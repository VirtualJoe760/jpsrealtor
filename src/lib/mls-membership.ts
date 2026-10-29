// src/lib/mls-membership.ts
//
// The agent's MLS association, collected so ChatRealty can call each
// association about IDX data access — we don't have feeds for all of them
// yet (2026-10-28). Stored on User.agentProfile.mlsMembership. Agents edit
// the contact fields; dataAccessStatus/adminNotes are admin-only
// (/admin/mls-associations).

export interface MlsMembershipInput {
  associationName: string;
  mlsId: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  website?: string;
}

const clean = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Validates agent-supplied fields. Returns the clean value or an error message. */
export function parseMlsMembership(body: any): { value?: MlsMembershipInput; error?: string } {
  const value: MlsMembershipInput = {
    associationName: clean(body?.associationName),
    mlsId: clean(body?.mlsId, 60),
    contactName: clean(body?.contactName) || undefined,
    contactPhone: clean(body?.contactPhone, 40) || undefined,
    contactEmail: clean(body?.contactEmail).toLowerCase() || undefined,
    website: clean(body?.website, 300) || undefined,
  };
  if (!value.associationName) return { error: "Enter your MLS association's name." };
  if (!value.mlsId) return { error: "Enter your MLS ID number." };
  if (!value.contactPhone && !value.contactEmail) {
    return { error: "Add the association's phone number or email so we can contact them." };
  }
  if (value.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.contactEmail)) {
    return { error: "That association email doesn't look right." };
  }
  if (value.website && !/^https?:\/\//i.test(value.website)) value.website = `https://${value.website}`;
  return { value };
}

/** Mongo $set for the agent-editable fields (keeps admin status/notes). */
export function mlsMembershipSet(v: MlsMembershipInput): Record<string, unknown> {
  const set: Record<string, unknown> = { "agentProfile.mlsMembership.updatedAt": new Date() };
  for (const [k, val] of Object.entries(v)) set[`agentProfile.mlsMembership.${k}`] = val ?? null;
  return set;
}

export function hasMlsMembership(m?: { associationName?: string; mlsId?: string } | null): boolean {
  return !!(m?.associationName && m?.mlsId);
}
