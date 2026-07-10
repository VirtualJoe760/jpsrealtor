# create-chatrealty-site

Scaffold a Next.js real-estate website backed by the [ChatRealty](https://chatrealty.io)
API — **one command**, then customize.

```bash
npm create chatrealty-site@latest my-site
# or
npx create-chatrealty-site my-site
```

You'll be asked for:

- your **ChatRealty API token** (`crt_live_…`, from Settings → Integrations on your ChatRealty site), and
- the **API base** (default `https://www.chatrealty.io`; use `http://localhost:3000` for local dev).

It verifies the token, writes the starter, and drops the token into `.env.local`
(git-ignored). Then:

```bash
cd my-site
npm install
npm run dev
```

## What you get

A complete site covering the ChatRealty build guide:

- **Listings search** — filters (city, price, beds, baths, pool) against the live MLS feed
- **Interactive map** — Leaflet with price pins and listing popups
- **Listing detail pages** — full facts, remarks, a map, and IDX **attribution** on every view
- **Favorites** — saved to `localStorage` (mirrors ChatRealty's guest model)
- **Lead capture** — an inquiry form that records a deduped contact against your CRM (write-only)
- **Neighborhood pages** — median price, days-on-market, and active listings per area
- A typed, **server-side** ChatRealty client (`lib/chatrealty.ts`) + proxy routes (`app/api/*`)

## Security

Your token is used **server-side only**. It's read from `CHATREALTY_API_TOKEN`
(not `NEXT_PUBLIC_`-prefixed, so Next never bundles it to the browser), and every
browser-facing call goes through the app's own `/api` routes. Keep it that way —
never import `lib/chatrealty.ts` from a client component or move the token into
client code.

## Related packages

- [`@chatrealty/sync`](https://www.npmjs.com/package/@chatrealty/sync) — pull your MLS RESO feed into your own database (the backend bookend to this frontend).
- [`@chatrealty/mcp-server`](https://www.npmjs.com/package/@chatrealty/mcp-server) — connect the ChatRealty tool catalog to any Claude client and have it extend your site.

MIT © ChatRealty
