---
title: Agent setup chat (first-run onboarding)
status: current
last_verified: 2026-11-17
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
  The effect that does this runs **once**, guarded by a ref — `updateSession`
  and `router` are new objects every render, so having them in the dep array
  made the effect cancel its own 2.5s timer on each render and the
  `router.replace("/agent/dashboard")` never fired. The agent sat on "taking
  you to your dashboard…" indefinitely (found + fixed 2026-11-17).
- **The cross-host hand-off must stamp the gate fields.**
  `/api/auth/receive` mints the session cookie on the agent's subdomain, and
  that is where every agent sign-in lands. Until 2026-11-17 it left
  `onboardingComplete` and `agentTier` off the token entirely — and
  `portalGates()` tests them with `=== false` / `=== "free"`, so **both** the
  forced-setup gate and the Basic requirement were off for the first page
  load after sign-in. Anything added to the token in `auth.ts`'s jwt callback
  has to be added here too.
- **`/agent/settings` is an escape hatch.** It stays reachable during setup so
  an agent isn't locked out if Groq is down or the key is missing (the route
  returns 503). From there they can edit their profile and reach Billing, but
  only finishing the chat clears the gate.
- **Contact visibility has a deterministic fallback** — the model tends not to
  save that one answer, so the route parses "public"/"gated" itself when the
  previous question asked it.
- **The UI owns the chips; the model must never name them.** `deriveChoices()`
  matches the reply text, so a question with no case there renders no buttons.
  The closing confirmation had no case until 2026-11-17 — the model kept
  writing "tap 'Yes, finish setup'" under an empty row and the only way
  through was to type it. Its case is checked **first**, before the
  required-field guard, because the summary printed just above repeats every
  field name ("Team/Brand:", "Brokerage:") and the later matchers would
  otherwise claim the turn. The prompt now also forbids writing button labels
  at all.
- **Replies are rendered as markdown** (`react-markdown` + `remark-gfm`, as in
  CHAP). The summary is a bold-labelled list and used to print as raw
  `- **License #:**`. `whitespace-pre-wrap` is on user bubbles only — with
  markdown it doubles every gap.
- **`tidyReply()` repairs run-together sentences.** The model occasionally
  staples two questions together with no space ("(Optional.)Would you like…").
  It inserts a space after `.?!` when a capital follows, skipping URL and
  email tokens.
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
