# ChatRealty — Business & Technical Architecture

**Date:** April 22, 2026
**Domain:** chatrealty.io
**Status:** Vision — foundational pieces in progress

---

## Executive Summary

ChatRealty is a white-label real estate marketing platform that transforms a single Next.js application into a network of interconnected agent websites. Each agent gets their own domain, landing page, CRM, and AI-powered marketing tools — all running on one codebase. The platform earns revenue through ad spend commissions, real estate referral fees, and domain markup.

---

## Platform Architecture

### Hub-and-Spoke Multi-Domain Network

```
                        agent1domain.com
                             ↕
    customdomain.com ↔  chatrealty.io  ↔ agent2.jpsrealtor.com
                             ↕
                      josephsardella.com
                             ↕
                        jpsrealtor.com
```

- **Hub:** `chatrealty.io` — the platform brand, agent directory, consumer entry point
- **Spokes:** Individual agent domains — custom domains or subdomains of jpsrealtor.com
- **Founding domain:** `jpsrealtor.com` — Joseph Sardella's primary site and the original codebase
- **Alias:** `josephsardella.com` — personal brand domain pointing to the same app

All domains run on a single Next.js 16 application deployed on Vercel. Middleware resolves the incoming hostname to an agent profile and rewrites the request to serve that agent's personalized content.

### Middleware Routing

```
Incoming Request
  → Middleware reads hostname
    → chatrealty.io       → /chat-landing (platform home)
    → josephsardella.com  → /agent/[agentId] (Joseph's profile)
    → agent.jpsrealtor.com → lookup agent by subdomain → /agent/[agentId]
    → customdomain.com    → lookup agent by domain → /agent/[agentId]
    → jpsrealtor.com      → default home page (Insights)
```

### What Each Agent Gets

| Feature | Description |
|---------|-------------|
| Custom domain | Purchased through the platform (Vercel API) or BYO domain |
| Landing page | Personalized hero, bio, testimonials, stats, service areas |
| Property search | Full MLS search with the agent's branding |
| AI chat | Branded AI assistant with agent's voice and knowledge |
| Neighborhood pages | Local content for the agent's service areas |
| Blog/Insights | Agent-authored articles syndicated to their GBP |
| CRM | Contact management, lead scoring, import tools |
| Campaign tools | Multi-channel marketing (ads, mail, voicemail, email, SMS) |
| Analytics | GSC, GA4, ad performance, lead attribution |
| GBP integration | Auto-post articles, reply to reviews, update business info |

---

## Revenue Model

### Revenue Stream 1: Ad Spend Commission

Subscription tiers are managed marketing packages with tiered ad budgets. The platform executes all campaigns on behalf of the agent.

| Channel | Provider | Agent Pays | Platform Earns |
|---------|----------|-----------|----------------|
| Google Search Ads | Google Ads API v18 | Daily budget (agent sets) | % commission on spend |
| Meta Retargeting | Meta Marketing API v21 | Daily budget (agent sets) | % commission on spend |
| Direct Mail | Thanks.io | Per-piece ($0.65–$1.66) | Markup on piece cost |
| Ringless Voicemail | Drop Cowboy | Per-delivery | Markup on delivery cost |
| SMS Campaigns | Twilio | Per-message | Markup on message cost |
| Email Marketing | Resend / SendFox | Included in tier | Bundled |

**Growth mechanic:** More results → agent increases budget → more revenue. The platform's job is to prove ROI so agents keep scaling spend.

### Revenue Stream 2: Real Estate Referral Fee

Leads generated through the platform's campaigns close real estate deals. The platform takes a referral fee on closed transactions.

- Standard referral: 25–35% of the agent's commission
- Platform tracks lead attribution: which campaign, channel, and ad generated each lead
- CRM tracks lead → showing → offer → close pipeline
- Transparent reporting so agents see the value

### Revenue Stream 3: Domain Markup

Agents purchase custom domains directly through the platform. Vercel handles registration, DNS, SSL, and renewal. The platform marks up the cost.

- Domain registration: ~$10–15/year (Vercel cost) → marked up as part of subscription
- Agent never touches Vercel, DNS, or any technical configuration
- Domain auto-connected to project, middleware starts routing immediately

---

## Domain Provisioning Flow

### Automated via Vercel Domains API

```
Agent Dashboard → "Get Your Domain"
  │
  ├─ Step 1: Search
  │   GET /v4/domains/status?name={domain}
  │   → Available / Taken
  │
  ├─ Step 2: Price
  │   GET /v4/domains/price?name={domain}
  │   → $12/year (show with markup)
  │
  ├─ Step 3: Purchase
  │   Agent pays via Stripe (domain cost + markup)
  │   POST /v5/domains/buy → Vercel purchases domain
  │
  ├─ Step 4: Connect
  │   POST /v10/projects/{projectId}/domains
  │   → Domain added to jpsrealtor project
  │   → SSL auto-provisioned by Vercel
  │
  ├─ Step 5: Configure
  │   Save domain to agent's User.agentProfile.customDomain
  │   Middleware starts routing hostname → agent profile
  │
  └─ Step 6: SEO Setup
      → Auto-verify in Google Search Console
      → Auto-create GBP post with new domain
      → Dynamic cross-links start flowing
```

### BYO Domain (Agent Brings Their Own)

Agents can also connect an existing domain by updating their DNS:
1. Add CNAME record pointing to `cname.vercel-dns.com`
2. Platform verifies DNS propagation
3. Same steps 4–6 as above

---

## SEO: Cross-Linking Authority Network

### Strategy

