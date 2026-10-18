import { CREDIT_SPEND_VALUE, CREDIT_TIERS, type CreditTier } from '@/config/credits';

export const TOPUP_PRICING_VERSION = 'credits-v1';
export function quoteCreditTopup(amount: unknown, baseTier: CreditTier | null, admin = false) {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 10 || amount > 10000
    || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001) {
    throw new Error('Top-up must be $10–$10,000 in whole cents');
  }
  const tier: CreditTier = admin || amount >= 1000 || baseTier === 'topagent' ? 'topagent'
    : amount >= 500 || baseTier === 'experienced' ? 'experienced' : 'beginner';
  const markup = admin ? 0 : CREDIT_TIERS[tier].markup;
  const amountCents = Math.round(amount * 100);
  // Integer cents and integer markup avoid boundary under-grants from float division.
  const spendCentsPerCredit = Math.round(CREDIT_SPEND_VALUE * 100);
  const points = Math.floor(amountCents * 100 / (spendCentsPerCredit * (100 + Math.round(markup * 100))));
  return { points, tier, amountCents, amount: amountCents / 100, markup,
    adSpendValue: points * CREDIT_SPEND_VALUE, pricingVersion: TOPUP_PRICING_VERSION };
}
