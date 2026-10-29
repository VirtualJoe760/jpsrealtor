// src/config/feature-access.ts
//
// Outreach — campaigns (ads, postcards, voicemail), text messages and email
// sending — is ADMIN-ONLY for now (decided 2026-10-28). It isn't ready for
// agents, and every channel spends real money. Paying Basic agents and
// grandfathered agents are locked out the same as free ones.
//
// Enforced in three places; flip this ONE constant to open them:
//   - src/proxy.ts            → refuses /api outreach prefixes for signed-in
//                                non-admins, and redirects the /agent pages
//   - each outreach route      → `!OUTREACH_FOR_AGENTS || isFreeTier(...)` guard
//   - agent nav + Settings     → hides Email / Messages / Campaigns and the
//                                ad-account, messaging and email integrations
// The phone dialer has its own admin-only gate (src/lib/dialer/session-server.ts).

export const OUTREACH_FOR_AGENTS = false;

/** Portal pages for outreach features. */
export const OUTREACH_PAGE_PREFIXES = ["/agent/campaigns", "/agent/messages", "/agent/email"];

/**
 * API prefixes refused to signed-in non-admins while outreach is off. Requests
 * with no session (Twilio/Stripe/Drop Cowboy webhooks) are not affected —
 * those verify their own signatures in-route.
 */
export const OUTREACH_API_PREFIXES = [
  "/api/campaigns",
  "/api/crm/send-email",
  "/api/crm/sms/send",
  "/api/agent/email",
  "/api/agent/messaging",
  "/api/dropcowboy/campaign",
];
