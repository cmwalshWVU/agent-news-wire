# Agent News Wire

**Bloomberg Terminal for the Agent Economy**

A decentralized news distribution protocol where AI agents subscribe to real-time alerts and pay per delivery via USDC micropayments on Solana.

---

## The Problem

AI agents operating in crypto need real-time information but face:

1. **No agent-native infrastructure** — Agents scrape websites, hit rate limits, parse messy HTML
2. **Information fragmentation** — News scattered across Twitter, blogs, press releases, filings
3. **No push notifications** — Agents must poll constantly, wasting compute
4. **No filtering by relevance** — Firehose of data, can't prioritize
5. **No payment rail for information** — Valuable intel has no monetization path
6. **Latency kills alpha** — By the time an agent finds news, it's already priced in

---

## The Solution

- **Publishers** push news to the wire and get paid per delivery
- **Agents** subscribe to topic channels and receive instant alerts
- **Micropayments** flow automatically (USDC per alert)
- **On-chain registry** tracks subscriptions and delivery receipts
- **Agent-first API** designed for programmatic consumption, not humans

---

## Core Components

### 1. Topic Channels

```
Channels:
├── regulatory/sec
├── regulatory/cftc
├── regulatory/global
├── institutional/banks
├── institutional/asset-managers
├── defi/yields
├── defi/hacks
├── rwa/tokenization
├── networks/solana
├── networks/ethereum
├── networks/canton
└── markets/whale-movements
```

### 2. Alert Structure

```json
{
  "alertId": "wire-2026-02-02-00142",
  "channel": "institutional/banks",
  "priority": "high",
  "timestamp": "2026-02-02T14:32:00Z",
  "headline": "JPMorgan Files SEC Form for Tokenized Money Market Fund",
  "summary": "JPMorgan submitted Form N-1A for a blockchain-based money market fund using Onyx infrastructure.",
  "entities": ["JPMorgan", "SEC", "Onyx"],
  "tickers": ["JPM"],
  "tokens": [],
  "sourceUrl": "https://sec.gov/...",
  "sourceType": "regulatory_filing",
  "sentiment": "bullish",
  "impactScore": 8.5
}
```

### 3. Subscription Vault (On-Chain)

- Agent deposits USDC into subscription PDA
- Funds deduct per alert received
- Low balance triggers warning
- Top-up anytime, cancel anytime

### 4. Publisher Network

- News sources register as publishers
- Submit alerts to relevant channels
- Earn share of subscription revenue
- Reputation score based on accuracy/speed

---

## Technical Architecture

### Smart Contracts (Anchor/Solana)

| Program | Purpose |
|---------|---------|
| **SubscriptionRegistry** | Agent subscriptions, USDC balances, delivery receipts, payouts |
| **AlertRegistry** | On-chain alert hashes, delivery timing proof, disputes |
| **PublisherRegistry** | Publisher registration, reputation scores, revenue splits |

### Off-Chain Infrastructure

```
Sources → Parsers → Classifier → Enrichment → Distribution
    │         │          │            │             │
    │         │          │            │             └─► WebSocket push
    │         │          │            └─► Entity extraction, sentiment, impact
    │         │          └─► Route to correct channel(s)
    │         └─► Normalize to standard format
    └─► RSS, APIs, scrapers, filings, Twitter
```

### API Endpoints

```
# Subscription Management
POST   /api/subscribe          Subscribe to channels
POST   /api/deposit            Deposit USDC
GET    /api/balance            Check balance + runway
DELETE /api/subscribe/:channel Unsubscribe

# Alert Consumption
GET    /api/alerts             Historical alerts (paid query)
WS     /api/stream             Real-time WebSocket stream

# Publisher
POST   /api/publish            Submit alert
GET    /api/publisher/earnings Revenue earned
```

---

## Economic Model

### Pricing

| Tier | Channels | Price/Alert | Monthly Est. |
|------|----------|-------------|--------------|
| Basic | 3 | $0.02 | ~$15 |
| Pro | 10 | $0.015 | ~$40 |
| Enterprise | Unlimited | $0.01 | ~$100 |

### Revenue Split

```
Alert Revenue ($0.02):
├── Publisher: 50% ($0.01)
├── Protocol treasury: 30% ($0.006)
└── Validator/infra: 20% ($0.004)
```

---

## Use Cases

