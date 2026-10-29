// src/config/domain-pricing.ts
//
// What an agent pays to register a domain through ChatRealty (decided
// 2026-10-28): the registrar's price + a flat $10 service fee, billed yearly
// as a Stripe subscription that renews with the domain. Connecting a domain
// the agent already owns is free with Basic.

/** Stripe metadata `type` on domain checkouts and their yearly subscriptions. */
export const DOMAIN_CHECKOUT_TYPE = "domain_registration";

/** Flat fee on top of the registrar's price, every year. */
export const DOMAIN_SERVICE_FEE_USD = 10;

/**
 * Registrar prices above this are premium names — refuse self-serve checkout
 * rather than put a large amount on ChatRealty's Vercel bill on autopilot.
 */
export const MAX_REGISTRAR_PRICE_USD = 60;

/**
 * TLDs offered for self-serve purchase. Kept to TLDs that need no extra
 * registrant fields (Vercel's `additional_contact_info_required`): .us needs
 * a nexus declaration, .realtor is restricted to NAR members, etc. A buy that
 * fails anyway is refunded automatically (src/lib/domains/fulfill.ts).
 */
export const SELF_SERVE_TLDS = [
  "com", "net", "org", "co", "io", "me", "info", "biz",
  "homes", "house", "estate", "properties", "land", "realty",
];

export function tldOf(domain: string): string {
  return domain.split(".").slice(1).join(".");
}

export interface DomainQuote {
  purchasePrice: number; // registrar, year 1
  renewalPrice: number; // registrar, each later year
  firstYearCharge: number; // what the agent pays today
  yearlyCharge: number; // what the agent pays each renewal
}

const cents = (n: number) => Math.round(n * 100) / 100;

export function quoteDomain(purchasePrice: number, renewalPrice: number): DomainQuote {
  return {
    purchasePrice,
    renewalPrice,
    firstYearCharge: cents(purchasePrice + DOMAIN_SERVICE_FEE_USD),
    yearlyCharge: cents(renewalPrice + DOMAIN_SERVICE_FEE_USD),
  };
}

/** Lowercase, strip protocol/path/www. Returns null when it isn't a domain. */
export function normalizeDomain(input: string): string | null {
  const d = String(input || "")
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[/?#].*$/, "");
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(d) && d.length <= 253 ? d : null;
}
