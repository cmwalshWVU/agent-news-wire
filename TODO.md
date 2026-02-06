# Agent News Wire - TODO List

**Created:** 2026-02-03  
**Last Updated:** 2026-02-06 04:30 UTC

---

## ✅ Completed

### Infrastructure
- [x] API server with REST + WebSocket
- [x] SEC EDGAR data source
- [x] DeFiLlama data source
- [x] Whale Alert data source (mock)
- [x] Genfinity data source
- [x] 17 channels configured
- [x] TypeScript SDK with types
- [x] Demo subscriber agent

### Solana Programs
- [x] SubscriptionRegistry program
- [x] AlertRegistry program
- [x] PublisherRegistry program
- [x] Deploy all programs to devnet
- [x] Initialize all programs with config

### API Integration
- [x] Wire API stats to on-chain
- [x] Wire subscription queries to on-chain
- [x] Wire subscription CREATION to on-chain (create-tx)
- [x] Wire USDC deposits to on-chain (deposit-tx)
- [x] PDA lookup endpoint
- [x] Trial mode configuration

### Web Frontend (NEW!)
- [x] Next.js 14 project setup
- [x] Tailwind CSS configuration
- [x] Wallet adapter integration
- [x] Landing page (/)
- [x] Dashboard page (/dashboard)
- [x] Alerts page (/alerts) with WebSocket
- [x] Subscribe page (/subscribe) with wallet flow
- [x] Balance page (/balance) with deposit flow
- [x] Alert card component
- [x] Header with navigation
- [x] Production build successful
- [x] Dashboard: Connect wallet CTA for non-connected users ✅ 2026-02-06
- [x] Dashboard: Channel bitmap decoder utility ✅ 2026-02-06
- [x] Dashboard: Display subscribed channels with badges ✅ 2026-02-06
- [x] Dashboard: Clear state on wallet disconnect ✅ 2026-02-06
- [x] Dashboard: Three distinct states (disconnected/connected/subscribed) ✅ 2026-02-06

---

## 🟡 In Progress

### End-to-End Testing
- [x] Create subscriber on-chain ✅
- [x] Fix: Subscriber vault now created with subscriber ✅ (2026-02-05)
- [ ] Deposit USDC using deposit-tx (needs devnet USDC)
- [ ] Connect WebSocket, receive alerts
- [ ] Verify balance deductions on-chain

---

## 🔴 High Priority (This Week)

### Database & Persistence (CRITICAL)
- [ ] Add PostgreSQL/SQLite for subscription persistence
  - Currently in-memory only — server restart loses all subscriptions
  - Subscribers have stale IDs in localStorage that fail on reconnect
  - Need to persist: subscribers, alerts, publishers, balances
- [ ] Schema design for subscriptions, alerts, publishers
- [ ] Migration strategy for existing in-memory data

### Cloud Deployment & CI/CD
- [ ] Dockerize API server
- [ ] Dockerize frontend (Next.js)
- [ ] Set up CI/CD pipeline (GitHub Actions or GitLab CI)
  - Build, test, deploy on push to main
  - Environment: staging → production
- [ ] Deploy to cloud provider (Railway / Render / Fly.io / AWS)
- [ ] Set up environment variables and secrets management
- [ ] Configure domain and SSL

### Data Sources
- [x] Add CFTC RSS feed (`regulatory/cftc` channel) ✅ 2026-02-05
- [x] Add Rekt News / DeFiLlama Hacks (`defi/hacks` channel) ✅ 2026-02-05
- [ ] Integrate real Whale Alert API (get API key)
- [ ] Add Helius webhooks for Solana on-chain events

### API Enhancements
- [ ] Implement API key authentication
- [ ] Add rate limiting
- [ ] Add request logging

### Publisher System
- [ ] Create `POST /api/publish` endpoint
- [ ] Publisher registration flow
- [ ] Alert validation/moderation logic
- [ ] Revenue tracking per publisher

---

