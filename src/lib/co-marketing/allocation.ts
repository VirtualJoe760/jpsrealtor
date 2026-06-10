// src/lib/co-marketing/allocation.ts
//
// Pure fair-value allocation for co-marketing group ad-spend. Computes each
// party's whole-credit share of a campaign's total spend. RESPA-critical: a
// party may only pay for the fair-market value of the advertising THEY receive,
// so the split must be explainable (equal / agreed % / fixed $ / co-branding
// share). No DB, no side effects — fully unit-testable.
//
// Invariant: the returned shares are non-negative integers that sum EXACTLY to
// totalCredits (except 'fixed', where the caller supplies the amounts and the
// total is their sum). We use the largest-remainder method so rounding never
// drops or invents a credit.

export type AllocationBasis = 'equal' | 'percentage' | 'fixed' | 'co_branding_share';

export interface AllocationParticipant {
  userId: string;
  percentage?: number;    // for 'percentage' (e.g. 60 means 60%)
  fixedCredits?: number;  // for 'fixed'
  weight?: number;        // for 'co_branding_share' (relative presence in the creative); default 1
}

export interface AllocationInput {
  totalCredits: number;   // ignored for 'fixed' (total is the sum of fixed amounts)
  basis: AllocationBasis;
  participants: AllocationParticipant[];
}

export interface AllocatedShare {
  userId: string;
  shareCredits: number;
}

/** Distribute `total` integer units across `weights` proportionally, exact sum. */
function largestRemainder(userIds: string[], weights: number[], total: number): AllocatedShare[] {
  const sumW = weights.reduce((s, w) => s + w, 0);
  if (sumW <= 0 || total <= 0) {
    return userIds.map((userId) => ({ userId, shareCredits: 0 }));
  }
  const exact = weights.map((w) => (w / sumW) * total);
  const floors = exact.map((x) => Math.floor(x));
  let remainder = total - floors.reduce((s, f) => s + f, 0);
  // Hand the leftover credits to the largest fractional parts, one each.
  const order = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac);
  const shares = [...floors];
  for (let k = 0; k < order.length && remainder > 0; k++) {
    shares[order[k].i] += 1;
    remainder -= 1;
  }
  return userIds.map((userId, i) => ({ userId, shareCredits: shares[i] }));
}

export function computeShares(input: AllocationInput): AllocatedShare[] {
  const { totalCredits, basis, participants } = input;
  if (participants.length === 0) return [];
  const ids = participants.map((p) => p.userId);

  switch (basis) {
    case 'fixed':
      // Caller-supplied explicit amounts; the campaign total is their sum.
      return participants.map((p) => ({
        userId: p.userId,
        shareCredits: Math.max(0, Math.round(p.fixedCredits ?? 0)),
      }));

    case 'percentage':
      return largestRemainder(ids, participants.map((p) => Math.max(0, p.percentage ?? 0)), totalCredits);

    case 'co_branding_share':
      return largestRemainder(ids, participants.map((p) => Math.max(0, p.weight ?? 1)), totalCredits);

    case 'equal':
    default:
      return largestRemainder(ids, participants.map(() => 1), totalCredits);
  }
}

/** Sum of computed shares — for validation against the campaign total. */
export function totalAllocated(shares: AllocatedShare[]): number {
  return shares.reduce((s, x) => s + x.shareCredits, 0);
}

/**
 * Per-party funding plan given their share + current balance + purchase tier.
 * Implements the funding rule: spend existing balance first, then BUY the
 * remaining credits at the party's tier markup (that purchase is where the
 * platform earns; the ad spend itself stays at wholesale $0.10/credit).
 *
 * `purchasePriceForCredits` comes from src/config/credits.ts.
 */
export interface FundingPlan {
  shareCredits: number;
  creditsFromBalance: number;  // covered by existing balance
  shortfallCredits: number;    // must be purchased
  chargeDollars: number;       // cost to buy the shortfall at this tier (0 if none)
}

export function computeFundingPlan(
  shareCredits: number,
  currentBalance: number,
  shortfallPrice: (credits: number) => number, // e.g. (c) => purchasePriceForCredits(c, tier)
): FundingPlan {
  const share = Math.max(0, Math.round(shareCredits));
  const creditsFromBalance = Math.min(Math.max(0, currentBalance), share);
  const shortfallCredits = share - creditsFromBalance;
  const chargeDollars = shortfallCredits > 0 ? shortfallPrice(shortfallCredits) : 0;
  return { shareCredits: share, creditsFromBalance, shortfallCredits, chargeDollars };
}
