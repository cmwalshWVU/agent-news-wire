# Agent News Wire - Data Collection Strategy

## Overview

Multi-source ingestion pipeline. Prioritized by ease of implementation and value for MVP.

---

## 1. Regulatory Filings

### SEC EDGAR (Free, Official)

```bash
# RSS Feed - New filings every 10 minutes
https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=&company=&dateb=&owner=include&count=40&output=atom

# Full-text search API
https://efts.sec.gov/LATEST/search-index?q=blockchain&dateRange=custom&startdt=2026-01-01

# Company filings (e.g., Coinbase)
https://data.sec.gov/submissions/CIK0001679788.json
```

**Forms to monitor:**
- 10-K, 10-Q — Quarterly reports mentioning crypto
- S-1 — IPO filings (new crypto companies)
- N-1A — Fund registrations (ETFs, money market funds)
- No-action letters
- Comment letters

### CFTC

```bash
# Press releases RSS
https://www.cftc.gov/PressRoom/PressReleases/rss

# Enforcement actions
https://www.cftc.gov/LawRegulation/Enforcement/EnforcementActions
```

### Federal Register (All US Regulatory)

```bash
# API - search for crypto-related rules
https://www.federalregister.gov/api/v1/documents?conditions[term]=cryptocurrency&per_page=20
```

### Global Regulators

| Region | Source | Method |
|--------|--------|--------|
| EU | EUR-Lex | RSS + API |
| UK | FCA | RSS feed |
| Singapore | MAS | Scrape newsroom |
| Hong Kong | SFC | Scrape |
| Japan | FSA | Scrape (translate) |

---

## 2. Institutional Announcements

### Press Release Wires (Paid)

- PR Newswire API
- Business Wire API
- GlobeNewswire API

**Cost:** $500-2000/month for real-time feeds
**Filter keywords:** blockchain, tokenization, digital assets, cryptocurrency

### Free Alternatives

**Bank Newsrooms (Scrape):**
```python
sources = [
    "https://www.jpmorgan.com/news",
    "https://newsroom.bankofamerica.com/",
    "https://www.citigroup.com/global/news",
    "https://www.goldmansachs.com/media-relations/press-releases/",
    "https://www.blackrock.com/corporate/newsroom",
    "https://www.fidelity.com/about-fidelity/our-company/news-releases",
]
# Scrape every 5-15 minutes, diff for new items
```

**Twitter/X Lists:**
```python
# Key institutional accounts
accounts = [
    "@BlackRock", "@jpmorgan", "@NYSE",
    "@CantonNetwork", "@dtcc"
]
# Stream mentions of crypto keywords
```

---

## 3. DeFi & Protocol News

### DeFiLlama API (Free)

```bash
# TVL changes
https://api.llama.fi/protocols

# Yields
https://yields.llama.fi/pools

# Stablecoin flows
https://stablecoins.llama.fi/stablecoins
```

**Alert triggers:**
- TVL drops >10% in 1 hour
- New protocol with >$10M TVL
- Yield spikes (arbitrage)

### DeFi Hacks

- Scrape rekt.news
- Monitor @PeckShieldAlert, @SlowMist_Team on Twitter
- Protocol Discord #announcements

### Protocol Announcements

```python
protocol_blogs = [
    "https://medium.com/feed/@jupiter-exchange",
    "https://blog.kamino.finance/rss",
]
```

---

## 4. On-Chain Data

### Helius Webhooks (Solana)

```bash
curl -X POST https://api.helius.xyz/v0/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "webhookURL": "https://yourserver.com/webhook",
    "accountAddresses": ["whale_wallet_1", "whale_wallet_2"],
    "transactionTypes": ["TRANSFER"],
    "webhookType": "enhanced"
  }'
```

**Cost:** Free tier available

### Whale Alert API (Multi-chain)

```bash
https://api.whale-alert.io/v1/transactions?api_key=YOUR_KEY&min_value=1000000
```

**Cost:** $20-100/month
**Covers:** BTC, ETH, SOL, USDT, USDC

---

## 5. Social/Sentiment

### Twitter/X API v2

**Cost:** $100/month (Basic) or $5000/month (Pro)

```python
influencers = [
    "VitalikButerin", "cz_binance", "jessepollak",
    "aabornenfeld", "balaboraji"
]
```

### LunarCrush API

```bash
https://lunarcrush.com/api
```
**Cost:** Free tier available

### Reddit

- Monitor r/cryptocurrency, r/solana, r/defi
- Filter by upvotes and keywords

---

