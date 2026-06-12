/**
 * Per-agent legal documents (Terms of Service + Privacy Policy).
 *
 * Based on ChatRealty's own approved Terms/Privacy (src/app/terms-of-service +
 * src/app/privacy-policy), parameterized per agent. Goal: agents never write
 * legal docs — we generate standardized ones with their identity. Agents MAY
 * supply their own body, but the **mandatory platform clause** (which releases
 * ChatRealty / the platform operator from liability on the agent's branded site)
 * and the **SMS clause** are ALWAYS appended at compose time and cannot be
 * removed. Agent is covered, platform is protected, agent keeps freedom over
 * the rest.
 *
 * NOT legal advice — reviewable boilerplate adapted from the platform's docs.
 */
import { smsTermsClause, smsPrivacyClause } from '@/lib/messaging/sms-legal';

export interface AgentLegalInfo {
  agentName: string;          // e.g. "Joseph Sardella"
  licenseNumber?: string;     // DRE # / license number
  businessEntity?: string;    // e.g. "JPS & Company LLC"
  brokerageName?: string;     // e.g. "eXp Realty of Southern California"
  brandName?: string;         // platform brand, default "ChatRealty"
  platformEntity?: string;    // operator behind the platform, default "JPS & Company LLC"
  websiteUrl?: string;        // the agent's branded site
  contactEmail?: string;
  contactPhone?: string;
  mailingCity?: string;       // e.g. "Palm Desert, California 92260"
  state?: string;             // governing-law state, default "California"
  effectiveDate?: string;     // passed in by the caller
}

const brand = (i: AgentLegalInfo) => i.brandName || 'ChatRealty';
const operator = (i: AgentLegalInfo) => i.platformEntity || 'JPS & Company LLC';
const stateOf = (i: AgentLegalInfo) => i.state || 'California';

/** "Joseph Sardella, operating as JPS & Company LLC through eXp Realty…" */
function partyDescriptor(i: AgentLegalInfo): string {
  let s = i.agentName;
  if (i.licenseNumber) s += `, licensed real estate agent (DRE# ${i.licenseNumber})`;
  if (i.businessEntity) s += `, operating as ${i.businessEntity}`;
  if (i.brokerageName) s += ` through ${i.brokerageName}`;
  return s;
}

const protectedParties = (i: AgentLegalInfo) =>
  [i.agentName, i.businessEntity, i.brokerageName, `${brand(i)} and ${operator(i)}`]
    .filter(Boolean)
    .join(', ');

function header(title: string, i: AgentLegalInfo): string {
  return [
    `# ${title}`,
    '',
    `**${partyDescriptor(i)}**`,
    i.websiteUrl ? i.websiteUrl : '',
    i.effectiveDate ? `_Last Updated: ${i.effectiveDate}_` : '',
  ].filter(Boolean).join('\n');
}

/**
 * MANDATORY, non-removable. Identifies the platform and releases ChatRealty /
 * the platform operator from liability for the agent's services on their site.
 */
export function platformClause(i: AgentLegalInfo): string {
  const agent = i.agentName;
  return [
    `## Platform & Technology Provider`,
    '',
    `This website is operated by ${agent} and is **powered by ${brand(i)}™, a ` +
      `software and technology platform operated by ${operator(i)}.** ${brand(i)} ` +
      `is a technology provider only — it is **not a real estate brokerage or ` +
      `agent, and is not a party to any transaction, representation agreement, or ` +
      `communication** between you and ${agent}. ${agent} (and their brokerage) is ` +
      `solely responsible for all real estate services, advice, listings, pricing, ` +
      `and content on this website.`,
    '',
    `The website and platform are provided **"AS IS" and "AS AVAILABLE"** without ` +
      `warranties of any kind. To the maximum extent permitted by law, **${brand(i)} ` +
      `and ${operator(i)}, and their affiliates, officers, and employees, shall not ` +
      `be liable** for any direct, indirect, incidental, special, consequential, or ` +
      `punitive damages arising from this website or ${agent}'s services, and you ` +
      `agree to indemnify and hold them harmless from any related claims.`,
    '',
    `_This Platform section is required, applies in addition to any custom terms ` +
      `provided by ${agent}, and may not be removed or modified._`,
  ].join('\n');
}

