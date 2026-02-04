# Agent News Wire

**Bloomberg Terminal for the Agent Economy**

A decentralized news distribution protocol where AI agents subscribe to real-time alerts and pay per delivery via USDC micropayments on Solana.

## Prerequisites

- Node.js 18+
- npm or pnpm
- (Optional) Rust + Anchor CLI for smart contract development

## Quick Start

```bash
# 1. Start the API server (backend)
cd api && npm install && npm run dev

# 2. Start the frontend (in another terminal)
cd frontend && npm install && PORT=3001 npm run dev

# 3. Open in browser
open http://localhost:3001
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│         Next.js 14 · Tailwind · Wallet Adapter               │
│   Landing · Dashboard · Alerts · Subscribe · Balance         │
└────────────────────────┬────────────────────────────────────┘
                         │ REST + WebSocket
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATA SOURCES                            │
├──────────┬──────────┬──────────┬──────────┬────────────────┤
│ SEC      │ DeFi     │ Whale    │ Banks    │ Social         │
│ EDGAR    │ Llama    │ Alert    │ Newsrooms│ (future)       │
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
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  SOLANA PROGRAMS                             │
│   SubscriptionRegistry · AlertRegistry · PublisherRegistry   │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
agent-news-wire/
├── api/              # Backend REST API + WebSocket
├── frontend/         # Next.js web application
├── programs/         # Solana smart contracts (Anchor)
├── sdk/              # TypeScript client SDK
├── scripts/          # Deployment & initialization
└── demo/             # Demo subscriber agent
```

## Frontend (New!)

Full-featured web application built with Next.js 14:

| Page | Route | Description |
|------|-------|-------------|
| Landing | `/` | Hero, features, stats, CTA |
| Dashboard | `/dashboard` | Stats, recent alerts, subscription status |
| Alerts | `/alerts` | Real-time feed with channel filters |
| Subscribe | `/subscribe` | Channel picker, wallet integration |
| Balance | `/balance` | Balance management, deposits |

### Features
- **Wallet Connect** - Phantom, Solflare support via `@solana/wallet-adapter`
- **Real-time Alerts** - WebSocket feed with live updates
- **On-chain Subscriptions** - Create subscriptions directly on Solana
- **Trial Mode** - All features free during trial period
- **Responsive** - Mobile-friendly design

### Running the Frontend
```bash
cd frontend
npm install
npm run dev         # Development (port 3000)
PORT=3001 npm run dev  # Use different port if API on 3000
npm run build       # Production build
npm start           # Production server
```

## API Endpoints

### Subscription Management

```bash
# Create subscription
curl -X POST http://localhost:3000/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{"channels": ["regulatory/sec", "markets/whale-movements"]}'

# Check balance
curl http://localhost:3000/api/balance/{subscriberId}

# Build on-chain subscription tx
curl -X POST http://localhost:3000/api/subscription/create-tx \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "xxx", "channels": ["defi/yields"]}'

# Get PDA info for wallet
curl http://localhost:3000/api/subscription/pda/{walletAddress}
```

### Alerts

```bash
# List channels
curl http://localhost:3000/api/channels

# Get recent alerts
curl http://localhost:3000/api/alerts

# Get alerts by channel
curl http://localhost:3000/api/alerts?channel=regulatory/sec
```

### WebSocket Stream

```javascript
const ws = new WebSocket('ws://localhost:3000/api/stream?subscriberId=xxx');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'alert') {
    console.log('New alert:', data.alert.headline);
  }
};
```

## Channels

| Channel | Description |
|---------|-------------|
| `regulatory/sec` | SEC EDGAR filings |
| `regulatory/cftc` | CFTC news & enforcement |
| `regulatory/global` | International regulators |
| `institutional/banks` | Major bank announcements |
| `institutional/asset-managers` | Fund & ETF news |
| `defi/yields` | DeFi yield opportunities |
| `defi/hacks` | Exploits & security incidents |
| `defi/protocols` | Protocol TVL changes |
| `rwa/tokenization` | Real-world asset tokenization |
| `networks/solana` | Solana network news |
| `networks/ethereum` | Ethereum network news |
| `networks/hedera` | Hedera/HBAR news |
| `networks/ripple` | Ripple/XRP news |
| `networks/bitcoin` | Bitcoin news |
| `markets/whale-movements` | Large crypto transfers |
| `markets/liquidations` | Major liquidation events |

## Smart Contracts (Devnet)

| Program | Address | Status |
|---------|---------|--------|
| SubscriptionRegistry | `H18zPB6sm7THZbBBtayAyjtQnfRvwN7E72Kxnomd2TVJ` | ✅ Deployed |
| AlertRegistry | `BsMVJwatabfvQMtkJxUuS5jYvmrk1j8VUVFv5sG9595t` | ✅ Deployed |
| PublisherRegistry | `H3DAhavhTEom9RsZkpKTYonZcfDQ7pqoH6SXrUAAsHNc` | ✅ Deployed |

## Pricing

**Trial Mode Active** - All features currently free!

| Action | Trial | Production |
|--------|-------|------------|
| Real-time alert | FREE | $0.02 |
| Historical query | FREE | $0.05 |
| Publisher stake | FREE | 100 USDC |

## Environment Variables

Copy the example files and customize as needed:

```bash
# API
cp api/.env.example api/.env

# Frontend
cp frontend/.env.example frontend/.env.local
```

### API (`api/.env`)
```bash
PORT=3000
HOST=0.0.0.0
WHALE_ALERT_API_KEY=         # Optional - for real whale alerts
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet
```

### Frontend (`frontend/.env.local`)
```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000
NEXT_PUBLIC_SOLANA_RPC=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=devnet
```

## Development

```bash
# Run everything for development
# Terminal 1: API
cd api && npm run dev

# Terminal 2: Frontend
cd frontend && PORT=3001 npm run dev

# Terminal 3: Demo subscriber (optional)
cd demo && npx tsx subscriber.ts
```

## Roadmap

- [x] SEC EDGAR ingestion
- [x] DeFiLlama yields/TVL
- [x] Whale Alert (mock)
- [x] WebSocket distribution
- [x] In-memory subscriptions
- [x] Solana smart contracts (Anchor)
- [x] On-chain subscription PDAs
- [x] Web frontend (Next.js)
- [x] Wallet integration
- [x] Trial mode
- [ ] USDC payment integration
- [ ] Publisher network
- [ ] More data sources

## License

MIT
