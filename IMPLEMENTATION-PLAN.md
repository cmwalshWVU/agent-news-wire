# Agent News Wire - Implementation Plan

**Created:** 2026-02-06  
**Goal:** Deliver maximum value in minimum time

---

## Executive Summary

The product is 83% complete but has a critical blocker: **no persistence**. Server restarts wipe all subscriptions. Until this is fixed, nothing else matters.

**Priority order:**
1. Database (unblocks everything)
2. Deploy to cloud (makes it usable)
3. Publisher system (creates content flywheel)
4. More data sources (increases value)
5. Everything else (polish)

---

## Phase 1: Foundation (Days 1-3)
### *"Make it not break"*

**Goal:** Subscriptions survive server restarts. Deployable to cloud.

| Task | Time | Why First |
|------|------|-----------|
| Add SQLite persistence | 4-6 hrs | Critical blocker. Everything breaks without this. |
| Schema: subscribers, alerts | 2 hrs | Minimal schema to unblock |
| Docker: API server | 2 hrs | Required for cloud deploy |
| Docker: Frontend | 1 hr | Simple Next.js container |
| Docker Compose (local) | 1 hr | Dev environment parity |

**Deliverable:** `docker-compose up` runs full stack with persistent data.

**Why SQLite first:**
- Zero infrastructure (single file)
- Easy migration to Postgres later
- Fast to implement
- Good enough for MVP scale

---

## Phase 2: Go Live (Days 4-6)
### *"Make it accessible"*

**Goal:** Live on the internet with CI/CD.

| Task | Time | Why Now |
|------|------|---------|
| Deploy to Railway/Render | 2-3 hrs | Fastest path to production |
| Environment variables | 1 hr | Secrets management |
| Domain + SSL | 1 hr | Professional appearance |
| GitLab CI pipeline | 2-3 hrs | Auto-deploy on push |
| Health check endpoint | 30 min | Uptime monitoring |

**Deliverable:** `https://api.agentnewswire.io` is live, auto-deploys on merge.

**Platform recommendation:** Railway
- Supports Docker
- Built-in Postgres (for Phase 5 upgrade)
- Simple CI/CD
- Generous free tier
- Easy SSL/domains

---

## Phase 3: Content Engine (Days 7-10)
### *"Make it valuable"*

**Goal:** External publishers can submit alerts. More data flowing.

| Task | Time | Why Now |
|------|------|---------|
| `POST /api/publish` endpoint | 3-4 hrs | Enables third-party content |
| Publisher registration | 2 hrs | Identity for publishers |
| Basic alert validation | 2 hrs | Spam prevention |
| Whale Alert API integration | 2-3 hrs | Real whale data |
| Helius webhooks (Solana) | 3-4 hrs | On-chain event alerts |

**Deliverable:** AI agents and external sources can publish alerts via API.

**Why publishers matter:**
- You can't scale content creation alone
- AI agents are the target customer
- Creates network effects (more publishers → more subscribers → more publishers)

---

## Phase 4: Security & Ops (Days 11-13)
### *"Make it production-ready"*

**Goal:** Ready for real users at scale.

| Task | Time | Why Now |
|------|------|---------|
| API key authentication | 3-4 hrs | Prevent abuse |
| Rate limiting | 2 hrs | Protect infrastructure |
| Request logging | 2 hrs | Debug issues |
| Error monitoring (Sentry) | 1-2 hrs | Know when things break |
| Structured logging | 2 hrs | Ops visibility |

**Deliverable:** Production-grade API with auth, rate limits, and monitoring.

---

## Phase 5: Scale Prep (Days 14-17)
### *"Make it ready to grow"*

**Goal:** Infrastructure that scales, SDK for developers.

| Task | Time | Why Now |
|------|------|---------|
| Migrate SQLite → Postgres | 3-4 hrs | Scale beyond single-node |
| Publish SDK to NPM | 2-3 hrs | Developer adoption |
| SDK documentation | 3-4 hrs | Onboarding |
| Demo agent: trading bot | 4-5 hrs | Show what's possible |
| WebSocket heartbeat/reconnect | 2-3 hrs | Reliability |

**Deliverable:** Scalable infrastructure + published SDK + working demo.

---

## Phase 6: Polish (Days 18+)
### *"Make it delightful"*

Pick based on user feedback:

| Task | Impact | Effort |
|------|--------|--------|
| Alert search/filtering | High | Medium |
| Publisher dashboard | High | Medium |
| More data sources | High | Varies |
| Alert detail modal | Medium | Low |
| Webhook delivery option | Medium | Medium |
| Full-text search | Medium | High |
| Dark/light mode | Low | Low |

---

## Quick Wins (Do Anytime)

These can be done in parallel or during downtime:

- [ ] Request logging (1 hr) — instant ops visibility
- [ ] Health check endpoint (30 min) — uptime monitoring
- [ ] Structured JSON logs (1 hr) — better debugging
- [ ] README improvements (1 hr) — onboarding

---

## What NOT to Do Yet

| Task | Why Defer |
|------|-----------|
| Anchor tests | Programs are stable, tests don't add user value now |
| Dispute mechanism | No publishers yet to dispute |
| Multi-language summaries | Premature optimization |
| Custom alert rules | Need users first to understand requirements |
| Bank newsroom scrapers | Complex, low ROI vs API sources |

---

## Success Metrics

**Phase 1-2 (Foundation):**
- [ ] Zero data loss on server restart
- [ ] Live URL accessible

**Phase 3 (Content):**
- [ ] 3+ external publishers registered
- [ ] 100+ alerts/day flowing

**Phase 4 (Production):**
- [ ] API keys issued to 10+ subscribers
- [ ] Zero unauthorized access

**Phase 5 (Scale):**
- [ ] SDK installed by 5+ developers
- [ ] Demo agent running live

---

## Estimated Timeline

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Phase 1: Foundation | 3 days | Day 3 |
| Phase 2: Go Live | 3 days | Day 6 |
| Phase 3: Content | 4 days | Day 10 |
| Phase 4: Security | 3 days | Day 13 |
| Phase 5: Scale | 4 days | Day 17 |
| Phase 6: Polish | Ongoing | — |

**MVP live with persistence + CI/CD: Day 6**  
**Full production-ready: Day 13**  
**Growth-ready with SDK: Day 17**

---

## Next Action

**Start Phase 1 now:**

```bash
cd agent-news-wire/api
npm install better-sqlite3 @types/better-sqlite3
```

Then create `src/services/database.ts` with schema for subscribers and alerts.

---

*This plan optimizes for: shipped > perfect. Iterate based on real user feedback.*
