---
title: Agent Audio and Mobile Calling
status: partial
last_verified: 2026-10-18
related: [README.md, build-plan.md, twilio-voice-adapter.md]
---

# Agent audio and mobile calling

The workspace now offers Audio & devices with local microphone/speaker preferences, an explicit ten-second microphone meter and a short generated speaker tone. These tests are real local device diagnostics, while all calls remain simulated. The Phone option shows the planned call-me and dial-in connection modes; both connection buttons remain disabled until the server bridge is implemented.

## Implemented browser controls

Device enumeration never requests microphone access on mount. Test microphone is the permission gesture; its stream feeds a meter without connecting to speakers, recording or uploading audio. Stop, closing settings, mode/device changes, a call starting, a hidden page and unmount clean up resources. Permission grants arriving after cancellation immediately stop their tracks. Speaker testing uses a quiet half-second generated WAV and setSinkId when supported; selection failures never silently play through a different selected device. Tests stop automatically. Preferences contain only connection mode and device IDs in this browser's local storage.

Output-device APIs are feature-detected. Browsers without setSinkId show system-routing guidance instead of an unusable picker; supported selectAudioOutput prompts are available as Choose another speaker. HTTPS or localhost is required for device access. Browser/device permissions may hide device names or outputs. These preferences do not yet configure a Twilio Device because browser voice SDK audio is not connected.

Files: F:\web-clients\joseph-sardella\jpsrealtor\src\app\components\crm\dialer\DialerAudioSettings.tsx and F:\web-clients\joseph-sardella\jpsrealtor\src\lib\dialer\browser-audio.ts. Offline lifecycle tests use fake media resources; real-device mic/speaker quality remains a manual integration check.

## Accepted phone/mobile direction

Keep agent audio transport separate from the public verified callback number and from prospect legs. A persistent conference-backed agent connection can use browser WebRTC, an outbound call to the agent's verified phone, or an inbound phone call authenticated with a temporary session code. The queue/contact UI stays on the web. A future native mobile app can use the same session controller with native voice SDKs.

Call me: explicitly connect a verified owned phone, reserve funds for the additional agent/conference leg, call it once through a durable command, and require agent acceptance before dialing prospects. A phone answering machine is not a ready agent. Never let a posted arbitrary number become a paid forwarding destination. Preserve the public outbound caller-ID choice independently.

Dial in: issue a short-lived one-use join challenge bound to owner/session and the active agent lease. Store a salted hash of the code, never a plaintext reusable PIN; rate-limit attempts by account/session/source and enforce expiry and global attempt limits. Verify signed inbound/TwiML callbacks and provider account, validate expected call identity and then atomically consume the challenge and claim the single agent slot. Caller ID alone is not authentication. Reject duplicate agent joins and avoid revealing whether another user's session exists. Do not expose conference names or arbitrary room joins to the browser.

On mobile, offer a tel link to the configured dial-in number only after issuing an authorized challenge; the normal phone app handles agent audio while the browser resumes the contact/queue view. Do not substitute a direct tel link to a prospect for controlled dialing: it would bypass metering, multi-line arbitration and provider history. Where cellular data is unavailable during a voice call, explain that the web panel may be temporarily offline and reconcile on return without redialing.

A lost agent leg pauses new destination work, reconciles existing prospect legs and retains uncertain holds. Rejoining is explicit and cannot dial a prospect automatically. End session terminates every tracked agent/prospect leg through durable commands. Pacing, voicemail/overflow, notes and wrap-up remain independent of the chosen agent device. Agent leg, conference and prospect usage must all feed credits and cost reporting; no flat minute price is assumed.

## Remaining implementation

Add DialerAgentConnection and join-challenge models, owner-scoped connection commands, phone verification, signed inbound/DTMF/bridge callbacks, bounded worker jobs, browser tokens/SDK binding and credit reservations/settlement for every leg. Extend the single agent lease for one session with separate agent/prospect capacity. Exercise backgrounding, incoming cellular interruptions, speaker/Bluetooth routing, network loss, expired/replayed codes, concurrent joins and session termination on real iOS/Android devices before activation.

Sources: [Twilio JavaScript SDK mobile limitations](https://www.twilio.com/docs/voice/sdks/javascript), [MDN output routing](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/setSinkId), [MDN speaker permission selection](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/selectAudioOutput).
