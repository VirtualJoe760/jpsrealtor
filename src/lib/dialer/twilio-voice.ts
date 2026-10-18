import 'server-only';
import twilio from 'twilio';
import { twilioCallbackUrl, twilioVoiceConfiguration, type VoiceEnvironment } from './twilio-voice-config';

const CALL_SID = /^CA[a-f\d]{32}$/i;
const PHONE = /^\+[1-9]\d{7,14}$/;
const STATUSES = new Set(['queued', 'ringing', 'in-progress', 'completed', 'busy', 'failed', 'no-answer', 'canceled']);

/** Trusted server plan only. Ownership/funding must be checked by the future producer. */
export interface TwilioCallPlan {
  jobId: string;
  to: string;
  from: string;
  ringSeconds: number;
  maxCallSeconds: number;
}

export function twilioCallOptions(plan: TwilioCallPlan, env: VoiceEnvironment = process.env) {
  if (!PHONE.test(plan.to) || !PHONE.test(plan.from) || plan.to === plan.from ||
    !Number.isInteger(plan.ringSeconds) || plan.ringSeconds < 5 || plan.ringSeconds > 60 ||
    !Number.isInteger(plan.maxCallSeconds) || plan.maxCallSeconds < 1 || plan.maxCallSeconds > 3600) {
    throw new Error('Invalid voice call plan');
  }
  return {
    to: plan.to, from: plan.from, timeout: plan.ringSeconds, timeLimit: plan.maxCallSeconds,
    url: twilioCallbackUrl('voice', plan.jobId, env), method: 'POST',
    statusCallback: twilioCallbackUrl('status', plan.jobId, env), statusCallbackMethod: 'POST',
    statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'], record: false,
  };
}

/** Separate from the eager SMS singleton. Importing this module performs no requests. */
export function twilioVoiceAdapter(env: VoiceEnvironment = process.env) {
  let client: ReturnType<typeof twilio> | undefined;
  function getClient() {
    const config = twilioVoiceConfiguration(env);
    if (!config.accountConfigured || !config.voiceApiKeyConfigured) throw new Error('Voice credentials unavailable');
    // Disable SDK retries: create-call is not safely replayable after a timeout.
    return client ||= twilio(env.TWILIO_VOICE_API_KEY_SID, env.TWILIO_VOICE_API_KEY_SECRET,
      { accountSid: env.TWILIO_ACCOUNT_SID, autoRetry: false, timeout: 10_000 });
  }
  return {
    async fetchCall(callSid: string) {
      if (!CALL_SID.test(callSid)) throw new Error('Invalid provider call identity');
      const call = await getClient().calls(callSid).fetch();
      if (call.accountSid !== env.TWILIO_ACCOUNT_SID || call.sid !== callSid || !STATUSES.has(call.status)) {
        throw new Error('Provider call identity mismatch');
      }
      const duration = call.duration == null ? null : Number(call.duration);
      return {
        providerCallId: call.sid, status: call.status,
        durationSeconds: Number.isSafeInteger(duration) && duration >= 0 ? duration : null,
        // Provider prices may arrive later; do not use these as an immediate wallet charge.
        price: call.price ?? null, priceUnit: call.priceUnit ?? null,
      };
    },
    async createCall(plan: TwilioCallPlan): Promise<{ providerCallId: string }> {
      const options = twilioCallOptions(plan, env);
      const config = twilioVoiceConfiguration(env);
      if (!config.dispatchRequested || !config.liveCallingEnabled) {
        throw new Error('Live voice dispatch is not activated');
      }
      // This branch stays gated until funded live attempts and signed TwiML routes exist.
      const call = await getClient().calls.create(options);
      if (!CALL_SID.test(call.sid) || call.accountSid !== env.TWILIO_ACCOUNT_SID) throw new Error('Provider call identity mismatch');
      return { providerCallId: call.sid };
    },
  };
}
