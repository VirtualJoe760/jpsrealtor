---
title: Dialer Implementation Status
status: partial
last_verified: 2026-10-18
related: [README.md, build-plan.md]
---

# Implementation status

## Implemented contact workspace

The Contacts app at /agent/contacts starts with contact selection. Select individual contacts, or choose a tag/status/search/filter set, then choose Open in dialer. Selection takes priority and includes selected contacts across the current filters. The queue and its label are frozen at launch; later filter changes do not mutate it. The contact detail sheet can also launch a one-contact queue. Back to contacts restores the mounted list and its selection. There is no independent Dialer tab that silently loads all contacts. ContactBottomPanel remains a separate swipe-to-organize component.

The calling UI remains simulated. Attempt start/answer/end/wrap-up now persist through the server controller; mute and the display timer remain local. In the Contacts app, SavedDialerWorkspace creates/restores server-owned simulation sessions, and explicit Save notes / Save outcome actions persist notes, dispositions and skips before advancing. The standalone sample preview remains local. No voice SDK or provider call is connected; microphone permission is requested only for explicit local device tests; persisted DialerAttempt records are explicitly simulated history. Open in dialer opens the queue without calling. Start dialer starts the saved session and immediately initiates the first simulated attempt, per the selected product behavior. Subsequent calls remain explicitly started after saving an outcome. Inline edits and saved notes in the embedded existing contact page retain their normal CRM persistence; this is separate from simulated call notes/outcomes. Queue search covers the entire frozen list and paginates 10 rows per page; every contact remains reachable. Searches reset to page one, and changing the active contact follows its page. Demo contacts are used only when no CRM contacts are supplied, with a visible sample-data banner.

Below the desktop breakpoint, Dialer, Property tools and Queue are horizontal scroll-snap panels with tap controls and keyboard navigation. Desktop places the full-width calling/contact row above the full-width Property and MLS comps/map tools. The calling row edits contact details inline; additional phone numbers expand in place. The gear opposite Back to contacts holds audio settings, desktop queue visibility and session recovery. Queue search and 10-row pagination remain available; it is collapsed by default. Credits remain in the existing navigation. The persistent mobile call bar stays available while swiping.

Home reuses saved CRM contact property facts and ContactPropertyCarousel. Property photos remain in Property tools. The inline details form does not mount photo or recent-market components. Additional property research is available in Property tools. The shared photo endpoint now accepts exact-address MLS or web metadata matches, with provenance-aware caching; unrelated neighborhood and Street View substitutions are removed. Load MLS property explicitly calls the existing read-only /api/crm/contacts/enrich route, which can use configured geocoding. Candidate matched address and source are displayed separately; nearby reference data never overwrites saved contact facts. Active asking prices are labeled separately from recorded MLS sales. This action does not save enrichment to the contact.

Home also offers new-tab Zillow address search, Google site searches for Redfin/Realtor.com/Homes.com, and Google Maps. Search links use encoded address text with noopener/noreferrer; no guessed listing IDs or scraped values are presented. A local Research address field lets agents refine the search without editing the saved contact address. External research does not automatically populate CRM fields.

Comps reuses /api/crm/contacts/[id]/comparables and unified_closed_listings. The endpoint now verifies contact ownership, awaits Next.js route params, validates radius/limit/date/coordinate input, supports days, and filters results to the actual radius rather than bounding-box corners. Existing callers without days retain their previous history window. The UI defaults to the same nearby-sales request as ContactViewPanel: radius 0.5 miles, limit 10, no date or subject filters. All recorded sales plus 90/180/365-day windows and 0.5/1/2-mile radii are available. Match available beds, baths & size is explicit opt-in; imported tax-record property types are never passed as MLS propertyType filters. Numeric-string coordinates and legacy lat/lng/long aliases are supported, including restored sessions; and displays returned-sale medians, distance, sale date, property facts, MLS source, and Zillow research. It is a recent nearby-sales shortlist, not an appraisal or an exhaustive market statistic: the backend first takes a bounded recent candidate set, then sorts by distance. No fabricated listing records or prices are used.

