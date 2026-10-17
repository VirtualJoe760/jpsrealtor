# create-chatrealty-site

Scaffold a Next.js real-estate website backed by the [ChatRealty](https://chatrealty.io)
API — **one command**, then customize. Usually driven by Claude through the
ChatRealty MCP build guide (`get_build_guide`), but it works on its own too.

```bash
npx create-chatrealty-site@latest my-site --test-data
cd my-site && npm install && npm run dev
```

## Two ways to start

**Test data (no token).** `--test-data` (or Enter at the token prompt) runs the
site on **47 watermarked sample listings** bundled with the package, with a
permanent banner on every page. It is **localhost only**: a deploy build fails
on purpose while `CHATREALTY_TEST_DATA=true`, because sample listings must
never be public.

**Your own data.** If your listings are already seeded in ChatRealty
(Settings → Integrations), Claude connects the site to them with the MCP tool
`get_site_claim_code`: it returns a one-time code and a small script that trades
the code for this site's key and writes `CHATREALTY_API_TOKEN` into
`.env.local` — nothing to copy or paste. You can also pass a website key
yourself:

```bash
npx create-chatrealty-site my-site --token crt_live_xxx
```

The CLI verifies the token against `/api/skill/me` and writes `.env.local`
(git-ignored, mode 0600) with the token, the API base
(default `https://www.chatrealty.io`), a generated `AUTH_SECRET` and a
generated `CRON_SECRET`.

Flags: `--test-data`, `--token`, `--api-base`, `--chat-key` (turn on CHAP with a
Groq/OpenAI-compatible key), `--no-chap`, `--agent-name`, `--brokerage`,
`--market`, `--yes`. Run `--help` for details. Non-interactive when stdin is not
a TTY.

## What you get

- **Listings search** — filters (city, price, beds, baths, pool), scoped by
  default to your market (`MARKET_CITIES` / `AGENT_SERVICE_AREAS` / your profile)
- **Clustered map** — Leaflet price pins with listing popups
- **Listing detail pages** — facts, remarks, photo gallery, map, and IDX
  **"Listed by {office} — {agent}"** attribution on every card, popup and page
- **CHAP** — the on-site AI property chat (bring your own LLM key)
- **Favorites behind sign-in** — magic link, plus Google/Facebook with your own
  OAuth keys; on-device in test mode
- **Lead capture** — an inquiry form that lands deduped contacts in your
  ChatRealty CRM (write-only, honeypot + rate limit, optional Turnstile)
- **Neighborhoods, blog, about, contact** — hydrated from your ChatRealty profile
- **Hourly sync route** (`/api/sync/cron`) for sites running their own
  `@chatrealty/sync` database
- A typed, **server-side** ChatRealty client (`lib/chatrealty.ts`) + proxy routes (`app/api/*`)

## Security

Your token is used **server-side only**. It's read from `CHATREALTY_API_TOKEN`
(not `NEXT_PUBLIC_`-prefixed, so Next never bundles it to the browser), and every
browser-facing call goes through the app's own `/api` routes. Keep it that way —
never import `lib/chatrealty.ts` from a client component or move the token into
client code. Never paste a key into a chat.

## Related packages

- [`@chatrealty/mcp-server`](https://www.npmjs.com/package/@chatrealty/mcp-server) — the ChatRealty tools + build guide for any Claude client.
- [`@chatrealty/sync`](https://www.npmjs.com/package/@chatrealty/sync) — pull your MLS RESO feed into your own database yourself.

MIT © ChatRealty
