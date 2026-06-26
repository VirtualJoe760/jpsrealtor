// src/lib/crm/end-user.ts
//
// Agent 32 — the per-tenant end-user account + the single signup hook
// (build_plan §8.3).
//
// `end_user` is the consumer account that registers through a tenant surface
// (favorites / saved-searches / auto-contact work out of the box). It is the
// product-provided identity path; the BYO-auth path (`/api/skill/contacts/
// from-signup`) skips end-user creation and calls the upsert directly.
//
// `onSignup` is THE single signup hook: it creates-or-links the `end_user`, then
// calls `upsertContactFromSignup` so the end-user is mirrored into the tenant
// CRM as a deduped Contact, linked back by `linked_user_id`. This is the entry
// point of the lead loop (build_plan §8.3): the Contact then accrues favorites +
// saved searches that resolve to the same person.
//
// TENANT SCOPING (build_plan §3.3): the per-tenant `DbAdapter` is passed in (from
// the keystone resolver). No module-level `db`, no Pool, no global connection.
//
// NON-BLOCKING contract: the CRM upsert never throws (it returns a null result on
// failure). `registerEndUser` itself DOES surface a hard DB error to its caller —
// creating the end-user account is the primary action of a registration request;
// only the *contact mirroring* is best-effort. `onSignup` therefore lets a
// registration failure propagate but always swallows a contact failure.

import type { DbAdapter } from "@/lib/db/adapter";
import {
  upsertContactFromSignup,
  type UpsertContactResult,
} from "@/lib/crm/upsert-contact-from-signup";

// ---------------------------------------------------------------------------
// registerEndUser
// ---------------------------------------------------------------------------

/** Marketing-consent slice stored on the `end_user.marketing_consent` jsonb. */
export interface EndUserConsent {
  readonly smsOptIn?: boolean;
  readonly emailOptIn?: boolean;
  readonly marketingConsent?: boolean;
  readonly consentDate?: string;
  readonly consentIp?: string;
  readonly [k: string]: unknown;
}

/** Input to `registerEndUser`. Email is the case-insensitive (citext) key. */
export interface RegisterEndUserInput {
  readonly email?: string | null;
  readonly name?: string | null;
  readonly phone?: string | null;
  readonly consent?: EndUserConsent | null;
}

/** The end-user account row (subset the hook needs back). */
export interface EndUserRecord {
  readonly id: string;
  readonly email: string | null;
  readonly name: string | null;
  readonly phone: string | null;
}

function normalizeEmail(email: string | null | undefined): string | null {
  const e = (email ?? "").trim().toLowerCase();
  return e.length > 0 ? e : null;
}

function normalizePhone(phone: string | null | undefined): string | null {
  const p = (phone ?? "").trim();
  return p.length > 0 ? p : null;
}

/**
 * Create or fetch the `end_user` account for a signup. Idempotent on email: the
 * `email citext UNIQUE` constraint means a re-registration with the same email
 * (any casing) returns the existing row instead of creating a duplicate. Name /
 * phone / consent are filled in on first create; an existing row's fields are
 * left as-is (the ON CONFLICT path only re-reads it) so a later signup never
 * clobbers a consent decision.
 *
 * When the signup has no email (phone-only lead), a fresh row is created each
 * call — there is no unique key to dedupe a null-email end-user on; dedup of the
 * *contact* still happens downstream by phone in `upsertContactFromSignup`.
 */
export async function registerEndUser(
  adapter: DbAdapter,
  input: RegisterEndUserInput,
): Promise<EndUserRecord> {
  const email = normalizeEmail(input.email);
  const name = (input.name ?? "").trim() || null;
  const phone = normalizePhone(input.phone);
  const consentJson = input.consent ? JSON.stringify(input.consent) : null;

  if (email) {
    // Upsert by the citext unique. ON CONFLICT DO NOTHING + a follow-up read
    // would race; instead DO UPDATE a no-op (email = excluded.email) so RETURNING
    // always yields the row whether it was inserted or already existed.
    const rows = await adapter.query<EndUserRecord>(
      `INSERT INTO end_user (email, name, phone, marketing_consent)
         VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT (email) DO UPDATE SET email = excluded.email
       RETURNING id, email::text AS email, name, phone`,
      [email, name, phone, consentJson],
    );
    return rows[0];
  }

  // No email → no unique key; create a standalone account.
  const rows = await adapter.query<EndUserRecord>(
    `INSERT INTO end_user (email, name, phone, marketing_consent)
       VALUES (NULL, $1, $2, $3::jsonb)
     RETURNING id, email::text AS email, name, phone`,
    [name, phone, consentJson],
  );
  return rows[0];
}

// ---------------------------------------------------------------------------
// onSignup — THE single signup hook
// ---------------------------------------------------------------------------

/** The payload `onSignup` accepts (product end-user registration). */
export interface OnSignupPayload {
  readonly email?: string | null;
  readonly name?: string | null;
  readonly phone?: string | null;
  readonly consent?: EndUserConsent | null;
  /** Lead source override; defaults to `"website"` downstream. */
  readonly source?: string | null;
  /** Extra tags beyond the canonical `"Website Signup"` (e.g. the origin domain). */
  readonly tags?: readonly string[] | null;
}

/** The result of the full signup hook. */
export interface OnSignupResult {
  /** The created/linked end-user account id. */
  readonly endUserId: string;
  /** The upserted contact result (`contactId` null only if the CRM write failed). */
  readonly contact: UpsertContactResult;
}

/**
 * THE single signup hook (build_plan §8.3). Creates/links the `end_user`, then
 * mirrors it into the tenant CRM via `upsertContactFromSignup`, linked by
 * `endUserId`.
 *
 * The end-user creation is the primary action (a hard DB error propagates so the
 * registration route can report it). The contact mirroring is best-effort and
 * NON-BLOCKING: `upsertContactFromSignup` never throws, so a CRM failure leaves
 * `contact.contactId === null` but the signup still succeeds.
 */
export async function onSignup(
  adapter: DbAdapter,
  payload: OnSignupPayload,
): Promise<OnSignupResult> {
  const endUser = await registerEndUser(adapter, {
    email: payload.email,
    name: payload.name,
    phone: payload.phone,
    consent: payload.consent,
  });

  const contact = await upsertContactFromSignup(adapter, {
    name: payload.name ?? endUser.name,
    email: payload.email ?? endUser.email,
    phone: payload.phone ?? endUser.phone,
    source: payload.source,
    endUserId: endUser.id,
    tags: payload.tags,
  });

  return { endUserId: endUser.id, contact };
}
