Continue the 2026-10-17 documentation audit. Be token-conscious: NO sub-agents, work one doc at a time, Grep before Read, read only the line ranges you need.

Context
- Work in the worktree F:\web-clients\joseph-sardella\jpsrealtor-wordmark (branch fix/agent-wordmark-default). Absolute Windows paths for every file op.
- Goal: every CURRENT doc matches the code. Code is the truth; fix docs, don't fix code — report code bugs instead. Policy: docs\AGENTS.md (frontmatter, last_verified 2026-10-17 only if the whole file was checked, else status partial + note).
- Repo is PUBLIC: no secrets or MLS listing data in docs.
- Already done and committed: multi-tenant, admin/auth/billing, MCP site-building, testing, chat, listings, root indexes, review queue (docs\review\README.md).

Local commits NOT pushed yet: 2fd6c3e3 (auth hand-off fix, code) and 54844d72 (docs). Ask Joseph before pushing.

1. Finish the half-done files. These have UNCOMMITTED partial edits from a stopped pass — run `git diff -- <file>` first, keep what's right, and finish verifying:
   - docs\crm\README.md, docs\integrations\email.md, docs\integrations\sms-compliance.md, docs\integrations\twilio.md
   - docs\routing\README.md: must match src\proxy.ts now. That covers:
     - the /api default-deny gate;
     - external-site subdomains: the whole /api surface is rewritten to the agent's deployment, except the platform-pinned /api/auth/{transfer,receive,impersonate,signout-chain}; on a serving host, receive and impersonate return 403;
     - /auth, /agent, /admin and /dashboard on such a host go to www via that host's /api/auth/transfer;
     - www sends agents home only if site-config confirms no external site (fail-closed);
     - the admin-only `agent` subdomain, owner domains, the coming-soon gate and portalGates.

     Joseph's main checkout copy (F:\web-clients\joseph-sardella\jpsrealtor\docs\routing\README.md, uncommitted) has a correct 2026-10-16 section on the /api gate. Fold it in.
   - docs\cms\README.md, docs\theming\README.md, docs\seo\README.md. In the SEO doc, keep the "Global footer" bullet as is.
   - docs\content-templates\README.md, actor-generation.md, auto-posting.md, cover-slide.md.
2. Not started:
   - docs\campaigns\README.md, co-marketing-adspend.md, go-live-checklist.md, google-ads-go-live.md, google-ads-standard-access-design.md. The README says Google Ads API v18; the code is v24 (src\lib\google-ads-api.ts:17).
   - docs\content-templates\carousel-slides.md, copy-voice.md.
   - The CRM/comms rows of docs\integrations\README.md. Do not touch its MLS-feed or API-token rows.

   Skip docs\testing\agents\tom\* (large uncommitted edits in the other checkout) and docs\archive\ (optional, later).
3. Add these findings, already reported by the earlier pass, to docs\review\README.md as a new "Doc audit, remaining areas" section, then mark Chat/Map-listings/Platform rows in its verification-status table:
   - HIGH: src\lib\cloudinary.ts:10 has a hard-coded Cloudinary API secret as a fallback, in a public repo. Remove the fallback and rotate the key.
   - MED: src\lib\oauth-state.ts:16 falls back to 'fallback-secret' when NEXTAUTH_SECRET is unset. It should fail closed.
   - MED: "sold" chat queries read Active listings. The parser sets dataset "closed" and closedSinceDays, but Layer 1 never passes them on (src\lib\chat-search\preview.ts:470,474 vs src\lib\chat-v2\listing-query.ts:83-87).
   - MED: unescaped user input goes into `new RegExp` in:
     - src\app\api\mls-listings\route.ts:49,145,150
     - src\lib\chat-search\nearby-pois.ts:71,82,211
     - src\app\api\chat\community-facts\route.ts:26-34

     Use escapeRegex from @/lib/security.
   - MED (moderate confidence): searchHomes copies house/condo/townhouse into propertySubType, and the query matches it exactly, so it likely returns zero rows (src\lib\chat-v2\tool-executors.ts:187-191, listing-query.ts:458-460).
   - LOW-MED: the chat-v3 route takes body.userId from anonymous callers, but user-analytics looks users up by email, and the widget sends the literal "demo-user" (src\app\api\chat-v3\route.ts:47-53).
   - LOW-MED: "Ask chat" on insights pushes /chap?chat=…, which nothing reads (HomeClient.tsx:232).
   - LOW: the subdivision hierarchy fields (parentSubdivision, hierarchyLevel, …) are read in 3 routes but missing from src\models\subdivisions.ts.
   - LOW:
     - crontab.vps references 4 scripts that aren't in this repo.
     - Dead code: chatv3:toast has no listener; mode contact_import posts to a missing route; there are stray .backup files in src\.
     - mapbox-gl and react-map-gl are unused dependencies.
   - MED: where the test repairer runs (Mac or Windows) is unreconciled across docs\testing\README.md and repairer.md; ask Joseph.
   - LOW: scripts\agent-feedback.mjs:22 and scripts\test-accounts.ts:54 hard-code an F:/ env path.
4. Fix memory drift (C:\Users\DellaMSI\.claude\projects\F--web-clients-joseph-sardella-jpsrealtor\memory\):
   - project_home_page_architecture.md: chat persistence is one flat sessionStorage array with a 5-minute sliding expiry, not "5 convos max"; `/` has no ?view= chat.
   - project_poi_display_design.md: the API returns nothing below zoom 14, only golf/park/attraction at 14–15, and everything from 16.
5. Scan the edited docs for secrets, stage by explicit path (never `git add -A`, no env files, NOT next.config.mjs, which holds a TEMP turbopack.root change), and commit per area. Ask before pushing.
