// src/lib/tenant/__tests__/provisioning-gate.test.ts
//
// Agent 12 — approval-gate tests. Node built-in runner ONLY (no vitest/jest):
//   npx tsx --test src/lib/tenant/__tests__/provisioning-gate.test.ts
//
// NO LIVE MONGO / NEON / SECRETS. Every external system (control store, token
// mint, provisioning service, PlatformConfig toggle, email) is injected through
// the gate's `__setProvisioningGateDeps` seam, so each test runs the REAL gate
// logic against fully fake collaborators (build_plan §3.6).
//
// We assert:
//   • approveTenant flips pending → approved, mints EXACTLY ONE token (plaintext
//     returned once), attaches its HASH (denormalized invariant), stamps the
//     license-verified audit fields, and calls provisionTenant;
//   • approveTenant rejects a non-pending tenant (no token, no provisioning);
//   • approveTenant throws TenantNotFound for a missing tenant;
//   • rejectTenant sets status rejected + reason (+ rejectedAt);
//   • getTenantAutoApprove defaults to FALSE.

import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

// Test env BEFORE anything reads it — the gate imports secrets.ts + control store
// transitively (which read SECRETS_ENCRYPTION_KEY / MONGODB_URI at module load).
process.env.SECRETS_ENCRYPTION_KEY =
  process.env.SECRETS_ENCRYPTION_KEY || crypto.randomBytes(32).toString("base64");
process.env.MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:0/test";

import type { ITenant } from "@/models/control/Tenant";
import { TenantNotFoundError, TenantUnavailableError } from "@/lib/tenant/errors";
import {
  approveTenant,
  rejectTenant,
  getTenantAutoApprove,
  __setProvisioningGateDeps,
  type ProvisioningGateDeps,
} from "@/lib/tenant/provisioning-gate";

// -----------------------------------------------------------------------------
// Fakes
// -----------------------------------------------------------------------------

/** A minimal mutable tenant doc the fake store hands back and mutates. */
function makeTenant(status: ITenant["status"]): ITenant {
  return {
    tenantId: "tenant_x",
    status,
    license: {},
    approvedAt: undefined,
    rejectedAt: undefined,
    rejectionReason: undefined,
    // `saveApproved`'s default impl calls `.save()`; our fake replaces it, but
    // provide a no-op so even an accidental real call wouldn't blow up.
    async save() {
      return this;
    },
  } as unknown as ITenant;
}

/**
 * Build a fully-faked deps set around one in-memory tenant, capturing call
 * counts + arguments so each test can assert the gate's behavior precisely.
 */
function makeDeps(tenant: ITenant | null) {
  const calls = {
    mintToken: 0,
    attachToken: 0,
    provisionTenant: 0,
    saveApproved: 0,
    setRejected: 0,
    notifyApproved: 0,
    notifyRejected: 0,
    lastAttached: null as { tokenHash: string; last4: string } | null,
    lastApprovedBy: null as string | null,
    lastRejectReason: null as string | null,
  };

  // A deterministic minted token so we can assert the plaintext is returned and
  // only its hash is attached.
  const minted = {
    plaintext: "crt_live_FAKEPLAINTEXT0000",
    hash: "deadbeefhash",
    last4: "0000",
  };

  const fakeDeps: ProvisioningGateDeps = {
    async findTenant() {
      return tenant;
    },
    async saveApproved(t, approvedBy) {
      calls.saveApproved += 1;
      calls.lastApprovedBy = approvedBy;
      const now = new Date();
      t.status = "approved";
      t.approvedAt = now;
      t.license = t.license ?? ({} as ITenant["license"]);
      t.license.verifiedAt = now;
      t.license.verifiedBy = approvedBy;
      return t;
    },
    async setRejected(_tenantId, reason) {
      calls.setRejected += 1;
      calls.lastRejectReason = reason;
      if (!tenant) return null;
      tenant.status = "rejected";
      tenant.rejectionReason = reason;
      tenant.rejectedAt = new Date();
      return tenant;
    },
    mintToken() {
      calls.mintToken += 1;
      return minted;
    },
    async attachToken(_tenantId, token) {
      calls.attachToken += 1;
      calls.lastAttached = { tokenHash: token.tokenHash, last4: token.last4 };
      return tenant;
    },
    async provisionTenant(t) {
      calls.provisionTenant += 1;
      return t;
    },
    async getAutoApproveConfig() {
      return false;
    },
    async notifyApproved() {
      calls.notifyApproved += 1;
    },
    async notifyRejected() {
      calls.notifyRejected += 1;
    },
  };

  return { fakeDeps, calls, minted };
}