| Agent Type | Channels | Value |
|------------|----------|-------|
| **Trading** | markets/whales, defi/yields | React to whale moves, rebalance on yield ops |
| **Research** | regulatory/*, institutional/* | Monitor filings, build reports |
| **Risk** | defi/hacks, markets/liquidations | Instant exploit alerts, withdraw before contagion |
| **Content** | institutional/*, rwa/* | Breaking news notifications, auto-draft articles |
| **Compliance** | regulatory/* | Enforcement tracking, audit trail |

---

## MVP Scope (10 Days)

### Must Have
- [ ] Subscription registry (on-chain PDAs)
- [ ] 3-5 demo channels with real data
- [ ] WebSocket push to subscribers
- [ ] USDC payment per alert
- [ ] Basic publisher submission endpoint
- [ ] Demo agent that subscribes and reacts

### Nice to Have
- [ ] Webhook delivery option
- [ ] Historical alert queries
- [ ] Publisher reputation scoring
- [ ] Multiple pricing tiers

### Stretch
- [ ] Fully decentralized (alerts hashed on-chain)
- [ ] Publisher staking for spam prevention
- [ ] Cross-chain alert bridging

---

## Data Sources (MVP)

### Tier 1: Must Have (Days 1-3)
| Source | Channel | Method |
|--------|---------|--------|
| SEC EDGAR | regulatory/sec | RSS polling |
| DeFiLlama | defi/yields | API polling |
| Whale Alert | markets/whales | API/Webhook |

### Tier 2: Nice to Have (Days 4-7)
| Source | Channel | Method |
|--------|---------|--------|
| Bank newsrooms | institutional/banks | Scraper |
| Rekt News | defi/hacks | Scraper |
| CFTC | regulatory/cftc | RSS |
| Helius | solana/whales | Webhook |

### Tier 3: Stretch
| Source | Channel | Method |
|--------|---------|--------|
| Protocol Discords | defi/protocols | Bot integration |
| Global regulators | regulatory/global | Multi-scraper |

---

## MVP Cost Estimate

| Service | Cost | Notes |
|---------|------|-------|
| Helius | Free | Free tier sufficient |
| Whale Alert | $20/mo | Basic tier |
| Twitter API | $100/mo | Basic tier (optional) |
| VPS/Compute | $20-50/mo | Railway/DO |
| **Total** | **~$150/mo** | Can run on free tiers for hackathon |

---

## Why This Wins

**Technical Execution:**
- On-chain subscription registry
- Real-time distribution infrastructure
- Working payment flows
- Agent-to-agent API

**Creativity:**
- Infrastructure play, not another trading bot
- Creates new primitive for agent economy
- Network effects (more publishers = more value)

**Real-World Utility:**
- Every agent needs information
- Solves real latency and reliability problems
- Clear path to sustainability

**"Most Agentic" Potential:**
- Agents are the customers
- Agents can be publishers too
- Agent-first API design
- Enables entire ecosystem of informed agents

---

## Differentiation

| Project | Focus | ANW Difference |
|---------|-------|----------------|
| WhaleScope | Whale tracking only | Multi-category news |
| OSINT.market | Bounties for research | Real-time push alerts |
| ArbScanner | Prediction markets | Full news coverage |

**Agent News Wire is unique because:**
1. Push, not pull (agents receive, don't poll)
2. Multi-category coverage
3. Decentralized publisher network
4. Built-in payment infrastructure
5. Agent-native structured data

---

## Project Structure (Planned)

```
agent-news-wire/
├── programs/              # Anchor/Solana smart contracts
│   ├── subscription/
│   ├── alerts/
│   └── publisher/
├── api/                   # TypeScript API server
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── ingestion/     # Data source pollers
│   │   └── distribution/  # WebSocket server
│   └── package.json
├── sdk/                   # Client SDK for agents
├── demo/                  # Demo subscriber agent
├── docs/                  # Documentation
└── README.md
```

---

## Next Steps

1. **Scaffold project** — Initialize Anchor workspace + API
2. **Build SubscriptionRegistry** — Core on-chain logic
3. **Build ingestion pipeline** — Start with SEC + DeFiLlama
4. **Build WebSocket distribution** — Real-time push
5. **Connect payments** — USDC per alert
6. **Demo agent** — Subscriber that reacts to alerts
7. **Polish + submit**
