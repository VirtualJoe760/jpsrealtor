// src/lib/db/schema/__tests__/crm-schema.test.ts
//
// LIVE test for the CRM + lead-loop schema (migration 0002_crm_leadloop,
// build_plan §8.3). Asserts the three tables — `contact`, `end_user`,
// `saved_search` — exist on the live Neon DB, then round-trips an
// insert → select → delete of a uniquely-marked marker row in each (the
// saved_search row hangs off its end_user via the FK).
//
// SAFETY (wave rules):
//   • Loads NEON_DIRECT_CONN_URI from .env.local via dotenv.
//   • SKIPS the whole suite cleanly (logging why) when the conn string is absent
//     — never fails for a missing secret.
//   • NEVER logs the connection string or any secret.
//   • Cleans up EVERY seeded row in a finally, even on assertion failure.
//   • Closes the Neon WS pool in an after() hook.
//
// Run: npx tsx --test src/lib/db/schema/__tests__/crm-schema.test.ts
//
// Node built-in runner ONLY (node:test + node:assert/strict).

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { config as loadEnv } from "dotenv";
import { Pool, neonConfig } from "@neondatabase/serverless";
// `ws` ships no bundled types in this repo (no @types/ws); runtime import is
// fine and tsx does not type-check.
// @ts-ignore - no type declarations for 'ws'; Node WebSocket shim for the WS Pool
import ws from "ws";

neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;

loadEnv({ path: ".env.local" });

const CONN = process.env.NEON_DIRECT_CONN_URI;
const LIVE = typeof CONN === "string" && CONN.length > 0;

// Unique marker so a partial/aborted run never collides and cleanup is exact.
const MARKER = `__crt_test_crm_${Date.now()}_`;

if (!LIVE) {
  test("crm-schema LIVE suite — SKIPPED (NEON_DIRECT_CONN_URI absent)", { skip: true }, () => {
    // Intentionally empty. The conn string is not configured in this environment,
    // so the live suite cannot run. Clean skip, not a failure (wave rules).
    // Configure NEON_DIRECT_CONN_URI in .env.local to run it.
  });
} else {
  const pool = new Pool({ connectionString: CONN! });

  after(async () => {
    await pool.end();
  });

  test("crm-schema — tables exist + round-trip insert/select/delete", async (t) => {
    // ---- existence: all three tables present after 0002 ----------------------
    await t.test("contact / end_user / saved_search exist on Neon", async () => {
      const { rows } = await pool.query<{ c: string | null; e: string | null; s: string | null }>(
        `SELECT to_regclass('public.contact')      AS c,
                to_regclass('public.end_user')     AS e,
                to_regclass('public.saved_search') AS s`,
      );
      assert.equal(rows[0]?.c, "contact", "contact table must exist");
      assert.equal(rows[0]?.e, "end_user", "end_user table must exist");
      assert.equal(rows[0]?.s, "saved_search", "saved_search table must exist");
    });

    // ---- contact round-trip --------------------------------------------------
    await t.test("contact: insert → select → delete", async () => {
      const phone = MARKER + "5551112222";
      const email = MARKER + "lead@example.com";
      try {
        const ins = await pool.query<{ id: string }>(
          `INSERT INTO contact (first_name, last_name, display_name, phones, emails, phone, email, labels, source, status, notes, extras)
           VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb)
           RETURNING id`,
          [
            "Lead",
            "Tester",
            "Lead Tester",
            JSON.stringify([{ number: phone, label: "mobile", isPrimary: true, isValid: true }]),
            JSON.stringify([{ address: email, label: "personal", isPrimary: true, isValid: true }]),
            phone,
            email,
            [MARKER + "Website Signup", MARKER + "example.com"],
            "website",
            "uncontacted",
            JSON.stringify({ note: MARKER }),
            JSON.stringify({ testMarker: MARKER }),
          ],
        );
        const id = ins.rows[0]?.id;
        assert.equal(typeof id, "string");
        assert.match(id!, /^[0-9a-f-]{36}$/, "contact id is a uuid");

        const sel = await pool.query(
          `SELECT first_name, phone, email, labels, source, created_at, updated_at FROM contact WHERE id = $1`,
          [id],
        );
        assert.equal(sel.rowCount, 1);
        assert.equal(sel.rows[0].first_name, "Lead");
        assert.equal(sel.rows[0].phone, phone);
        assert.equal(sel.rows[0].email, email);
        assert.equal(sel.rows[0].source, "website");
        assert.deepEqual(sel.rows[0].labels, [MARKER + "Website Signup", MARKER + "example.com"]);
        assert.ok(sel.rows[0].created_at instanceof Date, "created_at defaulted");
        assert.ok(sel.rows[0].updated_at instanceof Date, "updated_at defaulted");

        const del = await pool.query(`DELETE FROM contact WHERE id = $1`, [id]);
        assert.equal(del.rowCount, 1);
      } finally {
        await pool.query(`DELETE FROM contact WHERE phone = $1`, [phone]);
      }
    });

    // ---- end_user + saved_search round-trip (FK chain) -----------------------
    await t.test("end_user + saved_search: insert → select → delete (FK)", async () => {
      const email = MARKER + "enduser@example.com";
      let endUserId: string | undefined;
      try {
        const insUser = await pool.query<{ id: string }>(
          `INSERT INTO end_user (email, name, phone, marketing_consent)
           VALUES ($1, $2, $3, $4::jsonb)
           RETURNING id`,
          [email, "End User", MARKER + "5553334444", JSON.stringify({ marketingConsent: true })],
        );
        endUserId = insUser.rows[0]?.id;
        assert.equal(typeof endUserId, "string");

        // citext: a case-variant select must still find the row.
        const selUser = await pool.query(
          `SELECT id, name FROM end_user WHERE email = $1`,
          [email.toUpperCase()],
        );
        assert.equal(selUser.rowCount, 1, "citext email lookup is case-insensitive");
        assert.equal(selUser.rows[0].name, "End User");

        const insSearch = await pool.query<{ id: string }>(
          `INSERT INTO saved_search (end_user_id, name, criteria, notify)
           VALUES ($1, $2, $3::jsonb, $4)
           RETURNING id`,
          [
            endUserId,
            MARKER + "Palm Desert pools",
            JSON.stringify({ city: "Palm Desert", filter: "PoolYN eq true" }),
            true,
          ],
        );
        const searchId = insSearch.rows[0]?.id;
        assert.equal(typeof searchId, "string");

        const selSearch = await pool.query(
          `SELECT end_user_id, name, notify FROM saved_search WHERE id = $1`,
          [searchId],
        );
        assert.equal(selSearch.rowCount, 1);
        assert.equal(selSearch.rows[0].end_user_id, endUserId);
        assert.equal(selSearch.rows[0].notify, true);

        // ON DELETE CASCADE: deleting the end_user removes its saved_search.
        const delUser = await pool.query(`DELETE FROM end_user WHERE id = $1`, [endUserId]);
        assert.equal(delUser.rowCount, 1);
        const orphan = await pool.query(`SELECT id FROM saved_search WHERE id = $1`, [searchId]);
        assert.equal(orphan.rowCount, 0, "saved_search cascade-deleted with its end_user");
        endUserId = undefined;
      } finally {
        // Belt-and-suspenders cleanup (cascade should already have cleared the search).
        await pool.query(`DELETE FROM saved_search WHERE name = $1`, [MARKER + "Palm Desert pools"]);
        await pool.query(`DELETE FROM end_user WHERE email = $1`, [email]);
      }
    });
  });
}
