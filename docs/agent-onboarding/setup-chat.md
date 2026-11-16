---
title: Agent setup chat (first-run onboarding)
status: current
last_verified: 2026-11-04
related:
  - ./README.md
  - ../commerce/free-tier-gating.md
  - ../routing/README.md
  - ../agent-identity/agent-profile.md
---

# Agent setup chat

## TL;DR

New agents set up their account by **chatting**, at `/agent/setup`. It is the
only first-run setup: the 13-step form wizard that used to live at
`/agent/settings?onboarding=true` was **removed 2026-11-04**. After setup,
agents edit everything in `/agent/settings` (the sidebar editor, which reuses
the same step forms the wizard had).

## Flow

```
pay for Basic → activatePaidAgent() sets agentProfile.onboardingComplete=false
  → middleware sends every /agent/* page to /agent/setup
  → chat collects fields (save_profile) → agent confirms → finish_setup
  → onboardingComplete=true → page calls session.update() → /agent/dashboard
```

What it collects, in order: name (pre-filled from the account), team/brand
name, **license number + brokerage (required — they must appear on the site
by law)**, phone, contact visibility (public vs gated behind a form), service
areas, specializations, brand color, headshot. Everything except license and
brokerage can be skipped with a chip.

## Pieces

| Piece | File | Notes |
|---|---|---|
| Page | `src/app/agent/setup/page.tsx` | Chat UI (CHAP styling), quick-reply chips, headshot upload via `/api/upload`, live progress checklist |
| API | `src/app/api/agent/setup-chat/route.ts` | Stateless Groq tool loop (`GROQ_API_KEY`, model `SETUP_CHAT_MODEL`, default `openai/gpt-oss-120b`). Tools: `save_profile`, `finish_setup` |
| Gate | `src/proxy.ts` (`portalGates()`) | `onboardingComplete === false` → `/agent/setup`. `/agent/setup` and `/agent/settings` are exempt |
| Entry links | `join-us/page.tsx` (after payment), `email-resend.ts` + `email-agent-application.ts` (welcome CTA), dashboard `GoLiveBounties.tsx` | All point at `/agent/setup` |

## Rules that matter

- **The model writes only whitelisted paths** (`FIELD_PATHS` in the route).
  Note `licenseNumber`, `brokerageName`, `teamName`, `phone`,
  `contactVisibility` are **top-level** User fields, not `agentProfile.*`.
- **`finish_setup` is the only writer of `onboardingComplete`.** It refuses
  until license + brokerage are saved. `PUT /api/user/profile` stopped
  accepting `onboardingComplete` on 2026-11-04 — while the wizard existed, one
  PUT could skip the compliance check.
- **Refresh the JWT before leaving.** The middleware reads
  `onboardingComplete` from the token; without `session.update()` a stale
  `false` bounces the agent from the dashboard straight back to setup.
- **`/agent/settings` is an escape hatch.** It stays reachable during setup so
  an agent isn't locked out if Groq is down or the key is missing (the route
  returns 503). From there they can edit their profile and reach Billing, but
  only finishing the chat clears the gate.
- **Contact visibility has a deterministic fallback** — the model tends not to
  save that one answer, so the route parses "public"/"gated" itself when the
  previous question asked it.
- **Existing agents need the backfill before this ships.**
  `scripts/backfill-agent-onboarding.ts` — the `=== false` check in the gate
  does NOT spare agents who predate the flag (the schema default, the `!!`
  coercion in `auth.ts`, and its once-a-minute refresh all turn `undefined`
  into `false`), and the `localStorage` cushion that used to soften it went
  with the wizard. Detail + commands:
  [../commerce/free-tier-gating.md](../commerce/free-tier-gating.md) §
  Forced onboarding.

## History

- 2026-07-24 — chat setup shipped (commit 2b52d223) as the "default", but the
  middleware still redirected to `/agent/settings?onboarding=true`, which
  rendered the wizard. New agents never reached the chat.
- 2026-11-04 — wizard removed, gate and links pointed at `/agent/setup`,
  session refresh added on finish, `onboardingComplete` removed from the
  profile PUT allowlist.
