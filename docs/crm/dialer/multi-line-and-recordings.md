---
title: Multi-line Dialing and Prerecorded Messages
status: partial
last_verified: 2026-10-17
related: [README.md, session-continuity.md]
---

Implementation sequence and shared contracts: [full build plan](./build-plan.md) and [backend contracts](./backend-contracts.md). This document expands its feature requirements.

# Multi-line dialing and prerecorded messages

The target product includes selectable one-, two-, and three-line calling, prerecorded voicemail drops, and a separate prerecorded response when multiple humans answer. These are required product features, not implemented by the current single-call simulation. Build the single-line voice foundation and saved sessions first, then implement this orchestration before claiming Mojo-style triple-line functionality.

## Agent experience

- Choose dialing mode and approved voicemail/overflow recordings before starting a saved queue.
- Start dialer reserves and calls up to the selected number of distinct eligible contacts; never call multiple numbers for the same contact simultaneously.
- Display each line's contact, selected phone, ringing/detection/connected/voicemail/overflow/ended state, elapsed time and final outcome. One conversation is the agent's active contact page.
- The first eligible human answer atomically claims the sole agent audio connection. Other calls never share that audio or hear the agent's conversation.
- Stop launching new prospect calls while the agent is occupied. Existing sibling calls must each reach an explicit resolution; do not silently cancel every ringing call without considering minimum ring-time rules.
- A second human answer takes the separately approved overflow path: a permitted recording or optional eligible [Retell AI receptionist](./retell-overflow.md). Never mistake this for successful conversation or voicemail. Record the event for follow-up and abandonment accounting.
- Pause after current calls prevents new reservations but lets active conversations and approved recordings finish. End all calls is a distinct explicit action.
- Resume restores every unresolved line and reconciles it with the provider before any replacement call starts. The browser is not the scheduler.

## Server orchestration

Use a durable session controller, server-side line reservations, and a maximum of three destination calls per agent session; there is still only one active human conversation per agent. Replace the single-attempt lock with an agent/session lock, a bounded set of line slots, and an atomic active-conversation claim. A second tab/device cannot create another independent set of lines.

Persist one CallAttempt per destination attempt and provider leg identifiers beneath it. Maintain dialing batch ID, line slot, contact/phone, call state, detection classification, agent assignment, recording asset/version, playback status, outcome and usage. Telephony answers, human detection, agent connection and message completion are separate events. A human who receives an overflow recording counts as an overflow/abandoned answer where applicable, not a handled agent conversation.

Two nearly simultaneous human callbacks must compete through a compare-and-set or transaction. Only the winner can bridge to the agent. Repeated webhooks, late machine classifications and delayed bridge acknowledgments must not reroute an already assigned human or play a recording into the active conversation. An ambiguous provider response keeps the line reserved until reconciliation; it must not launch a duplicate attempt.

Use a dedicated destination-call API and, where appropriate, an isolated conference containing the agent and the single winning prospect. Do not bridge all three prospects to one conference. Provider adapters expose line creation, human assignment, recording playback/termination, classification callbacks, and leg reconciliation separately. Twilio Voice's existing single-line Dial/Number recipe alone does not implement this controller.

## Voicemail drops

Maintain an agent-owned audio library: upload or record, preview locally, label, duration, asset version, purpose (voicemail versus overflow), and approval/eligibility metadata. Keep recordings private in storage and supply provider-accessible scoped delivery URLs; do not mix them with MLS photos. Test playback locally and with mocks before authorized controlled calls.

Support a deliberate Drop voicemail action, and an optional automatic drop only where recipient/campaign eligibility permits. For automatic delivery, use answering-machine detection with message-end detection rather than playing at answer time. Twilio DetectMessageEnd can report machine_end_beep, machine_end_silence, machine_end_other, human, fax, or unknown. Set timeout/fallback policy explicitly; unknown is not permission to play a sales recording to a person.

Machine detection is fallible and can add delay. A late or wrong classification must have an operator override and a safe fallback. Do not promise a recording was delivered just because playback was requested: track queued/started/completed/interrupted/failed and classify completed playback separately from proof that a recipient heard it. Once machine playback is confirmed running independently, the agent may continue only within the three-line capacity and session policy.

## Simultaneous human answers and overflow audio

The requested concept is an agent-unavailable recording (for example, an explanation that the agent is on another line). This is a distinct message type from a marketing voicemail. Its final wording and behavior must meet the applicable abandoned-call/prerecorded-message rules; a custom apology or sales pitch alone is not sufficient. Do not label or preapprove an arbitrary script as compliant.

For US telemarketing covered by the FTC Telemarketing Sales Rule, an answer not connected to a representative within two seconds after the person's completed greeting is abandoned. The safe harbor includes a maximum three-percent abandonment rate using the specified per-campaign measurement periods, minimum ringing requirements, identification recording, and records. The FTC guidance also describes FCC limits on recording content and a callback number that accepts entity-specific do-not-call requests. An overflow recording does not turn an abandoned call into a handled call or make unlimited overflow acceptable.

Implement campaign-specific live-answer and abandonment counters, timing records, and conservative pacing guards. Reduce lines or pause before exceeding configured limits; three lines are a maximum, not a promise to dial three at every instant. A one-agent triple-line session may need to spend substantial time in single-line mode. Include unknown classifications and timing uncertainty in the policy rather than excluding them to improve statistics.

Prerecorded marketing voicemail has separate consent and opt-out requirements. FTC guidance generally requires prior signed written agreement for covered prerecorded telemarketing, including messages selected by a live operator and messages reaching voicemail, with specified exceptions and additional opt-out rules. Determine applicable federal/state requirements and recipient eligibility before enabling delivery. Do not assume a contact record, business relationship, verified caller ID, or manual Drop button supplies consent.

Do not implement holding the second person indefinitely or promising the agent will pick up shortly unless that separate flow is explicitly designed and approved. The initial overflow path should be bounded, record the event and any opt-out, end cleanly, and create a follow-up item without automatically redialing that person.

## Saved sessions, controls, cost and verification

- Persist queue completion by contact/attempt outcome rather than advancing a shared cursor by three. A ringing or playback line remains in flight after the main conversation ends.
- Resume can restore a connected conversation, an interrupted voicemail, an overflow needing follow-up and a pending disposition at the same time. Never resume by blindly calling all unfinished IDs.
- Charge estimates and settled costs include every telephone leg, agent connection, answering-machine detection, conference participation where used, recordings/storage and applicable short-call/unanswered fees. Three-line dialing does not imply exactly three times the single-line bill.
- Tests must cover simultaneous answers with exactly one agent bridge; humans never hearing another prospect; a late AMD result after human assignment; repeated playback callbacks; machine greeting timeout; opt-out suppression before the next attempt; pacing limits; provider timeout after acceptance; reconnect during three active lines; and End all calls terminating every tracked leg.
- First simulate line cards, voicemail outcomes and collisions in the UI. Backend provider calls remain disabled until the single-line foundation, durable sessions, eligibility/message policies, line capacity and abandonment accounting are verified. Do not test by calling prospects or launching paid voicemail campaigns.

## Sources reviewed 2026-10-17

- [Twilio answering-machine detection](https://www.twilio.com/docs/voice/answering-machine-detection)
- [Twilio AMD FAQ and best practices](https://www.twilio.com/docs/voice/answering-machine-detection-faq-best-practices)
- [FTC guide: call abandonment, prerecorded messages and opt-out requirements](https://www.ftc.gov/business-guidance/resources/complying-telemarketing-sales-rule)