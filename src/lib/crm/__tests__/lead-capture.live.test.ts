// src/lib/crm/__tests__/lead-capture.live.test.ts
//
// Agent 32 — LIVE lead-capture test (build_plan §8.3 acceptance).
//
// Runs the real signup hook against a live Neon tenant DB (the `contact` /
// `end_user` tables from migration 0002_crm_leadloop). Proves the §8.3 invariant:
//
//   1. `onSignup` creates EXACTLY ONE contact (and one end_user account).
//   2. A SECOND `onSignup` with the SAME email/phone does NOT duplicate — it
//      links/updates the existing contact instead (dedup mirrors linkUserToAgent).
//   3. `source` + the canonical `"Website Signup"` tag + `linked_user_id` are
//      stamped on the created contact.
//   4. A phone-only re-signup dedupes on the phone key (no email).
//
// SAFETY (wave rules):
//   • Loads NEON_POOLED_CONN_URI from .env.local via dotenv.
//   • SKIPS cleanly (logging why) when the conn string is absent — never fails
//     for a missing secret.
//   • NEVER logs the connection string or any secret.
//   • Every row it creates carries a unique MARKER in its email/phone/tags, and
//     an after() hook DELETEs all marker rows + ends the WS pool — even on
//     assertion failure.
//
// Run: npx tsx --test src/lib/crm/__tests__/lead-capture.live.test.ts
//
// Node built-in runner ONLY (node:test + node:assert/strict).

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { config as loadEnv } from "dotenv";
import { neon, neonConfig } from "@neondatabase/serverless";
// `ws` ships no bundled types in this repo (no @types/ws); runtime import is
// fine and tsx does not type-check. The CRM writes route through the adapter's
// WS `Pool` (INSERT/UPDATE with positional params), which needs a WebSocket
// constructor in Node — production sets this globally; the test sets it here.
// @ts-ignore - no type declarations for 'ws'; Node WebSocket shim for the WS Pool
import ws from "ws";

neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;

import { createPostgresAdapter } from "../../db/postgres-adapter";
import { onSignup } from "../end-user";
import { upsertContactFromSignup } from "../upsert-contact-from-signup";

// -----------------------------------------------------------------------------
// Env / skip gate
// -----------------------------------------------------------------------------

loadEnv({ path: ".env.local" });

const CONN = process.env.NEON_POOLED_CONN_URI;
const LIVE = typeof CONN === "string" && CONN.length > 0;

