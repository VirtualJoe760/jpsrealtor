---
title: Agent directory (/directory)
status: current
last_verified: 2026-10-17
related: [./README.md, ../seo/README.md]
supersedes: docs/archive/chatrealty/AGENT_DIRECTORY.md
---

# Agent directory

## TL;DR

`/directory` lists every agent with a public profile and links each card to the
agent's site (`customDomain`, else `{subdomain}.chatrealty.io`) — the hub-side
cross-link of the hub-and-spoke network. The code is live but **nothing links
to it** (no nav or footer entry); the agent network is a post-launch item.
Restored 2026-10-17 from `archive/chatrealty/AGENT_DIRECTORY.md`, re-verified
against code.

## Files

| File | Role |
|---|---|
| `src/app/api/agents/directory/route.ts` | `GET` — public (under the proxy's `/api/agents` public prefix) |
| `src/app/directory/page.tsx` | Server component; metadata uses the current host's `siteName` |
| `src/app/directory/DirectoryClient.tsx` | Search (debounced), filter pills, responsive grid, skeletons, empty state |
| `src/app/components/directory/AgentCard.tsx` | Card: headshot/initials, headline, tagline, service areas, specializations, certifications, "Visit Website" |

## API

`GET /api/agents/directory?city=&specialization=&search=`

- Selects users with role `realEstateAgent` **and** a non-empty
  `agentProfile.headshot` or `agentProfile.headline`.
- `city` matches `agentProfile.serviceAreas.name`, `specialization` matches
  `agentProfile.specializations`, `search` matches `name` — all
  case-insensitive regexes.
- Returns `{ success, agents: [{ id, name, headshot, headline, tagline,
  serviceAreas[{name,type}], specializations, customDomain, subdomain,
  socialMedia, certifications[{name,issuedBy,year}] }], filters: { cities,
  specializations } }` — public-safe fields only.
- `Cache-Control: public, max-age=3600, stale-while-revalidate=300`.

## Gotchas

- **User input goes straight into `new RegExp(...)`** for `city`,
  `specialization` and `search` on a public, unauthenticated route — regex
  injection / ReDoS risk. Escape the input (reported, not fixed).
- **No site-readiness filter.** An agent whose subdomain still shows
  `/coming-soon` is listed and linked.
- **Served on every host**, including `jpsrealtor.com/directory`, not just the
  platform.
