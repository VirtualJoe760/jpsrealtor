/**
 * Attribute Resolver
 *
 * Takes a raw listing + subdivision profile + parsed remarks and resolves
 * each attribute to a final value with confidence score.
 *
 * Core principle: Unknown ≠ No. A null field is never treated as false.
 */

import {
  ResolvedAttribute,
  ResolvedListingAttributes,
  ConfidenceLevel,
  SubdivisionProfile,
  ParsedRemarks,
  parseViewCategories,
} from "./types";
import { parseRemarks } from "./remarks-parser";

// ─── Helpers ───

function confirmed<T>(value: T): ResolvedAttribute<T> {
  return { value, confidence: 1.0, level: "confirmed", source: "MLS field" };
}

function unknown<T>(): ResolvedAttribute<T> {
  return { value: null, confidence: 0, level: "unknown", source: "No data available" };
}

function fromRemarks<T>(value: T, confidence: number, snippet: string): ResolvedAttribute<T> {
  return { value, confidence, level: "inferred-remarks", source: "publicRemarks", snippet };
}

function fromSubdivision<T>(value: T, confidence: number, detail: string): ResolvedAttribute<T> {
  return { value, confidence, level: "inferred-subdivision", source: `Subdivision profile (${detail})` };
}

// ─── Boolean Resolver ───
// Combines MLS field, remarks signal, and subdivision prevalence.

function resolveBoolean(
  mlsValue: boolean | null | undefined,
  remarksDetected: boolean,
  remarksConfidence: number,
  remarksSnippet: string,
  subdivisionPrevalence: number | null, // null if no profile
  subdivisionMinThreshold: number = 0.75,
  remarksNegative: boolean = false,
): ResolvedAttribute<boolean> {
  // 1. MLS structured field (100% confidence)
  if (mlsValue === true) return confirmed(true);
  if (mlsValue === false) return confirmed(false);

  // 2. Explicit negative in remarks
  if (remarksNegative) return fromRemarks(false, 0.90, "Explicit negative in remarks");

  // 3. Remarks detection
  if (remarksDetected && remarksConfidence > 0) {
    return fromRemarks(true, remarksConfidence, remarksSnippet);
  }

  // 4. Subdivision inference
  if (subdivisionPrevalence !== null) {
    if (subdivisionPrevalence >= subdivisionMinThreshold) {
      const conf = Math.min(0.80, 0.50 + subdivisionPrevalence * 0.30);
      return fromSubdivision(true, conf, `${Math.round(subdivisionPrevalence * 100)}% prevalence`);
    }
    if (subdivisionPrevalence <= 0.10) {
      const conf = Math.min(0.70, 0.50 + (1 - subdivisionPrevalence) * 0.20);
      return fromSubdivision(false, conf, `${Math.round(subdivisionPrevalence * 100)}% prevalence`);
    }
  }

  // 5. Truly unknown
  return unknown();
}

// ─── Main Resolver ───

