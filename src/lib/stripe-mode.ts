export type StripeMode = 'test' | 'live';
type Env = Record<string, string | undefined>;

function keyMode(value?: string): StripeMode | null {
  if (/^(sk|rk|pk)_test_/.test(value || '')) return 'test';
  if (/^(sk|rk|pk)_live_/.test(value || '')) return 'live';
  return null;
}

/** Safe to serialize. Never return keys or webhook signing secrets. */
export function stripeConfiguration(env: Env = process.env) {
  const secret = env.STRIPE_SECRET_KEY;
  const mode = keyMode(secret);
  const publicKeys = [env.STRIPE_PUBLISHABLE_KEY, env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY].filter(Boolean);
  const mismatchedKeys = publicKeys.some(key => keyMode(key) !== mode);
  const secretConfigured = !!secret && /^(sk|rk)_(test|live)_/.test(secret);
  const webhookConfigured = !!env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_');
  return {
    mode: secretConfigured ? mode! : secret ? 'unknown' as const : 'missing' as const,
    secretConfigured, webhookConfigured, mismatchedKeys,
    checkoutConfigured: secretConfigured && webhookConfigured && !mismatchedKeys,
  };
}

export function requireStripeMode(env: Env = process.env): StripeMode {
  const config = stripeConfiguration(env);
  if (config.mode !== 'test' && config.mode !== 'live') throw new Error('Stripe mode is not configured');
  if (config.mismatchedKeys) throw new Error('Stripe keys use different modes');
  return config.mode;
}
