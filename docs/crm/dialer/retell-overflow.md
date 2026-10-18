---
title: Retell AI Overflow Receptionist
status: partial
last_verified: 2026-10-17
related: [README.md, build-plan.md, multi-line-and-recordings.md, backend-contracts.md]
---

# Retell AI overflow receptionist

The user already has a Retell agent. The target product can route an additional answered prospect call to that agent while Joseph is occupied. This is an optional extension of triple-line handling, not an implemented feature, an authorization to change the existing agent, or permission to send live contact data to Retell during development.

## Sequencing and script ownership

The user wants Retell to follow a specific script and explicitly deferred scripting until the other dialer features are built. Implement adapter contracts, isolated state handling and simulated handoff tests first. Keep live AI routing disabled until the script, disclosures, fallback branches and permitted tools are finalized and tested. The role below is a design candidate, not an approved prompt or permission to modify the existing agent.

## Intended experience

1. Joseph speaks to the first human answer through the dialer.
2. Another human answers an already-ringing line. Check eligibility, configured overflow policy, budget, and available Retell capacity server-side.
3. Route that call to an isolated Retell session. Display AI handling on that line; never mix it with Joseph's or another prospect's audio.
4. Candidate role for the later scripting session: identify itself as Joseph's AI assistant, explain he is unavailable, capture reason for calling, callback preferences and opt-outs. Confirm this behavior in the user's specific script. Qualification or appointment booking requires explicit agent configuration and authorized tools; do not assume the existing agent is suitable.
5. If Joseph becomes available, show Request handoff / Accept handoff with a short context summary. Transfer only after the human agent's availability is atomically reserved. Do not interrupt the current human call or promise immediate availability.
6. If no handoff occurs, save structured result, optional transcript under a retention policy, callback task and an email draft suggestion. Do not automatically send an email or enroll the caller in the newsletter.

## Integration spike

Retell documents two custom-telephony methods: SIP trunking and Dial to SIP URI. The latter fits the proposed app-controlled call controller: register a phone call for the configured agent, obtain the Retell call ID, then connect the existing Twilio destination leg to its per-call SIP URI. Registration expires unless connected within the documented window. This is a design candidate; prove the end-to-end already-answered outbound-call path using approved controlled numbers before selecting the transport.

Crucial limitation: Retell's built-in transfer feature is unavailable with Dial to SIP; custom functions and our Twilio controller must implement transfer/end logic. Do not promise a warm handoff merely because the Retell agent has a transfer tool. Evaluate SIP trunking separately if native Retell transfer capabilities are important; do not reconfigure the user's main number or SMS routing as a side effect.

Discovery requires agent ID/version, telephony mode, existing greeting, tools, recording/storage settings, supported transfer flow, account concurrency and spend limits. Keys stay in server-side secret storage. Existing Retell configuration is inspected read-only first; use a dedicated version/clone for testing after selecting a setup path.

## State, tools and isolation

Persist Retell call ID and agent version under the original CallAttempt, with AI routing/pending/active/handoff-requested/handoff-completed/failed/ended states. An AI call is not a new prospect attempt and must not advance another contact's queue item. Claim an AI reservation before registration; ambiguous registration/SIP responses remain unresolved until reconciliation.

Pass only a purpose-specific context allowlist (first name, agent identity, approved call reason, optional confirmed address/context). Do not dump CRM history or raw imports into prompts. Bind callbacks and tool requests to the owner, contact, attempt and Retell call. Caller speech, transcripts and model tool arguments are untrusted: server tools authorize and validate them independently. Never let a model select an arbitrary phone number, expose another contact, clear suppression, buy anything, or send marketing without the applicable explicit user action and eligibility.

Verify webhook/tool authenticity according to the chosen Retell SDK/API documentation during implementation; reject unverified or replayed state-changing requests. Reconcile duplicate/out-of-order provider events just like Twilio events. Redact logs; configure retention, access permissions and transcript/recording storage deliberately.

## Capacity and fallbacks

For a three-line outbound batch with one human conversation, up to two remaining prospects may require AI simultaneously. Reserve both app-side AI slots and check actual Retell account limits; do not assume the account can handle them. Keep the total prospect-line budget bounded even after routing to AI. No new outbound batch starts merely because Retell took a line.

If Retell is unavailable, over budget, ineligible or slow to connect, use the separately eligible overflow policy; otherwise stop safely and record an actionable callback/exception. Do not leave the person in indefinite silence. Set measured routing deadlines and a maximum AI-call duration. App, Twilio and Retell kill switches must stop new routing while allowing in-flight calls to end/reconcile.

AI minutes, telephony/SIP legs and any transfer/conference/storage features are additional costs. Use the actual agent configuration/account rates before enabling AI overflow; no hard-coded advertised rate is a cost guarantee.

## Eligibility and release gates

The FCC's 2024 ruling treats AI-generated voice as artificial voice under the TCPA. Determine applicable consent, identification, opt-out and recording requirements before routing outbound prospects to AI. A human-started session, an answered call, the existence of a CRM record, or a verified caller ID is not by itself permission for AI marketing. AI disclosure is an intentional product policy; review current jurisdiction-specific requirements before launch.

Do not assume AI handling is a live sales representative for abandoned-call calculations. Keep AI-handled, human-handled, prerecorded overflow and unresolved outcomes distinct; validate the applicable treatment before changing pacing.

Release only after tests prove simultaneous AI calls remain isolated, the original human conversation continues, no double routing/transfer occurs, opt-outs persist before another call, API/SIP/concurrency failures recover safely, malicious tool inputs fail authorization, summaries stay with the right contact, and human handoff works on the chosen transport. Initial pilot uses explicitly approved controlled numbers, not cold prospects.

## Official references reviewed 2026-10-17

- [Retell custom telephony and SIP transfer limitation](https://docs.retellai.com/deploy/custom-telephony)
- [Retell Register Phone Call API](https://docs.retellai.com/api-references/register-phone-call)
- [FCC AI-generated voice ruling, FCC 24-17](https://docs.fcc.gov/public/attachments/FCC-24-17A1.pdf)
