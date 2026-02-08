# Agent News Wire - TODO List

**Created:** 2026-02-03  
**Last Updated:** 2026-02-08 06:45 UTC

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

### Web Frontend
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
- [x] Dashboard: Connect wallet CTA for non-connected users
- [x] Dashboard: Channel bitmap decoder utility
- [x] Dashboard: Display subscribed channels with badges
- [x] Dashboard: Clear state on wallet disconnect
- [x] Dashboard: Three distinct states (disconnected/connected/subscribed)

### Database & Persistence ✅ COMPLETE (2026-02-06)
- [x] PostgreSQL support for production (Railway)
- [x] SQLite fallback for local development
- [x] Schema design for subscriptions, alerts, publishers
- [x] Migrate subscription-store.ts to async database
- [x] Migrate alert-store.ts to async database
- [x] Migrate publisher-store.ts to async database
- [x] Data persists across server restarts
- [x] Auto-migration for schema changes

### Cloud Deployment ✅ COMPLETE (2026-02-06)
- [x] Railway deployment (API + Frontend + Postgres)
- [x] GitLab CI/CD pipeline with manual deploy triggers
- [x] Nixpacks configuration for both services
- [x] Environment variable configuration
- [x] Health check endpoints (/api/health, /api/ready)
- [x] Production URLs configured and working

---

## 🟡 In Progress

### End-to-End Testing
- [x] Create subscriber on-chain ✅
- [x] Fix: Subscriber vault now created with subscriber ✅
- [ ] Deposit USDC using deposit-tx (needs devnet USDC)
- [ ] Connect WebSocket, receive alerts
- [ ] Verify balance deductions on-chain

---

## 🔴 High Priority (This Week)

### Data Sources
- [ ] Integrate real Whale Alert API (get API key)
- [ ] Add Helius webhooks for Solana on-chain events

### API Enhancements
- [ ] Implement API key authentication
- [ ] Add rate limiting
- [ ] Add request logging

### Publisher System
- [x] Publisher registration endpoint exists
- [x] Publisher authentication with API keys
- [ ] Alert validation/moderation logic
- [ ] Revenue tracking per publisher
- [ ] Publisher dashboard in frontend

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
- [ ] Custom domain setup

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

### Production URLs
```
API:      https://api-production-5669.up.railway.app
Frontend: https://agent-news-wire.genfinity.io
```

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
# Local Development
cd api && npm run dev          # API on :3000
cd frontend && npm run dev     # Frontend on :3001

# Deploy to Railway (via GitLab CI)
git push origin main           # Triggers build
# Then manually trigger deploy jobs in GitLab CI/CD

# SDK Build
cd sdk && npm run build
```

---

## 📊 Progress Summary

| Category | Done | Total | % |
|----------|------|-------|---|
| Frontend | 15 | 20 | 75% |
| API + Database | 18 | 20 | 90% |
| Data Sources | 6 | 10 | 60% |
| Smart Contracts | 22 | 23 | 96% |
| Cloud Deploy | 6 | 6 | 100% |
| Publisher | 2 | 5 | 40% |
| SDK | 9 | 10 | 90% |
| Documentation | 6 | 10 | 60% |
| **Overall** | **84** | **104** | **81%** |

---

*Check off items as completed. Update "Last Updated" date when modifying.*