/** Standardized Terms body (adapted from the platform's TOS). */
export function standardTerms(i: AgentLegalInfo): string {
  const agent = i.agentName;
  return [
    `## 1. Agreement to Terms`,
    `These Terms of Service ("Terms") are a legally binding agreement between you ` +
      `and ${partyDescriptor(i)} ("we," "us," or "our"), governing your use of this ` +
      `website and all related features, content, tools, and services (the "Site"). ` +
      `By using the Site you agree to these Terms and our Privacy Policy. If you do ` +
      `not agree, do not use the Site. We may modify these Terms; continued use after ` +
      `changes constitutes acceptance.`,
    '',
    `## 2. Eligibility`,
    `You must be at least 18 and able to enter binding agreements to use the Site.`,
    '',
    `## 3. Accounts & Security`,
    `If you create an account, you agree to provide accurate information and are ` +
      `responsible for activity under your account. Optional two-factor authentication ` +
      `(2FA) via SMS is available. We may suspend or terminate accounts for conduct ` +
      `that violates these Terms.`,
    '',
    `## 4. Services`,
    `The Site provides real estate listing data (sourced from the applicable MLS), an ` +
      `AI-powered assistant, market analysis and CMA reports, and communication tools ` +
      `(chat, SMS, email). All such information is for general informational purposes ` +
      `only, is not guaranteed accurate or complete, and is not a substitute for ` +
      `professional, legal, or financial advice. Verify independently before relying ` +
      `on it. Standard message and data rates may apply to SMS.`,
    '',
    `## 5. Real Estate Services`,
    `Real estate services are provided by ${agent}` +
      (i.brokerageName ? ` through ${i.brokerageName}` : '') +
      `. Any representation agreements, purchase contracts, or other legal documents ` +
      `are between you and the licensed real estate professional and/or brokerage. ` +
      `${agent} is solely responsible for compliance with real estate, advertising, ` +
      `fair housing, and communications laws (including the TCPA and CAN-SPAM Act).`,
    '',
    `## 6. Intellectual Property & MLS Data`,
    `Site content is owned by or licensed to us and may not be copied or redistributed ` +
      `without consent. MLS listing data is licensed for personal, non-commercial use ` +
      `to identify prospective properties and may not be reproduced or redistributed. ` +
      `By submitting content (reviews, photos, messages), you grant us a non-exclusive, ` +
      `royalty-free license to use it in connection with the Site.`,
    '',
    `## 7. Prohibited Conduct`,
    `You agree not to use the Site unlawfully; violate fair housing laws; scrape or ` +
      `extract data; reproduce MLS data; interfere with or attempt unauthorized access ` +
      `to the Site; transmit malware; send spam in violation of the TCPA/CAN-SPAM Act; ` +
      `impersonate others; or misuse AI features to generate harmful or illegal content.`,
    '',
    `## 8. Disclaimers`,
    `THE SITE AND ALL CONTENT AND SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" ` +
      `WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, ` +
      `FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. We do not warrant the ` +
      `accuracy of listing data, valuations, CMA reports, or AI-generated content, and ` +
      `are not responsible for third-party services or other users' conduct.`,
    '',
    `## 9. Limitation of Liability`,
    `TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL ${protectedParties(i).toUpperCase()}, ` +
      `OR THEIR OFFICERS, EMPLOYEES, OR AFFILIATES, BE LIABLE FOR ANY INDIRECT, ` +
      `INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES. TOTAL AGGREGATE ` +
      `LIABILITY SHALL NOT EXCEED THE GREATER OF THE AMOUNTS YOU PAID IN THE PRECEDING ` +
      `12 MONTHS OR ONE HUNDRED DOLLARS ($100).`,
    '',
    `## 10. Indemnification`,
    `You agree to indemnify, defend, and hold harmless ${protectedParties(i)}, and their ` +
      `respective officers, employees, and affiliates, from any claims, damages, or ` +
      `expenses (including reasonable attorneys' fees) arising from your use of the Site, ` +
      `your violation of these Terms or applicable law, or your content.`,
    '',
    `## 11. Dispute Resolution`,
    `These Terms are governed by the laws of the State of ${stateOf(i)}. Before any ` +
      `formal proceeding, you agree to first attempt informal resolution for 30 days. ` +
      `Disputes will be resolved through **binding individual arbitration** (JAMS ` +
      `Streamlined Rules), except small-claims matters. **YOU AND WE WAIVE ANY RIGHT ` +
      `TO A CLASS, COLLECTIVE, OR REPRESENTATIVE PROCEEDING.**`,
    '',
    `## 12. Electronic Communications`,
    `By using the Site you consent to receive electronic communications (email, SMS, ` +
      `push notifications, in-app messages), which satisfy any legal writing ` +
      `requirement. You may opt out of non-essential communications as described in the ` +
      `Privacy Policy and the SMS terms below.`,
    '',
    `## 13. Severability & Entire Agreement`,
    `If any provision is unenforceable, it will be modified or severed and the rest ` +
      `remains in effect. These Terms, the Privacy Policy, and any agreements you enter ` +
      `with us constitute the entire agreement regarding the Site.`,
  ].join('\n');
}