Each domain in the network ranks independently in Google. Authority flows between domains through contextual, relevant cross-links. This is NOT a PBN — each site serves a real business purpose with unique content.

### Link Types

| Link Source | Link Target | Context |
|------------|-------------|---------|
| Agent site footer | chatrealty.io | "Powered by ChatRealty" |
| chatrealty.io agent directory | Agent's domain | Agent listing with bio and link |
| Agent blog posts | Other agents' relevant content | "More from our network" |
| Neighborhood pages | Local agent's domain | "Your local expert: [Name]" |
| Listing pages | Listing agent's domain | "Listed by [Name]" |
| JSON-LD structured data | All related domains | `sameAs` arrays |

### Dynamic NetworkLinks Component

A shared component queries the agent database and renders contextually relevant cross-links based on:
- Current page context (city, neighborhood, property type)
- Current domain (excludes self-links)
- Agent service areas (only links to relevant agents)
- Content relevance (matches topics across agent blogs)

### Per-Domain SEO Infrastructure

Each domain requires its own:
- Google Search Console property (`sc-domain:agent-domain.com`)
- Sitemap (`/sitemap.xml` dynamically generated per domain)
- robots.txt (if needed, domain-specific rules)
- Google Analytics tracking (shared GA4 with cross-domain or per-agent measurement ID)
- Google Business Profile (agent's own GBP linked to their domain)

### Google Compliance Rules

1. Each domain has unique, valuable content — not duplicated across domains
2. Links are contextually relevant — not spammy footer link farms
3. Each site serves a genuine business purpose
4. Content is authored by or for the specific agent
5. Cross-links provide real user value (finding local experts, related content)

---

## Technical Foundation (Already Built)

| Component | Status | Details |
|-----------|--------|---------|
| Multi-tenant User model | Done | `agentProfile.customDomain`, `agentProfile.subdomain`, branding, service areas |
| Auth multi-domain support | Done | Cookie domain set to `undefined` (auto-scopes to hostname) |
| CORS multi-domain | Done | All 3 domains + www variants allowed |
| Google OAuth redirect URIs | Done | Added for jpsrealtor.com, josephsardella.com, chatrealty.io |
| GBP API integration | Done | localPosts v4, auto-post articles with title in first line |
| Campaign system | Done | 3 channels: voicemail, direct mail, community ads (Google + Meta) |
| CRM | Done | Contacts, tags, campaigns, lead scoring |
| AI chat | Done | Claude + Groq, tool-augmented, 5 concurrent conversations |
| MLS data pipeline | Done | 76k+ listings, 8 MLSs, daily sync |
| CMA system | Done | 1,424 subdivisions, nightly cron |
| CMS + blog | Done | AI article generation, MDX publishing, GBP syndication |
| Privacy Policy + TOS | Done | Comprehensive, covers all integrations |
| Footer with legal links | Done | Privacy Policy + Terms of Service on every page |

## Technical Foundation (To Build)

| Component | Priority | Details |
|-----------|----------|---------|
| Middleware hostname routing | High | Resolve domain → agent → rewrite to their content |
| chatrealty.io landing page | High | Platform brand page, separate from jpsrealtor home |
| Agent onboarding wizard | High | Apply → verify identity → choose domain → configure profile |
| Vercel Domains API integration | Medium | Buy, connect, manage domains programmatically |
| Dynamic sitemap per domain | Medium | Generate unique sitemap based on hostname |
| NetworkLinks component | Medium | Dynamic cross-linking based on page context |
| Per-agent GA4 tracking | Medium | Cross-domain or per-agent measurement IDs |
| GSC auto-verification | Low | Programmatic domain verification via GSC API |
| Ad spend billing + commission | High | Stripe billing tied to campaign spend + markup |
| Lead attribution tracking | High | Campaign → lead → showing → close pipeline |
| Agent dashboard (white-label) | Medium | Branded version of existing agent tools |
| Referral fee tracking | Medium | Track closed deals and calculate referral commissions |

---

## Growth Flywheel

```
More agents join the platform
  → More domains with unique local content
    → More backlinks from local sources (GBP, community sites, news)
      → More authority flowing through cross-links
        → All domains rank higher in Google
          → More leads generated for agents
            → Agents increase ad spend (more revenue)
              → Agents close more deals (referral revenue)
                → Platform reputation grows
                  → More agents join
```

---

## Competitive Moat

1. **Network effects:** Each new agent strengthens every other agent's SEO through cross-linking
2. **Data advantage:** 76k+ MLS listings, 1,424 subdivision CMAs, 8 MLS associations
3. **AI integration:** Claude-powered chat, content generation, voicemail scripts, campaign optimization
4. **Full-stack marketing:** Agents can't replicate the multi-channel campaign system (Google Ads + Meta + direct mail + voicemail + email + SMS) on their own
5. **White-label simplicity:** Agents get a complete online presence without any technical knowledge
6. **Dual revenue alignment:** Platform earns more when agents succeed (ad spend + referrals), creating aligned incentives

---

## Domain Inventory

| Domain | Purpose | Status |
|--------|---------|--------|
| jpsrealtor.com | Founding site, Joseph Sardella's primary domain | Production |
| josephsardella.com | Personal brand alias | Production |
| chatrealty.io | Platform brand, hub domain | Connected, needs landing page |
| www variants | Redirect to apex domains | Configured |
| jpsrealtor.vercel.app | Vercel default | Production |
| Agent domains (future) | Per-agent custom domains | To build |

---

**Next milestone:** Build middleware hostname routing + chatrealty.io landing page to establish the hub.
