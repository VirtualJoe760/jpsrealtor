# Using `useAgentProfile()` in a component

## Import

```tsx
"use client";

import { useAgentProfile } from "@/app/hooks/useAgentProfile";
```

The hook is **client-only** — it uses `useState`/`useEffect` and a `fetch()`.
You can't call it from a Server Component. Wrap any consumer in `"use client"`.

## Basic usage

```tsx
export default function MyComponent() {
  const { agent, loading } = useAgentProfile();

  return (
    <div style={{ background: agent.brandColor }}>
      <h1>{agent.name}</h1>
      <p>{agent.bio}</p>
    </div>
  );
}
```

## The `AgentProfile` shape

```ts
interface AgentProfile {
  name: string;
  email: string;
  phone: string;
  brokerageName: string;
  licenseNumber: string;
  headshot: string;          // Cloudinary URL or "" if not yet loaded / missing
  heroPhoto: string;
  bio: string;
  headline: string;
  tagline: string;
  brandColor: string;        // Hex
  secondaryColor: string;    // Hex
  customDomain: string;
  subdomain: string;
  socialMedia: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
    tiktok?: string;
  };
  valuePropositions: Array<{ icon?: string; title: string; description: string }>;
  stats: Array<{ label: string; value: string; icon?: string }>;
  specializations: string[];
  serviceAreas: string[];
}
```

The hook **always returns a populated object** — never `null`. While the fetch
is in flight, you get the hardcoded `FALLBACK` (defined at the top of
`useAgentProfile.ts`). Once the fetch resolves, you get the real data.

## CRITICAL: guarding `<Image>` against the headshot

`agent.headshot` defaults to **the empty string** during the initial render
window. Next.js `<Image>` throws on empty `src`. Always guard:

```tsx
{agent.headshot && (
  <div className="relative w-40 h-40 rounded-full overflow-hidden">
    <Image src={agent.headshot} alt={agent.name} fill className="object-cover" />
  </div>
)}
```

This isn't optional — you'll get a runtime error in dev otherwise.

The same goes for any other field that might be empty (most fields fall back
to a hardcoded default and are safe, but `headshot` was deliberately changed
to empty-string after we removed the bad `about.png` fallback).

## CRITICAL: `tel:` links and Google Voice extension

If a user has the Google Voice Chrome extension installed, it wraps every
`<a href="tel:...">` in its own anchor at runtime. This causes a hydration
mismatch on the server-rendered HTML.

**Always add `suppressHydrationWarning` to phone-link anchors:**

```tsx
<a
  suppressHydrationWarning
  href={`tel:${agent.phone.replace(/\D/g, "")}`}
  className="..."
>
  <Phone className="w-4 h-4" />
  {agent.phone}
</a>
```

This is purely cosmetic for the React warning — it doesn't affect the rendered
output for users without the extension.

## The `loading` flag

```tsx
const { agent, loading } = useAgentProfile();
```

`loading` is `true` until the first fetch resolves. **Most components don't
need it** because the fallback values are sensible. But if you want a skeleton
during the initial paint, you can:

```tsx
if (loading) return <Skeleton />;
return <ActualUI agent={agent} />;
```

## Module-level caching

The hook caches the resolved profile in a module-level variable:

```ts
let cachedProfile: AgentProfile | null = null;
```

So on subsequent mounts (e.g., navigating between pages), the hook returns the
cached value immediately and skips the fetch. **This means a freshly-saved
profile field won't appear until the page is hard-reloaded** (or the dev
server restarts). See `DATA_FLOW.md` § "Caching" for more.

## Multiple components, one fetch

Because of module-level caching, mounting `useAgentProfile()` in 5 components
on the same page only triggers **one** network request — the first to mount
fires the fetch, the rest read from cache. No request coalescing needed at
the component level.

## Anti-patterns

❌ **Don't** call the hook from a Server Component.
❌ **Don't** read `agent.headshot` directly into `<Image>` without a guard.
❌ **Don't** assume `agent.X` matches the DB path one-to-one — read `DATA_FLOW.md` for the mapping.
❌ **Don't** add field-specific fetches for agent data. Extend the hook instead.
❌ **Don't** mutate the returned `agent` object — it's shared across components via the module cache.

## When to add a new field

If you need a field that the hook doesn't expose yet:

1. Confirm it lives in `User.agentProfile.X` in the model.
2. Add it to the route response (`src/app/api/agent/public/route.ts`).
3. Add it to the `AgentProfile` interface in the hook.
4. Add it to the `FALLBACK` object with a sensible default.
5. Add the merge line in the hook's `.then(raw => ...)` block.
6. Use it in your component.

See `UPDATING_PROFILE_FIELDS.md` for the full checklist with example diffs.