/** Standardized Privacy body (adapted from the platform's Privacy Policy). */
export function standardPrivacy(i: AgentLegalInfo): string {
  const agent = i.agentName;
  const contact = i.contactEmail ? ` at ${i.contactEmail}` : '';
  return [
    `## 1. Introduction`,
    `This Privacy Policy describes how ${partyDescriptor(i)} ("we," "us," or "our") ` +
      `collects, uses, shares, and protects your information when you use this website ` +
      `(the "Site"), which is powered by ${brand(i)}.`,
    '',
    `## 2. Information We Collect`,
    `**You provide:** name, email, phone, password, real estate preferences, contact ` +
      `and inquiry details, communication content (including SMS and AI chat), and any ` +
      `content you upload. **Collected automatically:** device/browser info, IP address, ` +
      `usage data, approximate (or, with permission, precise) location, cookies, and ` +
      `property-interaction data. **From third parties:** MLS listing data, public ` +
      `records, market data, and neighborhood/business information.`,
    '',
    `## 3. How We Use Information`,
    `To provide real estate services and listings; power AI assistant features; ` +
      `respond to inquiries and connect you with ${agent}; send transactional and ` +
      `(with your consent) marketing communications; analyze and improve the Site; and ` +
      `for security, fraud prevention, and legal compliance.`,
    '',
    `## 4. How We Share Information`,
    `**We do not sell your personal information.** We share it with service providers ` +
      `that operate the Site on our behalf — including **Twilio** (SMS), **Stripe** ` +
      `(payments/identity), cloud hosting, AI providers, mapping, and email delivery — ` +
      `who are contractually bound to protect it and use it only to provide their ` +
      `services. We may share certain data with advertising partners (Google, Meta) for ` +
      `measurement and retargeting (you can opt out), with real estate professionals to ` +
      `respond to your inquiries, as required by law, and in a business transfer.`,
    '',
    `## 5. Data Retention`,
    `We retain information while your account is active and as needed for our services ` +
      `and legal obligations (e.g., transaction records retained per applicable real ` +
      `estate regulations). Aggregated, anonymized data may be retained indefinitely.`,
    '',
    `## 6. Data Security`,
    `We use industry-standard safeguards (TLS in transit, encryption at rest, bcrypt ` +
      `password hashing, optional SMS 2FA, PCI-DSS-compliant payment processing via ` +
      `Stripe, and access controls). No method of transmission or storage is 100% ` +
      `secure; we will notify affected users of a breach as required by law.`,
    '',
    `## 7. Cookies & Tracking`,
    `We use essential, preference, analytics, and advertising cookies/pixels (including ` +
      `Google Analytics and the Meta Pixel). You can manage cookies in your browser and ` +
      `opt out via Google and Meta ad settings.`,
    '',
    `## 8. Your Privacy Rights`,
    `California residents have rights under the CCPA/CPRA, including to know, delete, ` +
      `correct, opt out of sharing for targeted advertising, limit use of sensitive ` +
      `information, and non-discrimination. Other jurisdictions may grant additional ` +
      `rights. To exercise them, contact us${contact}. You may opt out of marketing ` +
      `emails via "unsubscribe" and of marketing SMS by replying STOP.`,
    '',
    `## 9. Children's Privacy`,
    `The Site is not intended for individuals under 18, and we do not knowingly collect ` +
      `their information.`,
    '',
    `## 10. Third-Party Links & International Transfers`,
    `The Site links to third-party services with their own privacy practices. The Site ` +
      `is hosted in the United States; by using it you consent to processing your ` +
      `information there.`,
    '',
    `## 11. Changes`,
    `We may update this Policy; material changes will be reflected in the "Last Updated" ` +
      `date and, where appropriate, communicated to you.`,
  ].join('\n');
}

