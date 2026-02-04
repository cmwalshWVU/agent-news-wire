# Architecture & Design Decisions

**Purpose:** Document why things were built the way they were.

---

## Overview

Agent News Wire is a real-time crypto intelligence feed designed for AI agents. Think "Bloomberg Terminal for the Agent Economy."

```
┌─────────────────┐
│   Web Frontend  │ ◀─────────────────────┐
│   (Next.js 14)  │                       │
└────────┬────────┘                       │
         │ REST + WebSocket               │
         ▼                                │ Wallet Connect
┌─────────────────┐     ┌─────────────────┐
│   Data Sources  │────▶│    API Server   │────▶ AI Agents
│  (SEC, DeFi,    │     │  (Fastify +     │    (Subscribers)
│   Whale Alert)  │     │   WebSocket)    │
└─────────────────┘     └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  Solana Chain   │
                        │  (Payments &    │
                        │   Receipts)     │
                        └─────────────────┘
```

---

## Web Frontend Architecture

### Tech Stack
| Technology | Purpose |
|------------|---------|
| Next.js 14 | App Router, Server Components |
| TypeScript | Type safety |
| Tailwind CSS | Utility-first styling |
| @solana/wallet-adapter | Phantom, Solflare integration |
| Sonner | Toast notifications |
| Lucide React | Icons |

### Page Structure
```
frontend/src/app/
├── page.tsx              # Landing page
├── layout.tsx            # Root layout with wallet provider
├── globals.css           # Tailwind + custom styles
├── dashboard/page.tsx    # Stats, recent alerts
├── alerts/page.tsx       # Real-time feed
├── subscribe/page.tsx    # Channel selection + wallet
└── balance/page.tsx      # Balance management
```

### Component Architecture
```
frontend/src/components/
├── WalletProvider.tsx    # Solana wallet context
├── Header.tsx            # Navigation + wallet button
└── AlertCard.tsx         # Alert display (compact/full)
```

### API Client
Single file handles all API communication:
```
frontend/src/lib/api.ts
├── fetchStats()          # GET /api/stats
├── fetchChannels()       # GET /api/channels
├── fetchAlerts()         # GET /api/alerts
├── createSubscription()  # POST /api/subscribe
├── getSubscription()     # GET /api/subscription/:id
├── getBalance()          # GET /api/balance/:id
├── getPDAInfo()          # GET /api/subscription/pda/:wallet
├── buildCreateTx()       # POST /api/subscription/create-tx
├── buildDepositTx()      # POST /api/subscription/deposit-tx
└── createAlertWebSocket() # WS /api/stream
```

### Why Next.js 14 App Router?
- **Server Components** — Reduced client bundle size
- **Streaming** — Progressive page loads
- **File-based routing** — Simple, predictable URLs
- **Built-in optimization** — Image, font, script optimization
- **React 18 features** — Concurrent rendering, Suspense

### Why Tailwind CSS?
- **No CSS files to manage** — Styles in components
- **Dark mode built-in** — Via class strategy
- **Responsive design** — Mobile-first utilities
- **Consistent design system** — Predefined spacing, colors

### Wallet Flow
```
1. User clicks "Connect Wallet"
2. WalletModalProvider shows wallet options
3. User selects Phantom/Solflare
4. Wallet adapter stores connection
5. publicKey available throughout app
6. On subscribe:
   a. Frontend calls buildCreateTx()
   b. API returns unsigned transaction
   c. Frontend calls signTransaction()
   d. Frontend sends signed tx to Solana
   e. Frontend calls createSubscription() to sync
```

---

## Why These Design Choices?

### Why Solana?
- **Sub-second finality** — Alerts are time-sensitive; can't wait for 12+ second block times
- **Low fees** — Micropayments ($0.02/alert) need <$0.001 tx fees to be viable
- **Program composability** — Agents can interact with subscription contracts programmatically
- **Existing DeFi ecosystem** — Integration with Jupiter, Marinade, etc. for agent actions

### Why WebSocket over Webhooks?
- **Persistent connection** — No need to expose endpoints; agents can be behind NAT
- **Lower latency** — No HTTP overhead per message
- **Bidirectional** — Can update subscriptions without new requests
- Webhooks available later as alternative for serverless agents

### Why Per-Alert Pricing ($0.02)?
- **Aligns incentives** — Pay for value received, not time subscribed
- **Publisher economics** — $0.01/alert to publisher makes high-quality data worthwhile
- **Agent-friendly** — Agents can budget per-task; subscribe only when needed
- **Spam prevention** — Cost to receive = cost to send means no free spam

### Why Channel-Based Architecture?
- **Granular subscriptions** — Agents subscribe only to what they need
- **Efficient filtering** — Server-side filtering reduces bandwidth
- **Clear pricing** — Easy to understand what you're paying for
- **Publisher specialization** — Publishers can focus on specific domains

### Why Trial Mode?
- **Reduce friction** — Users can try before committing
- **Demonstration** — Show full functionality without USDC
- **Configurable** — Easy to switch to production pricing
- **No blockchain dependency** — Works even if Solana has issues

