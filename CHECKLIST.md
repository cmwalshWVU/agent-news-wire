# Agent News Wire - Feature Checklist

**Last Updated:** 2026-02-06

## Legend
- ✅ Complete
- 🟡 Partial / In Progress
- ⬜ Not Started

---

## Web Frontend (NEW!)

### Pages
- ✅ Landing page (`/`) - Hero, features, stats, CTA
- ✅ Dashboard (`/dashboard`) - Stats, alerts, subscription status
- ✅ Alerts feed (`/alerts`) - Real-time feed with filters
- ✅ Subscribe (`/subscribe`) - Channel picker, wallet flow
- ✅ Balance (`/balance`) - Balance management, deposits

### Components
- ✅ Header with navigation
- ✅ Wallet connect button (Phantom, Solflare)
- ✅ Alert card component
- ✅ Channel selector with categories
- ✅ Stats cards
- ✅ Toast notifications (Sonner)

### Features
- ✅ Wallet adapter integration
- ✅ On-chain subscription flow
- ✅ On-chain deposit flow
- ✅ WebSocket real-time alerts
- ✅ Channel filtering
- ✅ Trial mode banner
- ✅ Responsive design
- ✅ Dark theme
- ✅ Dashboard: Connect wallet CTA
- ✅ Dashboard: Channel bitmap decoder
- ✅ Dashboard: Subscribed channels display
- ✅ Dashboard: Wallet state handling (disconnect clears state)

### Build
- ✅ Next.js 14 App Router
- ✅ TypeScript
- ✅ Tailwind CSS
- ✅ Production build successful

---

## Core Infrastructure

### API Server
- ✅ Fastify server with REST endpoints
- ✅ CORS enabled
- ✅ Health check endpoint (`/api/health`)
- ✅ Stats endpoint (`/api/stats`)
- ✅ Graceful shutdown handling
- ✅ Trial mode configuration
- ⬜ Rate limiting
- ⬜ API key authentication
- ⬜ Request logging/analytics

### WebSocket Distribution
- ✅ WebSocket server (`/api/stream`)
- ✅ Real-time alert push to subscribers
- ✅ Per-subscriber channel filtering
- ✅ Connection/disconnection handling
- ✅ Channel subscription updates via WebSocket
- ⬜ Heartbeat/ping-pong keepalive
- ⬜ Reconnection handling (client-side)
- ⬜ Message acknowledgment

---

## Data Ingestion

### SEC EDGAR
- ✅ RSS feed polling
- ✅ Crypto keyword filtering
- ✅ Form type detection (10-K, S-1, N-1A, etc.)
- ✅ Company name extraction
- ✅ Impact score estimation
- ⬜ Full-text search API integration
- ⬜ Company-specific filing tracking

### DeFiLlama
- ✅ Yields API polling
- ✅ TVL API polling
- ✅ Yield spike/drop detection (>50% change)
- ✅ High-yield opportunity alerts (>20% APY, >$10M TVL)
- ✅ TVL surge/crash detection (>10% 24h change)
- ⬜ Stablecoin flow tracking
- ⬜ Protocol-specific monitoring

### Whale Alert
- ✅ Mock data generation for demo
- ✅ Multi-chain support (BTC, ETH, XRP, HBAR, USDC)
- ✅ Exchange inflow/outflow sentiment detection
- ✅ Priority based on USD amount
- 🟡 Real API integration (code ready, needs API key)

### Genfinity
- ✅ RSS feed polling
- ✅ Category-to-channel mapping
- ✅ Entity extraction
- ✅ Ticker detection
- ✅ Impact score estimation
- ✅ HTML stripping from descriptions

### Additional Sources (Not Started)
- ⬜ CFTC RSS feed
- ⬜ Federal Register API
- ⬜ Bank newsroom scrapers
- ⬜ Rekt News (DeFi hacks)
- ⬜ Twitter/X API integration
- ⬜ Global regulators (EU, UK, Singapore)

---

## Channels

### Regulatory
- ✅ `regulatory/sec` - SEC filings
- ⬜ `regulatory/cftc` - CFTC news (channel exists, no source)
- 🟡 `regulatory/global` - International (Genfinity only)

### Institutional
- 🟡 `institutional/banks` - Bank news (Genfinity only)
- 🟡 `institutional/asset-managers` - Fund/ETF news

### DeFi
- ✅ `defi/yields` - Yield opportunities (DeFiLlama)
- ⬜ `defi/hacks` - Exploits/security (needs Rekt News)
- ✅ `defi/protocols` - Protocol TVL (DeFiLlama)

### RWA
- ⬜ `rwa/tokenization` - Tokenization news

### Networks
- ✅ `networks/solana` - Solana news
- ✅ `networks/ethereum` - Ethereum news
- ✅ `networks/canton` - Canton Network
- ✅ `networks/hedera` - Hedera/HBAR
- ✅ `networks/ripple` - Ripple/XRP
- ✅ `networks/avalanche` - Avalanche/AVAX
- ✅ `networks/bitcoin` - Bitcoin/BTC

### Markets
- ✅ `markets/whale-movements` - Whale transfers
- ⬜ `markets/liquidations` - Liquidation events

---

## Subscription System

### In-Memory Store (MVP)
- ✅ Create subscription (`POST /api/subscribe`)
- ✅ Get subscription details (`GET /api/subscription/:id`)
- ✅ Update channels (`PUT /api/subscription/:id/channels`)
- ✅ Unsubscribe (`DELETE /api/subscription/:id`)
- ✅ Channel-based subscriber indexing
- ✅ On-chain sync for wallet subscribers
- ⬜ Persistence (survives restart)

