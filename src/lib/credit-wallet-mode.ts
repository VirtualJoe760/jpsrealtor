import CreditLedger from '@/models/CreditLedger';
import SandboxCreditLedger from '@/models/SandboxCreditLedger';
import type { StripeMode } from './stripe-mode';

export function creditWalletForMode(mode: StripeMode) {
  if (mode === 'test') return SandboxCreditLedger;
  if (mode === 'live') return CreditLedger;
  throw new Error('Unknown credit wallet mode');
}