---

## Channel Structure

Channels organized hierarchically by domain:

```
regulatory/
├── sec          # SEC filings (10-K, S-1, crypto-related)
├── cftc         # CFTC announcements
└── global       # International regulators (EU, UK, Singapore)

institutional/
├── banks        # Bank crypto initiatives
└── asset-managers  # ETF filings, fund launches

defi/
├── yields       # APY opportunities >20%, TVL >$10M
├── hacks        # Exploits, vulnerabilities
└── protocols    # TVL changes, launches

rwa/
└── tokenization # Real-world asset tokenization

networks/
├── solana       # Solana ecosystem
├── ethereum     # Ethereum ecosystem
├── canton       # Canton Network (institutional)
├── hedera       # Hedera/HBAR
├── ripple       # Ripple/XRP
├── avalanche    # Avalanche/AVAX
└── bitcoin      # Bitcoin/BTC

markets/
├── whale-movements  # Large transfers
└── liquidations     # DeFi liquidation events
```

### Why These Specific Channels?
- **Genfinity focus** — Aligns with existing content coverage
- **Institutional angle** — Canton, Hedera, XRP = enterprise blockchain
- **Actionable data** — Each channel maps to potential agent actions
- **Expandable** — Easy to add new channels without restructuring

---

## Program Architecture

### Three Programs (Separation of Concerns)

1. **SubscriptionRegistry** — User-facing
   - Subscriber accounts & balances
   - Channel subscriptions (bitmap for gas efficiency)
   - USDC deposits/withdrawals
   - Per-alert charging

2. **AlertRegistry** — Data integrity
   - On-chain proof of alert delivery
   - Content hashes (not full content)
   - Delivery receipts
   - Future: dispute resolution

3. **PublisherRegistry** — Supply-side
   - Publisher registration with staking
   - Reputation scores
   - Revenue distribution
   - Slash mechanism for bad actors

### Why Separate Programs?
- **Upgradability** — Can upgrade one without affecting others
- **Security isolation** — Compromise of one doesn't affect others
- **Clear ownership** — Different authorities for different concerns
- **Gas efficiency** — Smaller programs = cheaper deploys

### Why Bitmap for Channels?
```rust
channels: u32  // 32 channels max, 1 bit each
```
- Single storage slot vs. vector
- O(1) subscription checks
- Cheap to update
- 32 channels sufficient for MVP

---

## Data Source Selection

| Source | Why Chosen |
|--------|------------|
| SEC EDGAR | Primary US regulatory data, RSS available |
| DeFiLlama | Best aggregated DeFi data, free API |
| Whale Alert | Industry standard for large transfers |
| Genfinity | Your own content, guaranteed relevance |

### Why Not (Yet)
- **Twitter/X** — Rate limits, API costs, noise ratio
- **Discord** — Requires bot presence, TOS concerns  
- **On-chain events** — Helius webhooks planned for v2
- **News APIs** — Most are paywalled or low-quality

---

## Alert Schema Design

```typescript
interface Alert {
  alertId: string;        // Unique identifier
  channel: string;        // Category for filtering
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;      // ISO 8601
  headline: string;       // Max 200 chars, human-readable
  summary: string;        // Max 1000 chars, context
  entities: string[];     // Companies, protocols mentioned
  tickers: string[];      // Stock tickers ($COIN, $MSTR)
  tokens: string[];       // Crypto tokens (BTC, ETH, SOL)
  sourceUrl: string;      // Original source
  sourceType: string;     // 'sec-filing', 'defi-protocol', etc.
  sentiment?: string;     // bullish/bearish/neutral
  impactScore?: number;   // 0-10 estimated importance
}
```

### Design Principles
- **Agent-optimized** — Structured for programmatic parsing
- **Action-oriented** — Includes entities/tickers for immediate lookup
- **Source-traceable** — Always link to original
- **Sentiment-tagged** — Helps agents prioritize

---

## Security Model

### On-Chain
- **PDA-based accounts** — No private key management for subscribers
- **Authority checks** — Only owner can withdraw, only protocol can charge
- **Delivery receipts** — Proof of service for disputes

### Off-Chain
- **API keys** (planned) — Rate limiting per subscriber
- **WebSocket auth** — Subscription ID validated on connect
- **No PII stored** — Only wallet addresses

### Frontend
- **Wallet adapter** — Never touches private keys
- **Client-side signing** — Transactions signed in wallet, not server
- **No secrets in client** — API URL only, no keys

---

## Scalability Considerations

### Current (MVP)
- In-memory alert storage (1000 per channel max)
- Single server WebSocket
- Polling-based ingestion (60s intervals)
- Static frontend (can be CDN-hosted)

### Future
- PostgreSQL for persistence
- Redis for pub/sub scaling
- Multiple API instances behind load balancer
- Push-based ingestion where available
- Edge deployment for frontend

---

*This document explains the "why" behind decisions. Update when architecture changes significantly.*