Implementation files are under F:\web-clients\joseph-sardella\jpsrealtor\src\app\components\crm\dialer\ (DialerPropertyPanels.tsx and property-context.ts), plus DialerContactPane.tsx, alongside DialerMockup.tsx and the existing Contacts components. The original property/contact UI needed no new Mongoose model; the session/controller models described below are now implemented. Live voice milestones remain planned.

Validation: TypeScript and the production build passed for the selection/workspace revision. Fixture rendering verified CRM binding, embedded contact rendering without a modal backdrop, and research links. Isolated browser QA covers both themes, mobile/desktop layout, horizontal scrolling, persistent call controls, research link construction, input, period/radius controls, queue progression, and reset. Mocked-database endpoint checks cover auth/ownership, input limits, date/subject filters, exact-radius exclusion, and private caching. Authenticated live contact/photo/MLS results still require a running signed-in app session; the isolated preview does not stand in for a live-data test.


## Saved simulation sessions — initial implementation, 2026-10-18

- New model: src/models/DialerSession.ts. Bounded embedded queues (1–250 selected contacts) make each checkpoint atomic; this is a deliberate first slice before separate queue/attempt records and a durable runner for live orchestration.
- GET/POST /api/crm/dialer/sessions and GET/PATCH /api/crm/dialer/sessions/[id] authenticate the owner, use private no-store responses and expose safe projections. Creation deduplicates normalized phones, excludes do-not-contact/invalid numbers, rejects unavailable contacts, and uses a unique owner/request-key index with a payload hash. Ensure indexes are installed before enabling production writes.
- Checkpoints use compare-and-set versions; stale saves return 409 without overwriting another tab. Opening/restoring never calls a provider. Recent queues appear in Contacts; completed lists remain viewable. Missing/deleted contact records render a read-only queue placeholder so saved wrap-up remains possible; new starts revalidate ownership and phone eligibility.
- Save notes is explicit; unsaved drafts can still be lost when leaving/reloading. Queue navigation and Back to contacts require a note save first; browser refresh/close warns about unsaved notes where supported. Saved outcomes advance only after persistence succeeds. No autosave, active-device lease, real provider history, recording delivery, live call usage collection or production billing activation exists yet; server-only credit reservation primitives are now implemented separately.
- Simulation Do not call / Bad line / Connected outcomes are saved only on the simulation queue; they do not mutate CRM suppression or lifecycle state. Do not treat a simulated outcome as a real call record.
- Offline verification: node scripts/tests/dialer-sessions.test.cjs covers auth, owner query filters, queue bounds, suppression/dedup, repeat creation, changed-payload conflict and stale-version checkpoint protection. It mocks Mongo and does not prove live database persistence or index deployment.

Validation: npx tsc --noEmit passed after correcting the Mongoose model export type. Route/schema/render fixtures passed without network calls. npx next build passed, including compilation, TypeScript and page generation. Existing configuration/browser-data warnings remain. No deployment, paid call or live database persistence test was performed.

## Credit foundation — 2026-10-18

See [credits and billing](./credits-and-billing.md) for implemented quotes, paid-only idempotent fulfillment, transactional holds, shared debit protection and the read-only billing endpoint. The inline wallet panel was subsequently removed in favor of the navigation credit entry. These primitives do not charge simulated calls. Offline payment/reservation tests pass; account setup, Mongo transaction/index validation, historical precision/customer reconciliation, legacy billing recovery and provider usage ingestion remain activation requirements. Auto-top-up and live voice are disabled.

Credit milestone validation: npx tsc --noEmit and npx next build passed; offline credit and saved-session regression suites passed. No Stripe request, live Mongo transaction/index mutation, payment, email or phone call was used for validation. Existing Next configuration/browser-data warnings remain.

## Stripe sandbox isolation — 2026-10-18

Verified local Stripe key mode without revealing credentials; the local webhook signing secret is absent. Added safe readiness diagnostics, separate sandbox credit storage, owner/mode customer mapping, top-up event-mode checks, checkout configuration gates and test-credit labels in the dashboard/dialer. New sandbox purchases leave production credits unchanged. Historical balances and legacy subscription grants remain unaudited. No provider configuration was changed or test payment initiated. See [Stripe setup](./stripe-test-setup.md).

