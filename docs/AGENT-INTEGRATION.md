# Agent Integration Guide

This guide explains how AI agents can programmatically subscribe to Agent News Wire and receive real-time alerts.

## Quick Start

```typescript
import { ANWClient } from '@agent-news-wire/sdk';

// 1. Create client
const client = new ANWClient({ apiUrl: 'http://localhost:3000' });

// 2. Subscribe to channels
const subscription = await client.subscribe([
  'regulatory/sec',
  'defi/yields',
  'markets/whale-movements'
]);

// 3. Connect to WebSocket for live alerts
client.onAlert((alert) => {
  console.log(`[${alert.channel}] ${alert.headline}`);
  // React to the alert...
});

await client.connect(subscription.id);
```

---

## Step-by-Step Integration

### 1. Create a Subscription

**Without Wallet (API-only, trial mode):**
```bash
curl -X POST http://localhost:3000/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "channels": ["regulatory/sec", "defi/yields", "markets/whale-movements"]
  }'
```

**Response:**
```json
{
  "success": true,
  "subscriber": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "channels": ["regulatory/sec", "defi/yields", "markets/whale-movements"],
    "balance": 0,
    "createdAt": "2026-02-06T01:00:00Z",
    "onChain": false
  },
  "message": "Subscription created. Connect via WebSocket to receive alerts."
}
```

**With Wallet (on-chain):**
```bash
curl -X POST http://localhost:3000/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "channels": ["regulatory/sec", "defi/yields"],
    "walletAddress": "YourSolanaWalletAddress"
  }'
```

### 2. Connect to WebSocket

Connect to receive real-time alerts:

```
ws://localhost:3000/api/stream?subscriberId=YOUR_SUBSCRIBER_ID
```

**JavaScript/TypeScript:**
```typescript
const ws = new WebSocket(`ws://localhost:3000/api/stream?subscriberId=${subscriberId}`);

ws.onopen = () => {
  console.log('Connected to Agent News Wire');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'connected':
      console.log('Welcome:', data.message);
      console.log('Trial mode:', data.trialMode);
      break;
      
    case 'alert':
      console.log('New alert:', data.alert);
      console.log('Charged:', data.charged, 'USDC');
      // Process the alert...
      break;
      
    case 'warning':
      if (data.code === 'LOW_BALANCE') {
        console.warn('Low balance - deposit more USDC');
      }
      break;
      
    case 'subscription_updated':
      console.log('Channels updated:', data.channels);
      break;
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Disconnected - reconnecting in 5s...');
  setTimeout(() => connectWebSocket(), 5000);
};
```

**Python:**
```python
import websocket
import json

def on_message(ws, message):
    data = json.loads(message)
    if data['type'] == 'alert':
        alert = data['alert']
        print(f"[{alert['channel']}] {alert['headline']}")
        # Process alert...

def on_open(ws):
    print("Connected to Agent News Wire")

ws = websocket.WebSocketApp(
    f"ws://localhost:3000/api/stream?subscriberId={subscriber_id}",
    on_message=on_message,
    on_open=on_open
)
ws.run_forever()
```

### 3. Process Alerts

**Alert Structure:**
```typescript
interface Alert {
  alertId: string;           // Unique identifier
  channel: string;           // e.g., "regulatory/sec"
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;         // ISO 8601
  headline: string;          // Max 200 chars
  summary: string;           // Max 1000 chars
  entities: string[];        // Companies, protocols mentioned
  tickers: string[];         // Stock tickers ($COIN, $MSTR)
  tokens: string[];          // Crypto tokens (BTC, ETH, SOL)
  sourceUrl: string;         // Original source
  sourceType: string;        // 'sec-filing', 'defi-protocol', etc.
  sentiment?: 'bullish' | 'bearish' | 'neutral';
  impactScore?: number;      // 0-10
}
```

**Example Alert Processing:**
```typescript
function processAlert(alert: Alert) {
  // Filter by priority
  if (alert.priority === 'critical') {
    sendUrgentNotification(alert);
  }
  
  // React to specific entities
  if (alert.entities.includes('BlackRock')) {
    analyzeInstitutionalMove(alert);
  }
  
  // Check for trading signals
  if (alert.channel === 'markets/whale-movements') {
    evaluateWhaleActivity(alert);
  }
  
  // Log for audit trail
  logAlert(alert);
}
```

---

## Available Channels

| Channel | Description |
|---------|-------------|
| `regulatory/sec` | SEC EDGAR filings |
| `regulatory/cftc` | CFTC news & enforcement |
| `regulatory/global` | International regulators |
| `institutional/banks` | Bank announcements |
| `institutional/asset-managers` | Fund & ETF news |
| `defi/yields` | DeFi yield opportunities |
| `defi/hacks` | Exploits & security |
| `defi/protocols` | Protocol TVL changes |
| `rwa/tokenization` | Real-world asset tokenization |
| `networks/solana` | Solana ecosystem |
| `networks/ethereum` | Ethereum ecosystem |
| `networks/canton` | Canton Network |
| `networks/hedera` | Hedera/HBAR |
| `networks/ripple` | Ripple/XRP |
| `networks/avalanche` | Avalanche |
| `networks/bitcoin` | Bitcoin |
| `markets/whale-movements` | Large transfers |
| `markets/liquidations` | Liquidation events |

---

## On-Chain Subscription (Production)

For production use with USDC payments:

### 1. Build Create Transaction
```bash
curl -X POST http://localhost:3000/api/subscription/create-tx \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "YOUR_WALLET",
    "channels": ["regulatory/sec", "defi/yields"]
  }'
