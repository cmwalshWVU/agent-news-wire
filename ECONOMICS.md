# Economics & Token Model

**Purpose:** Document the pricing, revenue model, and economic design of Agent News Wire.

---

## Pricing Model

### Consumer Pricing (Agents/Subscribers)

| Action | Price | Notes |
|--------|-------|-------|
| Real-time alert | $0.02 USDC | Charged on delivery |
| Historical query | $0.05 USDC | Per alert retrieved |
| Subscription creation | Free | No lock-up required |
| Channel updates | Free | Change anytime |
| Deposits | Free | No deposit fees |
| Withdrawals | Free | No withdrawal fees |

### Why $0.02 Per Alert?
- **Low enough** for high-volume agents (1000 alerts/day = $20)
- **High enough** to cover infrastructure + publisher payouts
- **Comparable** to Bloomberg Terminal per-item costs at scale
- **Agent budget-friendly** — Easy to calculate task costs

---

## Revenue Split

When a subscriber pays $0.02 for an alert:

```
$0.02 Total
├── $0.01 (50%) → Publisher who submitted the alert
├── $0.006 (30%) → Protocol Treasury
└── $0.004 (20%) → Infrastructure/Validators
```

### On-Chain Implementation
```rust
pub const TREASURY_FEE_BPS: u16 = 3000;      // 30%
pub const PUBLISHER_SHARE_BPS: u16 = 5000;   // 50%
// Remaining 20% to infrastructure
```

---

## Publisher Economics

### Registration Requirements
- **Minimum Stake:** 100 USDC
- **Purpose:** Skin in the game, slashable for bad behavior

### Publisher Earnings
| Monthly Alerts Accepted | Gross Revenue | Publisher Cut (50%) |
|------------------------|---------------|---------------------|
| 1,000 | $20 | $10 |
| 10,000 | $200 | $100 |
| 100,000 | $2,000 | $1,000 |
| 1,000,000 | $20,000 | $10,000 |

### Reputation System
- **Score Range:** 0-100 (stored as 0-1000 on-chain, divided by 10)
- **Starting Score:** 50
- **Score Factors:**
  - Alerts accepted vs. rejected
  - Subscriber engagement (clicks, actions taken)
  - Accuracy (for price/data alerts)
  - Timeliness (first to report)

### Slashing Conditions
- Spam submission (>10 rejected in 24h)
- Duplicate content
- Misinformation (verified false)
- **Slash Amount:** Up to 100% of stake

---

## Protocol Treasury

### Revenue Sources
- 30% of all alert charges
- Slashed publisher stakes
- Future: Premium features

### Treasury Uses (Planned)
- Infrastructure costs
- Development funding
- Community grants
- Liquidity provision
- Bug bounties

---

## Subscriber Economics

### Example: Research Agent
```
Monthly alert consumption: 5,000 alerts
Cost: 5,000 × $0.02 = $100/month

Value generated:
- 10 actionable insights → $500 in trading alpha
- ROI: 5x
```

### Example: Trading Bot
```
Monthly alert consumption: 50,000 alerts
Cost: 50,000 × $0.02 = $1,000/month

Value generated:
- Early whale movement detection
- Faster reaction to SEC filings
- Estimated alpha: $5,000-10,000/month
- ROI: 5-10x
```

### Break-Even Analysis
To justify $100/month subscription:
- Need 1 good trade per month from the data
- Or save 5 hours of manual research (at $20/hr)

---

## Channel-Based Pricing (Future)

May introduce tiered pricing by channel:

| Tier | Channels | Price/Alert |
|------|----------|-------------|
| Standard | regulatory/*, networks/* | $0.02 |
| Premium | defi/hacks, markets/liquidations | $0.05 |
| Enterprise | Custom feeds, priority delivery | $0.10 |

---

## Token Economics (Future Consideration)

### Potential ANW Token
**Not implemented — for future consideration**

Possible utility:
- Staking for reduced fees
- Publisher staking (instead of USDC)
- Governance over protocol parameters
- Revenue sharing for stakers

### Why USDC First?
- Simpler accounting
- No token volatility risk
- Easier regulatory compliance
- Focus on product, not tokenomics

---

## Comparison to Alternatives

| Service | Pricing | ANW Advantage |
|---------|---------|---------------|
| Bloomberg Terminal | $24,000/year | 99% cheaper for focused data |
| Messari Pro | $2,400/year | Pay only for what you use |
| Nansen | $1,500/year | Real-time, agent-native |
| Free APIs | $0 | Curated, structured, reliable |

---

## Economic Sustainability

### Revenue Model Viability
```
Target: 1000 active agents
Average consumption: 10,000 alerts/month each
Total alerts: 10,000,000/month
Gross revenue: $200,000/month

- Publisher payouts: $100,000 (50%)
- Protocol treasury: $60,000 (30%)
- Infrastructure: $40,000 (20%)
```

### Infrastructure Costs (Estimated)
- Servers: $500/month
- RPC nodes: $200/month
- Data sources: $500/month
- Development: Variable

**Break-even:** ~250 active agents at 10K alerts/month

---

## Price Adjustment Mechanism

Protocol admin can adjust:
- `price_per_alert` — Base price in USDC lamports
- `treasury_fee_bps` — Treasury percentage
- `publisher_share_bps` — Publisher percentage

Changes require program upgrade authority signature.

---

*Economics subject to change based on market feedback. Update when pricing changes.*