## 🟢 Medium Priority (Next 2 Weeks)

### Smart Contracts
- [ ] Add dispute mechanism to AlertRegistry
- [ ] Write Anchor tests for all programs
- [ ] Audit critical paths (deposits, withdrawals)

### SDK Improvements
- [ ] Publish to NPM as `@agent-news-wire/sdk`
- [ ] Add Solana wallet integration helpers
- [ ] Add on-chain subscription methods
- [ ] Write SDK documentation

### Demo Agents
- [ ] Trading bot example (react to whale movements)
- [ ] Research agent example (summarize regulatory filings)
- [ ] Content agent example (generate news summaries)

### Frontend Enhancements
- [ ] Alert search/filtering
- [ ] Date range selection
- [ ] Alert detail modal
- [ ] Publisher dashboard
- [ ] Settings page
- [ ] Dark/light mode toggle

### Additional Data Sources
- [ ] Federal Register API
- [ ] Bank newsroom scrapers (JPMorgan, BlackRock, Fidelity)
- [ ] Protocol Discord monitoring
- [ ] Twitter/X API integration
- [ ] Global regulators (EU MiCA, UK FCA, Singapore MAS)

---

## 🔵 Lower Priority (Backlog)

### Infrastructure
- [ ] Monitoring/alerting (Datadog, Sentry, etc.)
- [ ] Health check dashboard
- [ ] Log aggregation (structured JSON logs)

### API Features
- [ ] Full-text search for alerts
- [ ] Date range filtering
- [ ] Webhook delivery option (alternative to WebSocket)
- [ ] Alert tagging/keywords
- [ ] Related alerts linking

### WebSocket Enhancements
- [ ] Heartbeat/ping-pong keepalive
- [ ] Message acknowledgment
- [ ] Reconnection handling improvements

### Documentation
- [ ] Architecture deep-dive doc
- [ ] Publisher onboarding guide
- [ ] Integration tutorials
- [ ] Video walkthrough

### Advanced Features
- [ ] Multi-language alert summaries
- [ ] Sentiment analysis improvements
- [ ] Custom alert rules per subscriber
- [ ] Alert priority customization
- [ ] Batch historical queries

---

## 📋 Quick Reference

### Program Addresses (Devnet)
```
SubscriptionRegistry: H18zPB6sm7THZbBBtayAyjtQnfRvwN7E72Kxnomd2TVJ
AlertRegistry:        BsMVJwatabfvQMtkJxUuS5jYvmrk1j8VUVFv5sG9595t
PublisherRegistry:    H3DAhavhTEom9RsZkpKTYonZcfDQ7pqoH6SXrUAAsHNc
```

### Key Files to Edit
```
api/src/services/subscription-store.ts  → Subscription logic
api/src/config/trial.ts                 → Trial mode settings
api/src/ingestion/                      → Add new data sources
programs/*/src/lib.rs                   → Smart contract changes
sdk/src/client.ts                       → SDK enhancements
frontend/src/app/                       → Frontend pages
frontend/src/components/                → UI components
frontend/src/lib/api.ts                 → API client
```

### Run Commands
```bash
# API Server
cd api && npm run dev

# Frontend (use different port if API on 3000)
cd frontend && PORT=3001 npm run dev

# SDK Build
cd sdk && npm run build

# Programs (use v1.52 for edition2024)
cargo-build-sbf --tools-version v1.52 --manifest-path <program>/Cargo.toml
```

---

## 📊 Progress Summary

| Category | Done | Total | % |
|----------|------|-------|---|
| Frontend | 14 | 14 | 100% |
| API | 15 | 17 | 88% |
| Data Sources | 6 | 10 | 60% |
| Smart Contracts | 22 | 23 | 96% |
| Publisher | 0 | 5 | 0% |
| SDK | 9 | 10 | 90% |
| Documentation | 6 | 8 | 75% |
| **Overall** | **72** | **87** | **83%** |

---

*Check off items as completed. Update "Last Updated" date when modifying.*