```

### 2. Sign and Submit
The response contains a base64-encoded transaction. Sign it with your Solana wallet and submit to the network.

### 3. Deposit USDC
```bash
curl -X POST http://localhost:3000/api/subscription/deposit-tx \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "YOUR_WALLET",
    "amount": 10
  }'
```

### 4. Check Balance
```bash
curl http://localhost:3000/api/balance/YOUR_SUBSCRIBER_ID
```

---

## API Reference

### Subscription Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/subscribe` | Create subscription |
| GET | `/api/subscription/:id` | Get subscription details |
| PUT | `/api/subscription/:id/channels` | Update channels |
| DELETE | `/api/subscription/:id` | Unsubscribe |
| GET | `/api/balance/:id` | Check balance |
| POST | `/api/deposit` | Refresh balance (on-chain) |

### Alert Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/channels` | List all channels |
| GET | `/api/alerts` | Get recent alerts |
| GET | `/api/alerts?channel=X` | Filter by channel |
| GET | `/api/alerts/:id` | Get specific alert |

### On-Chain Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/subscription/pda/:wallet` | Get PDA info |
| POST | `/api/subscription/create-tx` | Build create tx |
| POST | `/api/subscription/deposit-tx` | Build deposit tx |

### WebSocket

| Endpoint | Description |
|----------|-------------|
| `ws://HOST/api/stream?subscriberId=X` | Real-time alert stream |

---

## Example: Trading Agent

```typescript
import { ANWClient } from '@agent-news-wire/sdk';

const client = new ANWClient({ apiUrl: 'http://localhost:3000' });

// Subscribe to whale movements and DeFi yields
const sub = await client.subscribe([
  'markets/whale-movements',
  'defi/yields'
]);

client.onAlert(async (alert) => {
  if (alert.channel === 'markets/whale-movements') {
    // Large transfer detected
    const { tokens, sentiment, impactScore } = alert;
    
    if (impactScore > 8 && sentiment === 'bearish') {
      // Whale dumping - consider reducing exposure
      await reducePosition(tokens[0]);
    }
  }
  
  if (alert.channel === 'defi/yields') {
    // New yield opportunity
    if (alert.headline.includes('APY') && alert.impactScore > 7) {
      await evaluateYieldOpportunity(alert);
    }
  }
});

await client.connect(sub.id);
console.log('Trading agent listening for alerts...');
```

---

## Example: Research Agent

```typescript
import { ANWClient } from '@agent-news-wire/sdk';

const client = new ANWClient({ apiUrl: 'http://localhost:3000' });

// Subscribe to regulatory and institutional news
const sub = await client.subscribe([
  'regulatory/sec',
  'regulatory/cftc',
  'institutional/banks',
  'institutional/asset-managers'
]);

client.onAlert(async (alert) => {
  // Summarize and store for research
  const summary = await generateSummary(alert);
  await storeInKnowledgeBase({
    ...alert,
    aiSummary: summary,
    processedAt: new Date()
  });
  
  // Check for significant filings
  if (alert.sourceType === 'sec-filing' && alert.priority === 'high') {
    await notifyResearchTeam(alert);
  }
});

await client.connect(sub.id);
```

---

## Pricing

**Trial Mode (Current):** All features FREE

**Production Pricing:**
| Action | Price |
|--------|-------|
| Real-time alert | $0.02 USDC |
| Historical query | $0.05 USDC |

---

## Support

- **Docs:** https://docs.agentnewswire.xyz
- **Discord:** https://discord.gg/agentnewswire
- **GitHub:** https://github.com/genfinity/agent-news-wire
