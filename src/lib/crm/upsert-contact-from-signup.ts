// src/lib/crm/upsert-contact-from-signup.ts
//
// Agent 32 — the ported `linkUserToAgent` lead-capture upsert (build_plan §8.3).
//
// PORT, NOT INVENTION. The legacy app runs `linkUserToAgent()`
// (`src/lib/signup-origin.ts`) on every end-user signup: it creates-or-links a
// deduped CRM `Contact` for the agent, stamped `source: "website"`, tagged, and
// linked to the end-user account — and it NEVER fails the signup on a CRM error.
// This is that exact flow re-homed onto the per-tenant Postgres CRM (`contact`
// table, migration 0002_crm_leadloop / `src/lib/db/schema/crm.ts`).
//
// THE DATABASE IS THE AGENT (build_plan §3.3 / §8.3): the product is
// database-per-tenant, so a contact carries NO `userId` agent-scoping — the
// tenant DB itself is the isolation boundary. Dedup therefore drops the legacy
// `(userId, phone)` compound and becomes a per-tenant lookup that mirrors
// `linkUserToAgent`'s `$or`: phone first (the table's only hard unique), then a
// soft email match (legacy mirror `email` / structured `emails[].address`),
// then the `linked_user_id` link.
//
// NON-BLOCKING (build_plan §8.3 invariant): this function NEVER throws to its
// caller. A signup must succeed even when the CRM write fails. On any error it
// logs (no secrets / PII bodies) and returns `{ contactId: null, created:false }`.
//
// TENANT SCOPING (build_plan §3.3): the per-tenant `DbAdapter` is passed in — it
// is obtained by the caller from the keystone resolver. This module never
// constructs an adapter, never opens a Pool, never imports a module-level `db`.

import type { DbAdapter } from "@/lib/db/adapter";

// ---------------------------------------------------------------------------
// Public input / output
// ---------------------------------------------------------------------------

/** The signup details a Contact is upserted from (mirrors `linkUserToAgent`). */
export interface SignupContactInput {
  /** Display name (split into first/last like the legacy port). Optional. */
  readonly name?: string | null;
  /** Email — the soft dedup key + legacy mirror. At least one of email/phone. */
  readonly email?: string | null;
  /** Phone — the hard per-tenant dedup key (sparse-unique). */
  readonly phone?: string | null;
  /** Lead source. Defaults to `"website"` (the legacy enum value). */
  readonly source?: string | null;
  /**
   * The tenant `end_user.id` this contact is linked to, when the signup created
   * an end-user account. Stamped as `linked_user_id` (the legacy `linkedUserId`).
   */
  readonly endUserId?: string | null;
  /**
   * Extra tags to stamp beyond the canonical `"Website Signup"` tag. The legacy
   * port also tags the origin domain; the BYO-auth path may pass it here.
   */
  readonly tags?: readonly string[] | null;
}