// =============================================================================
// approveTenant — happy path.
// =============================================================================
test("approveTenant: flips pending→approved, mints ONE token, attaches hash, provisions", async () => {
  const tenant = makeTenant("pending");
  const { fakeDeps, calls, minted } = makeDeps(tenant);
  const restore = __setProvisioningGateDeps(fakeDeps);

  try {
    const result = await approveTenant("tenant_x", "admin@chatrealty.com");

    // EXACTLY ONE token minted; plaintext returned once.
    assert.equal(calls.mintToken, 1, "exactly one token minted");
    assert.equal(result.token, minted.plaintext, "plaintext returned once");
    assert.equal(result.last4, minted.last4);

    // Only the HASH is attached (denormalized invariant) — never the plaintext.
    assert.equal(calls.attachToken, 1, "token hash attached exactly once");
    assert.equal(calls.lastAttached?.tokenHash, minted.hash, "hash (not plaintext) attached");
    assert.notEqual(calls.lastAttached?.tokenHash, minted.plaintext);

    // Status flipped + license-verified audit stamped.
    assert.equal(result.tenant.status, "approved");
    assert.ok(result.tenant.approvedAt instanceof Date, "approvedAt stamped");
    assert.equal(result.tenant.license.verifiedBy, "admin@chatrealty.com", "license verifier stamped");
    assert.ok(result.tenant.license.verifiedAt instanceof Date, "license verifiedAt stamped");
    assert.equal(calls.lastApprovedBy, "admin@chatrealty.com");

    // Provisioning handed off; best-effort notify fired.
    assert.equal(calls.provisionTenant, 1, "provisionTenant called");
    assert.equal(calls.notifyApproved, 1, "approval notification fired");
  } finally {
    restore();
  }
});

// =============================================================================
// approveTenant — guard: non-pending tenant.
// =============================================================================
test("approveTenant: rejects a non-pending tenant before minting or provisioning", async () => {
  const tenant = makeTenant("active");
  const { fakeDeps, calls } = makeDeps(tenant);
  const restore = __setProvisioningGateDeps(fakeDeps);

  try {
    await assert.rejects(
      () => approveTenant("tenant_x", "admin@chatrealty.com"),
      (err: unknown) => err instanceof TenantUnavailableError,
    );
    assert.equal(calls.mintToken, 0, "no token minted for a non-pending tenant");
    assert.equal(calls.attachToken, 0);
    assert.equal(calls.provisionTenant, 0, "no provisioning for a non-pending tenant");
  } finally {
    restore();
  }
});

// =============================================================================
// approveTenant — guard: missing tenant.
// =============================================================================
test("approveTenant: throws TenantNotFound for a missing tenant", async () => {
  const { fakeDeps, calls } = makeDeps(null);
  const restore = __setProvisioningGateDeps(fakeDeps);

  try {
    await assert.rejects(
      () => approveTenant("ghost", "admin@chatrealty.com"),
      (err: unknown) => err instanceof TenantNotFoundError,
    );
    assert.equal(calls.mintToken, 0);
  } finally {
    restore();
  }
});

// =============================================================================
// rejectTenant — sets rejected + reason.
// =============================================================================
test("rejectTenant: sets status rejected with the reason", async () => {
  const tenant = makeTenant("pending");
  const { fakeDeps, calls } = makeDeps(tenant);
  const restore = __setProvisioningGateDeps(fakeDeps);

  try {
    const result = await rejectTenant("tenant_x", "Invalid license number");

    assert.equal(result.status, "rejected");
    assert.equal(result.rejectionReason, "Invalid license number");
    assert.ok(result.rejectedAt instanceof Date, "rejectedAt stamped");
    assert.equal(calls.setRejected, 1);
    assert.equal(calls.lastRejectReason, "Invalid license number");
    assert.equal(calls.notifyRejected, 1, "rejection notification fired");
    // No token / provisioning on reject.
    assert.equal(calls.mintToken, 0);
    assert.equal(calls.provisionTenant, 0);
  } finally {
    restore();
  }
});

test("rejectTenant: falls back to a default reason when none given", async () => {
  const tenant = makeTenant("pending");
  const { fakeDeps, calls } = makeDeps(tenant);
  const restore = __setProvisioningGateDeps(fakeDeps);

  try {
    const result = await rejectTenant("tenant_x", "   ");
    assert.equal(result.rejectionReason, "Rejected by admin");
    assert.equal(calls.lastRejectReason, "Rejected by admin");
  } finally {
    restore();
  }
});

test("rejectTenant: throws TenantNotFound for a missing tenant", async () => {
  const { fakeDeps } = makeDeps(null);
  const restore = __setProvisioningGateDeps(fakeDeps);

  try {
    await assert.rejects(
      () => rejectTenant("ghost", "nope"),
      (err: unknown) => err instanceof TenantNotFoundError,
    );
  } finally {
    restore();
  }
});

// =============================================================================
// getTenantAutoApprove — defaults to FALSE.
// =============================================================================
test("getTenantAutoApprove: defaults to false", async () => {
  // Use the REAL default config reader is impossible without Mongo; instead the
  // gate's contract is: the toggle resolves through getAutoApproveConfig and the
  // safe default is OFF. We verify both the injected default and that a config
  // returning false yields false.
  const { fakeDeps } = makeDeps(makeTenant("pending"));
  const restore = __setProvisioningGateDeps(fakeDeps);
  try {
    assert.equal(await getTenantAutoApprove(), false, "default OFF");
  } finally {
    restore();
  }

  // And when the config explicitly says false, still false.
  const restore2 = __setProvisioningGateDeps({
    getAutoApproveConfig: async () => false,
  });
  try {
    assert.equal(await getTenantAutoApprove(), false);
  } finally {
    restore2();
  }

  // Sanity: when ON, it reflects ON (proves it reads the toggle, not a constant).
  const restore3 = __setProvisioningGateDeps({
    getAutoApproveConfig: async () => true,
  });
  try {
    assert.equal(await getTenantAutoApprove(), true);
  } finally {
    restore3();
  }
});
