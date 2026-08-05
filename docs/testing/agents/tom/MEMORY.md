# MEMORY — Tom, Judge

## Sessions run

| # | Date | Persona | Market | Positioning | Design | Score | Report ID |
|---|---|---|---|---|---|---|---|
| 5 | 2026-08-04 | Priya Manohar, Valley Oak RE | Sacramento | first-time buyers | warm oak and linen | 75/100 | 6a720288802beca327a12604 |
| 6 | 2026-08-04 | Marcus Delgado, Pacific Shores Realty Group | Orange County (Newport Beach / Irvine) | luxury / relocation | light and architectural | 67/100 | 6a722458e7d6e9479406a685 |
| 7 | 2026-08-04 | Diane Calloway, Desert Key Properties | GPS MLS / La Quinta area | vacation rental investment + retirement relocation | sun-bleached terracotta and shadow | 67/100 | 6a727972342e901959414c90 |
| 8 | 2026-08-04 | Carter Winslow, Fairway & Desert Realty | GPS MLS / Rancho Mirage, Indian Wells, Palm Desert | luxury golf-course and country club | midnight blue and burnished gold | 55/100 (filed) / 78/100 (my read) | 6a72875a538234b9a409b168 |
| 9 | 2026-08-05 | Sandra Okafor, Coachella Valley Homes Realty | GPS MLS / Cathedral City, Desert Hot Springs, Thousand Palms, Sky Valley | family relocation, mid-market | bright and optimistic, clean lines and desert light | 82/100 — Gate 7 FAIL (not ship-ready) | 6a72977fd46d2f4499086401 |

## Recurring issues across sessions

- **CHAP two-presentation conflict (session 5):** Builder chose HeroSearch-in-hero and kept ChapWidget in layout — two accessible CHAP presentations. DESIGN.md is explicit about removing the unchosen presentation. HeroSearch.tsx itself warns. Likely to recur if brief doesn't call this out.
- **MCP tools unavailable in subagent context (session 5):** report_bug, give_feedback, whoami not accessible. No bugs can be filed in-session. Source zip lands in /tmp rather than submitted via give_feedback. Needs resolution before the build guide's process expectations are achievable.
- **Browser unreachable for judging (session 5+):** OpenClaw policy blocks localhost navigation. Judging via curl + source inspection. Carries scoring gaps for visual, console, and interactive verification. Consistent -5 to -10 pts across Buyer's Journey and CHAP dimensions.
- **Hardcoded Tailwind radius classes bypassing --radius (session 6):** Builders often use `rounded-xl`/`rounded-2xl` Tailwind classes instead of `style={{ borderRadius: "var(--radius)" }}`. These bypass the design system variable. Flag in coaching every session until it stops recurring.
- **Neighborhood homepage links with ignored query params (session 6):** Homepage neighborhood tiles linked to `/neighborhoods?q=City Name` but the index page doesn't consume searchParams. Links are effectively dead. Watch for this pattern in future builds.
- **npm vs committed version mismatch (sessions 5–6):** The routine's resolutionNotes describe fixes committed but not released to npm. Builders scaffold 0.8.0; the guide's instructions reference 0.9.0 features (CHAP_PRESENTATION constant). Include workaround instructions in briefs until 0.9.0 publishes. ← RESOLVED in 0.10.0 (verified session 7).
- **Agent identity always resolves to dogfood account (Joseph Sardella), not the brief persona (sessions 5–7, structural):** `getAgentProfile()` returns the token-holder's live ChatRealty profile. Dogfood token = Joseph Sardella. No env override path exists for test runs. Gate 3 is structurally unpassable on the dogfood token until product adds env override (AGENT_NAME/AGENT_DRE/etc.) or guide adds pre-build step to configure ChatRealty profile. Carry into all future briefs: brief's persona hardcoded in layout as fallback, but fallback only fires when API returns null name — dogfood account has non-null name.
- **Neighborhood index derives city list from unfiltered 50-listing sample (session 7):** `searchListings({ limit: 50 })` with no city filter returns whatever the token's data scope surfaces first. Dogfood account returns national inventory — Los Angeles, Oxnard, San Diego dominate the index instead of GPS cities. Homepage hardcoded tiles work; index page is wrong. Fix: neighborhood index should use a curated hardcoded city list, not derive from a listing sample.
- **Search API omits attribution fields on dogfood token path (session 7):** `listAgentName`/`listOfficeName` absent from search results for dogfood token. Attribution component correctly renders nothing. Detail pages always include attribution. ListingSummary type marks these optional with note: "Present on the tenant/product token path." Gate 1 unverifiable on cards for dogfood builds. ← RESOLVED in v0.11.0 (session 8 confirmed attribution on all card surfaces including CHAP results).
- **Agent identity AGENT_* overrides:** RESOLVED in v0.11.0. AGENT_NAME, AGENT_LICENSE, AGENT_BROKERAGE, AGENT_PHONE, AGENT_EMAIL, AGENT_HEADLINE, AGENT_TAGLINE, AGENT_BIO, AGENT_SERVICE_AREAS, AGENT_SPECIALIZATIONS all work. Gate 3 passable. (session 8 confirmed)
- **Neighborhood index GPS scope:** RESOLVED in v0.11.0. Index built from AGENT_SERVICE_AREAS, fan-out to real per-area stats. (session 8 confirmed)
- **Default /listings browse not restricted to service area (session 8):** `searchListings({ limit: N })` with no city filter returns national dogfood inventory. 22 of 23 first listings were non-GPS on session 8. `ListingsBrowser` starts with `city: ""`. Gate 3 failure. Root: no service-area filter applied by default. ← **RESOLVED in v0.12.0** — MARKET_CITIES env var scopes default browse. Confirmed session 9: all 24 unfiltered cards in Sandra's service area cities.
- **CHAP result cards link off-site to chatrealty.io (session 8):** `ChapMessages.tsx` uses `l.detailUrl`. Bug filed: 6a7285cb961c94294892466f. ← **RESOLVED in v0.12.0** — all CHAP cards now use listingHref(). Confirmed session 9.
- **CHAP conversational question recycles prior search results (session 8):** After a listing search, a market question returned the same listing results. ← **RESOLVED in v0.12.0** — CHAP routes market questions to get_market_stats. Confirmed session 9.
- **401 on /api/account/oauth-bridge every page load (session 8):** ← **RESOLVED in v0.12.0** — me now reports oauthPending; client only bridges when needed. Zero 401s in session 9.
- **Race condition between cron firings and Test Claude completion (session 8):** Test Claude completed session 8 at ~17:39 PDT; completion message arrived to me ~5 min after a cron filing. Two scoring sessions ran against the same build. BRIEF.md now instructs Test Claude to write COMPLETE marker and SESSION-NOTES.md last; session 9 child exited before writing either (same process failure, different root — child exited early rather than running twice).
- **Two presentation CHAP conflict RESOLVED (v0.10.0+):** CHAP_PRESENTATION constant enforces single presentation at build time. Confirmed session 8.
- **Tailwind radius token bypass RESOLVED (v0.11.0):** All `rounded-*` classes now map to `var(--radius)` via tailwind.config.ts. Confirmed session 8.
- **"Back to listings" filter preservation (session 9 regression):** Session 8 resolution notes said "Back to listings keeps the search filters." Session 9: broken again. Link href in DOM is correct (encodes params in `?back=` param) but Next.js navigation strips query params when the link is followed. Check every session — this is fragile and has now regressed once after being marked fixed.
- **Listing detail page horizontal overflow at 375px (session 9 — Gate 7):** Parent `mt-4 grid gap-8 lg:grid-cols-3` has no single-column mobile fallback. Child `lg:col-span-2` renders at 3112px at 375px viewport. Fix: add `grid-cols-1` to the parent. Brief coaching: check the listing detail page at 375px before calling the build done.
- **"View all N photos" absent from swipe deck (session 9):** Session 8 resolution notes claimed the link now routes on-site. In session 9 the link doesn't exist in the swipe deck at all — only "View details →" is present. Either removed rather than rerouted, or fix didn't land in v0.12.0.
- **Real RESO data path confirmed working (session 9 — MILESTONE):** First session with real GPS listing data. Path: `npx @chatrealty/sync init --token $CHATREALTY_API_TOKEN`, then `RESO_BEARER_TOKEN` (from `SPARK_ACCESS_TOKEN` in credentials file), `RESO_BASE_URL=https://replication.sparkapi.com/Reso/OData`. Old `SPARK_OAUTH_KEY`/`SPARK_ACCESS_TOKEN` naming convention reads nothing. The brief's updated RESO path is correct. Carry this into every future brief.
- **Child session process failure (sessions 8 and 9, consistent pattern):** Both sessions: child exited after starting dev server without writing SESSION-NOTES.md, COMPLETE marker, or sending a completion message. No `report_bug` filings confirmable. Pattern: child builds and starts the server, then exits. Process dimension likely to stay at 4/10 until this is resolved. BRIEF.md is explicit about writing both files — child ignores it. May need to be in the task string, not just BRIEF.md.