/** The non-throwing result. `contactId` is null only when the upsert failed. */
export interface UpsertContactResult {
  /** The upserted/linked contact id, or `null` when the write failed. */
  readonly contactId: string | null;
  /** True when a NEW contact row was inserted; false when an existing one was linked. */
  readonly created: boolean;
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

const CANONICAL_TAG = "Website Signup";
const DEFAULT_SOURCE = "website";

/** Lowercase + trim an email; `null` when absent/blank (the legacy key shape). */
function normalizeEmail(email: string | null | undefined): string | null {
  const e = (email ?? "").trim().toLowerCase();
  return e.length > 0 ? e : null;
}

/** Trim a phone; `null` when absent/blank. */
function normalizePhone(phone: string | null | undefined): string | null {
  const p = (phone ?? "").trim();
  return p.length > 0 ? p : null;
}

/** Split a display name into { firstName, lastName }, mirroring the legacy port. */
function splitName(
  name: string | null | undefined,
  email: string | null,
): { firstName: string; lastName: string } {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || (email ? email.split("@")[0] : "") || "";
  const lastName = parts.slice(1).join(" ") || "";
  return { firstName, lastName };
}

/** The structured `emails[]` jsonb element (Mongo IEmail shape). */
function buildEmailsJson(email: string | null): unknown[] {
  return email
    ? [{ address: email, label: "personal", isPrimary: true, isValid: true }]
    : [];
}

/** The structured `phones[]` jsonb element (Mongo IPhone shape). */
function buildPhonesJson(phone: string | null): unknown[] {
  return phone
    ? [{ number: phone, label: "mobile", isPrimary: true, isValid: true }]
    : [];
}

/** Dedupe + assemble the tag list (canonical first, then any extras). */
function buildTags(extra: readonly string[] | null | undefined): string[] {
  const out = [CANONICAL_TAG];
  for (const t of extra ?? []) {
    const tag = (t ?? "").trim();
    if (tag && !out.includes(tag)) out.push(tag);
  }
  return out;
}

interface ExistingRow {
  readonly id: string;
  readonly linked_user_id: string | null;
}

/**
 * Find an existing contact, mirroring `linkUserToAgent`'s `$or` lookup but
 * per-tenant (no `userId`): phone (hard key) → legacy `email` mirror → structured
 * `emails[].address` → `linked_user_id`. Phone is checked first because it is the
 * table's only hard unique (a NULL-phone web lead can only match on email/link).
 */
async function findExistingContact(
  adapter: DbAdapter,
  email: string | null,
  phone: string | null,
  endUserId: string | null,
): Promise<ExistingRow | null> {
  // Phone first (the hard sparse-unique). Cheapest, most authoritative match.
  if (phone) {
    const byPhone = await adapter.query<ExistingRow>(
      `SELECT id, linked_user_id FROM contact WHERE phone = $1 LIMIT 1`,
      [phone],
    );
    if (byPhone[0]) return byPhone[0];
  }

  // Then the soft email match: legacy scalar mirror OR structured emails[].
  // jsonb containment matches `[{ "address": <email>, ... }]` without unnesting.
  if (email) {
    const byEmail = await adapter.query<ExistingRow>(
      `SELECT id, linked_user_id FROM contact
         WHERE email = $1
            OR emails @> $2::jsonb
         LIMIT 1`,
      [email, JSON.stringify([{ address: email }])],
    );
    if (byEmail[0]) return byEmail[0];
  }

  // Finally the end-user link (a re-signup with neither email nor phone match
  // but the same account still links to its existing contact).
  if (endUserId) {
    const byLink = await adapter.query<ExistingRow>(
      `SELECT id, linked_user_id FROM contact WHERE linked_user_id = $1 LIMIT 1`,
      [endUserId],
    );
    if (byLink[0]) return byLink[0];
  }

  return null;
}

// ---------------------------------------------------------------------------
// upsertContactFromSignup — the public entry
// ---------------------------------------------------------------------------

/**
 * Create-or-link a per-tenant CRM `contact` from a signup, deduped by phone then
 * email (mirrors `linkUserToAgent`). NON-BLOCKING: never throws to the caller.
 *
 * - New person → INSERT one row (`source` default `"website"`, `status`
 *   `"uncontacted"`, structured `phones[]`/`emails[]` + legacy scalar mirrors,
 *   `linked_user_id` when an `endUserId` is given, canonical tag + any extras).
 *   Returns `{ contactId, created: true }`.
 * - Existing person (phone/email/link hit) → links the `end_user` account if not
 *   already linked, leaves the rest untouched. Returns `{ contactId, created:false }`.
 * - No email AND no phone → nothing to dedup on; skips cleanly with a null result
 *   (the legacy port likewise needs an identity to key on).
 * - Any error → logged (no PII body), returns `{ contactId: null, created:false }`.
 */
export async function upsertContactFromSignup(
  adapter: DbAdapter,
  input: SignupContactInput,
): Promise<UpsertContactResult> {
  try {
    const email = normalizeEmail(input.email);
    const phone = normalizePhone(input.phone);
    const endUserId = (input.endUserId ?? "").trim() || null;

    // Need at least one identity key to dedup on (mirrors the legacy guard).
    if (!email && !phone && !endUserId) {
      return { contactId: null, created: false };
    }

    const existing = await findExistingContact(adapter, email, phone, endUserId);

    if (existing) {
      // Link the end-user account if not already linked (the only mutation on
      // an existing contact — mirrors `linkUserToAgent`'s link-if-absent).
      if (endUserId && !existing.linked_user_id) {
        await adapter.query(
          `UPDATE contact SET linked_user_id = $1, updated_at = now() WHERE id = $2`,
          [endUserId, existing.id],
        );
      }
      return { contactId: existing.id, created: false };
    }

    const { firstName, lastName } = splitName(input.name, email);
    const source = (input.source ?? "").trim() || DEFAULT_SOURCE;
    const tags = buildTags(input.tags);

    const inserted = await adapter.query<{ id: string }>(
      `INSERT INTO contact (
         first_name, last_name, phones, emails, phone, email,
         labels, source, status, linked_user_id
       ) VALUES (
         $1, $2, $3::jsonb, $4::jsonb, $5, $6,
         $7::text[], $8, $9, $10
       )
       RETURNING id`,
      [
        firstName || null,
        lastName || null,
        JSON.stringify(buildPhonesJson(phone)),
        JSON.stringify(buildEmailsJson(email)),
        phone,
        email,
        tags,
        source,
        "uncontacted",
        endUserId,
      ],
    );

    const contactId = inserted[0]?.id ?? null;
    return { contactId, created: contactId != null };
  } catch (err) {
    // NON-BLOCKING (build_plan §8.3): a CRM write error must never fail signup.
    // Log the shape, not the payload — no email/phone bodies in the log line.
    console.error(
      "[crm/upsert-contact-from-signup] upsert failed (non-blocking):",
      err instanceof Error ? err.message : String(err),
    );
    return { contactId: null, created: false };
  }
}
