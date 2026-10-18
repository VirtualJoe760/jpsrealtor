import { creditWalletForMode } from '@/lib/credit-wallet-mode';
import { stripeConfiguration } from '@/lib/stripe-mode';
import { CREDIT_SPEND_VALUE } from '@/config/credits';
import { dialerOwner, dialerJson } from '@/lib/dialer/session-server';

export async function GET() {
  try {
    const userId = await dialerOwner();
    if (!userId) return dialerJson({ error: 'Unauthorized' }, 401);
    const stripe = stripeConfiguration();
    // Read only: viewing a workspace does not create a wallet or initiate funding.
    const wallet = stripe.mode === 'test' || stripe.mode === 'live'
      ? await creditWalletForMode(stripe.mode).findOne({ userId }).select('balance reservedCredits').lean() : null;
    const balance = wallet?.balance || 0, reservedCredits = wallet?.reservedCredits || 0;
    return dialerJson({ balance, reservedCredits,
      availableCredits: Math.max(0, Math.round((balance - reservedCredits) * 1000) / 1000),
      spendValuePerCredit: CREDIT_SPEND_VALUE,
      stripe, sandbox: stripe.mode === 'test', voiceEnabled: false, autoTopupEnabled: false, readiness: 'pilot-verification-required',
    });
  } catch { return dialerJson({ error: 'Unable to load calling credits' }, 500); }
}
