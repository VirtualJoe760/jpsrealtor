---
title: Dialer Implementation Status
status: partial
last_verified: 2026-10-18
related: [README.md, build-plan.md]
---

# Implementation status

## Implemented contact workspace

The Contacts app at /agent/contacts starts with contact selection. Select individual contacts, or choose a tag/status/search/filter set, then choose Open in dialer. Selection takes priority and includes selected contacts across the current filters. The queue and its label are frozen at launch; later filter changes do not mutate it. The contact detail sheet can also launch a one-contact queue. Back to contacts restores the mounted list and its selection. There is no independent Dialer tab that silently loads all contacts. ContactBottomPanel remains a separate swipe-to-organize component.

The calling UI remains simulated. Attempt start/answer/end/wrap-up now persist through the server controller; mute and the display timer remain local. In the Contacts app, SavedDialerWorkspace creates/restores server-owned simulation sessions, and explicit Save notes / Save outcome actions persist notes, dispositions and skips before advancing. The standalone sample preview remains local. No voice SDK, microphone permission or provider call is connected; persisted DialerAttempt records are explicitly simulated history. Open in dialer opens the queue without calling. Start dialer starts the saved session and immediately initiates the first simulated attempt, per the selected product behavior. Subsequent calls remain explicitly started after saving an outcome. Inline edits and saved notes in the embedded existing contact page retain their normal CRM persistence; this is separate from simulated call notes/outcomes. Queue search renders at most 50 rows at once to keep large contact lists usable on mobile. Demo contacts are used only when no CRM contacts are supplied, with a visible sample-data banner.

Below the desktop breakpoint, Dialer, Contact, and Queue are horizontal scroll-snap panels with tap controls and keyboard arrow navigation. Contact contains Full contact, Property research, and MLS comps sections. DialerContactPane embeds the original ContactViewPanel with embedded=true: no modal backdrop, drag-to-dismiss, or footer navigation actions; existing phone/email editing, status, saved notes, photos, property facts, map and recent market activity stay in the same component. The persistent call bar remains available while swiping, and contact state stays mounted. Desktop presents queue, dialer, and the full contact side panel simultaneously, with independent scrolling. Both themes and reduced-motion preferences are supported.

Home reuses saved CRM contact property facts and ContactPropertyCarousel. Existing contact photos load when the full contact view is first opened on mobile, or when the contact side panel opens on desktop. Additional property research is available inside Contact. The existing photo endpoint can return a fuzzy address match, a neighborhood comparable, or Street View; its image-source labels and a visible caution distinguish these from a verified subject photo. Load MLS property explicitly calls the existing read-only /api/crm/contacts/enrich route, which can use configured geocoding. Candidate matched address and source are displayed separately; nearby reference data never overwrites saved contact facts. Active asking prices are labeled separately from recorded MLS sales. This action does not save enrichment to the contact.

Home also offers new-tab Zillow address search, Google site searches for Redfin/Realtor.com/Homes.com, and Google Maps. Search links use encoded address text with noopener/noreferrer; no guessed listing IDs or scraped values are presented. A local Research address field lets agents refine the search without editing the saved contact address. External research does not automatically populate CRM fields.

Comps reuses /api/crm/contacts/[id]/comparables and unified_closed_listings. The endpoint now verifies contact ownership, awaits Next.js route params, validates radius/limit/date/coordinate input, supports days, and filters results to the actual radius rather than bounding-box corners. Existing callers without days retain their previous history window. The UI passes available subject beds, baths, size, and type; offers 90/180/365-day windows and 0.5/1/2-mile radii; and displays returned-sale medians, distance, sale date, property facts, MLS source, and Zillow research. It is a recent nearby-sales shortlist, not an appraisal or an exhaustive market statistic: the backend first takes a bounded recent candidate set, then sorts by distance. No fabricated listing records or prices are used.

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

See [credits and billing](./credits-and-billing.md) for implemented quotes, paid-only idempotent fulfillment, transactional holds, shared debit protection and the read-only wallet panel. These primitives do not charge simulated calls. Offline payment/reservation tests pass; account setup, Mongo transaction/index validation, historical precision/customer reconciliation, legacy billing recovery and provider usage ingestion remain activation requirements. Auto-top-up and live voice are disabled.

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