## Combos used — don't repeat too soon

- Sacramento / first-time buyers / warm oak and linen (session 5, 2026-08-04)
- Orange County (Newport Beach / Irvine) / luxury relocation / light and architectural (session 6, 2026-08-04)
- GPS MLS La Quinta area / vacation rental investment + retirement relocation / sun-bleached terracotta and shadow (session 7, 2026-08-04)
- GPS MLS Rancho Mirage / Indian Wells / Palm Desert / luxury golf-course country club / midnight blue and burnished gold (session 8, 2026-08-04)
- GPS MLS Cathedral City / Desert Hot Springs / Thousand Palms / Sky Valley / family relocation mid-market / bright and optimistic clean lines desert light (session 9, 2026-08-05)

## Standing rules to carry into briefs

- GPS MLS only (Palm Springs / Coachella Valley region) — sessions 5 and 6 used Sacramento and Orange County, both unjudgeable for IDX/attribution reasons; GPS is the only valid market
- California only for market
- Fictitious persona, internally consistent
- Credentials path: /Users/macdaddyjoe/Downloads/spark-rep (1).txt (quote the spaces/parens)
- Brief goes in BRIEF.md, not the task string
- Localhost only, never deploy
- **CHATREALTY_JUDGE_TOKEN is for the testing API only — never goes in a brief as the site token.** Using it as the build token blocks tenant DB provisioning (HTTP 403). This was the structural gap in sessions 1–8.
- **Brief must include:** (1) database connector from chatrealty.io setup wizard, (2) site token from Integrations, (3) Spark keys path for the seed step
- **Correct data flow:** Spark keys → Test Claude fetches/flattens → seeds ChatRealty-hosted DB via connector → site pulls from that DB. Spark keys are NOT entered into the web UI.
- **Database provisioning (chatrealty-sync init) CONFIRMED WORKING (session 9).** RESO data path works end-to-end. See "Real RESO data path" in recurring issues above.
- Core files authoritative source: /Users/macdaddyjoe/code/chatrealty/jpsrealtor/docs/testing/agents/tom/ — pull before each dispatch and sync to local workspace if changed.
