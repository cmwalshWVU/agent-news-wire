# API Reference

**Base URL:** `http://localhost:3000` (development)  
**Last Updated:** 2026-02-03 22:50 UTC

---

## Health & Stats

### GET /api/health
Health check endpoint.

```bash
curl http://localhost:3000/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-03T22:00:00.000Z"
}
```

### GET /api/stats
System statistics including on-chain data.

```bash
curl http://localhost:3000/api/stats
```

Response:
```json
{
  "alerts": {
    "totalAlerts": 89,
    "uniqueHashes": 89,
    "byChannel": {
      "defi/yields": 70,
      "markets/whale-movements": 5,
      "networks/ripple": 3
    }
  },
  "subscriptions": {
    "totalSubscribers": 2,
    "activeSubscribers": 2,
    "onChainSubscribers": 0,
    "byChannel": {
      "defi/yields": 1,
      "regulatory/sec": 1
    }
  },
  "distribution": {
    "connectedClients": 0,
    "alertsSent": 0,
    "revenueGenerated": "0.0000"
  },
  "onChain": {
    "totalSubscribers": 0,
    "totalAlertsDelivered": 0,
    "totalRevenue": 0,
    "pricePerAlert": 0.02,
    "programs": {
      "subscription": "H18zPB6sm7THZbBBtayAyjtQnfRvwN7E72Kxnomd2TVJ",
      "alerts": "BsMVJwatabfvQMtkJxUuS5jYvmrk1j8VUVFv5sG9595t",
      "publisher": "H3DAhavhTEom9RsZkpKTYonZcfDQ7pqoH6SXrUAAsHNc"
    },
    "network": "devnet"
  },
  "uptime": 60.5,
  "timestamp": "2026-02-03T22:00:00.000Z"
}
```

---

## Channels

### GET /api/channels
List all available channels.

```bash
curl http://localhost:3000/api/channels
```

Response:
```json
{
  "channels": [
    {
      "id": "regulatory/sec",
      "name": "SEC Filings",
      "description": "SEC crypto-related filings and enforcement actions",
      "category": "regulatory"
    },
    {
      "id": "defi/yields",
      "name": "DeFi Yields",
      "description": "High-yield opportunities and yield changes",
      "category": "defi"
    }
  ]
}
```

**Available Channels:**
- `regulatory/sec` — SEC filings
- `regulatory/cftc` — CFTC news
- `regulatory/global` — International regulators
- `institutional/banks` — Bank news
- `institutional/asset-managers` — Fund/ETF news
- `defi/yields` — Yield opportunities
- `defi/hacks` — Exploits/security
- `defi/protocols` — Protocol TVL changes
- `rwa/tokenization` — Tokenization news
- `networks/solana` — Solana news
- `networks/ethereum` — Ethereum news
- `networks/canton` — Canton Network
- `networks/hedera` — Hedera/HBAR
- `networks/ripple` — Ripple/XRP
- `networks/avalanche` — Avalanche/AVAX
- `networks/bitcoin` — Bitcoin/BTC
- `markets/whale-movements` — Whale transfers
- `markets/liquidations` — Liquidation events

---

## Alerts

### GET /api/alerts
Get recent alerts. Optionally filter by channel.

```bash
# All recent alerts
curl http://localhost:3000/api/alerts

# Filter by channel
curl http://localhost:3000/api/alerts?channel=regulatory/sec

# Limit results
curl http://localhost:3000/api/alerts?limit=10
```

Response:
```json
{
  "alerts": [
    {
      "alertId": "sec-1706918400-abc123",
      "channel": "regulatory/sec",
      "priority": "high",
      "timestamp": "2026-02-03T02:00:00.000Z",
      "headline": "Coinbase 10-K Filing Reveals $1.2B Crypto Holdings",
      "summary": "Coinbase Global Inc. filed its annual 10-K report with the SEC...",
      "entities": ["Coinbase", "SEC"],
      "tickers": ["$COIN"],
      "tokens": ["BTC", "ETH"],
      "sourceUrl": "https://www.sec.gov/...",
      "sourceType": "sec-filing",
      "sentiment": "neutral",
      "impactScore": 7
    }
  ]
}
```

### GET /api/alerts/:id
Get a specific alert by ID.

```bash
curl http://localhost:3000/api/alerts/sec-1706918400-abc123
```

---

## Subscriptions

### POST /api/subscribe
Create a new subscription. If `walletAddress` is provided, will check/sync with on-chain state.