// Unique per-run marker so a partial/aborted run never collides and cleanup is
// exact. Embedded in every email/phone/tag this test writes.
const RUN = `${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
const MARK_TAG = `__crt_test_a32_${RUN}`;
const email = (slug: string) => `crt-test-a32-${RUN}-${slug}@example.test`;
const phone = (n: string) => `+1999${RUN.slice(-4)}${n}`; // unique-ish, marker-scoped

// A raw neon() reader for assertions + cleanup (separate from the adapter under
// test). Cleanup keys off the marker email prefix + the marker tag.
const sql = LIVE ? neon(CONN as string) : null;

// -----------------------------------------------------------------------------
// Cleanup — delete every row this run created, then end the pool.
// -----------------------------------------------------------------------------

const adapter = LIVE ? createPostgresAdapter(CONN as string) : null;

after(async () => {
  if (sql) {
    // saved_search cascades from end_user; delete contacts + end_users by marker.
    await sql`DELETE FROM contact WHERE email LIKE ${`crt-test-a32-${RUN}-%`}
                OR ${MARK_TAG} = ANY(labels)`;
    await sql`DELETE FROM end_user WHERE email LIKE ${`crt-test-a32-${RUN}-%`}`;
  }
  if (adapter) {
    // Ends the WS pool if the adapter's writes opened one (build_plan: any test
    // opening a Neon pool MUST close it in an after() hook).
    await adapter.close();
  }
});

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

test("lead capture (live)", { skip: LIVE ? false : "NEON_POOLED_CONN_URI not set — skipping live lead-capture test" }, async (t) => {
  assert.ok(adapter && sql, "live adapter + sql reader required");

  await t.test("onSignup creates exactly one contact + one end_user", async () => {
    const e = email("create");
    const p = phone("01");

    const res = await onSignup(adapter!, {
      email: e,
      name: "Ada Lovelace",
      phone: p,
      source: "website",
      tags: [MARK_TAG, "chatrealty.io"],
    });

    assert.equal(typeof res.endUserId, "string", "end_user id returned");
    assert.ok(res.contact.contactId, "contact id returned");
    assert.equal(res.contact.created, true, "a NEW contact was created");

    // Exactly one contact for that email.
    const contacts = await sql!`SELECT id, source, status, labels, linked_user_id,
                                        first_name, last_name, phone, email, phones, emails
                                   FROM contact WHERE email = ${e.toLowerCase()}`;
    assert.equal(contacts.length, 1, "exactly one contact row for the email");

    const c = contacts[0] as Record<string, unknown>;
    // (3) source + canonical tag + linked_user_id stamped.
    assert.equal(c.source, "website", "source stamped");
    assert.equal(c.status, "uncontacted", "status stamped");
    assert.ok(Array.isArray(c.labels) && (c.labels as string[]).includes("Website Signup"),
      "canonical 'Website Signup' tag present");
    assert.ok((c.labels as string[]).includes(MARK_TAG), "extra tag carried");
    assert.equal(c.linked_user_id, res.endUserId, "linked_user_id === end_user id");
    // name split + structured + legacy mirror.
    assert.equal(c.first_name, "Ada");
    assert.equal(c.last_name, "Lovelace");
    assert.equal(c.phone, p, "legacy phone mirror");
    assert.equal(c.email, e.toLowerCase(), "legacy email mirror (lowercased)");
    assert.ok(Array.isArray(c.phones) && (c.phones as unknown[]).length === 1, "structured phones[]");
    assert.ok(Array.isArray(c.emails) && (c.emails as unknown[]).length === 1, "structured emails[]");

    // Exactly one end_user for that email.
    const eu = await sql!`SELECT id FROM end_user WHERE email = ${e.toLowerCase()}`;
    assert.equal(eu.length, 1, "exactly one end_user row");
  });

  await t.test("second onSignup with same email/phone does NOT duplicate", async () => {
    const e = email("dedup");
    const p = phone("02");

    const first = await onSignup(adapter!, {
      email: e,
      name: "Grace Hopper",
      phone: p,
      tags: [MARK_TAG],
    });
    assert.equal(first.contact.created, true, "first signup creates");

    const second = await onSignup(adapter!, {
      email: e,
      name: "Grace Hopper",
      phone: p,
      tags: [MARK_TAG],
    });
    assert.equal(second.contact.created, false, "second signup links, does not create");
    assert.equal(second.contact.contactId, first.contact.contactId,
      "same contact id on re-signup");
    // end_user dedupes on the citext email unique → same account.
    assert.equal(second.endUserId, first.endUserId, "same end_user on re-signup");

    const contacts = await sql!`SELECT id FROM contact WHERE email = ${e.toLowerCase()}`;
    assert.equal(contacts.length, 1, "still exactly one contact after re-signup");
    const eu = await sql!`SELECT id FROM end_user WHERE email = ${e.toLowerCase()}`;
    assert.equal(eu.length, 1, "still exactly one end_user after re-signup");
  });

  await t.test("upsertContactFromSignup dedupes on phone (no email)", async () => {
    const p = phone("03");

    const first = await upsertContactFromSignup(adapter!, {
      name: "Phone Only",
      phone: p,
      tags: [MARK_TAG],
    });
    assert.ok(first.contactId, "phone-only lead creates a contact");
    assert.equal(first.created, true);

    const second = await upsertContactFromSignup(adapter!, {
      name: "Phone Only Again",
      phone: p,
      tags: [MARK_TAG],
    });
    assert.equal(second.created, false, "same phone links, does not duplicate");
    assert.equal(second.contactId, first.contactId, "same contact id on the phone key");
  });

  await t.test("missing both email and phone returns a null result, no row", async () => {
    const res = await upsertContactFromSignup(adapter!, { name: "Nobody", tags: [MARK_TAG] });
    assert.equal(res.contactId, null, "nothing to dedup on → null contact id");
    assert.equal(res.created, false);
  });
});
