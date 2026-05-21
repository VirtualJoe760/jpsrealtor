# Agent Profile — Master Reference

This directory documents the **agent profile system**: how agent branding,
photos, contact info, and landing-page content flow from MongoDB through the
API into client components on every public-facing page.

If you're touching anything that displays agent info, **read this first**.

## Files in this directory

| File | What it covers |
|---|---|
| [`SCHEMA.md`](./SCHEMA.md) | The full `User.agentProfile` shape in MongoDB. Source of truth. |
| [`DATA_FLOW.md`](./DATA_FLOW.md) | DB → API → hook → component. End-to-end with field-level mapping. |
| [`USING_THE_HOOK.md`](./USING_THE_HOOK.md) | How to use `useAgentProfile()` in a client component, including loading state, fallbacks, and gotchas. |
| [`UPDATING_PROFILE_FIELDS.md`](./UPDATING_PROFILE_FIELDS.md) | How fields are saved (the dashboard upload flow) and how to add a new field end-to-end without breaking existing pages. |
| [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) | Common failures (wrong photo, fallback leaking, hydration mismatch on tel: links, stale module cache) and how to diagnose them. |

## TL;DR — the one thing to remember

There are **three layers** that all need to agree on field names, and the bug
that wasted hours on 2026-04-07 was that they didn't:

```
MongoDB  →  /api/agent/public  →  useAgentProfile  →  <Component>
  field         response shape         hook output       agent.field
```

The route **wraps its response in `{ profile: ... }`**:

```ts
return NextResponse.json({ profile: publicProfile });
```

The hook **must unwrap that envelope**:

```ts
const data = raw.profile || raw;
const ap = data.agentProfile || {};
```

If you ever add a new field, trace it through all three layers. The
TROUBLESHOOTING doc has a checklist.

## Source files

| Layer | Path |
|---|---|
| Mongoose schema | `src/models/User.ts` (the `agentProfile` subdocument inside the `User` schema) |
| Public read API | `src/app/api/agent/public/route.ts` |
| Authenticated update API | `src/app/api/user/profile/route.ts` (PUT) |
| Hook | `src/app/hooks/useAgentProfile.ts` |
| Dashboard editor | `src/app/agent/dashboard/page.tsx` |
| Photo upload helper | `uploadToCloudinary()` (called from the dashboard) |

## Components that consume `useAgentProfile()`

These all render the agent's photo, name, phone, brand colors, or social links.
If a public field changes, every one of these gets the update for free — but if
you change the **shape** of `AgentProfile`, you need to update all of them.

- `src/app/components/buy/BuyPageHero3D.tsx`
- `src/app/components/buy/BuyIntakeCTA.tsx`
- `src/app/components/buy/AgentValueProps.tsx`
- `src/app/components/sell/SellPageHero3D.tsx`
- `src/app/components/sell/SellIntakeCTA.tsx`
- `src/app/components/buy/ContactCTA.tsx` *(legacy, no longer mounted)*

## Conventions used in these docs

- **DB field** = exact path inside the Mongoose document, e.g. `User.agentProfile.headshot`
- **API field** = exact key in the JSON response from `/api/agent/public`, e.g. `profile.agentProfile.headshot`
- **Hook field** = the key on the `AgentProfile` interface returned by `useAgentProfile()`, e.g. `agent.headshot`
- **Component usage** = how a component reads it, e.g. `agent.headshot && <Image src={agent.headshot} />`
