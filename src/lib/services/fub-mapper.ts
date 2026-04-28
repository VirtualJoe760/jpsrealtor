// src/lib/services/fub-mapper.ts
// Maps FUB person objects to Contact model documents

import type { FubPerson } from "./fub-client";

// ---------------------------------------------------------------------------
// Stage -> Status mapping (mirrors Python script)
// ---------------------------------------------------------------------------

const STAGE_MAP: Record<string, string> = {
  lead: "uncontacted",
  new: "uncontacted",
  prospect: "uncontacted",
  "": "uncontacted",
  "spoke with customer": "contacted",
  "appointment set": "contacted",
  "attempted contact": "contacted",
  "met with customer": "qualified",
  "showing homes": "qualified",
  qualified: "qualified",
  nurture: "nurturing",
  "under contract": "nurturing",
  active: "nurturing",
  pipeline: "nurturing",
  closed: "client",
  "past client": "client",
  inactive: "inactive",
  unqualified: "inactive",
  trash: "inactive",
  "do not contact": "inactive",
};

function mapStage(stageName: string | null | undefined): string {
  if (!stageName) return "uncontacted";
  return STAGE_MAP[stageName.toLowerCase().trim()] || "uncontacted";
}

// ---------------------------------------------------------------------------
// Phone formatting
// ---------------------------------------------------------------------------

function formatE164(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length > 11) return `+${digits}`;
  return null;
}

function mapPhoneType(fubType: string | null | undefined): string {
  const map: Record<string, string> = { mobile: "mobile", home: "home", work: "work", fax: "work" };
  return map[(fubType || "").toLowerCase()] || "other";
}

function mapEmailType(fubType: string | null | undefined): string {
  const map: Record<string, string> = { home: "personal", work: "work", personal: "personal" };
  return map[(fubType || "").toLowerCase()] || "other";
}

// ---------------------------------------------------------------------------
// Main mapper
// ---------------------------------------------------------------------------

export function mapFubPersonToContact(person: FubPerson, userId: string) {
  const now = new Date();

  // Phones
  const phones: any[] = [];
  let legacyPhone: string | undefined;
  for (let i = 0; i < (person.phones || []).length; i++) {
    const p = person.phones[i];
    const formatted = formatE164(p.value);
    if (!formatted) continue;
    phones.push({
      number: formatted,
      label: mapPhoneType(p.type),
      isPrimary: i === 0 || !!p.isPrimary,
      isValid: (p.status || "").toLowerCase() !== "invalid",
      country: "US",
    });
    if (i === 0) legacyPhone = formatted;
  }

  // Emails
  const emails: any[] = [];
  let legacyEmail: string | undefined;
  for (let i = 0; i < (person.emails || []).length; i++) {
    const e = person.emails[i];
    const addr = (e.value || "").trim().toLowerCase();
    if (!addr) continue;
    emails.push({
      address: addr,
      label: mapEmailType(e.type),
      isPrimary: i === 0 || !!e.isPrimary,
      isValid: (e.status || "").toLowerCase() !== "invalid",
    });
    if (i === 0) legacyEmail = addr;
  }

  // Address
  let address: any = undefined;
  if (person.addresses && person.addresses.length > 0) {
    const a = person.addresses[0];
    address = {
      street: a.street || "",
      city: a.city || "",
      state: a.state || "",
      zip: a.code || "",
      country: a.country || "US",
    };
  }

  // Status
  let status = mapStage(person.stage);
  if (person.contacted === 1 && status === "uncontacted") {
    status = "contacted";
  }

  // Interests
  const personType = (person.type || "").toLowerCase();
  const tags = person.tags || [];
  const tagLower = tags.map((t) => t.toLowerCase());

  const interests: any = {};
  if (personType === "buyer" || tagLower.includes("buyer")) interests.buying = true;
  if (personType === "seller" || tagLower.includes("seller")) interests.selling = true;
  if (person.price) {
    interests.priceRange = { max: person.price };
  }

  const doc: any = {
    firstName: person.firstName || "",
    lastName: person.lastName || "",
    source: "followupboss",
    status,
    tags,
    fubId: person.id,
    fubSyncedAt: now,
    fubData: person,
    originalData: person,
  };

  if (phones.length) doc.phones = phones;
  if (legacyPhone) doc.phone = legacyPhone;
  if (emails.length) doc.emails = emails;
  if (legacyEmail) doc.email = legacyEmail;
  if (address) doc.address = address;
  if (Object.keys(interests).length) doc.interests = interests;
  if (person.lastActivity) doc.lastContactDate = person.lastActivity;

  return doc;
}
