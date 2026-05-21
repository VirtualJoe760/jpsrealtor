# Updating & Adding Agent Profile Fields

## How fields get saved (the dashboard upload flow)

The agent edits their profile at `/agent/dashboard`
(`src/app/agent/dashboard/page.tsx`).

### Photo upload example — the headshot

```ts
const handleHeadshotUpload = async (e) => {
  const file = e.target.files?.[0];
  // 1. Upload to Cloudinary first
  const uploadedUrls = await uploadToCloudinary([file], "headshots");
  const headshotUrl = uploadedUrls[0];

  // 2. Optimistic local update
  setAgentProfile({
    ...agentProfile,
    agentProfile: { ...agentProfile.agentProfile, headshot: headshotUrl }
  });

  // 3. Persist to MongoDB via the authenticated PUT route
  await fetch("/api/user/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agentProfile: { headshot: headshotUrl }
    }),
  });
};
```

### How `/api/user/profile` PUT works

Source: `src/app/api/user/profile/route.ts`

- Authenticated route (uses NextAuth session)
- Accepts a partial `agentProfile` object in the body
- Performs a **deep merge** with the existing `user.agentProfile` so you only
  send the fields you're changing
- Calls `user.markModified('agentProfile')` so Mongoose persists the nested
  changes
- Returns the updated user document

You can PUT any subset of `agentProfile`. The route handles missing keys
correctly — it won't blow away unspecified fields.

## How to add a new field — full checklist

Say you want to add a new field `agentProfile.tagline2` for a secondary
hero subtitle. Here's every place you need to touch.

### 1. Mongoose schema — `src/models/User.ts`

Add to the TS interface (around line 44):

```ts
agentProfile?: {
  // ...existing fields
  tagline2?: string;  // ← add here
};
```

Add to the schema definition (around line 470):

```ts
agentProfile: {
  // ...existing fields
  tagline2: String,  // ← add here
};
```

### 2. Public read API — `src/app/api/agent/public/route.ts`

Add it to the `agentProfile` object inside `publicProfile`:

```ts
agentProfile: {
  // ...existing fields
  tagline2: profile?.tagline2,
}
```

### 3. Hook — `src/app/hooks/useAgentProfile.ts`

Add to the `AgentProfile` interface:

```ts
export interface AgentProfile {
  // ...existing fields
  tagline2: string;
}
```

Add to `FALLBACK`:

```ts
const FALLBACK: AgentProfile = {
  // ...existing fields
  tagline2: "",
};
```

Add to the merge inside `.then(raw => ...)`:

```ts
const profile: AgentProfile = {
  // ...existing fields
  tagline2: ap.tagline2 || FALLBACK.tagline2,
};
```

### 4. Dashboard editor — `src/app/agent/dashboard/page.tsx`

Add an input for the agent to edit it:

```tsx
<input
  type="text"
  value={agentProfile.agentProfile?.tagline2 || ""}
  onChange={(e) => setAgentProfile({
    ...agentProfile,
    agentProfile: { ...agentProfile.agentProfile, tagline2: e.target.value }
  })}
/>
```

And include it in the save handler:

```ts
await fetch("/api/user/profile", {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    agentProfile: { tagline2: agentProfile.agentProfile.tagline2 }
  }),
});
```

### 5. Use it in a component

```tsx
const { agent } = useAgentProfile();
return <p>{agent.tagline2}</p>;
```

### 6. Restart the dev server

The hook's module-level cache holds the old shape. Restart, hard-reload, then
verify the new field is populated.

## Special cases

### Adding a Cloudinary asset field

Photos use `uploadToCloudinary([file], "<folder>")`. Pick a folder name that
matches the field's purpose, e.g.:

| Field | Cloudinary folder |
|---|---|
| `headshot` | `headshots` |
| `heroPhoto` | `hero-photos` |
| `coverPhoto` | `cover-photos` |
| `galleryPhotos` | `gallery` |
| `teamLogo` | `logos` |

The uploaded URL is what you write to `agentProfile.<field>`.

There's a list of "asset fields" near the top of `src/app/api/user/profile/route.ts`
(line 9 comment) — if your new field is a Cloudinary URL, check whether that
list needs updating for any cleanup logic.

### Adding a flattened field

If your new DB field is nested (`brandColors.tertiary`) but you want a flat
key in the API response (`tertiaryColor`), do the flattening **inside the
route**, not the hook. Example pattern:

```ts
// In the route
agentProfile: {
  // ...
  tertiaryColor: agent.agentProfile?.brandColors?.tertiary,
}
```

```ts
// In the hook
tertiaryColor: ap.tertiaryColor || FALLBACK.tertiaryColor,
```

The hook stays simple; the route owns the shape transformation.

### Fields that shouldn't go on the public route

Some fields are sensitive or admin-only and shouldn't be exposed via the
public read API:

- Application/verification status
- Stripe IDs
- Subscription details
- MLS data broker rights flags
- Anonymous IDs

These should only be readable via the **authenticated** `/api/user/profile`
GET, not `/api/agent/public`.

## Common mistakes when adding fields

1. **Forgetting to add to the route.** The hook will silently fall back. The
   field "doesn't appear" but throws no error.
2. **Forgetting to `markModified('agentProfile')` on the PUT.** Nested updates
   don't persist. Mongoose can't detect deep mutations on `Mixed` types.
3. **Saving to `User.field` instead of `User.agentProfile.field`.** Easy to
   mix up if the field already exists at the top level for legacy reasons.
4. **Storing UI state instead of canonical data.** e.g., storing the result of
   a computation instead of the inputs. Recompute in the component.
