const SID = { account: /^AC[a-f\d]{32}$/i, key: /^SK[a-f\d]{32}$/i };
export type VoiceEnvironment = Record<string, string | undefined>;
export const TWILIO_STATUS_PATH = '/api/crm/dialer/webhooks/twilio/status';
export const TWILIO_VOICE_PATH = '/api/crm/dialer/webhooks/twilio/voice';

export function publicDialerOrigin(env: VoiceEnvironment): string | null {
  try {
    const url = new URL(env.DIALER_PUBLIC_BASE_URL || '');
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') return null;
    return url.origin;
  } catch { return null; }
}

export function twilioVoiceConfiguration(env: VoiceEnvironment = process.env) {
  const accountConfigured = SID.account.test(env.TWILIO_ACCOUNT_SID || '');
  const voiceApiKeyConfigured = SID.key.test(env.TWILIO_VOICE_API_KEY_SID || '') && !!env.TWILIO_VOICE_API_KEY_SECRET;
  const signatureSecretConfigured = !!env.TWILIO_AUTH_TOKEN;
  const callbackBaseConfigured = !!publicDialerOrigin(env);
  return {
    accountConfigured, voiceApiKeyConfigured, signatureSecretConfigured, callbackBaseConfigured,
    dispatchRequested: env.DIALER_TWILIO_DISPATCH_ENABLED === 'true',
    // Configuration is not proof of the funded producer, callback routes or agent audio.
    liveCallingEnabled: false,
  };
}

export function twilioCallbackUrl(kind: 'status' | 'voice', jobId: string, env: VoiceEnvironment = process.env) {
  const origin = publicDialerOrigin(env);
  if (!origin || !/^[a-f\d]{24}$/i.test(jobId)) throw new Error('Invalid voice callback configuration');
  return `${origin}${kind === 'status' ? TWILIO_STATUS_PATH : TWILIO_VOICE_PATH}?jobId=${jobId}`;
}