Sandbox milestone validation: TypeScript, production build, saved-session regression tests, credit/mode-isolation tests and documentation checks passed. The readiness script reported test-mode Stripe configuration with missing webhook signing configuration and missing new voice API/app/callback settings. All payment/transaction tests used fixtures; no real or Stripe test payment was initiated. Existing Next/Mongoose/browser-data warnings remain.

## Durable simulation controller — 2026-10-18

Start/answer/end/checkpoint commands now share one Mongo transaction boundary, with separate DialerAttempt, DialerAgentState and DialerAction records. Required unique indexes are inspected before mutation. Wrap-up retains the global agent slot; saving its outcome releases the slot and advances only after persistence succeeds. Clients retain uncertain request keys, restore active attempts and allow explicit reopen. Deleted contacts no longer strand historical wrap-up. See [controller implementation](./simulation-controller.md) for exact behavior and remaining live-provider gates.

Controller milestone verification: npx tsc --noEmit and the final npx next build passed after completing the unavailable-contact UI type. All three offline controller/session/credit suites passed. Isolated browser checks verified lost-response replay, saved in-call notes, connected/wrap-up refresh recovery, retained elapsed duration and explicit next-contact start; temporary fixture tab/server were closed. No real database transaction, call or payment was initiated. Existing unrelated Next/Mongoose/browser-data warnings remain. Restart existing dev/Mongoose processes before exercising the new schemas; transaction/index integration verification is still required.

## Provider job foundation — 2026-10-18

Added DialerProviderJob, a fenced Mongo lease store and a bounded provider-neutral runner. Offline fake-provider tests cover expiry, stale workers, uncertain creates and late success. No producer, scheduler, Twilio voice adapter or live UI wiring is enabled. See [provider jobs](./provider-jobs.md).

Provider job milestone validation: npx tsc --noEmit passed; all four offline provider-job/controller/session/credit suites passed; documentation checks verified 32 local links. No page changed in this increment, so the production build was not repeated. No live Mongo, telephony or payment requests were made.

## Twilio adapter and signed status inbox — 2026-10-18

Added a separate lazy voice adapter, bounded call plan builder, account-bound call lookup, canonical signature verifier, DialerProviderEvent model and transactional inbox. The exact POST /api/crm/dialer/webhooks/twilio/status endpoint acknowledges only durable commits and has a narrow self-auth middleware exception; other dialer routes remain session-protected. Signed callbacks can resolve an uncertain create job without advancing an attempt or settling credits. Call creation is hard-disabled, including when a dispatch flag is set. See [Twilio voice](./twilio-voice-adapter.md) for remaining gates and verification scope.

Twilio milestone validation: npx tsc --noEmit and the final npx next build passed, including compilation, type checks and all 276 static pages. All five offline suites passed; documentation checks verified 36 local links. Safe readiness still reports test Stripe keys without a webhook signing secret, and missing voice API-key/app/public-base configuration. No provider call, payment or live database test was initiated. Existing Next configuration, browser-data and duplicate-index warnings remain. Restart Mongoose processes before loading the required providerAccountId job field; live index/transaction verification is still pending.

## Audio device controls and mobile phone scope — 2026-10-18

Audio & devices now offers microphone/speaker selection, bounded local diagnostics, cleanup on cancellation/visibility/navigation, and browser-local preferences. The live dev app was opened at localhost:3000/agent/contacts and the saved queue restored without starting a call. My phone previews the planned call-me/dial-in modes with disabled connection actions. See [agent audio](./agent-audio.md); provider calls remain disabled.

Audio checkpoint validation: npx tsc --noEmit and npx next build passed; all six offline suites and 39 documentation links passed. Browser QA in the signed-in live app verified saved-queue restore and browser/phone settings without starting a call or requesting microphone access. Added exact ignore coverage for the untracked example-named local environment file. Phone bridging and real voice remain disabled.

## Simplified workspace and queue pagination — 2026-10-18

Replaced the persistent three-column layout with a calling pane and compact contact summary. Show queue reveals plain rows, 10 per page, with search over all queue members, visible range and Previous/Next controls. Mobile retains Dialer/Contact/Queue swipe panels and the persistent call bar. The full contact editor, property research and MLS comps remain accessible explicitly. Billing configuration is a compact disclosure and conversation context is collapsed, reducing nested cards. Status and saved-note callbacks update the summary after successful edits.

