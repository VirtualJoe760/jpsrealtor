// packages/mcp-server/src/build-guide/prompts.ts
//
// The curated "build your real-estate site with Claude" clipboard prompts.
//
// This is the SINGLE source of truth for the build-guide prompt library. Three
// consumers read it WITHOUT forking the text, so they can never drift:
//
//   1. This MCP server's `guide://chatrealty/*` resources (Claude reads them
//      in-loop — see ./resource.ts).
//   2. The hosted MCP bridge (same resources over the HTTP transport).
//   3. The public developer-docs site's <ClaudePrompt> component (humans copy
//      them) — build_plan §7 / Agent 34 imports this same array.
//
// NARRATIVE (ship-strategy, corrected 2026-07-23): ChatRealty is PURELY
// BRING-YOUR-OWN-DATA. Each agent's own MLS feed seeds their own tenant
// database — ChatRealty never redistributes anyone else's feed (the platform
// owner's MLS license covers only the owner's internal/dogfood accounts).
// A token's /api/skill/me reports `dataSource`: "tenant" (your DB is
// connected), "none" (nothing yet — data tools refuse with no_data_source),
// or "dogfood" (platform-internal). Step 1 keys off that field and must NEVER
// claim a feed is live unless the token's OWN tenant returns rows. Tenant
// provisioning + the customer sync CLI are rolling out; until a tenant is
// enabled the guide stops honestly at step 1 rather than improvising imports.
// The shipped on-ramp is the `create-chatrealty-site` scaffolder; steps 3-6
// customize what it generates.
//
// Each prompt is a self-contained instruction an agent pastes into a fresh
// Claude session that has the ChatRealty MCP connected.
//
// KEEP THE BODIES PLAIN MARKDOWN. They are also served as a single markdown
// resource; avoid triple-backtick fences inside a body (use indented code or
// inline code) so the concatenated resource stays well-formed.

export type BuildGuidePrompt = {
  /** Stable kebab-case id. Used as the guide:// resource slug and the docs anchor. */
  id: string;
  /** Short human-readable title. */
  title: string;
  /** One-line summary shown in a prompt picker / table of contents. */
  summary: string;
  /** Ordered step number in the guided build (1-based). */
  order: number;
  /** The copy-paste prompt body (markdown). Self-contained. */
  body: string;
};