## Ingestion Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      DATA SOURCES                           │
├──────────┬──────────┬──────────┬──────────┬────────────────┤
│ SEC      │ Banks    │ DeFi     │ Chain    │ Social         │
│ EDGAR    │ Newsrooms│ Llama    │ Helius   │ Twitter        │
│ RSS      │ Scrape   │ API      │ Webhooks │ API            │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴───────┬────────┘
     │          │          │          │             │
     ▼          ▼          ▼          ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│                    INGESTION LAYER                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ Poller  │  │ Scraper │  │Webhook  │  │ Stream  │        │
│  │(5 min)  │  │(15 min) │  │Receiver │  │Consumer │        │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
│       └───────────┬┴───────────┬┴────────────┘             │
│                   ▼                                         │
│            ┌──────────────┐                                 │
│            │ Deduplicator │ (hash-based)                    │
│            └──────┬───────┘                                 │
└──────────────────┬──────────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                   PROCESSING LAYER                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Classifier  │  │  Enricher   │  │   Scorer    │         │
│  │ (channel)   │  │ (entities)  │  │  (impact)   │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         └────────────────┼────────────────┘                 │
│                          ▼                                  │
│                  ┌────────────────┐                         │
│                  │ Alert Builder  │                         │
│                  └───────┬────────┘                         │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  DISTRIBUTION LAYER                         │
│         ┌──────────────────────────────────────┐            │
│         │      Subscription Matcher            │            │
│         └──────────────────┬───────────────────┘            │
│                            ▼                                │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐               │
│  │ WebSocket │  │  Webhook  │  │ On-Chain  │               │
│  │   Push    │  │ Callback  │  │   Event   │               │
│  └───────────┘  └───────────┘  └───────────┘               │
└─────────────────────────────────────────────────────────────┘
```

---

## MVP Implementation Priority

### Tier 1: Must Have (Days 1-3)

| Source | Channel | Method | Difficulty |
|--------|---------|--------|------------|
| SEC EDGAR | regulatory/sec | RSS polling | Easy |
| DeFiLlama | defi/yields | API polling | Easy |
| Whale Alert | markets/whales | API/Webhook | Easy |

### Tier 2: Nice to Have (Days 4-7)

| Source | Channel | Method | Difficulty |
|--------|---------|--------|------------|
| Bank newsrooms | institutional/banks | Scraper | Medium |
| Rekt News | defi/hacks | Scraper | Easy |
| CFTC | regulatory/cftc | RSS | Easy |
| Helius | solana/whales | Webhook | Medium |

### Tier 3: Stretch (Days 8-10)

| Source | Channel | Method | Difficulty |
|--------|---------|--------|------------|
| Protocol Discords | defi/protocols | Bot integration | Hard |
| Global regulators | regulatory/global | Multi-scraper | Hard |

---

## Simplified MVP Approach

```python
# 1. Single polling service
async def poll_all_sources():
    while True:
        # SEC - every 10 min
        sec_items = await fetch_sec_rss()
        
        # DeFiLlama - every 5 min
        defi_items = await fetch_defillama_yields()
        
        # Whale Alert - every 1 min
        whale_items = await fetch_whale_alert()
        
        # Process and distribute
        for item in sec_items + defi_items + whale_items:
            alert = classify_and_enrich(item)
            await distribute_to_subscribers(alert)
        
        await asyncio.sleep(60)

# 2. Simple classifier
def classify_and_enrich(raw_item):
    return {
        "alertId": generate_id(),
        "channel": detect_channel(raw_item),
        "headline": raw_item["title"],
        "summary": raw_item.get("summary", ""),
        "sourceUrl": raw_item["link"],
        "timestamp": datetime.now().isoformat(),
        "impactScore": estimate_impact(raw_item)
    }

# 3. WebSocket distribution
async def distribute_to_subscribers(alert):
    channel = alert["channel"]
    subscribers = get_subscribers_for_channel(channel)
    for sub in subscribers:
        await sub.websocket.send(json.dumps(alert))
        await charge_subscriber(sub, PRICE_PER_ALERT)
```

---

## Cost Estimate

| Service | Cost | Notes |
|---------|------|-------|
| Helius | Free | Free tier sufficient |
| Whale Alert | $20/mo | Basic tier |
| Twitter API | $100/mo | Basic tier (optional) |
| VPS/Compute | $20-50/mo | Railway/DigitalOcean |
| **Total** | **~$150/mo** | Can run free for hackathon |

---

## Key Insight

**You don't need perfect data coverage to win the hackathon.**

What matters:
1. **Working end-to-end flow**: Source → Process → Distribute → Pay
2. **Real alerts**: Even 3-4 channels with real data is impressive
3. **Agent-first API**: Clean, documented, easy to integrate
4. **On-chain payments**: The Solana integration that makes it hackathon-relevant

Infrastructure is the hard part. Data sources can always be added later.
