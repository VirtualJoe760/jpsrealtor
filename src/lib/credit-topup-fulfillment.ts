import type Stripe from 'stripe';
import mongoose from 'mongoose';
import { creditWalletForMode } from '@/lib/credit-wallet-mode';
import { CREDIT_SPEND_VALUE } from '@/config/credits';
import { TOPUP_PRICING_VERSION } from '@/lib/credit-topup-quote';

/** Only call after verifying Stripe's signature. Idempotency lives with the grant. */
export async function fulfillCreditTopup(checkout: Stripe.Checkout.Session) {
  if (checkout.mode !== 'payment' || checkout.metadata?.type !== 'points_topup') return;
  if (checkout.payment_status !== 'paid') return;
  if (typeof checkout.livemode !== 'boolean') throw new Error('Missing payment mode');
  const CreditLedger = creditWalletForMode(checkout.livemode ? 'live' : 'test');
  const meta = checkout.metadata;
  if (meta.billingMode && meta.billingMode !== (checkout.livemode ? 'live' : 'test')) throw new Error('Credit quote mode mismatch');
  const paymentId = typeof checkout.payment_intent === 'string' ? checkout.payment_intent : checkout.payment_intent?.id;
  const points = Number(meta.points);
  if (!/^[a-f\d]{24}$/i.test(meta.userId || '') || !Number.isSafeInteger(points) || points <= 0 || points > 1000000
    || !paymentId || checkout.currency !== 'usd' || !checkout.amount_total || checkout.amount_total < 0) throw new Error('Invalid paid credit top-up');
  if (meta.pricingVersion) {
    const markupPercent = Number(meta.markupPercent);
    const expected = Math.floor(checkout.amount_total * 100 / (Math.round(CREDIT_SPEND_VALUE * 100) * (100 + markupPercent)));
    if (meta.pricingVersion !== TOPUP_PRICING_VERSION || !['0', '15', '20', '25'].includes(meta.markupPercent)
      || expected !== points || Math.round(Number(meta.amount) * 100) !== checkout.amount_total) throw new Error('Paid credit quote mismatch');
  }
  const userId = new mongoose.Types.ObjectId(meta.userId);
  const tier = ['beginner', 'experienced', 'topagent'].includes(meta.tier) ? meta.tier : 'beginner';
  // Initial creation is separate from the atomic grant. A crash here leaves a
  // zero wallet, and the next delivery safely retries the payment-keyed grant.
  try {
    await CreditLedger.updateOne({ userId }, { $setOnInsert: { userId, balance: 0, reservedCredits: 0, tier, totalEarned: 0, totalSpent: 0, transactions: [] } }, { upsert: true });
  } catch (error: any) { if (error?.code !== 11000) throw error; }
  const grant = { _id: new mongoose.Types.ObjectId(), type: 'topup_purchase', amount: points,
    description: 'Credit pack purchase', stripePaymentIntentId: paymentId,
    adSpendValue: points * CREDIT_SPEND_VALUE, metadata: { checkoutSessionId: checkout.id, pricingVersion: meta.pricingVersion || 'legacy', mode: checkout.livemode ? 'live' : 'test' }, createdAt: new Date() };
  const granted = await CreditLedger.findOneAndUpdate({ userId, transactions: { $not: { $elemMatch: { type: 'topup_purchase', stripePaymentIntentId: paymentId } } } }, [
    { $set: { balance: { $add: ['$balance', points] }, totalEarned: { $add: [{ $ifNull: ['$totalEarned', 0] }, points] }, __v: { $add: [{ $ifNull: ['$__v', 0] }, 1] } } },
    { $set: { transactions: { $concatArrays: [{ $ifNull: ['$transactions', []] }, [{ $mergeObjects: [{ $literal: grant }, { balanceAfter: '$balance' }] }]] } } },
  ], { new: true });
  if (!granted) {
    const previous = await CreditLedger.findOne({ userId, transactions: { $elemMatch: { type: 'topup_purchase', stripePaymentIntentId: paymentId } } }).select('_id').lean();
    if (!previous) throw new Error('Paid credit grant was not persisted');
  }
}
