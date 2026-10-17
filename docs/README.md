---
title: jpsrealtor / ChatRealty Documentation
status: current
last_verified: 2026-10-17
---

# Documentation

Welcome. Start with [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the platform map,
then drill into the relevant area folder.

## Where to look

| If you're working on… | Start here |
|---|---|
| Routing / `src/proxy.ts` / host-based rewrites | [`routing/README.md`](./routing/README.md) |
| Auth, sessions, sign-in/out, 2FA | [`auth/README.md`](./auth/README.md) |
| Anything scoping content by hostname (the cardinal rule) | [`multi-tenant/README.md`](./multi-tenant/README.md) |
| CRM, contact import, FUB, anti-spam | [`crm/README.md`](./crm/README.md) |
| Agent signup, application review, approval/rejection emails | [`agent-onboarding/README.md`](./agent-onboarding/README.md) |
| Admin dashboard, user management, "Log in as", moderation | [`admin/README.md`](./admin/README.md) |
| Agent profile data flow (`/api/agent/public`, `useAgentProfile`) | [`agent-identity/agent-profile.md`](./agent-identity/agent-profile.md) |
| Custom domains, domain registry, agent directory | [`multi-tenant/custom-domains.md`](./multi-tenant/custom-domains.md), [`domain-owner-scoping.md`](./multi-tenant/domain-owner-scoping.md), [`agent-directory.md`](./multi-tenant/agent-directory.md) |
| Articles, blog, insights, publishing pipeline | [`cms/README.md`](./cms/README.md) |
| MLS listings, photos, VPS cron, subdivisions | [`listings/README.md`](./listings/README.md) |
| Chat (CHAP), map, intent parsing, Groq narrate | [`chat/README.md`](./chat/README.md) |
| Stripe, subscriptions, credits, commissions | [`commerce/README.md`](./commerce/README.md) |
| External APIs (Cloudinary, Twilio, Resend, Meta, Google, etc.) | [`integrations/README.md`](./integrations/README.md) |
| API productization, `/api/skill/*`, npm packages, ship strategy | [`chatrealty-api/README.md`](./chatrealty-api/README.md) |
| MCP server: Claude tools, hosted connector, the website-build flow | [`mcp/README.md`](./mcp/README.md), [`mcp/site-building.md`](./mcp/site-building.md) |
| Bugs and inconsistencies awaiting a decision | [`review/README.md`](./review/README.md) |
| Known issues, resolved issues, aspirational features | [`tech-debt.md`](./tech-debt.md) |

## Conventions

Every doc has frontmatter (`title`, `status`, `last_verified`). The
documentation policy and refactor checklist live in
[`AGENTS.md`](./AGENTS.md) — read it before adding or modifying docs.

The root `CLAUDE.md` (project root, not this file) contains the operating
rules every Claude Code session loads: read docs before non-trivial tasks,
update docs in the same commit as code changes.

## Refactor history

The current structure was created on 2026-05-21 via a full documentation
refactor. The previous `/docs/` tree (~296 files) was preserved verbatim in
[`archive/`](./archive/) — historical reference only, not authoritative.

Each area README has a "Migration log" section at the bottom mapping legacy
files in `archive/` to their classification (CURRENT / PARTIAL / OUTDATED /
DUPLICATE / SUPERSEDED) and recommended action.
