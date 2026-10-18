import mongoose from 'mongoose';
import CreditLedger, { type ICreditLedger, type ICreditLedgerModel } from './CreditLedger';

// Test-mode purchases must not fund the collection used by paid outbound channels.
// Clone the schema so precision, indices and concurrency rules stay identical.
export default (mongoose.models.SandboxCreditLedger
  || mongoose.model<ICreditLedger>('SandboxCreditLedger', CreditLedger.schema.clone(), 'sandbox_credit_ledgers')) as ICreditLedgerModel;
