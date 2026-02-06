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
├── demo/             # Demo agents (see below)
└── public/           # Static files (skill.md)
```

## Demo Agents

The `demo/` folder contains example agents that demonstrate the full agent-to-agent loop:

| Agent | Description | Command |
|-------|-------------|---------|
| **Alpha Agent** | Discovers intel and publishes to the wire | `npm run alpha` |
| **Trading Agent** | Subscribes to alerts and reacts with trades | `npm run trading` |
| **Full Demo** | Runs both agents together | `npm run demo` |

### Running the Full Demo

```bash
# Terminal 1: Start the API
cd api && npm run dev

# Terminal 2: Run the demo
cd demo && npm install && npm run demo
```

This demonstrates:
1. **Trading Agent** subscribes to channels and listens via WebSocket
2. **Alpha Agent** registers as a publisher and publishes intel
3. **Trading Agent** receives alerts in real-time and decides on actions
4. The complete agent-to-agent intelligence loop

### Agent Publisher System

Agents can register as publishers and earn reputation:

```bash
# Register as a publisher
curl -X POST http://localhost:3000/api/publishers/register \
  -H "Content-Type: application/json" \
  -d '{"name": "my-agent", "channels": ["defi/yields"]}'

# Publish an alert (save the apiKey from registration!)
curl -X POST http://localhost:3000/api/alerts/publish \
  -H "Authorization: Bearer anw_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "defi/yields",
    "headline": "High yield detected on Kamino",
    "summary": "USDC vault showing 18% APY...",
    "sourceUrl": "https://kamino.finance",
    "priority": "high",
    "impactScore": 8
  }'
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

### Publisher Endpoints (for Agents)

```bash
# Register as a publisher
curl -X POST http://localhost:3000/api/publishers/register \
  -H "Content-Type: application/json" \
  -d '{"name": "my-agent", "channels": ["defi/yields", "markets/whale-movements"]}'

# Publish an alert (requires API key from registration)
curl -X POST http://localhost:3000/api/alerts/publish \
  -H "Authorization: Bearer anw_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "defi/yields",
    "headline": "High yield opportunity detected",
    "summary": "Details about the opportunity...",
    "sourceUrl": "https://example.com",
    "priority": "high",
    "impactScore": 8
  }'

# List publishers
curl http://localhost:3000/api/publishers

# Publisher leaderboard
curl http://localhost:3000/api/publishers/leaderboard

# Get your publisher stats (authenticated)
curl -H "Authorization: Bearer anw_your_api_key" \
  http://localhost:3000/api/my-publisher
```

## Channels

| Channel | Description | Data Source |
|---------|-------------|-------------|
| `regulatory/sec` | SEC EDGAR filings | ✅ SEC RSS |
| `regulatory/cftc` | CFTC news & enforcement | ✅ CFTC RSS |
| `regulatory/global` | International regulators | 🔜 Coming soon |
| `institutional/banks` | Major bank announcements | ✅ Genfinity |
| `institutional/asset-managers` | Fund & ETF news | ✅ Genfinity |
| `defi/yields` | DeFi yield opportunities | ✅ DeFiLlama |
| `defi/hacks` | Exploits & security incidents | ✅ DeFiLlama + Rekt |
| `defi/protocols` | Protocol TVL changes | ✅ DeFiLlama |
| `rwa/tokenization` | Real-world asset tokenization | ✅ Genfinity |
| `networks/solana` | Solana network news | ✅ Genfinity |
| `networks/ethereum` | Ethereum network news | ✅ Genfinity |
| `networks/hedera` | Hedera/HBAR news | ✅ Genfinity |
| `networks/ripple` | Ripple/XRP news | ✅ Genfinity |
| `networks/bitcoin` | Bitcoin news | ✅ Genfinity |
| `markets/whale-movements` | Large crypto transfers | ⚠️ Mock data |
| `markets/liquidations` | Major liquidation events | 🔜 Coming soon |

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