### Balance & Payments
- ✅ Deposit USDC (`POST /api/deposit`)
- ✅ Check balance (`GET /api/balance/:id`)
- ✅ Charge per alert ($0.02)
- ✅ Charge per historical query ($0.05)
- ✅ Low balance warning via WebSocket
- ✅ Build create-tx for on-chain subscription
- ✅ Build deposit-tx for USDC deposits
- ✅ PDA lookup endpoint
- ✅ On-chain balance queries
- ✅ Trial mode (free access)

---

## Alert System

### Alert Store
- ✅ In-memory storage
- ✅ Hash-based deduplication
- ✅ Per-channel indexing
- ✅ Max alerts per channel (1000)
- ✅ Recent alerts query
- ⬜ Persistence (database)
- ⬜ Full-text search

### Alert Schema
- ✅ Alert ID generation
- ✅ Channel classification
- ✅ Priority levels (low/medium/high/critical)
- ✅ Timestamp
- ✅ Headline (max 200 chars)
- ✅ Summary (max 1000 chars)
- ✅ Entities extraction
- ✅ Tickers extraction
- ✅ Tokens extraction
- ✅ Source URL
- ✅ Source type classification
- ✅ Sentiment (bullish/bearish/neutral)
- ✅ Impact score (0-10)

### Alert Endpoints
- ✅ List channels (`GET /api/channels`)
- ✅ Get recent alerts (`GET /api/alerts`)
- ✅ Filter by channel (`GET /api/alerts?channel=...`)
- ✅ Get single alert (`GET /api/alerts/:id`)
- ⬜ Search alerts
- ⬜ Date range filtering

---

## Smart Contracts (Solana/Anchor)

### SubscriptionRegistry
- ✅ Program scaffolding
- ✅ Subscriber PDA structure
- ✅ USDC vault per subscriber
- ✅ Channel subscription storage (bitmap)
- ✅ Deposit instruction
- ✅ Withdraw instruction
- ✅ Subscribe/unsubscribe instructions
- ✅ Charge for alert instruction
- ✅ Delivery receipt creation
- ✅ Deployed to devnet
- ✅ Initialized

### AlertRegistry
- ✅ Program scaffolding
- ✅ Alert hash storage (proof)
- ✅ Delivery receipts
- ✅ Timestamp verification
- ✅ Deployed to devnet
- ✅ Initialized
- ⬜ Dispute mechanism

### PublisherRegistry
- ✅ Program scaffolding
- ✅ Publisher registration
- ✅ Reputation scoring (0-100 scale)
- ✅ Revenue split logic
- ✅ Staking for spam prevention
- ✅ Slash mechanism
- ✅ Stake withdrawal
- ✅ Deployed to devnet
- ✅ Initialized

---

## Publisher Network

### Publisher API
- ⬜ Publisher registration endpoint
- ⬜ Alert submission endpoint (`POST /api/publish`)
- ⬜ Publisher earnings endpoint
- ⬜ Alert validation/moderation
- ⬜ Publisher dashboard

---

## SDK & Demo

### Client SDK
- ✅ TypeScript SDK package
- ✅ Subscription management
- ✅ WebSocket client wrapper
- ✅ Alert type definitions
- ✅ PDA seed helpers
- ✅ Channel bitmap helpers
- ⬜ NPM publishing

### Demo Agent
- ✅ Basic subscriber script
- ✅ Subscription creation
- ✅ Deposit simulation
- ✅ WebSocket connection
- ✅ Alert reaction examples

---

## Documentation

- ✅ README with quick start
- ✅ API endpoint documentation
- ✅ Alert schema documentation
- ✅ Channel list
- ✅ Progress report
- ✅ Frontend progress tracker
- ⬜ Integration guides
- ⬜ Publisher onboarding guide

---

## DevOps & Infrastructure

- ✅ TypeScript configuration
- ✅ Development server (tsx watch)
- ✅ Frontend production build
- ⬜ Docker containerization
- ⬜ Environment configuration
- ⬜ Logging infrastructure
- ⬜ Monitoring/alerting
- ⬜ CI/CD pipeline

---

## Summary

| Category | Complete | Partial | Not Started |
|----------|----------|---------|-------------|
| **Frontend** | **14** | **0** | **0** |
| API Server | 7 | 0 | 2 |
| WebSocket | 5 | 0 | 3 |
| Data Sources | 16 | 2 | 6 |
| Channels | 10 | 3 | 4 |
| Subscriptions | 7 | 0 | 1 |
| Payments | 10 | 0 | 0 |
| Alerts | 16 | 0 | 4 |
| Smart Contracts | 22 | 0 | 1 |
| Publisher Network | 0 | 0 | 5 |
| SDK/Demo | 9 | 0 | 1 |
| Documentation | 6 | 0 | 2 |
| DevOps | 3 | 0 | 5 |

**Overall Progress:** ~90% of MVP features complete

**Latest Updates (2026-02-04):**
- ✅ Complete web frontend built (5 pages)
- ✅ Wallet integration (Phantom, Solflare)
- ✅ Real-time alerts with WebSocket
- ✅ On-chain subscription flow
- ✅ On-chain deposit flow
- ✅ Trial mode active
- ✅ Production build successful
