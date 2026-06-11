/**
 * Per-agent SMS legal clauses (Phase 2 — A2P 10DLC consent evidence).
 *
 * US carriers + Twilio A2P vetting require each sending brand (each AGENT, in
 * our multi-tenant model) to publish SMS-specific Terms and Privacy language and
 * link it on the campaign registration as opt-in evidence. These generators
 * produce that boilerplate personalized to the agent.
 *
 * NOT legal advice — this is standard CTIA/A2P boilerplate intended as a
 * reviewable DRAFT. Have the agent (and, ideally, counsel) review before
 * publishing.
 */

export interface AgentLegalInfo {
  agentName: string;        // the agent / brand the messages come from
  brandName?: string;       // platform brand, default "ChatRealty"
  contactEmail?: string;
  contactPhone?: string;    // human support number (not the A2P number)
  privacyUrl?: string;      // absolute URL to the agent's privacy page
}

const brandOf = (i: AgentLegalInfo) => i.brandName || 'ChatRealty';

/** SMS Terms of Service section (the 5 CTIA-required disclosures). */
export function smsTermsClause(info: AgentLegalInfo): string {
  const who = info.agentName;
  const brand = brandOf(info);
  const help = info.contactEmail
    ? `Reply HELP for help or email ${info.contactEmail}.`
    : 'Reply HELP for help.';
  return [
    `## SMS / Text Messaging Terms`,
    ``,
    `**Program.** ${who}, powered by ${brand}, sends text messages about real ` +
      `estate — new listings, open houses, appointment confirmations, and replies ` +
      `to your inquiries.`,
    ``,
    `**Consent.** By providing your mobile number to ${who}, you agree to receive ` +
      `recurring automated and person-to-person text messages at that number. ` +
      `Consent is not a condition of any purchase.`,
    ``,
    `**Message frequency.** Message frequency varies based on your activity and ` +
      `requests.`,
    ``,
    `**Cost.** Message and data rates may apply, charged by your mobile carrier.`,
    ``,
    `**Opt-out.** Reply **STOP** at any time to unsubscribe; you will receive one ` +
      `confirmation and no further messages. Reply **START** to opt back in.`,
    ``,
    `**Help.** ${help}`,
    ``,
    `**Carriers.** Mobile carriers are not liable for delayed or undelivered messages.`,
  ].join('\n');
}

/** Privacy section — the carrier-mandated "no sharing of mobile data" language. */
export function smsPrivacyClause(info: AgentLegalInfo): string {
  const who = info.agentName;
  const brand = brandOf(info);
  return [
    `## Mobile Information & SMS Privacy`,
    ``,
    `${who} (via ${brand}) uses your mobile phone number solely to send the text ` +
      `messages you have consented to receive and to operate the messaging program.`,
    ``,
    `**No sale or sharing for marketing.** We do not sell or rent your mobile ` +
      `information. **No mobile information will be shared with third parties or ` +
      `affiliates for marketing or promotional purposes.** Information may be shared ` +
      `only with subprocessors (e.g., our messaging provider, Twilio) strictly to ` +
      `deliver the messages, and as required by law.`,
    ``,
    `**Opt-out data.** Your opt-out (STOP) request is honored immediately and your ` +
      `consent status is retained as a compliance record.`,
    info.privacyUrl ? `` : ``,
    info.privacyUrl ? `See our full Privacy Policy at ${info.privacyUrl}.` : '',
  ].filter(Boolean).join('\n');
}

/** Convenience: both sections concatenated for a per-agent legal page. */
export function smsLegalSections(info: AgentLegalInfo): string {
  return `${smsTermsClause(info)}\n\n${smsPrivacyClause(info)}`;
}
