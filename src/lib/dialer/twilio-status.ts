import 'server-only';
import { createHash } from 'node:crypto';
import twilio from 'twilio';
import { TWILIO_STATUS_PATH, twilioCallbackUrl, twilioVoiceConfiguration, type VoiceEnvironment } from './twilio-voice-config';

// Progress callbacks include initiated, although the REST CallStatus type omits it.
const STATUSES = new Set(['queued', 'initiated', 'ringing', 'in-progress', 'completed', 'busy', 'failed', 'no-answer', 'canceled']);
export class TwilioStatusValidationError extends Error {}
export interface VerifiedTwilioStatus {
  jobId: string;
  providerCallId: string;
  status: string;
  sequence: number;
  durationSeconds: number | null;
  payloadHash: string;
}

/** Form-body status callbacks only. No forwarded host headers or caller-supplied canonical URL. */
export function verifyTwilioStatus(input: {
  url: string; method: string; contentType: string; signature: string; body: string;
}, env: VoiceEnvironment = process.env): VerifiedTwilioStatus {
  const reject = () => { throw new TwilioStatusValidationError('Invalid Twilio status callback'); };
  const config = twilioVoiceConfiguration(env);
  if (!config.accountConfigured || !config.signatureSecretConfigured || !config.callbackBaseConfigured) reject();
  if (input.method !== 'POST' || input.contentType.split(';')[0].trim().toLowerCase() !== 'application/x-www-form-urlencoded' ||
    Buffer.byteLength(input.body, 'utf8') > 16_384 || !input.signature || input.signature.length > 128) reject();
  let url: URL;
  try { url = new URL(input.url); } catch { return reject(); }
  const jobId = url.searchParams.get('jobId') || '';
  let canonical: string;
  try { canonical = twilioCallbackUrl('status', jobId, env); } catch { return reject(); }
  if (url.pathname !== TWILIO_STATUS_PATH || input.url !== canonical) reject();
  const params: Record<string, string> = Object.create(null);
  for (const [key, value] of new URLSearchParams(input.body)) {
    if (Object.hasOwn(params, key) || key.length > 100 || value.length > 2048 || Object.keys(params).length >= 64) reject();
    params[key] = value;
  }
  if (!twilio.validateRequest(env.TWILIO_AUTH_TOKEN!, input.signature, canonical, params) ||
    params.AccountSid !== env.TWILIO_ACCOUNT_SID || !/^CA[a-f\d]{32}$/i.test(params.CallSid || '') ||
    !STATUSES.has(params.CallStatus) || !/^\d{1,9}$/.test(params.SequenceNumber || '')) reject();
  let durationSeconds: number | null = null;
  if (params.CallDuration !== undefined) {
    if (!/^\d{1,9}$/.test(params.CallDuration)) reject();
    durationSeconds = Number(params.CallDuration);
  }
  // Hash only the normalized event: irrelevant Twilio fields do not cause replay conflicts.
  const event = { jobId, providerCallId: params.CallSid, status: params.CallStatus,
    sequence: Number(params.SequenceNumber), durationSeconds };
  return { ...event, payloadHash: createHash('sha256').update(JSON.stringify(event)).digest('hex') };
}