export const BUILD_GUIDE_PROMPTS: readonly BuildGuidePrompt[] = [
  {
    id: "check-your-data-source",
    title: "Check your data source",
    summary:
      "ChatRealty is bring-your-own-data — confirm YOUR tenant database is connected, or start the data-key conversation (local test fetch vs VPS sync).",
    order: 1,
    body: [
      "Before we build, check my ChatRealty data source. ChatRealty is bring-your-own-data: my own MLS feed seeds my own tenant database — there is no shared listing pool.",
      "",
      "1. Call `whoami` and note the `dataSource` field. Talk to me like a product, not a stack trace: no token fragments, no HTTP status codes, no internal field names in your replies.",
      "2. If my data source is CONNECTED (`tenant`): ask me which cities or areas I serve, then probe MY database (one `search_listings` and `get_market_stats` for an area I name) and summarize what my data contains. Then we're ready to build.",
      "3. If NO data source is connected (`none`): do NOT call any listing or market tool, and do not mention any city, market, or listing counts — there is nothing to probe. Instead, start my data setup conversation: ask me ONE question — \"Do you have a data key from your MLS (RESO Web API or Spark credentials)?\"",
      "   - If I have one: set my data backend up RIGHT NOW, fully self-serve — no waiting on anyone: (1) `npx @chatrealty/sync init --token crt_live_…` provisions my dedicated ChatRealty database and writes CHATREALTY_DB_URL into .env.local automatically (the token is the same crt_live one; never paste connection strings into chat); (2) add my feed credentials to .env.local — a Spark access token (RESO_BEARER_TOKEN + RESO_BASE_URL) or RESO OAuth (RESO_TOKEN_URL/CLIENT_ID/CLIENT_SECRET), env-only, never in chat; (3) `npx chatrealty-sync doctor` validates both; (4) small local test fetch first: `npx chatrealty-sync run --once --dry-run --max 25`; (5) full seed: `npx chatrealty-sync run`; then recommend a VPS cron for the daily sync (set-and-forget — the same pattern production runs). After the seed, `whoami` shows dataSource `tenant` and we build on MY data.",
      "   - If I don't: explain how agents get one (your MLS or association's data-services / IDX / RESO Web API application) and offer to draft that request with me.",
      "   - EITHER WAY, offer the preview path: while the backend setup is in motion I can see the full site working NOW in TEST DATA mode — `npx create-chatrealty-site@latest my-site --test-data` scaffolds against 25 FICTITIOUS sample listings bundled with the package (no token needed). Rules you must keep: always call it test data, never present those listings as real, and NEVER deploy the site to Vercel or any host while it runs on test data — test data is localhost-only (the build hard-fails on deploy attempts in test mode by design; do not work around it). The site's built-in banner stays until my real feed is connected. Never scrape, never invent additional listings, never build a local stand-in database beyond the bundled samples.",
      "4. If `dataSource` is `dogfood`: this is a ChatRealty-internal owner account serving platform development data — fine for internal testing, but say so explicitly so nobody mistakes it for a customer setup.",
      "5. NEVER tell me my MLS feed is 'live' or 'seeded' unless step 2 returned rows from my OWN tenant.",
      "",
      "Answer with facts from the tool calls, not assumptions.",
    ].join("\n"),
  },
  {
    id: "scaffold-your-site",
    title: "Scaffold your site",
    summary:
      "One command generates a complete Next.js site on your ChatRealty data — the supported starting point.",
    order: 2,
    body: [
      "Scaffold my real-estate website using ChatRealty's official generator.",
      "",
      "1. Ask me for a ChatRealty API token (`crt_live_…`). I mint it at Settings → Integrations on my ChatRealty site — the 'Website & listings' preset is exactly right for this. I will paste it once; treat it like a password (server-side env only, never into client code, never committed).",
      "2. Run: `npx create-chatrealty-site@latest my-site --token <my token>` — the default API base (`https://www.chatrealty.io`) is correct. The CLI verifies the token against `/api/skill/me`; if verification fails, stop and show me the exact message.",
      "3. Then `cd my-site`, `npm install`, `npm run dev`, and open http://localhost:3000.",
      "4. Verify with me: the listings grid shows data; the map renders pins; a detail page shows 'Listed by {office} — {agent}' attribution (a hard IDX display rule); the favorites heart persists; the inquiry form submits; /blog, /about, /contact, and /neighborhoods all render (identity hydrates from my ChatRealty profile automatically).",
      "4b. Enable CHAP (the on-site property chat — ChatRealty's flagship search experience): ask me for an LLM API key (Groq recommended — console.groq.com, generous free tier; any OpenAI-compatible provider works), set CHAT_API_KEY in .env.local (server-side only, never in chat or client code), restart dev. The chat bubble appears bottom-right; test it with a real search like '3 beds under 800k with a pool'. It works in test-data mode too.",
      "5. The scaffold's look is deliberately a NEUTRAL CANVAS — the backend is now wired, but the site is not done. Move straight to the design step: that's where it becomes mine.",
      "",
      "Proceed with a real token once step 1 confirmed a connected data source (`tenant` — or `dogfood` for ChatRealty-internal testing). If no data source is connected yet, scaffold in TEST DATA mode instead (`--test-data`, no token) — fictitious sample listings, permanent banner, preview only, never launched publicly. Do NOT hand-build a site from scratch and do NOT install data-sync tooling yourself — the scaffolder is the supported path, and everything after this step customizes what it generated.",
    ].join("\n"),
  },
  {
    id: "design-your-site",
    title: "Design your site",
    summary:
      "The backend is wired — now Claude designs a site that's actually yours: interview, proposed direction, full restyle.",
    order: 3,
    body: [
      "Design my site. The backend and plumbing are done — this step is about making it BEAUTIFUL and unmistakably mine. You have strong design instincts: use them fully. The scaffold is a foundation, not the final look; you own the presentation layer.",
      "",
      "1. Interview me first (check `my_agent_profile` and skip anything already known): (a) WHERE I sell and what that place feels like — desert resort, coastal, mountain town, urban core, suburbs; (b) my MARKET FOCUS — luxury, investment/cash-flow, senior living, family & first-time buyers, vacation/second homes; (c) the FEEL I want — elegant, warm, bold, minimal, editorial — plus any sites or brands whose look I admire; (d) brand assets — colors, logo (put it in `public/` and wire the header), headshot, brokerage; (e) typography leaning — modern sans, classic serif, or a pairing.",
      "2. Translate PLACE + FOCUS into a design direction and PROPOSE it in words before writing code: palette (actual hex values), type pairing, imagery mood, homepage concept. Reason from my answers — for example, luxury desert might call for warm sand neutrals with an ink or evergreen accent, a serif display over a clean sans, full-bleed photography and generous whitespace; an investment focus might lead data-forward with stat blocks and cash-flow callouts up front; senior living wants a calm palette, high contrast, larger type, simpler navigation. These are reasoning examples, not options to copy.",
      "3. Once I approve the direction, REDESIGN the presentation layer: `app/globals.css` and the tailwind theme (a real palette scale + fonts via next/font), `app/layout.tsx` (header, nav, footer), `app/page.tsx` (hero + sections that fit my positioning — featured listings, a market-stats strip, an about/credibility block, a strong CTA), and the listing card/detail styling. Craft bar: one cohesive palette, a consistent type scale, deliberate spacing rhythm, and NO default-looking gray-card template soup.",
      "4. GUARDRAILS — restyle anything, but never remove: the 'Listed by {office} — {agent}' attribution on every card, detail, and map popup (IDX rule); the test-data banner when in test mode; the favorites and lead-capture logic; the server-side token boundary (`lib/` and `app/api/` stay untouched); accessibility basics (contrast, focus states, alt text).",
      "5. Show me the result in the browser, explain what you designed and why, and iterate until I say it feels like MY brand — not a template. Then nudge me to put the same brand details into my ChatRealty profile (Settings) so landing pages and articles match.",
    ].join("\n"),
  },
  {
    id: "customize-listings-and-search",
    title: "Customize listings & search",
    summary:
      "Tune the scaffolded search page: filters, sorting, and card design on the real /api/skill/listings/search params.",
    order: 4,
    body: [
      "Customize the listings search in my scaffolded ChatRealty site.",
      "",
      "1. The site's own `/api/listings` route proxies ChatRealty's `/api/skill/listings/search` server-side (the token stays in `.env.local`). Keep that boundary — client components must never call ChatRealty directly or see the token.",
      "2. Field names and filter params are NOT to be invented: use the connected `search_listings` tool's schema as the source of truth for what exists (city, price range, beds, baths, pool, property type, etc.), and mirror those in the filter UI in `components/ListingsBrowser`.",
      "3. Restyle the listing cards to my brand — but EVERY card and detail view keeps the attribution line ('Listed by {office} — {agent}'). That is an IDX compliance rule, not a style choice.",
      "4. Report metrics neutrally: price, beds/baths, days-on-market as plain facts. Never label a listing 'stale', 'overpriced', or similar — no editorializing about other agents' listings.",
      "",
      "Show me the diff of what you changed and check the page still renders live data afterward.",
    ].join("\n"),
  },
  {
    id: "add-the-map",
    title: "Tune the map",
    summary: "Customize the scaffolded Leaflet map: pins, popups, and map/grid linking.",
    order: 5,
    body: [
      "Improve the map view in my scaffolded ChatRealty site.",
      "",
      "1. The scaffold already ships a Leaflet map (`components/ListingMap`, client-only) with price-label pins. Customize pin styling and the popup to my brand — the popup keeps the photo, price, address, a 'View listing' link, AND the listing attribution (agent + office).",
      "2. Keep the map and the grid on the SAME data source (the site's `/api/listings` proxy) so the two views never disagree.",
      "3. If my listing set grows large, add viewport-based fetching (query by the visible bounds) rather than loading everything; keep it lightweight — no heavy map SDKs, no base64 images in markup.",
      "4. Link the views: selecting a card highlights its pin, and clicking a pin can scroll the grid.",
      "",
      "Verify pins, popups, and links against a real listing before we call it done.",
    ].join("\n"),
  },
  {
    id: "wire-favorites-and-lead-capture",
    title: "Wire favorites + lead capture",
    summary:
      "Guest favorites plus an inquiry form that lands leads in your ChatRealty CRM — write-only from the visitor's side.",
    order: 6,
    body: [
      "Polish favorites and lead capture in my scaffolded ChatRealty site.",
      "",
      "1. Favorites are guest-side today by design: the scaffold stores hearts in localStorage (`lib/favorites.ts`). Keep that model; synced visitor accounts are a ChatRealty roadmap feature, so don't invent a custom auth system for favorites.",
      "2. Lead capture: the inquiry form posts to the site's `/api/lead` route, which forwards server-side to ChatRealty's `POST /api/skill/contacts/from-signup`. Each submission is deduped into MY ChatRealty CRM (Contacts) — remind me to check new leads on my ChatRealty dashboard.",
      "3. The visitor side is WRITE-ONLY: the page never reads or displays anything from my CRM, and the API response returns no PII. Show a friendly 'Thanks — we'll be in touch' on success.",
      "4. Keep the spam defenses the scaffold ships (honeypot field + per-IP rate limit on `/api/lead`) — if you touch the form, keep both intact and test them.",
      "",
      "Finish by submitting one test lead and confirming with me that it appeared in my ChatRealty Contacts.",
    ].join("\n"),
  },
  {
    id: "build-neighborhoods",
    title: "Build neighborhoods",
    summary: "Generate neighborhood pages from live market stats — neutral, factual, SEO-friendly.",
    order: 7,
    body: [
      "Build out neighborhood pages for my scaffolded ChatRealty site.",
      "",
      "1. The scaffold ships `app/neighborhoods/[slug]` backed by `/api/skill/market/stats` plus a listings query for the area. For each city or subdivision I care about, generate a page: a short factual overview, key stats as a table (median price, average price, days-on-market, active count), and a grid of current listings with attribution on every card.",
      "2. Use the connected `get_market_stats` / `get_neighborhood_info` tools to confirm which areas have data. Where a subdivision has no stats, fall back to its city cleanly instead of erroring.",
      "3. Keep the copy NEUTRAL and factual — report metrics as plain facts. Never call a market or listing 'hot', 'stale', 'overpriced', or 'distressed'; no editorializing about other agents' listings.",
      "4. Cross-link neighborhoods to each other and to the main listings search for SEO; add structured data where it helps.",
      "",
      "Start with the areas I name, show me one finished page, then batch the rest.",
    ].join("\n"),
  },
  {
    id: "wire-your-blog",
    title: "Wire your blog",
    summary:
      "Serve your ChatRealty CMS blog on your own site — Claude drafts and publishes posts, no CMS login needed.",
    order: 8,
    body: [
      "Add a blog to my site, powered by my ChatRealty CMS.",
      "",
      "1. My posts live in ChatRealty's CMS and serve BOTH my own site and my tenant site. The scaffold already ships the blog (/blog index + post pages, pulling my PUBLISHED articles server-side; sample posts appear in test-data mode) — restyle it to my brand rather than rebuilding it.",
      "2. To create content: draft with `create_article` (blog posts, market insights, real-estate tips — pull my profile and market context first so it isn't generic). Show me the draft in chat.",
      "3. Publish ONLY when I explicitly approve, via `update_article` with `status: 'published'` — that runs the full CMS publish pipeline, including my Google Business cross-post if connected. Never publish on your own initiative.",
      "4. This works even while my listing data setup is still pending — content now, listings when my feed lands.",
      "",
      "Keep the copy factual and neutral; no editorializing about other agents' listings, ever.",
    ].join("\n"),
  },
] as const;

/** Look up a prompt by its stable id. Returns undefined on miss. */
export function getBuildGuidePrompt(id: string): BuildGuidePrompt | undefined {
  return BUILD_GUIDE_PROMPTS.find((p) => p.id === id);
}

/** All prompt ids, in build order. */
export function buildGuidePromptIds(): string[] {
  return [...BUILD_GUIDE_PROMPTS]
    .sort((a, b) => a.order - b.order)
    .map((p) => p.id);
}
