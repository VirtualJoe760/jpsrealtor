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
      "   - EITHER WAY, offer the preview path: while the backend setup is in motion I can see the full site working NOW in TEST DATA mode — `npx create-chatrealty-site@latest my-site --test-data` scaffolds against fictitious sample listings bundled with the package (no token needed). The scaffold step's interview-first rule still applies: collect my design answers and apply them BEFORE the first look — never show me the neutral wireframe as the preview. Rules you must keep: always call it test data, never present those listings as real, and NEVER deploy the site to Vercel or any host while it runs on test data — test data is localhost-only (the build hard-fails on deploy attempts in test mode by design; do not work around it). The site's built-in banner stays until my real feed is connected. Never scrape, never invent additional listings, never build a local stand-in database beyond the bundled samples.",
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
      "Interview first, then one command wires the backend plumbing — the first site the agent sees is already THEIRS, never the neutral wireframe.",
    order: 2,
    body: [
      "Scaffold my real-estate website using ChatRealty's official generator.",
      "",
      "0. VOICE — this governs every word you say to me in this build: confident consultant, plain English. NEVER narrate your internal mechanics — no 'let me pull the build guide / playbook / your profile', no tool names, no 'template' or 'scaffold' talk, no explaining why you're about to ask something. Just ask the next question or show the next thing. ('Excellent — tell me about your real estate business.' — that's the register.)",
      "1. QUESTIONS COME BEFORE ANY BUILDING. Check `my_agent_profile` FIRST and never ask anything it already answers. Then, before you run or show me anything, collect — in one compact message, using CHECKLISTS wherever possible (I tick boxes; I don't write essays):",
      "   (a) MY BUSINESS — plain questions: do I go by my own name ('Jane Smith, Real Estate Agent') or a team/group name? Must-haves you cannot build without: license ID number, brokerage, and team name if one exists — these are COMPLIANCE fields that must be present and easily viewable on the site, always including the footer, on every page. Also collect the market I serve and my phone/email, then ask ONE more question: 'Do you want your phone and email shown publicly on the site, or gated behind the contact form?' — honor the answer everywhere (license/brokerage/team are never gated; contact info is my choice). These are exactly the fields that live in my ChatRealty settings — collect what's missing and, at the end of the build, remind me to save them to my ChatRealty profile so everything stays in sync.",
      "   (b) FEATURES — 'The ChatRealty framework has these built in — check the ones you want on your site:' □ CHAP, the AI MLS search chat □ map-based search □ listings grid with filters □ favorites / saved homes □ swipe-style Discover browsing □ a Recommended-for-you row □ neighborhood pages with market stats □ a blog (writes/publishes through ChatRealty) □ lead-capture forms □ visitor accounts with saved-home sign-in. Only build what I check; how each one is PRESENTED (chat widget vs full-page CHAP, map style, card design) is design-step territory.",
      "   (c) THE HOMEPAGE — 'When someone lands on your site, what should they see? Check all that apply:' □ full-width photo hero □ video hero □ hero with a search bar in it □ a strong call-to-action □ featured listings □ a market-stats strip □ recent blog posts □ an about-me/credibility block □ testimonials. If I want an About page, run the same kind of checklist for it.",
      "   (d) BRAND BASICS — colors if I have them, a logo file if one exists, one feel word (elegant / warm / bold / minimal / editorial), and my HEADSHOT. If I don't have a professional headshot, offer this: 'Take a quick selfie in a well-lit spot — near a window works — and I'll turn it into a professional headshot.' If image tools are available in this session, produce two versions: a clean transparent-background cutout, and one filled with my brand color; save both to public/ and wire the about/credibility block. If no image tooling is available, say so plainly and continue — never block the build on a photo. Deeper design choices happen in the design step against real visuals, not as more questions here.",
      "   (e) my ChatRealty API token (`crt_live_…` — minted at Settings → Integrations, the 'Website & listings' preset is exactly right; treat it like a password: server-side env only, never in client code, never committed).",
      "   Do NOT run the scaffolder until I've replied.",
      "2. Run: `npx create-chatrealty-site@latest my-site --token <my token>` — default API base (`https://www.chatrealty.io`) is correct; the CLI verifies the token against `/api/skill/me` (if verification fails, stop and show me the exact message). Then `cd my-site && npm install`.",
      "3. KNOW WHAT THE SCAFFOLD IS: plumbing plus a disposable wireframe. It exists to guarantee the parts you must never improvise — the server-side token boundary, IDX attribution, favorites, CHAP, lead capture with spam defenses, security headers. Its neutral look is NOT the product and NOT 'the template we ship' — never present it to me as my site, and never invite me to look at it un-designed.",
      "4. THE MOCK COMES BEFORE THE SITE. Create `design/mock.html` in the project — ONE static, self-contained page (inline CSS, no build step) that shows me the design before you build it: a brand board (the actual palette as swatches with hex values, the type pairing), a full homepage comp laid out from my homepage checklist, and VARIANT STRIPS I can react to — 2–3 hero treatments, CHAP presented as a floating chat widget vs a full-page experience vs an inline panel, 2–3 map pin/tile styles, and listing-card layout options. Open the mock in the browser and ask me to react ('hero B, the dark pins, widget chat') — iterate the flat mock until I approve it. Iterating a mock takes seconds; iterating a built site doesn't.",
      "5. THE APPROVED MOCK IS THE DESIGN CONTRACT. It stays in the repo at `design/mock.html`; now implement the real site to MATCH it — globals.css/tailwind theme, fonts via next/font, layout header/nav/footer, the homepage, listing cards. When you show me the site, it should look like the mock I approved — that predictability is the point. If the build must deviate from the mock, say where and why.",
      "6. FIRST REVEAL + smoke-check in the same look: listings grid shows data; map renders pins; a detail page shows 'Listed by {office} — {agent}' attribution (hard IDX display rule); the favorites heart persists; the inquiry form submits; /blog, /about, /contact, and /neighborhoods render (identity hydrates from my ChatRealty profile).",
      "6b. Enable CHAP (the on-site property chat — ChatRealty's flagship search experience): ask me for an LLM API key (Groq recommended — console.groq.com, generous free tier; any OpenAI-compatible provider works), set CHAT_API_KEY in .env.local (server-side only, never in chat or client code), restart dev. Present CHAP the way the approved mock shows it (widget, full-page, or inline). Test it with a real search like '3 beds under 800k with a pool'. It works in test-data mode too.",
      "7. Move to the design step to refine the direction with me — updates go into BOTH the mock and the site so the contract stays true.",
      "",
      "Proceed with a real token once step 1 confirmed a connected data source (`tenant` — or `dogfood` for ChatRealty-internal testing). If no data source is connected yet, scaffold in TEST DATA mode instead (`--test-data`, no token) — fictitious sample listings, permanent banner, preview only, never launched publicly; the interview-first rule applies exactly the same. Do NOT hand-build a site from scratch and do NOT install data-sync tooling yourself — the scaffolder is the supported path, and everything after this step customizes what it generated.",
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
      "VOICE: confident consultant, plain English. Never narrate internal mechanics ('let me pull the guide / your profile'), never mention tools or templates — just propose, show, and ask me to react. Prefer checklists and either/or choices over open-ended questions.",
      "",
      "1. The scaffold step already collected my business details, feature checklist, homepage checklist, and brand basics, produced `design/mock.html`, and got my approval on it — do NOT re-ask any of that. The approved mock is the DESIGN CONTRACT: the site must match it, and every refinement in this step updates BOTH the mock and the site so they never drift. The best questions here are reactions to something visible: propose, then let me pick. If the mock is somehow missing, create it now (per the scaffold step) before restyling anything.",
      "2. Translate PLACE + FOCUS into a design direction and PROPOSE it in words before writing code: palette (actual hex values), type pairing, imagery mood, homepage concept. Reason from my answers — for example, luxury desert might call for warm sand neutrals with an ink or evergreen accent, a serif display over a clean sans, full-bleed photography and generous whitespace; an investment focus might lead data-forward with stat blocks and cash-flow callouts up front; senior living wants a calm palette, high contrast, larger type, simpler navigation. These are reasoning examples, not options to copy.",
      "3. Once I approve the direction, REDESIGN the presentation layer: `app/globals.css` and the tailwind theme (a real palette scale + fonts via next/font), `app/layout.tsx` (header, nav, footer), `app/page.tsx` (hero + sections that fit my positioning — featured listings, a market-stats strip, an about/credibility block, a strong CTA), and the listing card/detail styling. Craft bar: one cohesive palette, a consistent type scale, deliberate spacing rhythm, and NO default-looking gray-card template soup.",
      "4. GUARDRAILS — restyle anything, but never remove: the hamburger navigation (standard on EVERY breakpoint including desktop — restyle the button and drawer to my brand, but don't replace it with a horizontal link row); the license number, brokerage, and team name displayed in the footer (compliance — restyle, never remove or bury); the 'Listed by {office} — {agent}' attribution on every card, detail, and map popup (IDX rule); the test-data banner when in test mode; the favorites and lead-capture logic; the server-side token boundary (`lib/` and `app/api/` stay untouched); accessibility basics (contrast, focus states, alt text).",
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
      "1. Favorites are guest-side today by design: the scaffold stores hearts in localStorage (`lib/favorites.ts`) and ships a swipe-to-save discovery page at /discover (components/SwipeDeck.tsx) — visitors swipe through homes, right/♥ saves to favorites. Keep that model; synced visitor accounts are a ChatRealty roadmap feature, so don't invent a custom auth system for favorites.",
      "1b. The homepage also renders a 'Recommended for you' rail (components/RecommendedRail.tsx) that infers the visitor's taste from their saved homes (dominant city, price band, bedroom floor) and fetches similar active listings — it stays hidden until they've saved at least one home, so a first-time visitor never sees it. Keep it wired on the homepage; restyle freely in the design step but don't remove it (it's the on-site retention loop that turns a swipe into a return visit).",
      "1c. Favorites is an ACCOUNT feature, so it lives in the header account menu (components/AccountMenu.tsx), NOT the primary nav. The scaffold ships a magic-link sign-in (components/SignInDialog.tsx, lib/account.tsx, /api/account/* + /account/verify) that runs through ChatRealty — no password, ever. It degrades gracefully: in test-data/free mode (or before the platform end-user endpoints ship) it shows guest-only mode and favorites stay on-device, lighting up server sync automatically once accounts are enabled. Keep this structure; restyle the menu/dialog to my brand but don't move Favorites back into the top nav or add a password field.",
      "2. Lead capture: the inquiry form posts to the site's `/api/lead` route, which forwards server-side to ChatRealty's `POST /api/skill/contacts/from-signup`. Each submission is deduped into MY ChatRealty CRM (Contacts) — remind me to check new leads on my ChatRealty dashboard.",
      "3. The visitor side is WRITE-ONLY: the page never reads or displays anything from my CRM, and the API response returns no PII. Show a friendly 'Thanks — we'll be in touch' on success.",
      "4. Keep the spam defenses the scaffold ships (honeypot field + per-IP rate limit on `/api/lead`) — if you touch the form, keep both intact and test them.",
      "4b. Optional bot check: the form supports Cloudflare Turnstile (components/Turnstile.tsx) with the agent's OWN keys. It's off unless they set NEXT_PUBLIC_TURNSTILE_SITE_KEY + TURNSTILE_SECRET_KEY (free at dash.cloudflare.com → Turnstile) — the widget hides itself and /api/lead skips verification when unset. Offer to turn it on if they want stronger lead-form protection; don't require it.",
      "4c. The scaffold ships a middleware.ts with baseline security headers (nosniff, SAMEORIGIN framing, referrer policy, a lean permissions policy, and a CSP that allows Turnstile). Keep it — it's the agent's own single-tenant site, so this is standard hardening, not multi-tenant isolation.",
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
  {
    id: "go-live",
    title: "Go live",
    summary:
      "Deploy to Vercel with real data, then put the domain behind the agent's own Cloudflare for listing edge-cache + bot protection.",
    order: 9,
    body: [
      "Take my ChatRealty site live.",
      "",
      "1. PRECONDITION — compliance and real data. Do NOT deploy unless my LICENSE NUMBER is on the site and visible in the footer (along with brokerage and team name if one exists) — if I haven't provided a license number, stop and ask for it; no license, no launch. And NEVER deploy while the site runs on test data (CHATREALTY_TEST_DATA is set): the build hard-fails in that mode by design, and sample listings must never be public. Confirm my real feed is connected and CHATREALTY_API_TOKEN is set before deploying. If I'm still on test data, stop and tell me what's needed to connect my feed.",
      "2. Deploy the app to Vercel (or any Next.js host): set the env vars from .env.local in the host's dashboard (CHATREALTY_API_TOKEN, CHATREALTY_API_BASE, and CHAT_API_KEY if CHAP is on) — server-side only, never NEXT_PUBLIC. Point my domain at the deployment.",
      "3. Cloudflare — I set this up in MY OWN Cloudflare account (ChatRealty does not manage it); it does DOUBLE DUTY:",
      "   a. LISTING EDGE CACHE (the reason it matters): the public listing routes already send `Cache-Control: public, s-maxage=…, stale-while-revalidate=…` (see lib/chatrealty.ts REVALIDATE + /api/listings). Put my domain behind Cloudflare (proxied / orange-cloud) and let it honor those origin cache headers — listing data then serves from Cloudflare's edge, so visitors are fast and my ChatRealty API calls collapse to ~once per revalidate window instead of once per pageview. Do NOT edge-cache anything user-specific (favorites, /api/lead, /api/chat) — those send no-store and must stay uncached; if I add a custom cache rule, scope it to the listing/read routes only.",
      "   b. TURNSTILE bot protection on the lead form (optional) — my own site key + secret (dash.cloudflare.com → Turnstile, free). Set NEXT_PUBLIC_TURNSTILE_SITE_KEY + TURNSTILE_SECRET_KEY; unset = honeypot + rate-limit only.",
      "4. After deploy: confirm listings load on the live domain, submit one test lead and check it landed in my ChatRealty Contacts, and (if CHAP is on) run one live chat search.",
      "",
      "Cloudflare is MY infrastructure to provision — walk me through the account/DNS steps rather than doing them for me, and never ask me to paste secrets into chat.",
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
