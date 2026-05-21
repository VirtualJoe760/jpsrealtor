# Agent Profile — Troubleshooting

If something looks wrong on a public page, walk this list **in order**.

## "The wrong photo is showing"

### 1. Confirm the DB has the right URL

```bash
# In a Mongo shell
db.users.findOne(
  { email: "josephsardella@gmail.com" },
  { "agentProfile.headshot": 1, image: 1 }
)
```

- `User.agentProfile.headshot` = the **transparent PNG headshot** (used by all public pages)
- `User.image` = the **NextAuth profile image** (used only by the dashboard)

These are **two different fields**. The dashboard photo is not the public-page photo.

### 2. Confirm the route returns it

Add a temporary log to `src/app/api/agent/public/route.ts`:

```ts
console.log("[GET /api/agent/public] DB headshot value:", profile?.headshot);
```

Hit the page, look in the **terminal** (server-side log).

### 3. Confirm the hook unwrapped the envelope

Add a temporary log to `useAgentProfile.ts`:

```ts
console.log("[useAgentProfile] raw =", raw);
console.log("[useAgentProfile] data.agentProfile?.headshot =", data.agentProfile?.headshot);
```

Hit the page, look in the **browser console**. The route returns
`{ profile: { agentProfile: { headshot } } }` — the hook MUST do
`const data = raw.profile || raw` before reading.

### 4. Confirm the component is guarded

```tsx
{agent.headshot && <Image src={agent.headshot} ... />}
```

Without the guard, an empty-string headshot crashes `<Image>` with
"missing required src property".

### 5. Confirm the cache isn't stale

The hook caches the resolved profile in a module-level variable that **does
not reset on browser reload** in dev unless HMR fully resets the module. If
you saved a new value via the dashboard:

- Hard-reload the page (Ctrl+Shift+R)
- If that doesn't work, restart `npm run dev`
- The HTTP `Cache-Control: max-age=300` on the route can also serve a stale
  response for up to 5 minutes — bypass with Ctrl+Shift+R

## "All the fields are showing fallback values"

This means the hook is reading the wrong path through the response. Most
common cause: forgetting to unwrap the `{ profile: ... }` envelope.

Confirm the hook starts with:

```ts
.then(raw => {
  if (!raw) return;
  const data = raw.profile || raw;
  const ap = data.agentProfile || {};
  // ...read everything from `data.X` and `ap.X`
})
```

If you see `data.agentProfile?.X` (without unwrapping `raw.profile` first),
**that's the bug**.

## "Hydration mismatch on the phone link"

```
Hydration failed because the server rendered HTML didn't match the client.
...
- <a href="http://voice.google.com/calls?a=nc,..." className="gv-tel-link">
```

The Google Voice Chrome extension wraps `tel:` links at runtime. Add
`suppressHydrationWarning` to the anchor:

```tsx
<a
  suppressHydrationWarning
  href={`tel:${agent.phone.replace(/\D/g, "")}`}
>
  {agent.phone}
</a>
```

Real users without the extension are unaffected.

## "Image is missing required src property" or "empty string passed to src"

You forgot to guard an `<Image>` against an empty `headshot`. Wrap it:

```tsx
{agent.headshot && (
  <div className="...wrapper...">
    <Image src={agent.headshot} ... />
  </div>
)}
```

Note the wrapper is **inside** the conditional — if you put the conditional
on the `src` prop only, you still pass empty string.

## "The field saves but doesn't appear"

1. Restart the dev server (clears module-level cache).
2. Hard-reload the page (Ctrl+Shift+R).
3. Confirm the route forwards the field (`src/app/api/agent/public/route.ts`).
4. Confirm the hook reads it from `ap.X` not `data.X`.
5. Confirm the component reads `agent.X`.

If the field doesn't appear in the **route response** at all when you hit
`/api/agent/public` directly in the browser, **the route never forwarded it**.
Add it. See `UPDATING_PROFILE_FIELDS.md` § 2.

## "PUT to /api/user/profile returns 200 but the change doesn't persist"

The route does a **deep merge**. If you're updating a nested field, the route
should call `user.markModified('agentProfile')` before `user.save()`. Confirm
that line is present in `src/app/api/user/profile/route.ts`.

If you added a brand-new top-level field to `agentProfile`, the merge logic
in the route may not include it explicitly. Check the merge block (around
line 220 in the PUT handler) for any explicit field allowlist.

## "Brand color isn't applying"

The DB stores it as `agentProfile.brandColors.primary` (nested), but the
route flattens it to `brandColor`. The hook reads `ap.brandColor`. If you're
seeing the fallback green:

1. Confirm `brandColors.primary` is set in the DB.
2. Confirm the route still has the flattening line:
   ```ts
   brandColor: agent.agentProfile?.brandColors?.primary,
   ```
3. Confirm the component does `style={{ background: agent.brandColor }}`.

## "The transparent headshot looks cropped / has a border"

`object-cover` will crop a portrait PNG inside a square container. Use
`object-contain` instead, and remove any `border` / `rounded-2xl /
overflow-hidden` styles on the wrapper if you want the figure to "float":

```tsx
<div className="relative w-40 h-40 mb-4">
  <Image src={agent.headshot} alt={agent.name} fill className="object-contain" />
</div>
```

## "API response looks different from what the docs say"

The docs in `DATA_FLOW.md` describe the **current** route shape. If they
disagree with what `/api/agent/public` returns, **the route has been changed
without updating the docs**. Update them — these docs are the source of
truth for the contract between the route and the hook.

## When in doubt — trace the field

Pick the broken field. Walk it through these four checks:

```
[ ] DB:          db.users.findOne({ email: "..." }, { "agentProfile.X": 1 })
[ ] Route:       curl http://localhost:3000/api/agent/public | jq '.profile.agentProfile.X'
[ ] Hook:        console.log("ap.X =", ap.X) inside the .then(raw => ...) block
[ ] Component:   console.log("agent.X =", agent.X) at the top of the render
```

The first check that returns wrong/missing data is where the bug lives.
