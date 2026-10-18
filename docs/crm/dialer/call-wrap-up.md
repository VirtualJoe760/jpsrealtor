---
title: Call Outcomes and Connected-call Wrap-up
status: partial
last_verified: 2026-10-17
related: [README.md, build-plan.md, backend-contracts.md, session-continuity.md]
---

# Call outcomes and connected-call wrap-up

Accepted product requirement: distinguish outcomes such as No answer, Bad line and Connected. While connected, the agent can write client notes, move the contact into a new tag/group and book an appointment without leaving the calling workspace. Persist these actions and their result when wrapping up the call; this is planned beyond the current simulation.

## Status versus outcome

| State/outcome | Meaning and handling |
|---|---|
| Queued / Dialing / Ringing | Transient per-line progress; not a business disposition |
| No answer | No human conversation; keep attempt history and make a later retry pass explicit |
| Busy | Distinct from no answer when the provider reports it reliably |
| Bad line | Invalid/disconnected/unreachable destination; distinguish confirmed invalid number from transient network failure. Apply number-level handling, not automatic suppression of every phone on the contact |
| Failed / Unknown | Provider/system error or unresolved result; reconcile before retrying or releasing capacity |
| Connected | Live human connected to the agent; notes, tags and appointment actions stay accessible while audio continues |
| Voicemail / Overflow / AI handling | Separate paths; do not count these as a human conversation just because the provider says answered |
| Wrap-up | Call ended, but notes/disposition or selected actions may still need saving |
| Follow-up / Appointment booked / Not interested / Wrong number / Do not call | Human-selected business result, separate from transport status and CRM lifecycle status |

Do not replace Contact.status with telephony strings such as ringing or bad_line: its existing lifecycle enum serves a different purpose. Store transport status and call disposition on the attempt, and offer deliberate CRM status changes separately.

## Notes and tag changes

- Show all saved contact notes plus an autosaved current-call draft while connected. Explicitly save/promote client notes to the existing contact-note history, linked to the originating attempt; do not overwrite the contact's entire historical notes field.
- Provide Add tag and Move to tag. Move removes only the source group explicitly selected by the agent and adds the destination; preserve unrelated tags/labels. Confirm the desired source when launched from a multi-contact selection rather than assuming all current tags should be removed.
- Audit canonical Label IDs / Contact.labels versus legacy tags strings before wiring the control. Target labels must belong to the signed-in agent; use idempotent add/remove operations and persist the result before showing success.
- Tag changes affect future CRM views but do not mutate the membership/order of the frozen running queue or terminate an active call.
- Save & next requires durable disposition/note/tag results. Pending or failed actions remain recoverable and visible on resume rather than silently advancing. A user may deliberately cancel an unsaved optional action; never discard it implicitly.

## Appointment booking

Reuse existing Appointment and Google Calendar capabilities, but add an authenticated contact-scoped dialer command. The current /api/appointments/book route is a public visitor flow accepting agentId/subdomain and can find/create a contact by email; it is not the correct authority boundary for an agent-owned call session.

The in-call booking sheet includes contact, appointment type/title, date/time, timezone, duration, location/video/phone option, notes and confirmation recipient. Read available slots from the agent's own calendar settings; recheck availability and use a booking reservation/idempotency key at confirmation. Do not trust a browser-supplied agent identity or create a duplicate contact for the current call.

Persist booking action, Appointment ID and provider calendar-event ID with session/attempt/contact ownership. Distinguish locally saved, calendar pending, calendar confirmed and failed. Provider failure or timeout must not appear as confirmed; retry reconciles the existing event/action rather than creating a second appointment. A missing calendar connection should show setup or an explicitly local task option, not an invented available slot.

Separate booking from attendee confirmation email/SMS so an appointment retry cannot resend confirmations or unexpectedly spend communication credits. Present the applicable notification choice and reuse existing channel eligibility and send idempotency. Keep the call connected while editing the booking form. Show the appointment on contact history, call wrap-up and session resume.

This requirement authorizes human-agent booking UX in the plan. Retell appointment booking remains a separately configured tool/capability and is not enabled merely because a human can book.

## Existing code references

- F:\web-clients\joseph-sardella\jpsrealtor\src\app\components\crm\ContactViewPanel.tsx: existing note history, phone/email editing and lifecycle status.
- F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\crm\contacts\[id]\route.ts: owned status/notes/tags PATCH; audit canonical-label behavior before reuse.
- F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\crm\labels\route.ts: owned Label catalog and label membership counts.
- F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\appointments\available-slots\route.ts: current public availability route; reuse underlying calendar service with private ownership enforcement.
- F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\appointments\book\route.ts: public booking, calendar event, Appointment and agent notification flow; extract/reuse services deliberately.
- F:\web-clients\joseph-sardella\jpsrealtor\src\lib\gcal-api.ts: per-agent calendar settings/credentials and event creation helpers.

## Remaining progression decision

The user has specified outcomes and connected-call actions, but has not yet explicitly selected automatic progression after No answer/Bad line. Keep that decision open. Connected calls always provide a wrap-up opportunity; retain the currently planned explicit Save & next gate until a different behavior is selected.

Acceptance includes note/tag/appointment changes during uninterrupted audio; preserved unrelated labels; no queue mutation after retagging; owner checks; two users racing for a calendar slot; ambiguous calendar success; duplicate booking/confirmation retry; and reload during pending wrap-up with no lost draft or duplicate event.