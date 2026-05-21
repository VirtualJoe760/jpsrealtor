---
title: docs-v2 (Documentation Refactor in Progress)
status: current
last_verified: 2026-05-21
---

# docs-v2 — Documentation Refactor in Progress

This folder is the **new docs structure** being built alongside the legacy `/docs/`.
When complete, `/docs/` will be archived and `/docs-v2/` renamed to `/docs/`.

## Why

`/docs/` accumulated 266 files over time — only ~47 were current per the May 18
audit. Rather than mass-delete, we're rebuilding the structure intentionally
and migrating each legacy doc through a refactor checklist (see `CLAUDE.md`).

## Status

| File / Folder | Status | Purpose |
|---|---|---|
| `ARCHITECTURE.md` | ✅ Drafted | Thin index pointing to area docs |
| `CLAUDE.md` | ✅ Drafted | Docs policy: frontmatter, refactor checklist, folder rules |
| `KERNEL.md` | ✅ Drafted | Draft for the eventual root `CLAUDE.md` (kept small) |
| `routing/` | ✅ Drafted | `src/proxy.ts` host routing |
| `auth/` | ✅ Drafted | NextAuth, cross-domain, signout chain, 2FA |
| `multi-tenant/` | ✅ Drafted | `resolveDomainOwner` pattern + DomainRegistry |
| `crm/` | ⏳ Not started | Contact schema, import pipeline, FUB, anti-spam |
| `cms/` | ⏳ Not started | Articles: Mongo source of truth, MDX mirror, publishing pipeline |
| `listings/` | ⏳ Not started | UnifiedListing, MLS pipeline, photos |
| `chat/` | ⏳ Not started | Chat-v3 (parser → preview → narrate), CHAP, map |
| `commerce/` | ⏳ Not started | Stripe tiers, CreditLedger, Transactions |
| `integrations/` | ⏳ Not started | External APIs (Cloudinary, Twilio, Resend, etc.) |
| `tech-debt.md` | ⏳ Not started | Live list of known issues |
| `archive/` | ⏳ Not started | Where retired legacy docs land |

## Migration plan

1. **Phase 1 — Foundation.** `CLAUDE.md`, `ARCHITECTURE.md`, `KERNEL.md`, this README. ← *done now*
2. **Phase 2 — Area docs.** One folder per subsystem in `ARCHITECTURE.md`. Each `area/README.md` is the deep dive. Reference legacy `/docs/` content where it's still valid; classify each legacy doc per the refactor checklist.
3. **Phase 3 — Archive sweep.** Move retired `/docs/` content into `docs-v2/archive/`.
4. **Phase 4 — Cutover.** Rename `/docs/` → `/docs-legacy/`, rename `/docs-v2/` → `/docs/`, copy `KERNEL.md` to root `CLAUDE.md`.

## How to contribute during the transition

- Edit/add files in `/docs-v2/` only — don't touch `/docs/` yet.
- Every new file needs frontmatter per `CLAUDE.md`.
- If you reference a topic with no doc yet, create a stub with `status: outdated`.
