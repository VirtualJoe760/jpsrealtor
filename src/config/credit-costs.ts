// src/config/credit-costs.ts
// DEPRECATED — this file is now a back-compat shim.
// New code should import directly from "@/config/credits".
// All existing imports continue to work via the re-exports below.

export {
  CREDIT_SPEND_VALUE,
  CREDIT_SPEND_VALUE as CREDIT_AD_VALUE,
  CREDITS_PER_SPEND_DOLLAR as AD_SPEND_CREDITS_PER_DOLLAR,
  DIRECT_MAIL_CREDITS,
  RADIUS_LOOKUP_CREDITS,
  DATA_APPEND_CREDITS,
  VOICEMAIL_DROP_CREDITS,
  DIRECT_MAIL_LABELS,
  dollarsToCredits,
  creditsToDollars,
  adBudgetToCredits,
  estimateDirectMailCredits,
  estimateVoicemailCredits,
} from "./credits";