/** Build AgentLegalInfo from a (lean) User doc. Server-side only. */
export function agentLegalInfoFromUser(user: any): AgentLegalInfo {
  const ap = user.agentProfile || {};
  const domain = ap.customDomain || ap.subdomain;
  return {
    agentName: user.name || 'Your Agent',
    brandName: 'ChatRealty',
    platformEntity: 'JPS & Company LLC',
    businessEntity: ap.businessName || user.businessName,
    brokerageName: ap.brokerageName || user.brokerageName,
    licenseNumber: ap.licenseNumber || user.licenseNumber,
    state: ap.state || 'California',
    websiteUrl: domain ? (String(domain).startsWith('http') ? domain : `https://${domain}`) : undefined,
    contactEmail: user.email,
    contactPhone: ap.cellPhone || ap.officePhone || user.phone,
    mailingCity: [ap.city, ap.state, ap.zip].filter(Boolean).join(', ') || undefined,
    effectiveDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  };
}

const smsInfo = (i: AgentLegalInfo) => ({
  agentName: i.agentName,
  brandName: i.brandName,
  contactEmail: i.contactEmail,
  contactPhone: i.contactPhone,
  privacyUrl: i.websiteUrl ? `${i.websiteUrl.replace(/\/$/, '')}/privacy-policy` : undefined,
});

function contactBlock(i: AgentLegalInfo): string {
  return [
    `## Contact`,
    '',
    `**${i.agentName}**` + (i.licenseNumber ? ` · DRE# ${i.licenseNumber}` : ''),
    i.businessEntity || '',
    i.brokerageName || '',
    i.contactEmail ? `Email: ${i.contactEmail}` : '',
    i.contactPhone ? `Phone: ${i.contactPhone}` : '',
    i.websiteUrl ? `Website: ${i.websiteUrl}` : '',
    i.mailingCity ? `Mailing Address: ${i.mailingCity}` : '',
  ].filter(Boolean).join('\n');
}

/**
 * Full Terms: (agent's custom body OR the standard body), then the ALWAYS-included
 * platform clause + SMS terms clause + contact block.
 */
export function composeAgentTerms(i: AgentLegalInfo, customTerms?: string): string {
  const body = customTerms && customTerms.trim() ? customTerms.trim() : standardTerms(i);
  return [
    header('Terms of Service', i),
    body,
    platformClause(i),
    smsTermsClause(smsInfo(i)),
    contactBlock(i),
  ].join('\n\n---\n\n');
}

/**
 * Full Privacy Policy: (agent's custom body OR the standard body), then the
 * ALWAYS-included SMS privacy clause + platform note + contact block.
 */
export function composeAgentPrivacy(i: AgentLegalInfo, customPrivacy?: string): string {
  const body = customPrivacy && customPrivacy.trim() ? customPrivacy.trim() : standardPrivacy(i);
  const platformNote =
    `## Platform\n\nThis site is operated by ${i.agentName} and powered by ${brand(i)}, ` +
    `a technology platform operated by ${operator(i)} that processes data on the ` +
    `agent's behalf and does not sell your personal information. _This section is ` +
    `required and may not be removed._`;
  return [
    header('Privacy Policy', i),
    body,
    smsPrivacyClause(smsInfo(i)),
    platformNote,
    contactBlock(i),
  ].join('\n\n---\n\n');
}
