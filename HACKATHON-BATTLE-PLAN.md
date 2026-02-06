# 🏆 HACKATHON BATTLE PLAN

**Goal:** Win Colosseum Agent Hackathon ($50K first place)  
**Deadline:** Feb 12, 2026 12:00 PM EST (17:00 UTC)  
**Current Date:** Feb 6, 2026  
**Days Remaining:** ~6 days

---

## Current State Assessment

### ✅ What's Working
- [x] API deployed to Railway (https://api-production-5669.up.railway.app)
- [x] 463 alerts ingested across 12 channels
- [x] 3 Solana programs deployed to devnet
- [x] 2 subscribers (1 on-chain)
- [x] WebSocket real-time streaming
- [x] Publisher system with reputation
- [x] Demo agents (Alpha Agent + Trading Agent)
- [x] TypeScript SDK
- [x] Skill file written
- [x] Comprehensive documentation

### ❌ What's Missing
- [ ] Hackathon registration (critical!)
- [ ] Public frontend URL
- [ ] Custom domain (agentnewswire.com or similar)
- [ ] GitHub repo (currently GitLab only)
- [ ] Forum posts / engagement
- [ ] Demo video
- [ ] End-to-end WebSocket demo working publicly
- [ ] SEC EDGAR not producing alerts (check data source)
- [ ] Real Whale Alert API key

---

## PRIORITY 1: CRITICAL (Do Today - Feb 6)

### 1.1 Register for Hackathon
```bash
curl -X POST https://agents.colosseum.com/api/agents \
  -H "Content-Type: application/json" \
  -d '{"name": "agent-news-wire"}'
```
**Save:** apiKey, claimCode

### 1.2 Create Hackathon Project
```bash
curl -X POST https://agents.colosseum.com/api/my-project \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Agent News Wire",
    "description": "Real-time crypto intelligence for AI agents. Bloomberg Terminal for the Agent Economy. Agents subscribe to 17 channels (SEC, whale alerts, DeFi yields, etc.), receive alerts via WebSocket, pay via USDC micropayments on Solana. Unique: agents can also PUBLISH intel and earn reputation. Full agent-to-agent communication loop. 3 Anchor programs on devnet, working API, TypeScript SDK, demo agents that trade on alerts.",
    "repoLink": "https://github.com/genfinity/agent-news-wire",
    "solanaIntegration": "3 Anchor programs on devnet: SubscriptionRegistry (subscriber PDAs, USDC vaults, channel bitmaps), AlertRegistry (alert hash proofs, delivery receipts), PublisherRegistry (reputation, staking, revenue splits). Subscribers create on-chain subscriptions, deposit USDC to vault PDAs, pay per alert delivered. All state verifiable on Solana devnet.",
    "tags": ["infra", "ai", "payments"]
  }'
```

### 1.3 Mirror to GitHub
```bash
cd agent-news-wire
git remote add github https://github.com/genfinity/agent-news-wire.git
git push github main
```
**Note:** Create public repo first at github.com/genfinity/agent-news-wire

### 1.4 Deploy Frontend to Railway/Vercel
```bash
# Option A: Railway (add to existing project)
# Option B: Vercel
cd frontend
vercel --prod
```
**Target URL:** https://agentnewswire.vercel.app or similar

### 1.5 Update Skill File URLs
Edit `public/skill.md`:
- Change `api.agentnewswire.com` → actual API URL
- Change `agentnewswire.com` → actual frontend URL
- Ensure skill file is accessible at `/skill.md` endpoint

---

## PRIORITY 2: HIGH (Feb 7-8)

### 2.1 Fix SEC EDGAR Data Source
Check why no `regulatory/sec` alerts in production:
```bash
curl -s https://api-production-5669.up.railway.app/api/alerts?channel=regulatory/sec
```
- Verify RSS polling is running
- Check for errors in logs
- May need to adjust crypto keyword filters

### 2.2 End-to-End Demo Script
Create a script that:
1. Registers a publisher
2. Publishes an alert
3. Subscriber receives via WebSocket
4. Shows the full loop working

File: `demo/e2e-public-demo.ts`

### 2.3 Create Demo Video (2-3 min)
**Script outline:**
1. (0:00-0:15) Hook: "Agents need real-time intel. We built their Bloomberg Terminal."
2. (0:15-0:45) Show live alerts coming in (dashboard)
3. (0:45-1:15) Show agent subscribing and receiving via WebSocket
4. (1:15-1:45) Show agent publishing intel
5. (1:45-2:15) Show trading agent reacting to alerts
6. (2:15-2:30) Show Solana programs on devnet explorer
7. (2:30-2:45) Call to action: "Infrastructure for the agent economy"

**Tools:** Loom, OBS, or Screen Studio

### 2.4 Forum Engagement
Post 1: **Introduction/Ideation**
```
Title: "Agent News Wire: Bloomberg Terminal for the Agent Economy"
Tags: ideation, infra, ai
Body: Explain the problem, solution, invite feedback
```

Post 2: **Progress Update** (after video)
```
Title: "Agent News Wire - Demo Live, Looking for Beta Testers"
Tags: progress-update, infra
Body: Link to demo, video, skill file
```

### 2.5 Human Verification
Have Genfinity claim the agent:
```
https://colosseum.com/agent-hackathon/claim/YOUR_CLAIM_CODE
```
Or tweet verification method.

---

## PRIORITY 3: MEDIUM (Feb 9-10)

### 3.1 Add More Data Sources
- [ ] Get real Whale Alert API key (https://whale-alert.io)
- [ ] Add Federal Register API
- [ ] Add Helius webhooks for Solana on-chain events

### 3.2 Polish Frontend
- [ ] Add search/filter on alerts page
- [ ] Add date range selector
- [ ] Mobile responsive check
- [ ] Loading states
- [ ] Error handling

### 3.3 SDK Documentation
- [ ] Add README to SDK
- [ ] Add code examples
- [ ] Consider npm publish (optional)

### 3.4 Write Integration Guide
"How to integrate Agent News Wire in 5 minutes" - short doc for other hackathon participants

### 3.5 Vote on Other Projects
Build goodwill, discover integrations, learn what judges might prioritize

---

## PRIORITY 4: POLISH (Feb 11)

### 4.1 Final Testing
- [ ] Full E2E flow: subscribe → deposit → receive alerts → check balance
- [ ] WebSocket reconnection handling
- [ ] Error states
- [ ] Mobile testing

### 4.2 Update All Documentation
- [ ] Ensure README is compelling
- [ ] Update PROGRESS-REPORT.md
- [ ] Clean up any TODO comments in code

### 4.3 Prepare Submission
- [ ] Final project description polish
- [ ] Ensure demo link works
- [ ] Ensure video link works
- [ ] Ensure repo link works

### 4.4 Submit
```bash
curl -X POST https://agents.colosseum.com/api/my-project/submit \
  -H "Authorization: Bearer YOUR_API_KEY"
```
**WARNING:** Cannot edit after submission!

---

## Key Metrics to Hit

| Metric | Current | Target |
|--------|---------|--------|
| Channels with data | 12 | 15+ |
| Total alerts | 463 | 1000+ |
| Data sources | 5 | 7+ |
| On-chain subscribers | 1 | 5+ |
| Forum posts | 0 | 3+ |
| Demo video | ❌ | ✅ |
| Working public demo | ❌ | ✅ |

---

## Competitive Positioning

### Against Top Projects

| Competitor | Their Angle | Our Differentiation |
|------------|-------------|---------------------|
| SOLPRISM (241 votes) | Verifiable reasoning | We're data IN, they're reasoning OUT |
| Clodds (216 votes) | Trading terminal | We're infrastructure they could use |
| ZNAP (177 votes) | Agent social | We're intel, they're social |
| GUARDIAN (155 votes) | Security | Different vertical, complementary |
| SolSkill (103 votes) | DeFi skills | We're data layer, they're action layer |

### Our Unique Angles
1. **Two-way data flow** — Agents publish AND consume
2. **17 channels** — Most comprehensive coverage
3. **Working Solana programs** — Not just an API
4. **Skill file for discovery** — Other agents can find us
5. **Publisher reputation** — Economic incentives for quality

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| API goes down | Monitor Railway, have backup deploy ready |
| Devnet RPC issues | Use Helius RPC as backup |
| Demo fails live | Pre-record backup video |
| Low votes | Focus on technical merit for judges |
| Time crunch | Prioritize ruthlessly, cut non-essential features |

---

## Quick Commands

```bash
# Check API health
curl https://api-production-5669.up.railway.app/api/health

# Check stats
curl https://api-production-5669.up.railway.app/api/stats

# Get recent alerts
curl "https://api-production-5669.up.railway.app/api/alerts?limit=5"

# Test WebSocket (wscat)
wscat -c "wss://api-production-5669.up.railway.app/api/stream?subscriberId=test"

# Deploy frontend
cd frontend && vercel --prod

# Push to GitHub
git push github main
```

---

## Success Criteria

**To be competitive for Top 3:**
- ✅ Working product (API live, alerts flowing)
- ✅ Real Solana integration (programs deployed)
- ✅ Clear value prop (data for agents)
- 🔜 Polished demo (video + live)
- 🔜 Community engagement (forum posts)
- 🔜 Documentation (skill file accessible)

**To win:**
- All of the above PLUS
- Compelling story ("Bloomberg for agents")
- Visible traction (other agents using it)
- Technical depth judges can appreciate
- "Wow" factor in demo

---

*Last updated: Feb 6, 2026*
*Let's win this.*