The inherited contact PATCH limitation is repaired: validated phone/email arrays now persist, with synchronized legacy primary fields. Inline dialer editing also supports name and address. Offline route tests cover auth, ownership, validation and coordinate invalidation.

Live browser QA verified page 2/21, no-match search, search reset, full editor access, mobile Contact/Queue switching, and call controls above the mobile app navigation. Browser audio preference was restored and the temporary viewport override reset. Added mobile panel bottom padding so queue pagination and summary actions can scroll clear of the call bar. The prior audio/backend checkpoint is commit df9eb6b1; this follow-up simplifies presentation without enabling provider calls.

Simplification validation: npx tsc --noEmit and the final npx next build passed after the mobile overlap fix. Queue pagination, saved-session SSR/API and local audio lifecycle tests passed, along with 39 documentation links. The browser verified the live 208-contact queue and compact contact editor flow without starting a call or editing contact data. Existing build warnings remain.

## Comps parity and inline credits removal — 2026-10-18

Removed DialerCreditBalance from SavedDialerWorkspace; use the existing navigation credit entry. Fixed the MLS tab's hidden restrictive subject/date defaults: it now matches the working contact page's nearby-sales request, while date and beds/baths/size matching are explicit options. Imported Rsfr is not an MLS propertyType filter. Normalize numeric/string coordinates and retain legacy coordinate aliases in session restore. The live signed-in browser returned 10 closed sales for Aimm Holdings after previously returning none. Comps render as one-column rows in the narrow side pane.

Comps repair validation: npx tsc --noEmit and npx next build passed. Query-parity/coordinate regression tests and saved-session regression tests passed; documentation links verified. Live browser confirmed 10 MLS sales with the nearby defaults, restored that view after testing similarity controls, and verified the inline credit section was absent. No calls, payments or contact edits were made. Existing build warnings remain.


<!-- Dialer layout verified 2026-10-18 -->
Dialer layout: the full-width contact/calling row sits above Property and MLS comps tools. The duplicate Contact tab is removed. MLS comps use a subject-home marker and numbered comparable markers linked to the sale list; missing coordinates are omitted from the map. Mobile uses Dialer, Property tools and Queue panels. The gear opposite Back to contacts groups audio devices, desktop queue visibility and saved-session recovery; the previous preview/header block is removed. Calls remain simulated.

Dialer settings open in a native modal overlay with an independent scroll area, backdrop dismissal and Escape support. Opening settings does not move the calling workspace; focus returns to the gear when closed. Verified 2026-10-18.

Inline dialer contact editing (verified 2026-10-18): the full-contact launcher is replaced by editable name, phone/email lists with primary selection, and address fields in the calling row. Save contact uses owner-scoped PATCH with validated detail fields; legacy primary phone/email values stay synchronized. Unsaved details block leaving or changing contacts. Saved queue phone snapshots remain unchanged. Address edits clear old map coordinates so research cannot silently use the previous home. The existing contact panel phone/email PATCH rejection is fixed by this shared API extension.

Sold-comps map interactions (verified 2026-10-18): pointer hover or keyboard focus previews the MLS photo, sold price, address and beds/baths/size without zooming. Click/tap opens a native property-details dialog with saved closed-listing media, description, sale/build/lot/pool facts, attribution and external research links. Sale-list Property details offers the same view, including sales without map coordinates. The contact-owned comparables route projects primaryPhotoUrl/media/publicRemarks/listingId from unified_closed_listings; web photo discovery is triggered separately on opening details when photos are absent. Missing facts/photos remain explicitly unavailable. Mobile map gestures preserve one-finger panel scrolling.

Property photo enrichment (2026-10-18): contacts and sold-property dialogs share free, best-effort address-verified photo lookup and provenance-aware caching. POST lookups can seed declared externalPhotos fields on contacts/closed listings; MLS media is preserved. Source blocks are reported; no paid search provider or bypass is used. See [property-photo-discovery](../property-photo-discovery.md).
