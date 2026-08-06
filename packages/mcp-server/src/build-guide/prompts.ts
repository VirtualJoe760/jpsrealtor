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

// The interview interaction contract, shared by every step that asks the agent
// something. Written once and interpolated so the steps can't drift.
//
// WHY THIS EXISTS: the guide used to say "collect it all in one compact message
// using checklists" — which produced a wall of numbered questions the agent had
// to answer in prose. Every modern Claude client has an interactive
// multiple-choice tool (Claude Code: AskUserQuestion), which renders selectable
// chips. Tapping beats typing, so the interview must DRIVE THAT TOOL, one topic
// at a time, instead of printing a questionnaire.
const INTERVIEW_RULE = [
  "HOW TO ASK — this is not optional, and it applies to every question in this step:",
  "- USE YOUR INTERACTIVE MULTIPLE-CHOICE TOOL (in Claude Code it is `AskUserQuestion`) for every question that has predictable answers. It renders tappable options. NEVER print a numbered list of questions and ask me to write prose answers — that is the failure mode this rule exists to prevent.",
  "- ONE TOPIC AT A TIME. Ask, wait for my answer, then ask the next. Do not front-load the whole interview. A single tool call may carry a few tightly-related questions (the tool takes up to 4, each with up to 4 options), but never dump every topic at once.",
  "- Long checklists get SPLIT across sequential calls, not crammed in: the tool allows at most 4 options per question, so a 10-item feature list becomes several grouped questions ('Search & browsing', 'Engagement', 'Content'), each with `multiSelect` on so I can tick several. Use multiSelect for every check-all-that-apply question.",
  "- Make options concrete and self-explanatory — each needs a short label plus a one-line description of what it means for my site. Put your RECOMMENDATION first and mark it '(Recommended)'. The tool always offers a free-text escape, so never add your own 'Other' option.",
  "- Genuinely open questions (my license number, my phone, my brand colors, the market I serve) are NOT multiple choice — ask those directly in chat, one at a time. Never invent fake options for a factual field.",
  "- NEVER ask what you already know. Check `my_agent_profile` first and skip anything it answers; confirm rather than re-ask.",
].join("\n");

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
      "ChatRealty is bring-your-own-data — confirm YOUR tenant database is connected, or start the data-key conversation (serverless: the site syncs itself via an hourly cron, no VPS).",
    order: 1,
    body: [
      "Before we build, check my ChatRealty data source. ChatRealty is bring-your-own-data: my own MLS feed seeds my own tenant database — there is no shared listing pool.",
      "",
      "1. Call `whoami` and note the `dataSource` field. Talk to me like a product, not a stack trace: no token fragments, no HTTP status codes, no internal field names in your replies.",
      "2. If my data source is CONNECTED (`tenant`): ask me which cities or areas I serve, then probe MY database (one `search_listings` and `get_market_stats` for an area I name) and summarize what my data contains. Then we're ready to build.",
      "3. If NO data source is connected (`none`): do NOT call any listing or market tool, and do not mention any city, market, or listing counts — there is nothing to probe. Instead, start my data setup conversation: ask me ONE question, using your interactive multiple-choice tool (Claude Code: `AskUserQuestion`) rather than plain text — \"Do you have a data key from your MLS (RESO Web API or Spark credentials)?\" with the real paths as options: 'Yes, I have credentials' / 'Not yet — help me apply' / 'Show me the site with sample data first'.",
      "   - If I have one: THIS IS THE BUILD PATH — set my data backend up RIGHT NOW, BEFORE any scaffolding. Do NOT offer test data as an alternative in this branch, and do NOT hand off to the scaffold step until the seed is running or you can name what blocked it. A build that had working credentials in hand and shipped on sample data anyway has FAILED this step, no matter how good the site looks. Fully self-serve — NO SERVER NEEDED: (1) `npx @chatrealty/sync init --token crt_live_…` provisions my dedicated ChatRealty database and writes CHATREALTY_DB_URL into .env.local automatically (the token is the same crt_live one; never paste connection strings into chat). THE PACKAGE NAME IS SCOPED — `@chatrealty/sync`. `npx chatrealty-sync` (unscoped) is a 404 on the npm registry: no such package exists. `chatrealty-sync` is only the name of the COMMAND once installed. Every invocation you type or tell me to type must be `npx @chatrealty/sync …`. EXPLAIN THIS IN PLAIN LANGUAGE, don't just run it: I am a real estate agent, and 'provision a database', 'connection string' and 'database connector' mean nothing to me. Say something like \"this creates your own private copy of your MLS listings that only your site reads, and saves its address into your project so the site can find it — you never have to see or handle that address yourself.\" If a wizard screen or a doc says 'database connector', tell me it means that same address (it starts with postgresql://) and that init already put it where it belongs; (2) add my feed credentials to .env.local — a Spark access token (RESO_BEARER_TOKEN + RESO_BASE_URL) or RESO OAuth (RESO_TOKEN_URL/CLIENT_ID/CLIENT_SECRET), env-only, never in chat. TELL ME WHAT THESE NAMES MEAN before asking me for anything: RESO is the real-estate industry's standard for how an MLS hands out its data, and every MLS vendor speaks it — so the settings are named RESO_* no matter whose credentials I hand you. RESO_BASE_URL is the web address of my MLS's data feed; RESO_BEARER_TOKEN is the password-equivalent that proves I'm allowed to read it. That is why a file labeled 'Spark' maps onto RESO_* names: Spark is a vendor, RESO is the language. THERE ARE NO SPARK_* VARIABLES: Spark is one of the RESO Web API feeds this reads, so a Spark access token goes in as RESO_BEARER_TOKEN and Spark's API root as RESO_BASE_URL (https://replication.sparkapi.com/Reso/OData). If you were handed credentials labeled SPARK_ACCESS_TOKEN / SPARK_OAUTH_KEY / SPARK_OAUTH_SECRET, map them onto these names rather than inventing SPARK_* vars — nothing reads those. And note what CHATREALTY_API_TOKEN is NOT: it authenticates the site to the ChatRealty API, it does not connect a feed. A site with only that token set is reading the shared dataset, not mine; (3) `npx @chatrealty/sync doctor` validates both; (3b) ASK ME WHICH ASSOCIATIONS TO SYNC before pulling anything — one data key often reaches several MLS associations on a shared network, and syncing all of them can be 85k+ listings and ~26 minutes when I probably serve one or two. Run `npx @chatrealty/sync networks`, show me the list with each one's share, and ask me to pick (use your interactive multiple-choice tool, multiSelect, with 'All of them' as an option). Write my picks to RESO_NETWORKS in .env.local — it applies to the seed AND every nightly pull after it; (4) small local test fetch: `npx @chatrealty/sync run --once --dry-run --max 25`; (5) SEEDING + THE DAILY SYNC RUN THEMSELVES: my scaffolded site ships /api/sync/cron — an hourly Vercel cron that syncs in resumable, checkpointed slices. Once the site is deployed with CHATREALTY_DB_URL + the feed credentials (+ a random CRON_SECRET) in its Vercel env vars, a full seed completes unattended in a few hourly ticks and stays fresh forever; progress is at /api/sync/cron?status=1. For an INSTANT first seed instead of waiting on cron ticks, `npx @chatrealty/sync run` locally does the whole thing in one sitting — the checkpoint lives in my database, so local runs and the Vercel cron hand off to each other seamlessly. (Advanced alternates for unusual scale: a GitHub Actions scheduled workflow or a VPS cron — same package, same checkpoint.) After the seed, `whoami` shows dataSource `tenant` and we build on MY data. (5b) EXPECT RATE LIMITS, AND DO NOT READ THEM AS FAILURE. MLS feeds throttle per API KEY, so the quota an earlier run spent is still spent — a brand-new seed can hit `429 Too Many Requests` on its very first page. The sync retries automatically, honors the feed's own Retry-After, and checkpoints into my database after EVERY page, so a 429 that outlasts the retries costs one page, not the run. If it stops on 429: say plainly that my credentials are fine and the feed is just throttling, wait (15-60 minutes is typical) and re-run `npx @chatrealty/sync run` — it resumes from the checkpoint. Never re-init, never conclude the setup is broken, and never file a bug for a 429. (6) THE SEED IS NOT DONE UNTIL /listings PROVES IT — AND 'HAS ROWS' IS NOT 'HAS INVENTORY'. The number that decides whether my site shows anything is ACTIVE FOR-SALE listings, nothing else. Feeds are walked oldest-record-first, so a partial seed is mostly CLOSED archival sales — comps, not inventory — and a site built on it browses empty. `doctor` reports the Active for-sale count specifically; trust that line, not the total row count. Two judged sessions saw a non-zero row count (500, then 3,600), assumed the data step was finished, found an empty browse, and filed a critical API bug against a correctly-working API — in the second case the database's ONE Active row was a rental lease, which the browse excludes by design because it shows homes for sale. So: if the browse is empty, the FIRST hypothesis is 'the seed has not reached current listings yet', not 'the API is broken'. `--once` caps at 500 arbitrary records — it is a smoke test, and the 500 are often mostly one city; the sync now says so in its own output. A judged session read `pulled=500` as success, built the whole site on that slice, and got a browse full of the wrong city. So after a REAL seed (`npx @chatrealty/sync run`, no --once, no --max), open /listings and confirm the homes shown are in the cities I actually serve. If they are not, that mismatch IS the finding — do not move on. Check the dev-server console first: the site prints which source the market scope came from (MARKET_CITIES / AGENT_SERVICE_AREAS / my profile) and the cities it resolved to. If that line disagrees with .env.local, you edited .env.local without restarting the dev server — Next reads it only at startup. (7) TEST THE CRON LOCALLY — Vercel cannot call localhost, so nothing fires it in dev and it is easy to ship untested: `curl -H \"Authorization: Bearer $CRON_SECRET\" \"http://localhost:3000/api/sync/cron?status=1\"` should return progress JSON, not `unauthorized` and not `skipped`.",
      "   - If I don't: explain how agents get one (your MLS or association's data-services / IDX / RESO Web API application) and offer to draft that request with me.",
      "   - ONLY IF I have no credentials yet, or I explicitly chose 'Show me the site with sample data first': tell me the good news that I don't have to wait — I can see the full site working NOW on clearly-labeled TEST DATA while the feed application is in motion. Test data is the FALLBACK for that case, not a parallel option offered to everyone: if I have credentials, the bullet above is the path, and test data is reachable only after the seed is genuinely blocked and you have told me exactly what blocked it. Then HAND OFF TO THE SCAFFOLD STEP and let it own every build decision — this step is purely diagnostic (here's your data situation, here's how to fix it); it never runs a generator itself. The rules that travel with test data: always call it test data, never present those listings as real, and NEVER deploy to Vercel or any host while it runs on test data — test data is localhost-only (the build hard-fails on deploy attempts in test mode by design; do not work around it). The banner stays until my real feed is connected. Never scrape, never invent additional listings, never build a local stand-in database beyond the bundled samples.",
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
      "Four interactive questions, then build — the first site the agent sees is already THEIRS, never the neutral wireframe. Compliance and brand details are collected at the reveal, not up front.",
    order: 2,
    body: [
      "Scaffold my real-estate website using ChatRealty's official generator.",
      "",
      "0. VOICE — this governs every word you say to me in this build: confident consultant, plain English. NEVER narrate your internal mechanics — no 'let me pull the build guide / playbook / your profile', no tool names, no 'template' or 'scaffold' talk, no explaining why you're about to ask something. Just ask the next question or show the next thing. ('Excellent — tell me about your real estate business.' — that's the register.)",
      "",
      INTERVIEW_RULE,
      "",
      "0a. CONFIRM WHOSE SITE THIS IS BEFORE THE FIRST BUILD COMMAND. Call `whoami` and check the account it returns against the person you were asked to build for. The token decides whose profile hydrates the site AND whose CRM the leads land in — an AGENT_* override paints over the fields you set and nothing else. A judged session ran the entire build, including the MLS sync and the tenant database, on a token minted for a different agent; every gate that touches 'is this the right person' failed and the whole session was wasted. If `whoami` is not the expected person, STOP and say so — do not build and do not paper over it with overrides.",
      "0b. NON-NEGOTIABLES — these are defects if you get them wrong, not preferences:",
      "   - MOBILE-FIRST, ALWAYS. Design and build the small screen first, then widen. Most of my visitors are on phones. A layout that only looks right on a desktop is a failed build, not a first draft.",
      "   - A DEDICATED MAP PAGE IS FULL-WIDTH/FULL-BLEED. If the map has its own page, it fills the viewport — no narrow centered column, no card wrapper.",
      "   - MAPS MUST CLUSTER. Never render one marker per listing unclustered: a real feed is hundreds or thousands of homes and an unclustered map janks or dies. The scaffold ships clustering — keep it, and verify at a zoomed-out level that pins collapse into counts.",
      "   - SAVING IS BEHIND AUTH, ALWAYS. A 'Saved'/'Favorites' surface must never be reachable by a signed-out visitor. Tapping the heart, swiping right, or opening Saved while logged out opens the sign-in dialog. This is the funnel that turns visitors into MY leads — an ungated saved list silently breaks it.",
      "   - THE COPY MAY NOT PROMISE A FEATURE THE SITE DOES NOT HAVE. Every claim you write into the page has to be true of THIS build at the moment you write it. A judged build shipped a homepage promising 'Live GPS MLS data — homes actually on the market today' over a browse showing zero homes, and 'CHAP answers real questions about any home' with no CHAP widget on the page because no chat key was configured. Marketing copy about an unwired feature is a defect, not enthusiasm: it is the first thing a visitor tests and the fastest way to make a real agent look untrustworthy. Wire the feature, or cut the sentence — and if you cut it, tell me which feature is missing and what turning it on takes.",
      "   - THE COMPLIANCE LINE SHOWS MY LICENSE, NEVER A CITY. It reads: my name | DRE# {license} | brokerage | team (if any). Do not substitute an office location for the license number. If the license is missing from my profile, say so plainly and tell me to finish setup — do not paper over it with a city.",
      "   - THE SITE SHOWS WHOEVER IT IS FOR, NOT WHOEVER OWNS THE TOKEN. Identity (name, license, brokerage, bio, headshot, service areas) hydrates from the ChatRealty profile the token belongs to — right when the token is mine, wrong the moment it isn't, and wrong whenever the interview turned up details the profile doesn't carry yet. The fix is the `AGENT_*` overrides in .env.local (AGENT_NAME, AGENT_LICENSE, AGENT_BROKERAGE, AGENT_PHONE, AGENT_EMAIL, AGENT_HEADLINE, AGENT_TAGLINE, AGENT_BIO, AGENT_HEADSHOT, AGENT_SERVICE_AREAS, AGENT_SPECIALIZATIONS — see env.example); each one set wins over the API for that field alone. NEVER hardcode identity into a component as a fallback: `agent.name || \"Jane Smith\"` never fires when the API returns a real-but-wrong name, and a judged build shipped every page, title and CTA under the token holder's name because of exactly that. After the first render, READ what the header, the <title> and /about actually say and confirm it is the right person before moving on.",
      "",
      "1. THE ESSENTIALS — FOUR QUESTIONS, THEN YOU BUILD. Check `my_agent_profile` FIRST and skip anything it already answers. Then ask ONLY what you need to make the first version look like mine, one interactive question at a time. Open by setting the finish line out loud — 'Four quick questions and I'll have your site up' — and then honor it. Do NOT run the scaffolder until these are answered; do NOT ask anything from the deepen list (step 6c) yet.",
      "   (a) MY NAME OR MY BRAND — do I go by my own name ('Jane Smith, Real Estate Agent') or a team/brand name? Factual, so ask it directly. If I give a name with a marketing suffix ('Joseph Sardella Real Estate'), keep my actual NAME and the brand name as separate things.",
      "   (b) THE MARKET I SERVE — the city/area my site is about. Factual; ask directly.",
      "   (c) THE FEEL — one interactive question: elegant / warm / bold / minimal, each with a one-line description of what it implies visually. This drives the whole design direction.",
      "   (d) FEATURES — what's built into the framework, as multi-select groups (the tool allows 4 options per question, so split and set multiSelect): SEARCH & BROWSING — CHAP the AI MLS search chat / map-based search / listings grid with filters / swipe-style Discover browsing. SAVING & FOLLOW-UP — favorites/saved homes / a Recommended-for-you row / visitor accounts with saved-home sign-in / lead-capture forms. If I pick favorites or swipe browsing, ask ONE follow-up: how should swiping work — 'Swipe for Favorites' (the card deck opens when I tap a map marker, the way ChatRealty does it) or 'Discover' (a browsing page of its own)? Both use the same deck; only the entry point differs. CONTENT — neighborhood pages with market stats / a blog that writes and publishes through ChatRealty. Recommend a sensible default set so I can just accept it. Only build what I pick; how each one is PRESENTED is design territory, not an interview question.",
      "   (e) ONLY IF step 1 found a connected data source (`tenant`): my ChatRealty API token (`crt_live_…` — minted at chatrealty.io/agent/settings → Integrations, choosing \"Website API token\" when it asks what the key is for; treat it like a password: server-side env only, never in client code, never committed). If there's NO data source, we're building in test-data mode — do NOT ask for a token I don't need yet.",
      "   WHY SO SHORT: everything else — license number, brokerage, contact-gating, colors, logo, headshot, homepage section list — is collected at the FIRST REVEAL (step 6c), when I'm looking at something real and motivated to correct it. 'Must be on the site before it's ever deployed' and 'must be collected before the first command' are different constraints; do not conflate them. Compliance is enforced before launch, not before the first pixel.",
      "2. Run: `npx create-chatrealty-site@latest my-site --token <my token>` — default API base (`https://www.chatrealty.io`) is correct; the CLI verifies the token against `/api/skill/me` (if verification fails, stop and show me the exact message). In test-data mode it's `npx create-chatrealty-site@latest my-site --test-data` with no token. Then `cd my-site && npm install`.",
      "3. KNOW WHAT THE SCAFFOLD IS: plumbing plus a disposable wireframe. It exists to guarantee the parts you must never improvise — the server-side token boundary, IDX attribution, favorites, CHAP, lead capture with spam defenses, security headers. Its neutral look is NOT the product and NOT 'the template we ship' — never present it to me as my site, and never invite me to look at it un-designed.",
      "4. THE MOCK COMES BEFORE THE SITE. You have four answers and strong instincts — that is enough to DESIGN, so design; don't come back for more requirements. Propose the homepage section order yourself from my market and feel (a luxury market and a first-time-buyer market don't want the same page), and let me correct it against the picture rather than imagine it in advance. Create `design/mock.html` in the project — ONE static, self-contained page (inline CSS, no build step) that shows me the design before you build it: a brand board (the actual palette as swatches with hex values, the type pairing), a full homepage comp, and VARIANT STRIPS I can react to — 2–3 hero treatments, CHAP presented as a floating chat widget vs a full-page experience vs an inline panel, 2–3 map pin/tile styles, and listing-card layout options. Open the mock in the browser, then collect my reaction WITH YOUR MULTIPLE-CHOICE TOOL — one question per axis ('Which hero?' → the variants you actually drew, described in a few words each; 'CHAP presentation?'; 'Map pins?'; 'Card layout?'), so I'm picking from what's on screen instead of composing a critique. Iterate the flat mock until I approve it. Iterating a mock takes seconds; iterating a built site doesn't.",
      "5. THE APPROVED MOCK IS THE DESIGN CONTRACT. It stays in the repo at `design/mock.html`; now implement the real site to MATCH it — globals.css/tailwind theme, fonts via next/font, layout header/nav/footer, the homepage, listing cards. When you show me the site, it should look like the mock I approved — that predictability is the point. If the build must deviate from the mock, say where and why.",
      "6. FIRST REVEAL + smoke-check in the same look: listings grid shows data; map renders pins; 'Listed by {office} — {agent}' attribution renders on the CARDS and the detail page and the map popup (hard IDX display rule — check the cards specifically, that is where it goes missing); the favorites heart persists; the inquiry form submits; /blog, /about, /contact render under the RIGHT NAME (see the identity rule in 0b — read the header and <title>, don't assume); /neighborhoods lists the markets I actually serve, not a scatter of cities from elsewhere in the feed (it is built from my service areas — set AGENT_SERVICE_AREAS in .env.local if my profile has none).",
      "6a. CHECK THE UNFILTERED BROWSE — the page a visitor lands on. Open `/listings` with NO filters and READ THE CITY on the first dozen cards, then do the same for the homepage's featured homes. Every one of them has to be a market I serve. The feed is always wider than my market (the shared dataset is statewide; a real MLS covers its whole association), so an unscoped browse serves the newest listings from anywhere: a judged Coachella Valley build opened on Camarillo, Oxnard, Oakland, Los Angeles and Stockton, and 22 of the first 23 homes were outside the market the site claimed. The city filter working is NOT evidence the default works — the default is what a buyer sees first. The template scopes the browse to MARKET_CITIES, else AGENT_SERVICE_AREAS, else the profile's service areas; if none of those is set it serves the whole feed and prints a warning in the dev server log plus a dev-only notice on /listings. Set MARKET_CITIES in .env.local and reload until the cities are mine.",
      "6a-2. AND CHECK WHERE THE LINKS GO. Click a listing card, a CHAP result and the swipe deck's 'View details' — every one must stay on THIS site (/listings/{key}). Anything that navigates to chatrealty.io is a bug: the site is the destination, not a funnel to the hub. The listing objects carry a `detailUrl` that points at the hub — it's there for chat artifacts, not for site links; use `listingHref(listingKey)` from `lib/links.ts`. Photos are on-site too: the detail page renders the whole set through `components/PhotoGallery.tsx` (hero + thumbnail strip + full-screen viewer). There is no 'View all N photos' link any more — it used to point at the hub's gallery and was replaced, so if you go looking for it to check where it lands, it is gone on purpose.",
      "6a-3. OPEN THE LISTING DETAIL PAGE AT 375px BEFORE YOU CALL THE BUILD DONE. Not the homepage — the detail page, which is the surface a buyer actually reads. Set the viewport to 375px, load /listings/{key}, and try to scroll sideways. If it moves, the layout is broken. The trap is CSS Grid, not Tailwind: a `col-span-2` child inside a parent whose columns are only declared at `lg:` makes the grid invent two implicit auto-sized columns, and they size to CONTENT — a judged build measured its main column at 3,112px inside a 375px screen. Always pair the mobile base with the breakpoint (`grid-cols-1 lg:grid-cols-3`, `col-span-1 lg:col-span-2`) and add `min-w-0` to grid/flex children that hold text or a map.",
      "6a-4. TEST 'BACK TO LISTINGS' BY CLICKING IT, NOT BY READING THE HREF. Filter /listings (beds 3+, max price), open a listing, click '← Back to listings', and read the ADDRESS BAR: the params must still be there and the filter inputs must still be filled. A correct href can still land on a bare page — /listings re-applies the search from its own URL, so any filter it doesn't parse gets erased on arrival. Inspecting the DOM proves nothing here; only the round trip does.",
      "6b. Enable CHAP (the on-site property chat — ChatRealty's flagship search experience): ask me for an LLM API key (Groq recommended — console.groq.com, generous free tier; any OpenAI-compatible provider works), set CHAT_API_KEY in .env.local (server-side only, never in chat or client code), restart dev. Present CHAP the way the approved mock shows it by setting ONE constant — `CHAP_PRESENTATION` in `lib/chap-presentation.ts` — to \"widget\", \"panel\", or \"search\". That is the whole wiring step: the presentations you did not pick render nothing and `/search` 404s unless it IS the pick, so there is nothing to delete and no way to leave two live at once. Test it with a real search like '3 beds under 800k with a pool'. It works in test-data mode too.",
      "6c. NOW DEEPEN — the interview you deferred, asked against a real site. I can see my site, so this is the moment I'll happily fill in details; keep using the interactive tool, a topic at a time, and tell me why each one matters:",
      "   - COMPLIANCE (required before we can ever launch, so get them now): license ID number, brokerage, and team name if one exists. These must be present and easily viewable on the site — always including the footer, on every page. Put them in as soon as I give them: if my ChatRealty profile doesn't carry them yet, set AGENT_LICENSE / AGENT_BROKERAGE in .env.local so they show on the site immediately — AND QUOTE THE LICENSE VALUE. In a .env file `#` begins a comment, so `AGENT_LICENSE=CA DRE #02241837` stores `CA DRE ` and the number vanishes from the footer with no error at all. California's standard format always contains `#`, so this is the normal case: write `AGENT_LICENSE=\"CA DRE #02241837\"`. Then READ THE RENDERED FOOTER and confirm the digits are actually on the page — a missing license number is a compliance failure, not a typo, and tell me to add them to my profile too — `set_site_live` checks the PROFILE, so an env override alone will still block go-live. If I don't have them handy, note plainly that the site cannot go live without the license number and move on.",
      "   - CONTACT — my phone and email, then one interactive choice: 'Shown publicly' vs 'Gated behind the contact form.' Honor it everywhere (license/brokerage/team are never gated; contact info is my choice).",
      "   - BRAND SPECIFICS — exact colors if I have them, a logo file if one exists, and my HEADSHOT. If I don't have a professional headshot, offer this: 'Take a quick selfie in a well-lit spot — near a window works — and I'll turn it into a professional headshot.' If image tools are available in this session, produce two versions: a clean transparent-background cutout, and one filled with my brand color; save both to public/ and wire the about/credibility block. If no image tooling is available, say so plainly and continue — never block on a photo.",
      "   - THE HOMEPAGE, now that it's visible — multi-select against what I'm looking at: featured listings / market-stats strip / about-me credibility block / testimonials (offer recent blog posts if I took the blog). Same for an About page if I want one.",
      "   These are exactly the fields that live in my ChatRealty settings — at the end of the build, remind me to save them to my ChatRealty profile so everything stays in sync.",
      "7. Move to the design step to refine the direction with me — updates go into BOTH the mock and the site so the contract stays true.",
      "",
      "Proceed with a real token once step 1 confirmed a connected data source (`tenant` — or `dogfood` for ChatRealty-internal testing). If step 1 found that I HAVE feed credentials but the seed has not run yet, go back and run it — do not reach for `--test-data` as a shortcut past a data setup that was available to you; sample data is for agents who have nothing to connect yet, not for saving time. If no data source is connected and none can be, scaffold in TEST DATA mode instead (`--test-data`, no token) — fictitious sample listings, permanent banner, preview only, never launched publicly; the four-question fast path is identical either way. Do NOT hand-build a site from scratch and do NOT install data-sync tooling yourself — the scaffolder is the supported path, and everything after this step customizes what it generated.",
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
      "VOICE: confident consultant, plain English. Never narrate internal mechanics ('let me pull the guide / your profile'), never mention tools or templates — just propose, show, and ask me to react.",
      "",
      INTERVIEW_RULE,
      "",
      "1. The scaffold step already collected my business details, feature checklist, homepage checklist, and brand basics, produced `design/mock.html`, and got my approval on it — do NOT re-ask any of that. The approved mock is the DESIGN CONTRACT: the site must match it, and every refinement in this step updates BOTH the mock and the site so they never drift. The best questions here are reactions to something visible: propose, then let me pick. If the mock is somehow missing, create it now (per the scaffold step) before restyling anything.",
      "2. Translate PLACE + FOCUS into a design direction and PROPOSE it in words before writing code: palette (actual hex values), type pairing, imagery mood, homepage concept. Reason from my answers — for example, luxury desert might call for warm sand neutrals with an ink or evergreen accent, a serif display over a clean sans, full-bleed photography and generous whitespace; an investment focus might lead data-forward with stat blocks and cash-flow callouts up front; senior living wants a calm palette, high contrast, larger type, simpler navigation. These are reasoning examples, not options to copy.",
      "2b. This is a FRAMEWORK, not a fixed template — the plumbing is locked but the whole look is yours, and every build should look different. Read `DESIGN.md` in the project: it lists the token knobs (--brand scale, --surface, --text, --radius, --font-display/body, --section-gap in globals.css) and the VARIANT AXES to actually vary — hero (full-bleed photo / split / video / search-in-hero / minimal), homepage section set + order, listing-card layout (image-top / horizontal / photo-overlay), CHAP presentation (widget / inline / full-page — one constant, `CHAP_PRESENTATION`), map pin+tile style. Note the two axes are COUPLED in one direction: search-in-hero routes to `/search`, so it is only available when CHAP presentation is full-page. Pick the hero and the CHAP presentation together, not independently. Choose each axis from my market and feel, not from the scaffold's default. Anti-template rule: if the finished site resembles the neutral scaffold, you haven't designed it — start over on the presentation.",
      "3. Once I approve the direction, REDESIGN the presentation layer: `app/globals.css` (set the design tokens) and the tailwind theme (a real palette scale + fonts via next/font), `app/layout.tsx` (header, nav, footer), `app/page.tsx` (the hero variant + section order that fit my positioning), and the listing card/detail styling. Craft bar: one cohesive palette, a consistent type scale, deliberate spacing rhythm, and NO default-looking gray-card template soup.",
      "3b. Two mechanical rules that a judge has caught real builds failing. (a) SHAPE COMES FROM THE TOKEN: `--radius` in globals.css drives Tailwind's whole `rounded-*` scale, so set it once and let every surface follow. Do not shape a container with `rounded-[14px]` or an inline `borderRadius` — a build that did shipped `--radius: 0` and still had rounded corners on the listing-detail hero, the spec box, the inquiry sidebar and the CHAP cards. (`rounded-full` is exempt by design — circles and capsules stay round at any radius.) (b) EVERY NAMED MARKET IS A WORKING LINK: naming the agent's actual areas on the homepage is good copy, but each tile must go to `/neighborhoods/<slug>`, which resolves the name against the feed and renders stats + active homes. Click every tile before you call the homepage done — one build linked its named tiles at a query param the index ignored and all of them landed on the same undifferentiated page.",
      "4. GUARDRAILS — restyle anything, but never remove: MOBILE-FIRST layout (the phone view is the product, not an afterthought); a full-bleed dedicated map page; MAP CLUSTERING (an unclustered map breaks at real listing volume); the AUTH GATE on favorites/saved (signed-out taps open sign-in — never an open saved list); the compliance line showing DRE# and never an office city; the hamburger navigation (standard on EVERY breakpoint including desktop — restyle the button and drawer to my brand, but don't replace it with a horizontal link row); the license number, brokerage, and team name displayed in the footer (compliance — restyle, never remove or bury); the 'Listed by {office} — {agent}' attribution on every card, detail, and map popup (IDX rule); the test-data banner when in test mode; the favorites and lead-capture logic; the server-side token boundary (`lib/` and `app/api/` stay untouched); accessibility basics (contrast, focus states, alt text).",
      "5. Show me the result in the browser, explain what you designed and why, and iterate until I say it feels like MY brand — not a template. Then nudge me to put the same brand details into my ChatRealty profile (chatrealty.io/agent/settings → Branding) so landing pages and articles match.",
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
      "1. SAVING IS AN ACCOUNT FEATURE. When accounts are enabled (a connected tenant), tapping the heart or swiping right while signed out opens the sign-in dialog — visitors sign in with Google, Facebook, or a magic email link (never a password), their guest picks merge into the account, and saves sync across devices and into my CRM. In test-data/preview mode accounts aren't available, so favorites gracefully stay on-device — that's expected, not a bug. Never invent a custom auth system: the plumbing (auth.ts, /api/account/*, /api/auth/*) ships in the scaffold.",
      "1a. SOCIAL LOGIN SETUP (optional but recommended — it makes the site feel professional): Google and Facebook buttons appear automatically once I add MY OWN OAuth app keys to .env.local. Walk me through creating them — drive the browser step-by-step with me when you can: (1) GOOGLE: console.cloud.google.com → new project → OAuth consent screen (External, my brand name) → Credentials → OAuth client ID → Web application → authorized redirect URI EXACTLY `http://localhost:3000/api/auth/callback/google` (add my production domain's twin at go-live) → I copy the Client ID/Secret into .env.local as AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET myself — keys never go into chat. (2) FACEBOOK: developers.facebook.com → Create App (Consumer) → add Facebook Login → Valid OAuth Redirect URI `http://localhost:3000/api/auth/callback/facebook` → App ID/Secret into AUTH_FACEBOOK_ID / AUTH_FACEBOOK_SECRET (note: Facebook needs the app switched to Live mode + app review for public use — start it early). AUTH_SECRET was already generated at scaffold time. Restart dev; the buttons appear in the sign-in dialog on their own.",
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
      "2b. THE INDEX IS A CURATED LIST, NOT A SAMPLE. `/neighborhoods` builds itself from my SERVICE AREAS — the ones on my ChatRealty profile, or AGENT_SERVICE_AREAS in .env.local — and annotates each with live counts. If the index is showing cities I don't serve, my service areas are unset and it fell back to deriving them from the first page of listings; set them rather than filtering the sample harder. A single-market agent whose feed reaches further than that market is the normal case, not an edge case: one judged build serving the Coachella Valley shipped an index of Los Angeles, Oxnard and San Diego this way.",
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
      "2. Deploy the app to Vercel (or any Next.js host): set the env vars from .env.local in the host's dashboard (CHATREALTY_API_TOKEN, CHATREALTY_API_BASE, AUTH_SECRET, and CHAT_API_KEY if CHAP is on) — server-side only, never NEXT_PUBLIC.",
      "2b. CONNECT THE SITE TO MY CHATREALTY SUBDOMAIN: call `connect_site` with the deployment URL. My {subdomain}.chatrealty.io then serves the built site in PREVIEW — visible ONLY to me (via the Preview link on my ChatRealty dashboard) and ChatRealty admins; every other visitor still sees my current ChatRealty page. Tell me to open the preview and click through it with fresh eyes. CHECK WHOSE SUBDOMAIN YOU JUST CLAIMED: `connect_site` and `site_status` act on the account the MCP connection is authenticated as, which is NOT always the person the site is for — `.env.local`'s AGENT_* overrides do not reach the MCP. Call `site_status` and confirm the `subdomain` it returns is MINE before and after connecting. If it names someone else, STOP and say so: the MCP is signed in as the wrong account, and connecting would publish my site onto their subdomain. In that case I run `connect_site` myself from my own session — do not work around it.",
      "2c. When I say it's ready, call `set_site_live` — the subdomain becomes public for everyone. This is compliance-gated server-side: it fails without a license number on my ChatRealty profile. Going live is outward-facing: always confirm with me first. A custom domain (mydomain.com) can point at the deployment separately whenever I'm ready.",
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
