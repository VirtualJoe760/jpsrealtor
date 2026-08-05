# MEMORY — Tom, Judge

## Sessions run

| # | Date | Persona | Market | Positioning | Design | Score | Report ID |
|---|---|---|---|---|---|---|---|
| 5 | 2026-08-04 | Priya Manohar, Valley Oak RE | Sacramento | first-time buyers | warm oak and linen | 75/100 | 6a720288802beca327a12604 |
| 6 | 2026-08-04 | Marcus Delgado, Pacific Shores Realty Group | Orange County (Newport Beach / Irvine) | luxury / relocation | light and architectural | 67/100 | 6a722458e7d6e9479406a685 |
| 7 | 2026-08-04 | Diane Calloway, Desert Key Properties | GPS MLS / La Quinta area | vacation rental investment + retirement relocation | sun-bleached terracotta and shadow | 67/100 | 6a727972342e901959414c90 |
| 8 | 2026-08-04 | Carter Winslow, Fairway & Desert Realty | GPS MLS / Rancho Mirage, Indian Wells, Palm Desert | luxury golf-course and country club | midnight blue and burnished gold | 55/100 (filed) / 78/100 (my read) | 6a72875a538234b9a409b168 |

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
- **Default /listings browse not restricted to service area (session 8):** `searchListings({ limit: N })` with no city filter returns national dogfood inventory. 22 of 23 first listings were non-GPS on session 8. `ListingsBrowser` starts with `city: ""`. Gate 3 failure. Root: no service-area filter applied by default. This may be a non-issue on real GPS MLS tenant (tenant scope would be GPS-only), but renders as a gate fail on dogfood. Include in brief: verify /listings default (no filter) shows only GPS listings.
- **CHAP result cards link off-site to chatrealty.io (session 8):** `ChapMessages.tsx` uses `l.detailUrl` which resolves to `https://www.chatrealty.io/mls-listings/[key]`. Buyer leaves agent site on every CHAP card click. Bug filed: 6a7285cb961c94294892466f. Fix: use `/listings/${l.listingKey}`.
- **CHAP conversational question recycles prior search results (session 8):** After a listing search, a market question ("What's the golf community market like?") returns the exact same listing results as the prior search instead of answering the market question. Real behavior, not a dogfood artifact.
- **401 on /api/account/oauth-bridge every page load (session 8):** Console error visible in DevTools on every route, every session. Structural gap in my judging (no browser access) — filed by cron that had browser access. Watch every session.
- **Race condition between cron firings and Test Claude completion (session 8):** Test Claude completed session 8 at ~17:39 PDT; completion message arrived to me ~5 min after a cron firing already scored and filed the report. Two scoring sessions ran against the same build — the cron fired against an incomplete state (SESSION-NOTES.md mid-write). Next brief should instruct Test Claude to write a single "COMPLETE" marker file the moment it finishes, so cron firings can detect completion before scoring.
- **Two presentation CHAP conflict RESOLVED (v0.10.0+):** CHAP_PRESENTATION constant enforces single presentation at build time. Confirmed session 8.
- **Tailwind radius token bypass RESOLVED (v0.11.0):** All `rounded-*` classes now map to `var(--radius)` via tailwind.config.ts. Confirmed session 8.

## Combos used — don't repeat too soon

- Sacramento / first-time buyers / warm oak and linen (session 5, 2026-08-04)
- Orange County (Newport Beach / Irvine) / luxury relocation / light and architectural (session 6, 2026-08-04)
- GPS MLS La Quinta area / vacation rental investment + retirement relocation / sun-bleached terracotta and shadow (session 7, 2026-08-04)
- GPS MLS Rancho Mirage / Indian Wells / Palm Desert / luxury golf-course country club / midnight blue and burnished gold (session 8, 2026-08-04)

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
- **Database provisioning (chatrealty-sync init) was never successfully tested through session 8.** All sessions used the dogfood token which is blocked from this step. First session to test this properly starts at session 9.
- Core files authoritative source: /Users/macdaddyjoe/code/chatrealty/jpsrealtor/docs/testing/agents/tom/ — pull before each dispatch and sync to local workspace if changed.
