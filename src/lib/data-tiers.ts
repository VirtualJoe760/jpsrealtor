// src/lib/data-tiers.ts
//
// Storage allowances per subscription tier — the "data tier" half of the
// pricing model. One place, because the number is quoted in three voices that
// must agree: the sync CLI's preflight (plain English to an agent's Claude),
// the /api/skill/tenant response (machine-readable to tooling), and billing
// copy.
//
// WHY TIERED STORAGE EXISTS: association size varies by ~3 orders of
// magnitude. Measured against our own feed (2026-08-06, ~20 KB/row observed
// with raw payload retention): GPS ≈ 4.5k active ≈ 90 MB fits a free
// database; CRMLS ≈ 53.5k ≈ 1 GB+ cannot. A free tier that silently accepts
// a CRMLS seed dies at the 512 MB wall mid-run — which is precisely what
// happened to the first seeded tenant, at row ~26,400, twice. The tier
// ceiling plus the sync's preflight turns that wall into a priced choice
// made BEFORE any rows are written.
//
// NUMBERS ARE DEFAULTS pending Joe's pricing pass — chosen so each tier's
// allowance comfortably covers a class of association: free = one small/mid
// association; beginner = one large association; experienced = multi-network
// regional; topagent = CRMLS-scale plus history.

import type { SubscriptionTier } from "@/models/AgentSubscription";

export const DATA_TIERS: Record<
  SubscriptionTier,
  { storageLimitBytes: number; label: string }
> = {
  free: { storageLimitBytes: 512 * 1024 * 1024, label: "512 MB — one small/mid association" },
  beginner: { storageLimitBytes: 2 * 1024 ** 3, label: "2 GB — one large association" },
  experienced: { storageLimitBytes: 10 * 1024 ** 3, label: "10 GB — multi-network regional" },
  topagent: { storageLimitBytes: 50 * 1024 ** 3, label: "50 GB — full-market plus history" },
};

export function storageForTier(tier: SubscriptionTier) {
  return DATA_TIERS[tier] ?? DATA_TIERS.free;
}

export const UPGRADE_URL = "https://www.chatrealty.io/agent/settings";
