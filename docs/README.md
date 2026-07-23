---
title: jpsrealtor / ChatRealty Documentation
status: current
last_verified: 2026-07-23
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
| Articles, blog, insights, publishing pipeline | [`cms/README.md`](./cms/README.md) |
| MLS listings, photos, VPS cron, subdivisions | [`listings/README.md`](./listings/README.md) |
| Chat (CHAP), map, intent parsing, Groq narrate | [`chat/README.md`](./chat/README.md) |
| Stripe, subscriptions, credits, commissions | [`commerce/README.md`](./commerce/README.md) |
| External APIs (Cloudinary, Twilio, Resend, Meta, Google, etc.) | [`integrations/README.md`](./integrations/README.md) |
| API productization, `/api/skill/*`, npm packages, ship strategy | [`chatrealty-api/README.md`](./chatrealty-api/README.md) |
| Known issues, resolved issues, aspirational features | [`tech-debt.md`](./tech-debt.md) |

## Conventions

Every doc has frontmatter (`title`, `status`, `last_verified`). The
documentation policy and refactor checklist live in
[`CLAUDE.md`](./CLAUDE.md) — read it before adding or modifying docs.

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