```bash
# Basic subscription (mock mode)
curl -X POST http://localhost:3000/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "channels": ["regulatory/sec", "defi/yields"]
  }'

# With Solana wallet (checks on-chain state)
curl -X POST http://localhost:3000/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "channels": ["regulatory/sec", "defi/yields"],
    "walletAddress": "8WStCK1ee4opNrR2DveDgYHqehyW1xgVdBs8eFUQCNZ2"
  }'
```

Response:
```json
{
  "success": true,
  "subscriber": {
    "id": "eb273a6d-bc5c-47c5-a517-6ad8b68e7768",
    "channels": ["regulatory/sec", "defi/yields"],
    "balance": 0,
    "createdAt": "2026-02-03T22:47:51.993Z",
    "onChain": false,
    "walletAddress": "8WStCK1ee4opNrR2DveDgYHqehyW1xgVdBs8eFUQCNZ2"
  },
  "message": "Subscription created. Connect via WebSocket to receive alerts."
}
```

**Notes:**
- `onChain: true` means subscriber exists as PDA on Solana
- `onChain: false` means mock/local subscriber only
- Wallet subscribers sync balance from on-chain automatically

### GET /api/subscription/:id
Get subscription details. For on-chain subscribers, fetches live balance from Solana.

```bash
curl http://localhost:3000/api/subscription/sub_abc123
```

Response:
```json
{
  "id": "sub_abc123",
  "channels": ["regulatory/sec", "defi/yields"],
  "balance": 5.50,
  "alertsReceived": 25,
  "active": true,
  "createdAt": "2026-02-03T02:00:00.000Z",
  "onChain": true,
  "walletAddress": "8WStCK1ee4opNrR2DveDgYHqehyW1xgVdBs8eFUQCNZ2"
}
```

### PUT /api/subscription/:id/channels
Update subscribed channels.

```bash
curl -X PUT http://localhost:3000/api/subscription/sub_abc123/channels \
  -H "Content-Type: application/json" \
  -d '{
    "channels": ["regulatory/sec", "regulatory/cftc"]
  }'
```

### DELETE /api/subscription/:id
Unsubscribe (deactivate subscription).

```bash
curl -X DELETE http://localhost:3000/api/subscription/sub_abc123
```

---

## On-Chain Subscription Management

### GET /api/subscription/pda/:wallet
Get PDA addresses and on-chain status for a wallet.

```bash
curl http://localhost:3000/api/subscription/pda/8WStCK1ee4opNrR2DveDgYHqehyW1xgVdBs8eFUQCNZ2
```

Response:
```json
{
  "walletAddress": "8WStCK1ee4opNrR2DveDgYHqehyW1xgVdBs8eFUQCNZ2",
  "subscriberPDA": "5XYukG6iAauaEyzw2uEQcb3b8gGguoKmydyDAzfXuDjL",
  "vaultPDA": "5J9nmQhwoMe5NK7TtmQPJuStoLRaZzCjan732myY7GA6",
  "existsOnChain": false,
  "subscriber": null
}
```

### POST /api/subscription/create-tx
Build an on-chain subscription transaction for client-side signing.

```bash
curl -X POST http://localhost:3000/api/subscription/create-tx \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "8WStCK1ee4opNrR2DveDgYHqehyW1xgVdBs8eFUQCNZ2",
    "channels": ["defi/yields", "regulatory/sec"]
  }'
```

Response:
```json
{
  "success": true,
  "transaction": "AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABBAAIFb4...",
  "subscriberPDA": "5XYukG6iAauaEyzw2uEQcb3b8gGguoKmydyDAzfXuDjL",
  "message": "Sign and submit this transaction to create your on-chain subscription",
  "channels": ["defi/yields", "regulatory/sec"],
  "channelBitmap": 33,
  "instructions": [
    "1. Sign this transaction with your Solana wallet",
    "2. Submit the signed transaction to Solana",
    "3. Call POST /api/subscribe with your walletAddress to sync"
  ]
}
```

**Usage Flow:**
1. Call this endpoint to get the unsigned transaction
2. Decode the base64 transaction in your frontend
3. Sign with user's wallet (Phantom, Solflare, etc.)
4. Submit the signed transaction to Solana
5. Call `POST /api/subscribe` with walletAddress to sync API state

### POST /api/subscription/deposit-tx
Build a USDC deposit transaction for client-side signing.

```bash
curl -X POST http://localhost:3000/api/subscription/deposit-tx \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "8WStCK1ee4opNrR2DveDgYHqehyW1xgVdBs8eFUQCNZ2",
    "amount": 10
  }'
```

