# {{PROJECT}} — a ChatRealty-powered real-estate site

Scaffolded with [`create-chatrealty-site`](https://www.npmjs.com/package/create-chatrealty-site).
A Next.js (App Router) site wired to the ChatRealty API: live listings search, an
interactive map, favorites + lead capture, and neighborhood market pages.

## Run it

```
npm install
npm run dev
```

Open http://localhost:3000.

## How it's wired

Your API token is in `.env.local` (git-ignored) and is used **server-side only**:

```
CHATREALTY_API_TOKEN=crt_live_…   # never exposed to the browser
CHATREALTY_API_BASE=https://www.chatrealty.io
```

- `lib/chatrealty.ts` — the server-side ChatRealty client. Do NOT import it from
  client components.
- `app/api/*` — thin proxies the browser calls (`/api/listings`, `/api/lead`), so
  the token never leaves the server.
- `components/*` — `ListingsBrowser` (filters + grid + map), `ListingCard`,
  `ListingMap` (Leaflet), `FavoriteButton`, `InquiryForm`, `Attribution`.
- `app/listings` — search + detail. `app/neighborhoods/[slug]` — market stats +
  active listings. `app/favorites` — saved homes (localStorage).

## IDX attribution

Every card and the detail page render the listing's source attribution
(`listAgentName` / `listOfficeName`) via `components/Attribution.tsx`. This is a
hard IDX display rule — keep it on every listing view. (Attribution is present on
the tenant/product token path; the detail endpoint always returns it.)

## Customize

- Brand color: `tailwind.config.ts` → `colors.brand`.
- Areas in the nav: edit `app/layout.tsx` and the `/neighborhoods/[slug]` links.
- Filters / fields: extend `lib/types.ts` and the client in `lib/chatrealty.ts`
  against the ChatRealty API — don't invent fields; confirm names against the
  data dictionary.

## Going live + Cloudflare

Deploy to Vercel (or any Next.js host) — but only once your **real** ChatRealty
feed is connected. Test-data mode is localhost-only and the build hard-fails on
deploy by design. Set your env vars (`CHATREALTY_API_TOKEN`, `CHATREALTY_API_BASE`,
and `CHAT_API_KEY` if CHAP is on) in the host dashboard, server-side only.

Put your domain behind **your own Cloudflare** account — it does two jobs:

- **Listing edge cache.** Public listing routes send
  `Cache-Control: public, s-maxage=…, stale-while-revalidate=…` (see
  `REVALIDATE` in `lib/chatrealty.ts` and `/api/listings`). With Cloudflare
  proxying your domain and honoring origin cache headers, listing data serves
  from the edge — visitors are fast and your ChatRealty API calls collapse to
  ~once per revalidate window instead of once per pageview. Keep user-specific
  routes (favorites, `/api/lead`, `/api/chat`) **uncached** — they send
  `no-store`; if you add a custom cache rule, scope it to the read routes only.
- **Turnstile bot protection** on the lead form (optional). Add your own
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` (free at
  dash.cloudflare.com → Turnstile). Unset = honeypot + rate-limit only.

Cloudflare is your infrastructure — you own the account and DNS.

## Next steps (the build guide)

This starter covers the ChatRealty build guide end to end (listings → map →
favorites + leads → neighborhoods → go-live). To go further, connect the
ChatRealty MCP to your own Claude and ask it to extend any page — it has the
same build-guide prompts and can read your live market data.
