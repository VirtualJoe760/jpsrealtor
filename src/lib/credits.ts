// src/lib/credits.ts
// Unified credit operations: balance lookup, quoting, debit, credit.
// All credit math (rates, conversions, tier costs) lives in src/config/credits.ts.
// All credit storage lives in src/models/CreditLedger.ts.

import mongoose from "mongoose";
import dbConnect from "@/lib/mongoose";
import CreditLedger, {
  type CreditTransactionType,
  type CampaignChannel,
} from "@/models/CreditLedger";
import {
  CREDIT_SPEND_VALUE,
  CREDIT_TIERS,
  CREDITS_PER_SPEND_DOLLAR,
  type CreditTier,
  adBudgetToCredits,
  creditsForPurchase,
  creditsToDollars,
  estimateDirectMailCredits,
  estimateVoicemailCredits,
} from "@/config/credits";
import type { MailType } from "@/lib/thanksio";

// ---------------------------------------------------------------------------
// Quoting
// ---------------------------------------------------------------------------

export type CreditQuoteRequest =
  | { type: "ad"; dailyBudgetDollars: number; days?: number; channel?: CampaignChannel }
  | { type: "mail"; mailType: MailType; count: number; radiusSearch?: boolean; appendData?: boolean }
  | { type: "voicemail"; count: number }
  | { type: "purchase"; dollars: number; tier: CreditTier };

export interface CreditQuoteResult {
  credits: number;
  /** Dollar value of the spend (always credits × $0.10 for spend types). */
  dollarSpendValue: number;
  /** For purchase quotes: what the user pays. */
  purchaseDollars?: number;
  breakdown: Record<string, number | string>;
}

/** Cost preview for any credit operation. Pure math — no DB call. */
export function quote(req: CreditQuoteRequest): CreditQuoteResult {
  switch (req.type) {
    case "ad": {
      const days = req.days ?? 1;
      const credits = adBudgetToCredits(req.dailyBudgetDollars, days);
      return {
        credits,
        dollarSpendValue: creditsToDollars(credits),
        breakdown: {
          dailyBudgetDollars: req.dailyBudgetDollars,
          days,
          creditsPerDollar: CREDITS_PER_SPEND_DOLLAR,
          channel: req.channel ?? "ads",
        },
      };
    }
    case "mail": {
      const credits = estimateDirectMailCredits(req.mailType, req.count, {
        radiusSearch: req.radiusSearch,
        appendData: req.appendData,
      });
      return {
        credits,
        dollarSpendValue: creditsToDollars(credits),
        breakdown: { mailType: req.mailType, count: req.count },
      };
    }
    case "voicemail": {
      const credits = estimateVoicemailCredits(req.count);
      return {
        credits,
        dollarSpendValue: creditsToDollars(credits),
        breakdown: { count: req.count },
      };
    }
    case "purchase": {
      const credits = creditsForPurchase(req.dollars, req.tier);
      return {
        credits,
        dollarSpendValue: creditsToDollars(credits),
        purchaseDollars: req.dollars,
        breakdown: {
          tier: req.tier,
          markup: CREDIT_TIERS[req.tier].markup,
          costPerCredit: CREDIT_TIERS[req.tier].costPerCredit,
        },
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Ledger operations
// ---------------------------------------------------------------------------

export interface CreditBalance {
  userId: string;
  balance: number;
  tier: CreditTier;
  totalEarned: number;
  totalSpent: number;
  dollarSpendValue: number;
}

/** Look up (or create) the credit ledger for a user and return current state. */
export async function getBalance(userId: string | mongoose.Types.ObjectId): Promise<CreditBalance> {
  await dbConnect();
  const uid = typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;
  let ledger = await CreditLedger.findOne({ userId: uid });
  if (!ledger) {
    ledger = await CreditLedger.create({ userId: uid, balance: 0, tier: "beginner" });
  }
  return {
    userId: uid.toString(),
    balance: ledger.balance,
    tier: ledger.tier,
    totalEarned: ledger.totalEarned,
    totalSpent: ledger.totalSpent,
    dollarSpendValue: creditsToDollars(ledger.balance),
  };
}

export interface DebitInput {
  userId: string | mongoose.Types.ObjectId;
  amount: number;
  description: string;
  type?: CreditTransactionType;        // defaults to "campaign_spend"
  channel?: CampaignChannel;
  campaignId?: mongoose.Types.ObjectId | string;
  metadata?: Record<string, any>;
}

/** Atomically check + debit credits. Throws if balance is insufficient. */
export async function debit(input: DebitInput): Promise<CreditBalance> {
  await dbConnect();
  const uid = typeof input.userId === "string" ? new mongoose.Types.ObjectId(input.userId) : input.userId;
  const ledger = await CreditLedger.findOne({ userId: uid });
  if (!ledger) throw new Error("No credit ledger found for user");
  if (ledger.balance < input.amount) {
    throw new Error(`Insufficient credits: needs ${input.amount}, has ${ledger.balance}`);
  }
  ledger.debitPoints(input.amount, input.type ?? "campaign_spend", input.description, {
    channel: input.channel,
    campaignId: input.campaignId
      ? typeof input.campaignId === "string" ? new mongoose.Types.ObjectId(input.campaignId) : input.campaignId
      : undefined,
    adSpendValue: creditsToDollars(input.amount),
    metadata: input.metadata,
  });
  await ledger.save();
  return {
    userId: uid.toString(),
    balance: ledger.balance,
    tier: ledger.tier,
    totalEarned: ledger.totalEarned,
    totalSpent: ledger.totalSpent,
    dollarSpendValue: creditsToDollars(ledger.balance),
  };
}

export interface CreditInput {
  userId: string | mongoose.Types.ObjectId;
  amount: number;
  description: string;
  type: CreditTransactionType;         // required — no spend-side default
  stripePaymentIntentId?: string;
  metadata?: Record<string, any>;
}

export async function credit(input: CreditInput): Promise<CreditBalance> {
  await dbConnect();
  const uid = typeof input.userId === "string" ? new mongoose.Types.ObjectId(input.userId) : input.userId;
  let ledger = await CreditLedger.findOne({ userId: uid });
  if (!ledger) ledger = await CreditLedger.create({ userId: uid, balance: 0, tier: "beginner" });
  ledger.creditPoints(input.amount, input.type, input.description, {
    stripePaymentIntentId: input.stripePaymentIntentId,
    metadata: input.metadata,
  });
  await ledger.save();
  return {
    userId: uid.toString(),
    balance: ledger.balance,
    tier: ledger.tier,
    totalEarned: ledger.totalEarned,
    totalSpent: ledger.totalSpent,
    dollarSpendValue: creditsToDollars(ledger.balance),
  };
}

/** Throws if the user doesn't have enough credits. */
export async function ensureBalance(
  userId: string | mongoose.Types.ObjectId,
  requiredCredits: number
): Promise<void> {
  const b = await getBalance(userId);
  if (b.balance < requiredCredits) {
    throw new Error(`Insufficient credits: needs ${requiredCredits}, has ${b.balance}`);
  }
}

// Re-export the value constants most callers reach for.
export { CREDIT_SPEND_VALUE, CREDITS_PER_SPEND_DOLLAR };
