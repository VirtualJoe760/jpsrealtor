// src/lib/tenant/__tests__/resolve-tenant.test.ts
//
// Agent 07 — control-plane token resolver tests. Node built-in runner ONLY
// (the repo has neither vitest nor jest):
//   npx tsx --test src/lib/tenant/__tests__/resolve-tenant.test.ts
//
// NO LIVE MONGO. We mock Mongoose at two seams:
//   1. `dbConnect()` is short-circuited by pre-seeding its `global.mongoose`
//      cache with a fake conn, so it returns without ever calling
//      `mongoose.connect` (no socket, no MONGODB_URI needed).
//   2. The `Tenant` model's `findOne` static is stubbed per-test with
//      `mock.method`, returning a fake query whose `.exec()` resolves a
//      seeded tenant — so we assert the EXACT filter the resolver hands Mongo
//      (status:"active" + tokenHashes match) and the per-token revocation
//      re-check, with zero network.
//
// We DO exercise the real `src/lib/secrets.ts` so the decrypt round-trip is
// genuine: a unique test-only SECRETS_ENCRYPTION_KEY is set before import, and
// real ciphertext is produced with `encryptSecret`. No secret is ever logged.

import { test, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

// --- Set a test encryption key BEFORE importing anything that reads it. ------
// 32 random bytes, base64 — never logged, never persisted.
process.env.SECRETS_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
// dbConnect() reads MONGODB_URI at module load; give it a dummy so the import
// of the real mongoose helper does not throw. We never actually connect.
process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:0/test";

// Short-circuit dbConnect's connection cache so it returns a fake conn and never
// opens a socket. (src/lib/mongoose.ts reads `global.mongoose`.)
(globalThis as any).mongoose = { conn: { fake: true }, promise: null };

import { encryptSecret, hashToken } from "@/lib/secrets";
import TenantModel, { ITenant } from "@/models/control/Tenant";
import {
  resolveTenantByTokenHash,
  resolveTenantById,
  decryptTenantConnUri,
} from "@/lib/tenant/resolve-tenant";
import {
  TenantUnavailableError,
  TenantNotFoundError,
} from "@/lib/tenant/errors";

// -----------------------------------------------------------------------------
// Fake query helper — `TenantModel.findOne(filter)` returns `{ exec: () => ... }`
// -----------------------------------------------------------------------------

function fakeQuery<T>(result: T) {
  return { exec: async () => result } as any;
}

/** Build a plain tenant-shaped object (NOT a Mongoose doc). */
function makeTenant(over: Partial<ITenant> = {}): any {
  const tokenHash = (over as any).__tokenHash ?? "hash_active";
  return {
    tenantId: "tenant_abc",
    slug: "abc",
    ownerUserId: "user_1",
    status: "active",
    tokenHashes: [tokenHash],
    tenant_tokens: [
      {
        tokenHash,
        last4: "wxyz",
        name: "Test",
        scopes: ["listings:read"],
        createdAt: new Date(),
      },
    ],
    ...over,
  };
}

beforeEach(() => {
  mock.restoreAll();
});

// =============================================================================
// 1. Happy path — active tenant, non-revoked token resolves.
// =============================================================================
test("resolveTenantByTokenHash returns the active tenant on a valid hash", async () => {
  const hash = hashToken("crt_live_sample_active");
  const tenant = makeTenant({ __tokenHash: hash } as any);

  let capturedFilter: any = null;
  mock.method(TenantModel, "findOne", (filter: any) => {
    capturedFilter = filter;
    return fakeQuery(tenant);
  });

  const result = await resolveTenantByTokenHash(hash);
  assert.equal(result?.tenantId, "tenant_abc");

  // The lookup MUST scope to active tenants AND match by the flat hash index.
  assert.deepEqual(capturedFilter, { status: "active", tokenHashes: hash });
});

// =============================================================================
// 2. Suspended/non-active tenant is excluded (status is a security boundary).
//    The query filter itself excludes non-active, so Mongo returns null.
// =============================================================================
test("resolveTenantByTokenHash excludes a non-active (suspended) tenant", async () => {
  const hash = hashToken("crt_live_suspended");

  // Simulate Mongo applying the `status:"active"` filter: a suspended tenant
  // does not match, so findOne resolves null.
  mock.method(TenantModel, "findOne", () => fakeQuery(null));

  const result = await resolveTenantByTokenHash(hash);
  assert.equal(result, null);
});

// =============================================================================
// 3. Revoked token is rejected even if its hash lingers in tokenHashes[].
//    The flat mirror can lag a revoke; the per-token revokedAt re-check wins.
// =============================================================================
test("resolveTenantByTokenHash rejects a revoked token (per-token re-check)", async () => {
  const hash = hashToken("crt_live_revoked");
  const tenant = makeTenant({ __tokenHash: hash } as any);
  // Token is present in both arrays but marked revoked.
  tenant.tenant_tokens[0].revokedAt = new Date();

  mock.method(TenantModel, "findOne", () => fakeQuery(tenant));

  const result = await resolveTenantByTokenHash(hash);
  assert.equal(result, null, "a revoked token must not resolve a tenant");
});

// =============================================================================
// 4. Hash present on the active filter but missing from tenant_tokens[] → null.
// =============================================================================
test("resolveTenantByTokenHash returns null when no matching token record", async () => {
  const hash = hashToken("crt_live_orphan_hash");
  // Tenant matched by the flat index but the subarray has a DIFFERENT token.
  const tenant = makeTenant({ tokenHashes: [hash] } as any);
  tenant.tenant_tokens = [
    {
      tokenHash: "some_other_hash",
      last4: "0000",
      name: "Other",
      scopes: [],
      createdAt: new Date(),
    },
  ];

  mock.method(TenantModel, "findOne", () => fakeQuery(tenant));

  const result = await resolveTenantByTokenHash(hash);
  assert.equal(result, null);
});

// =============================================================================
// 5. Empty / falsy hash short-circuits to null without touching Mongo.
// =============================================================================
test("resolveTenantByTokenHash returns null on empty hash without a DB call", async () => {
  let called = false;
  mock.method(TenantModel, "findOne", () => {
    called = true;
    return fakeQuery(null);
  });

  const result = await resolveTenantByTokenHash("");
  assert.equal(result, null);
  assert.equal(called, false, "must not query Mongo on an empty hash");
});

// =============================================================================
// 6. resolveTenantById scopes to active + the given id.
// =============================================================================
test("resolveTenantById queries by tenantId AND status active", async () => {
  const tenant = makeTenant();
  let capturedFilter: any = null;
  mock.method(TenantModel, "findOne", (filter: any) => {
    capturedFilter = filter;
    return fakeQuery(tenant);
  });

  const result = await resolveTenantById("tenant_abc");
  assert.equal(result?.tenantId, "tenant_abc");
  assert.deepEqual(capturedFilter, { tenantId: "tenant_abc", status: "active" });
});

// =============================================================================
// 7. decrypt round-trips through the REAL secrets.ts (pooled + direct).
// =============================================================================
test("decryptTenantConnUri round-trips pooled and direct conn strings", () => {
  const pooled =
    "postgresql://role:pw@ep-cool-pooler.us-east-2.aws.neon.tech/db?sslmode=require";
  const direct =
    "postgresql://role:pw@ep-cool.us-east-2.aws.neon.tech/db?sslmode=require";

  const tenant = {
    tenantId: "tenant_abc",
    connStringEncrypted: encryptSecret(pooled),
    directConnStringEncrypted: encryptSecret(direct),
  };

  assert.equal(decryptTenantConnUri(tenant, "pooled"), pooled);
  assert.equal(decryptTenantConnUri(tenant, "direct"), direct);
  // Default kind is pooled.
  assert.equal(decryptTenantConnUri(tenant), pooled);
});

// =============================================================================
// 8. decrypt prefers the Mongoose instance method when present.
// =============================================================================
test("decryptTenantConnUri delegates to the model's decryptConnString when available", () => {
  let calledWith: string | undefined;
  const tenant = {
    tenantId: "tenant_abc",
    connStringEncrypted: "ignored",
    directConnStringEncrypted: "ignored",
    decryptConnString(kind: "pooled" | "direct") {
      calledWith = kind;
      return `decrypted:${kind}`;
    },
  };

  assert.equal(decryptTenantConnUri(tenant as any, "direct"), "decrypted:direct");
  assert.equal(calledWith, "direct");
});

// =============================================================================
// 9. decrypt throws when the requested conn string is absent (no secret leak).
// =============================================================================
test("decryptTenantConnUri throws when the conn string is unprovisioned", () => {
  const tenant = { tenantId: "tenant_abc" } as any;
  assert.throws(() => decryptTenantConnUri(tenant, "pooled"), /no pooled connection string/);
});

// =============================================================================
// 10. Error classes are wired for the error→status mapper (instanceof + code).
// =============================================================================
test("TenantUnavailableError / TenantNotFoundError carry stable codes", () => {
  const unavailable = new TenantUnavailableError("nope", "suspended");
  assert.equal(unavailable.code, "tenant_unavailable");
  assert.equal(unavailable.status, "suspended");
  assert.ok(unavailable instanceof Error);
  assert.ok(unavailable instanceof TenantUnavailableError);

  const notFound = new TenantNotFoundError();
  assert.equal(notFound.code, "tenant_not_found");
  assert.ok(notFound instanceof TenantNotFoundError);
});