Response:
```json
{
  "success": true,
  "transaction": "AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA...",
  "subscriberVault": "5J9nmQhwoMe5NK7TtmQPJuStoLRaZzCjan732myY7GA6",
  "amount": 10,
  "message": "Sign and submit to deposit 10 USDC",
  "instructions": [
    "1. Ensure you have USDC in your wallet",
    "2. Sign this transaction with your Solana wallet",
    "3. Submit the signed transaction to Solana",
    "4. Call GET /api/balance/:id to verify deposit"
  ]
}
```

**Note:** Subscriber must exist on-chain first. Call `create-tx` before `deposit-tx`.

---

## Payments

### POST /api/deposit
For on-chain subscribers: refreshes balance from Solana.
For mock subscribers: adds to local balance.

```bash
curl -X POST http://localhost:3000/api/deposit \
  -H "Content-Type: application/json" \
  -d '{
    "subscriberId": "sub_abc123",
    "amount": 10.00
  }'
```

Response:
```json
{
  "success": true,
  "balance": 10.00,
  "onChain": false,
  "message": "Deposited 10 USDC. New balance: 10"
}
```

**Note:** Actual USDC deposits for on-chain subscribers happen via Solana wallet interactions (SDK), not this endpoint.

### GET /api/balance/:id
Check subscription balance. For on-chain subscribers, queries live balance from Solana.

```bash
curl http://localhost:3000/api/balance/sub_abc123
```

Response:
```json
{
  "subscriberId": "sub_abc123",
  "balance": 9.82,
  "alertsReceived": 9,
  "alertsRemaining": 491,
  "pricePerAlert": 0.02,
  "onChain": true,
  "walletAddress": "8WStCK1ee4opNrR2DveDgYHqehyW1xgVdBs8eFUQCNZ2",
  "runway": "healthy"
}
```

**Runway Levels:**
- `healthy` — More than 100 alerts remaining
- `low` — 20-100 alerts remaining
- `critical` — Less than 20 alerts remaining

---

## WebSocket

### WS /api/stream
Real-time alert stream.

**Connection:**
```javascript
const ws = new WebSocket('ws://localhost:3000/api/stream?subscriberId=sub_abc123');

// Receive alerts
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  
  if (msg.type === 'alert') {
    console.log('New alert:', msg.data);
  }
  
  if (msg.type === 'balance_warning') {
    console.log('Warning:', msg.message);
  }
};
```

**Message Types (Server → Client):**
```typescript
// New alert
{ type: 'alert', data: Alert }

// Balance warning
{ type: 'balance_warning', message: string, balance: number }

// Connection confirmed
{ type: 'connected', subscriberId: string, channels: string[] }

// Error
{ type: 'error', message: string }
```

**Message Types (Client → Server):**
```typescript
// Update channels (while connected)
{ type: 'update_channels', channels: string[] }
```

---

## On-Chain Integration

### Solana Programs (Devnet)

| Program | Address |
|---------|---------|
| SubscriptionRegistry | `H18zPB6sm7THZbBBtayAyjtQnfRvwN7E72Kxnomd2TVJ` |
| AlertRegistry | `BsMVJwatabfvQMtkJxUuS5jYvmrk1j8VUVFv5sG9595t` |
| PublisherRegistry | `H3DAhavhTEom9RsZkpKTYonZcfDQ7pqoH6SXrUAAsHNc` |

### PDA Addresses

| PDA | Address |
|-----|---------|
| Subscription Config | `7pobVEtga9fSLngK3EUgtu45WuqrrnTgBsHPAc4cYRQN` |
| Alert Registry | `ErwSC32EUrF9PNcbqeT1Hdn85x2VhHVMfXUFTqyD5uWs` |
| Publisher Registry | `3H8MprBvoDiuKRCoUmYw3x9WipWu8nU9uRWffEzEEzmx` |

### PDA Derivation

```typescript
// Subscriber PDA
const [subscriberPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from('subscriber'), ownerPubkey.toBuffer()],
  SUBSCRIPTION_PROGRAM_ID
);

// Subscriber Vault PDA
const [vaultPDA] = PublicKey.findProgramAddressSync(
  [Buffer.from('subscriber_vault'), ownerPubkey.toBuffer()],
  SUBSCRIPTION_PROGRAM_ID
);
```

---

## Error Responses

All errors follow this format:
```json
{
  "error": "Error message describing what went wrong"
}
```

Common errors:
- `Subscription not found` — Invalid subscription ID
- `At least one channel is required` — Empty channels array
- `subscriberId and positive amount required` — Missing deposit params

---

## Pricing

| Action | Cost |
|--------|------|
| Receive alert (real-time) | $0.02 USDC |
| Historical alert query | $0.05 USDC |
| Subscription creation | Free |
| Channel updates | Free |

---

*API is currently in development on Solana devnet. Authentication and rate limiting will be added for production.*
