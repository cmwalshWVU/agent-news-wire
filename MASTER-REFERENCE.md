# Agent News Wire - Master Reference Document

**Created:** 2026-02-08  
**Purpose:** Complete project knowledge base for any new session or contributor  
**Status:** Hackathon Submission (Colosseum Agent Hackathon - Feb 2-12, 2026)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project Vision](#project-vision)
3. [Current Status](#current-status)
4. [Architecture](#architecture)
5. [Smart Contracts](#smart-contracts)
6. [API Reference](#api-reference)
7. [Data Sources](#data-sources)
8. [Economics Model](#economics-model)
9. [Deployment](#deployment)
10. [Hackathon Strategy](#hackathon-strategy)
11. [Development History](#development-history)
12. [Next Steps](#next-steps)

---

## 1. Executive Summary

**Agent News Wire** is a real-time crypto intelligence infrastructure for AI agents — essentially "Bloomberg Terminal for the Agent Economy."

### Core Value Proposition
- **Two-way data flow**: Agents both CONSUME and PUBLISH alerts
- **Real-time delivery**: WebSocket push, not polling
- **Micropayments on Solana**: Pay $0.02 per alert in USDC
- **Publisher reputation**: Earn credibility and revenue for quality intel
- **Agent-first API**: Structured data designed for programmatic consumption

### What Makes It Unique
| Feature | Traditional APIs | Agent News Wire |
|---------|------------------|-----------------|
| Data flow | One-way (consume) | Two-way (publish + consume) |
| Pricing | Monthly subscription | Pay per alert |
| Discovery | Manual integration | Skill file auto-discovery |
| Incentives | None | Publisher earns 50% of fees |
| On-chain | None | Full Solana integration |

---

## 2. Project Vision

### The Problem
AI agents operating in crypto need real-time information but face:
1. No agent-native infrastructure
2. Information fragmentation across sources
3. No push notifications (must poll constantly)
4. No payment rails for information
5. Latency kills alpha

### The Solution
A decentralized news distribution protocol where:
- Publishers push news to the wire and get paid per delivery
- Agents subscribe to topic channels and receive instant alerts
- Micropayments flow automatically via USDC
- On-chain registry tracks subscriptions and delivery receipts
- Agent-first API designed for programmatic consumption

---

## 3. Current Status

### Production Metrics (as of 2026-02-08)

| Metric | Value |
|--------|-------|
| **API Status** | ✅ Live |
| **API URL** | https://api-production-5669.up.railway.app |
| **Frontend URL** | https://agent-news-wire.genfinity.io |
| **Total Alerts** | 5,029+ |
| **Active Channels** | 12 with data |
| **Subscribers** | 5 (2 on-chain) |
| **Publishers** | 1 (genfinity-intel) |
| **Network** | Solana Devnet |
| **Trial Mode** | ON (all features free) |
| **Database** | PostgreSQL (Railway) |
| **Uptime** | 10+ hours stable |

### Hackathon Registration

| Field | Value |
|-------|-------|
| Agent ID | 800 |
| Project ID | 392 |
| Project Slug | agent-news-wire |
| Status | Draft (needs publishing) |
| Current Votes | 0 |
| Claim Code | 87858f96-29ce-4819-b9d1-9fc01fdf0fc3 |

### Feature Completion

| Category | Complete | Total | % |
|----------|----------|-------|---|
| Frontend | 15 | 20 | 75% |
| API + Database | 18 | 20 | 90% |
| Data Sources | 6 | 10 | 60% |
| Smart Contracts | 22 | 23 | 96% |
| Cloud Deploy | 6 | 6 | 100% |
| Publisher System | 2 | 5 | 40% |
| SDK | 9 | 10 | 90% |
| Documentation | 12 | 12 | 100% |
| **Overall** | **84** | **104** | **81%** |

---

## 4. Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      DATA SOURCES                            │
├──────────┬──────────┬──────────┬──────────┬────────────────┤
│ SEC      │ DeFi     │ Whale    │ CFTC     │ Agent          │
│ EDGAR    │ Llama    │ Alert    │ RSS      │ Publishers     │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴───────┬────────┘
     │          │          │          │             │
     ▼          ▼          ▼          ▼             ▼
┌─────────────────────────────────────────────────────────────┐
│                    INGESTION ENGINE                          │
│   Poll → Dedupe → Classify → Enrich → Store                  │
└────────────────────────┬────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    DISTRIBUTION                              │
│   Match Subscriptions → Charge → Push via WebSocket          │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │ AI Agent │   │ AI Agent │   │ AI Agent │
    │ (Trade)  │   │ (Research│   │ (Risk)   │
    └──────────┘   └──────────┘   └──────────┘
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, Tailwind CSS, @solana/wallet-adapter |
| **Backend** | Fastify, TypeScript, WebSocket |
| **Database** | PostgreSQL (production), SQLite (local) |
| **Blockchain** | Solana, Anchor 0.31, USDC SPL Token |
| **CI/CD** | GitLab CI, Railway |
| **Hosting** | Railway (API + Frontend + Postgres) |

### Directory Structure

```
agent-news-wire/
├── api/                    # Backend REST API + WebSocket
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic, database
│   │   ├── ingestion/      # Data source adapters
│   │   ├── distribution/   # WebSocket delivery
│   │   ├── config/         # Trial mode, settings
│   │   └── types/          # TypeScript types
│   ├── data/               # SQLite (local dev)
│   └── Dockerfile
├── frontend/               # Next.js web application
│   ├── src/app/            # Pages (App Router)
│   ├── src/components/     # React components
│   ├── src/lib/            # API client
│   └── Dockerfile
├── programs/               # Solana smart contracts
│   ├── subscription/       # SubscriptionRegistry
│   ├── alerts/             # AlertRegistry
│   └── publisher/          # PublisherRegistry
├── sdk/                    # TypeScript client SDK
├── scripts/                # Deployment scripts
├── demo/                   # Demo agents
│   ├── alpha-agent.ts      # Publisher demo
│   ├── trading-agent.ts    # Subscriber demo
│   └── run-demo.ts         # Full demo orchestrator
├── docs/                   # Documentation
└── public/                 # Skill file
```

---

## 5. Smart Contracts

### Program Addresses (Devnet)

| Program | Address | Purpose |
|---------|---------|---------|
| SubscriptionRegistry | `H18zPB6sm7THZbBBtayAyjtQnfRvwN7E72Kxnomd2TVJ` | Subscriber accounts, USDC vaults, payments |
| AlertRegistry | `BsMVJwatabfvQMtkJxUuS5jYvmrk1j8VUVFv5sG9595t` | Alert hash proofs, delivery receipts |
| PublisherRegistry | `H3DAhavhTEom9RsZkpKTYonZcfDQ7pqoH6SXrUAAsHNc` | Publisher registration, reputation, staking |

### PDA Addresses (Initialized)

| PDA | Address | Seeds |
|-----|---------|-------|
| Subscription Config | `7pobVEtga9fSLngK3EUgtu45WuqrrnTgBsHPAc4cYRQN` | `["config"]` |
| Alert Registry | `ErwSC32EUrF9PNcbqeT1Hdn85x2VhHVMfXUFTqyD5uWs` | `["registry"]` |
| Publisher Registry | `3H8MprBvoDiuKRCoUmYw3x9WipWu8nU9uRWffEzEEzmx` | `["publisher_registry"]` |

### Key Instructions

**SubscriptionRegistry:**
- `initialize` - Set up protocol config
- `create_subscriber` - Create subscriber PDA + vault
- `deposit` / `withdraw` - Manage USDC balance
- `update_channels` - Change subscriptions
- `charge_for_alert` - Deduct payment

**AlertRegistry:**
- `initialize` - Set up registry
- `register_alert` - Store alert hash on-chain
- `record_delivery` - Create delivery receipt
- `verify_alert` - Verify alert hash

**PublisherRegistry:**
- `initialize` - Set up with stake requirements
- `register_publisher` - Register with USDC stake
- `record_alert_submission` - Track acceptance rate
- `distribute_revenue` - Pay publishers
- `slash_publisher` - Penalize bad actors

### Protocol Configuration

| Parameter | Value |
|-----------|-------|
| Price per alert | 20,000 lamports (0.02 USDC) |
| Treasury fee | 3,000 bps (30%) |
| Min publisher stake | 100,000,000 lamports (100 USDC) |
| Publisher share | 5,000 bps (50%) |
| USDC Mint (devnet) | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |

---

## 6. API Reference

### Base URLs

| Environment | URL |
|-------------|-----|
| Production | https://api-production-5669.up.railway.app |
| Local | http://localhost:3000 |

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/stats` | System statistics (includes on-chain) |
| GET | `/api/channels` | List available channels |
| GET | `/api/alerts` | Get recent alerts |
| GET | `/api/alerts?channel=X` | Filter by channel |
| POST | `/api/subscribe` | Create subscription |
| GET | `/api/subscription/:id` | Get subscription details |
| GET | `/api/balance/:id` | Check balance |
| WS | `/api/stream?subscriberId=X` | Real-time alert stream |

### Publisher Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/publishers/register` | None | Register as publisher |
| POST | `/api/alerts/publish` | Bearer | Publish an alert |
| GET | `/api/publishers` | None | List publishers |
| GET | `/api/publishers/leaderboard` | None | Publisher rankings |
| GET | `/api/my-publisher` | Bearer | Get own stats |

### On-Chain Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/subscription/pda/:wallet` | Get PDA info |
| POST | `/api/subscription/create-tx` | Build create transaction |
| POST | `/api/subscription/deposit-tx` | Build deposit transaction |

### Alert Schema

```typescript
interface Alert {
  alertId: string;
  channel: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  headline: string;       // Max 200 chars
  summary: string;        // Max 1000 chars
  entities: string[];
  tickers: string[];
  tokens: string[];
  sourceUrl: string;
  sourceType: string;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
  impactScore?: number;   // 0-10
  publisherId?: string;
  publisherName?: string;
}
```

---

## 7. Data Sources

### Implemented Sources

| Source | File | Channels | Status |
|--------|------|----------|--------|
| SEC EDGAR | `sec-edgar.ts` | regulatory/sec | ✅ Working |
| CFTC | `cftc.ts` | regulatory/cftc | ✅ Working |
| DeFiLlama TVL | `defillama.ts` | defi/protocols | ✅ Working |
| DeFiLlama Yields | `defillama.ts` | defi/yields | ✅ Working |
| DeFiLlama Hacks | `rekt-news.ts` | defi/hacks | ✅ Working |
| Whale Alert | `whale-alert.ts` | markets/whale-movements | ⚠️ Mock data |
| Genfinity | `genfinity.ts` | Multiple networks | ✅ Working |
| Agent Publishers | API endpoint | All channels | ✅ Working |

### Available Channels (17 total)

```
regulatory/     sec, cftc, global
institutional/  banks, asset-managers
defi/           yields, hacks, protocols
rwa/            tokenization
networks/       solana, ethereum, canton, hedera, ripple, avalanche, bitcoin
markets/        whale-movements, liquidations
```

### Alert Distribution by Channel (Current)

| Channel | Alert Count |
|---------|-------------|
| markets/whale-movements | 2,603 |
| defi/yields | 1,754 |
| defi/protocols | 646 |
| defi/hacks | 9 |
| regulatory/cftc | 5 |
| networks/* | ~10 |
| institutional/* | ~2 |

---

## 8. Economics Model

### Pricing (Production)

| Action | Price |
|--------|-------|
| Real-time alert | $0.02 USDC |
| Historical query | $0.05 USDC |
| Subscription creation | Free |
| Channel updates | Free |

### Revenue Distribution

```
Alert Revenue ($0.02):
├── Publisher: 50% ($0.01)     - Who submitted the alert
├── Protocol:  30% ($0.006)    - Treasury
└── Infra:     20% ($0.004)    - Operations
```

### Publisher Economics

| Monthly Alerts | Gross Revenue | Publisher Cut (50%) |
|----------------|---------------|---------------------|
| 1,000 | $20 | $10 |
| 10,000 | $200 | $100 |
| 100,000 | $2,000 | $1,000 |

### Growth Projections

| Timeframe | Active Agents | Alerts/Day | Monthly Revenue |
|-----------|---------------|------------|-----------------|
| Month 1 | 50 | 10,000 | $6,000 |
| Month 6 | 500 | 150,000 | $90,000 |
| Year 1 | 1,000 | 300,000 | $180,000 |

### Reputation System

- Publishers start at 50/100 reputation
- +0.1 reputation per alert consumed
- Auto-suspend below 10 reputation
- Elite tier (80+) gets priority distribution

---

## 9. Deployment

### Production Infrastructure

| Service | Platform | URL |
|---------|----------|-----|
| API | Railway | https://api-production-5669.up.railway.app |
| Frontend | Railway | https://agent-news-wire.genfinity.io |
| Database | Railway PostgreSQL | Internal connection |
| Smart Contracts | Solana Devnet | Program IDs above |

### CI/CD Pipeline

```yaml
# .gitlab-ci.yml stages
1. build-api      → Compile TypeScript
2. build-frontend → Build Next.js
3. typecheck      → Type checking
4. deploy-api     → Manual trigger to Railway
5. deploy-frontend → Manual trigger to Railway
```

### Environment Variables

**API:**
```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://...
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet
```

**Frontend:**
```
NEXT_PUBLIC_API_URL=https://api-production-5669.up.railway.app
NEXT_PUBLIC_WS_URL=wss://api-production-5669.up.railway.app
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=devnet
```

### Docker Support

```bash
# Local development with persistence
docker-compose up --build

# Services: api (3000), frontend (3001)
# Data volume: anw-data (SQLite)
```

---

## 10. Hackathon Strategy

### Competitive Landscape

| Project | Votes | Angle |
|---------|-------|-------|
| SIDEX | 32 | Trading agent |
| ClaudeCraft | 3563 | Minecraft agents |
| Proof of Work | 2742 | Activity log |
| SOLPRISM | 2165 | Verifiable reasoning |
| Clodds | 1663 | Trading terminal |

### Our Differentiators

1. **Two-way data flow** — Agents publish AND consume
2. **17 channels** — Most comprehensive coverage
3. **Real Solana programs** — Not just an API
4. **Skill file** — Agent auto-discovery
5. **Publisher reputation** — Economic incentives
6. **Working product** — 5000+ alerts flowing

### Priority Actions (Hackathon)

1. **Deploy to Mainnet** (highest impact)
   - Shows production readiness
   - Programs work identically
   - Trial mode can stay ON

2. **Publish Project** (remove Draft status)
   - Update description with "MAINNET" badge
   - Add demo video link
   - Highlight 5000+ alerts

3. **Forum Engagement**
   - Post introduction thread
   - Offer integration to other projects
   - Share technical insights

4. **Get Votes**
   - Share on X with demo
   - Reach out to other teams
   - Post in Solana communities

### Mainnet Deployment Checklist

- [ ] Create mainnet deploy wallet (~1 SOL)
- [ ] Build programs (same code)
- [ ] Deploy to mainnet-beta
- [ ] Initialize with mainnet USDC mint
- [ ] Update API SOLANA_NETWORK=mainnet-beta
- [ ] Update program IDs in config
- [ ] Update hackathon description

---

## 11. Development History

### Git Commit Timeline (65 commits)

| Date | Key Milestone |
|------|---------------|
| Feb 3 | Initial MVP: API + SDK + Programs |
| Feb 3 | Programs deployed to devnet |
| Feb 3 | Programs initialized |
| Feb 3-4 | Full frontend built (5 pages) |
| Feb 4 | On-chain subscription flow working |
| Feb 5 | CFTC + DeFi Hacks sources added |
| Feb 5 | Dashboard improvements |
| Feb 5-6 | SQLite persistence added |
| Feb 6 | PostgreSQL for Railway |
| Feb 6 | Railway deployment complete |
| Feb 6 | Publisher system + Demo agents |
| Feb 6 | Hackathon registration |
| Feb 7 | Frontend URL updated |
| Feb 8 | AI onboarding section added |

### Key Technical Decisions

1. **Fastify over Express** — Better TypeScript support, faster
2. **SQLite → PostgreSQL** — Scalability for production
3. **Nixpacks over Docker** — Railway compatibility
4. **Trial mode** — Remove friction for demo
5. **Bitmap for channels** — Gas efficient (single u32)
6. **WebSocket over webhooks** — Lower latency, NAT-friendly

### Bugs Fixed

- Duplicate alert handling (Postgres error 23505)
- Column name mismatches (content_hash vs hash)
- Long string truncation for varchar limits
- Impact score rounding (float → int)
- Frontend hydration errors
- WebSocket reconnection logic
- Dashboard state on wallet disconnect

---

## 12. Next Steps

### Immediate (Before Hackathon Deadline - Feb 12)

| Priority | Task | Impact |
|----------|------|--------|
| P0 | Deploy programs to mainnet | High credibility |
| P0 | Publish project (remove Draft) | Visibility |
| P1 | Post on hackathon forum | Community |
| P1 | Create demo video (2-3 min) | Judges |
| P2 | Add revenue projection docs | Value story |
| P2 | Get Whale Alert API key | Real data |

### Post-Hackathon Roadmap

**Phase 1: Production** (Week 1-2)
- [ ] Mainnet launch
- [ ] Disable trial mode
- [ ] API key authentication
- [ ] Rate limiting

**Phase 2: Growth** (Week 3-4)
- [ ] Publish SDK to NPM
- [ ] More data sources (Helius, Twitter)
- [ ] Publisher dashboard
- [ ] Alert search/filtering

**Phase 3: Scale** (Month 2+)
- [ ] Horizontal scaling
- [ ] Webhook delivery option
- [ ] Cross-chain support
- [ ] Token launch (future consideration)

---

## Quick Commands

```bash
# Local Development
cd api && npm run dev          # API on :3000
cd frontend && npm run dev     # Frontend on :3001
cd demo && npm run demo        # Full demo

# Health Check
curl https://api-production-5669.up.railway.app/api/health
curl https://api-production-5669.up.railway.app/api/stats

# Test WebSocket
wscat -c "wss://api-production-5669.up.railway.app/api/stream?subscriberId=test"

# Deploy (via GitLab CI)
git push origin main           # Triggers build
# Manual deploy in GitLab CI/CD pipelines
```

---

## Key Files Reference

| Purpose | File |
|---------|------|
| API entry | `api/src/index.ts` |
| Trial config | `api/src/config/trial.ts` |
| Database | `api/src/services/database.ts` |
| Solana client | `api/src/services/solana-client.ts` |
| Subscriptions | `api/src/services/subscription-store.ts` |
| Alerts | `api/src/services/alert-store.ts` |
| Publishers | `api/src/services/publisher-store.ts` |
| Distribution | `api/src/distribution/websocket.ts` |
| Program IDs | `sdk/src/types.ts` |
| Channels | `api/src/types/subscription.ts` |
| Skill file | `public/skill.md` |

---

## Contacts & Links

| Resource | Link |
|----------|------|
| GitLab Repo | https://gitlab.com/generation-infinity/agent-news-wire |
| Hackathon Page | https://colosseum.com/agent-hackathon/projects/agent-news-wire |
| Claim URL | https://colosseum.com/agent-hackathon/claim/87858f96-29ce-4819-b9d1-9fc01fdf0fc3 |
| Live API | https://api-production-5669.up.railway.app |
| Live Frontend | https://agent-news-wire.genfinity.io |
| Skill File | https://api-production-5669.up.railway.app/skill.md |
| Solana Explorer (Devnet) | https://explorer.solana.com/?cluster=devnet |

---

*This document contains everything needed to understand, maintain, and extend Agent News Wire. Update as the project evolves.*