export function resolveAttributes(
  listing: any,
  profile: SubdivisionProfile | null,
  remarks?: ParsedRemarks,
): ResolvedListingAttributes {
  // Parse remarks if not pre-parsed
  const parsed = remarks || parseRemarks(listing.publicRemarks);
  const negSet = new Set(parsed.negatives.map(n => n.toLowerCase()));

  // ── Pool ──
  const pool = resolveBoolean(
    listing.poolYn ?? listing.pool ?? null,
    parsed.pool.detected && parsed.pool.isPrivate,
    parsed.pool.confidence,
    parsed.pool.snippet,
    profile?.poolPrevalence ?? null,
    0.85,
    negSet.has("no pool"),
  );

  // ── Spa ──
  const spa = resolveBoolean(
    listing.spaYn ?? listing.spa ?? null,
    parsed.spa.detected,
    parsed.spa.confidence,
    parsed.spa.snippet,
    profile?.spaPrevalence ?? null,
    0.80,
    negSet.has("no spa"),
  );

  // ── View ──
  let view: ResolvedAttribute<string>;
  if (listing.view && listing.view.length > 0) {
    view = confirmed(listing.view);
  } else if (listing.viewYn === true) {
    // Has view flag but no description — try remarks
    if (parsed.view.detected && parsed.view.categories.length > 0) {
      view = fromRemarks(parsed.view.categories.join(", "), parsed.view.confidence, parsed.view.snippet);
    } else {
      view = confirmed("Yes (unspecified)");
    }
  } else if (parsed.view.detected) {
    view = fromRemarks(parsed.view.categories.join(", "), parsed.view.confidence, parsed.view.snippet);
  } else if (profile && profile.viewPrevalence >= 0.70 && profile.commonViewTypes.length > 0) {
    view = fromSubdivision(
      profile.commonViewTypes[0],
      0.60,
      `${Math.round(profile.viewPrevalence * 100)}% have views, most common: ${profile.commonViewTypes[0]}`
    );
  } else {
    view = unknown();
  }

  const viewCategories = view.value ? parseViewCategories(view.value) : [];

  // ── Garage ──
  let garage: ResolvedAttribute<number>;
  if (listing.garageSpaces != null && listing.garageSpaces > 0) {
    garage = confirmed(listing.garageSpaces);
  } else if (parsed.garage.detected) {
    garage = fromRemarks(
      parsed.garage.spaces ?? Math.round(profile?.avgGarageSpaces || 2),
      parsed.garage.confidence,
      parsed.garage.snippet
    );
  } else if (profile && profile.garagePrevalence >= 0.85) {
    garage = fromSubdivision(
      Math.round(profile.avgGarageSpaces),
      0.65,
      `${Math.round(profile.garagePrevalence * 100)}% have garages, avg ${profile.avgGarageSpaces.toFixed(1)} spaces`
    );
  } else {
    garage = unknown();
  }

  // ── Gated Community ──
  let gatedCommunity: ResolvedAttribute<boolean>;
  if (listing.gatedCommunity === true) {
    gatedCommunity = confirmed(true);
  } else if (listing.gatedCommunity === false) {
    gatedCommunity = confirmed(false);
  } else if (parsed.gated.detected) {
    gatedCommunity = fromRemarks(true, parsed.gated.confidence, parsed.gated.snippet);
  } else if (profile) {
    if (profile.gatedPrevalence >= 0.90) {
      gatedCommunity = fromSubdivision(true, 0.80, `${Math.round(profile.gatedPrevalence * 100)}% gated`);
    } else if (profile.communityFacts?.securityType?.includes("guard")) {
      gatedCommunity = fromSubdivision(true, 0.90, "Community facts: guard gated");
    } else {
      gatedCommunity = unknown();
    }
  } else {
    gatedCommunity = unknown();
  }

  // ── Senior Community ──
  let seniorCommunity: ResolvedAttribute<boolean>;
  if (listing.seniorCommunityYn === true) {
    seniorCommunity = confirmed(true);
  } else if (listing.seniorCommunityYn === false) {
    seniorCommunity = confirmed(false);
  } else if (profile && profile.seniorPrevalence >= 0.90) {
    seniorCommunity = fromSubdivision(true, 0.85, `${Math.round(profile.seniorPrevalence * 100)}% senior`);
  } else if (profile && profile.seniorPrevalence <= 0.05) {
    seniorCommunity = fromSubdivision(false, 0.80, `${Math.round(profile.seniorPrevalence * 100)}% senior`);
  } else {
    seniorCommunity = unknown();
  }

  // ── Golf ──
  let golf: ResolvedAttribute<boolean>;
  if (listing.view && /golf/i.test(listing.view)) {
    golf = confirmed(true);
  } else if (listing.communityFeatures && /golf/i.test(listing.communityFeatures)) {
    golf = confirmed(true);
  } else if (listing.lotFeatures && /golf/i.test(listing.lotFeatures)) {
    golf = confirmed(true);
  } else if (parsed.golf.detected) {
    golf = fromRemarks(true, parsed.golf.confidence, parsed.golf.snippet);
  } else if (profile && profile.golfPrevalence >= 0.50) {
    golf = fromSubdivision(true, 0.70, `${Math.round(profile.golfPrevalence * 100)}% golf-related`);
  } else {
    golf = { value: false, confidence: 0.60, level: "unknown", source: "No golf signals detected" };
  }

  // ── Remodeled ──
  let remodeled: ResolvedAttribute<boolean>;
  if (parsed.remodeled.detected) {
    remodeled = fromRemarks(true, parsed.remodeled.confidence, parsed.remodeled.snippet);
  } else {
    remodeled = unknown();
  }

  // ── Furnished ──
  let furnished: ResolvedAttribute<string>;
  if (listing.furnished && listing.furnished !== "Unfurnished") {
    furnished = confirmed(listing.furnished);
  } else if (parsed.furnished.detected && parsed.furnished.level) {
    furnished = fromRemarks(parsed.furnished.level, parsed.furnished.confidence, parsed.furnished.snippet);
  } else if (listing.furnished === "Unfurnished") {
    furnished = confirmed("Unfurnished");
  } else {
    furnished = unknown();
  }

  return {
    pool,
    spa,
    view,
    viewCategories,
    garage,
    gatedCommunity,
    seniorCommunity,
    golf,
    remodeled,
    furnished,
  };
}
