---
title: Dialer Email Follow-ups and Newsletter Invitations
status: partial
last_verified: 2026-10-17
related: [README.md, session-continuity.md, ../../integrations/README.md]
---

Implementation sequence and shared contracts: [full build plan](./build-plan.md) and [backend contracts](./backend-contracts.md). This document expands its feature requirements.

# Email follow-ups and newsletter invitations

Add fast, contact-specific email follow-up to the calling workspace. This is a required product feature, not implemented in the current mockup. Reuse the CRM composer/template tools and verified sending identity rather than building an unrelated mail sender. No email is sent or subscriber changed by this planning work.

## Workflow

After a call outcome, show three quick actions: Couldn't reach you, Great speaking with you, and Invite to newsletter. Choosing an action opens an editable draft with the contact's chosen email, name, agent signature and callback number. A no-answer outcome can suggest the first draft; a completed conversation can suggest the second. Do not automatically send because a call ended or someone selected an outcome.

On mobile, open the draft as a sheet inside the calling workspace; retain call controls and return to the same contact and queue position. On desktop, use the contact side panel. Offer Send, Save draft, and Send & next. The last action explicitly sends and records the result before advancing; sending failure keeps the draft and current contact. During an active conversation, sending must not advance the queue or disconnect the call.

Examples are editable template copy, not automatic claims about an interaction:

| Quick action | Starter subject | Starter body |
|---|---|---|
| Couldn't reach you | Sorry I missed you, {{firstName}} | Hi {{firstName}}, I tried reaching you earlier and wanted to follow up by email. Is there a good time for a quick conversation? You can reach me at {{callbackNumber}}. {{signature}} |
| Great speaking with you | Great speaking with you, {{firstName}} | Hi {{firstName}}, it was great speaking with you today. As discussed, {{nextSteps}}. Please let me know if any questions come up. {{signature}} |
| Invite to newsletter | Local real estate updates | Hi {{firstName}}, if you'd like occasional local market updates, neighborhood insights, and real estate tips, you can sign up here: {{newsletterSignupUrl}}. {{signature}} |

Require unresolved placeholders such as nextSteps to be edited or removed before sending. Do not say a conversation happened when the attempt reached voicemail or overflow audio. An optional newsletter invitation paragraph may be added to another draft; it must not silently enroll the recipient.

## Existing integration and required additions

| Existing file (absolute path) | Reuse / caveat |
|---|---|
| F:\web-clients\joseph-sardella\jpsrealtor\src\app\components\crm\compose-panel\hooks\useSendEmail.ts | Existing validation, sending state and CRM send request; follow-up UI must supply a contact-scoped recipient and track persistent send state |
| F:\web-clients\joseph-sardella\jpsrealtor\src\app\components\crm\compose-panel\hooks\useTemplates.ts | Existing template selection/application; extend with personalized follow-up presets |
| F:\web-clients\joseph-sardella\jpsrealtor\src\app\components\crm\compose-panel\constants\index.ts | Existing EMAIL_TEMPLATES and /api/crm/send-email endpoint constant |
| F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\crm\send-email\route.ts | Resend delivery; session auth, paid-plan gating, agent sending-domain verification and recipient credit metering. It accepts recipient strings, so add contact ownership/address/suppression checks in the follow-up orchestration rather than assuming the current route supplies them |
| F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\newsletter\subscribe\route.ts | Existing public, domain-owner-scoped signup with Turnstile/rate limits. It can reactivate unsubscribed entries, so never invoke it as a shortcut for an agent clicking Invite |
| F:\web-clients\joseph-sardella\jpsrealtor\src\app\api\newsletter\subscribers\route.ts | Owner-scoped subscriber status; reconcile newsletter status without exposing another agent's list |

Create a saved follow-up/draft record tied to owner, session, contact and call attempt, with selected recipient, template/version, edited subject/body, newsletter invitation flag, timestamps, provider message ID, and delivery state. Add every field to its Mongoose schema before writing. Contact note content and draft email content are distinct; drafting does not claim an email was sent.

Use a stable send-action ID and an outbox/idempotent server workflow so double taps, ambiguous provider responses, retries and session resumes do not send duplicates or charge twice. Persist pending/accepted/delivered/failed/bounced states where provider events support them; provider acceptance is not proof of delivery. Record follow-up history in the contact timeline and surface it when resuming the list. Never automatically resend an accepted message after an app restart.

## Recipients and subscription handling

- Prefer the contact's primary structured email, allow choosing another saved address, and make the recipient visible before sending. Missing/invalid addresses disable Send and offer the existing contact editor without losing the calling session.
- Enforce authenticated contact ownership, relevant contact/channel suppression, unsubscribe/bounce state and sending identity server-side before delivery. Do not assume a phone-call outcome supplies email marketing permission.
- Newsletter invitation means a signup link to the correct agent's canonical branded newsletter signup page. It is separate from subscription creation. The recipient chooses whether to sign up through the existing public form.
- Show newsletter status as subscribed / not subscribed / unsubscribed / unknown where available. Do not treat a failed status lookup as not subscribed, and do not silently reactivate an unsubscribed recipient. Any future agent-entered subscription consent flow is a separate feature requiring explicit recorded consent and suppression rules.
- Do not invent newsletter frequency, property attachments or market claims in template copy. Attach a market report only when the actual artifact exists and the agent selects it.

## Acceptance

Drafts survive switching contact/dialer panels and resuming a saved session. A no-answer action produces a draft only; newsletter invitations never enroll by themselves. Missing recipient, wrong owner, suppression, unverified sender, insufficient balance and send failures leave actionable UI with no false success. Repeated taps/retries/resume produce at most one accepted send and one credit charge per send-action ID. Send & next advances only after the defined durable handoff, with no call interruption or repeated draft on the next contact.