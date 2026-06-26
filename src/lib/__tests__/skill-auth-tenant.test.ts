// src/lib/__tests__/skill-auth-tenant.test.ts
//
// Agent 11 — skill-auth tenant binding + research scope. Node built-in runner
// ONLY (no vitest/jest):
//   npx tsx --test src/lib/__tests__/skill-auth-tenant.test.ts
//
// NO LIVE NEON / MONGO. The tenant binding's only external touchpoints — the
// control-plane token resolver and the keystone SQL loader — are injected via
// the `__setTenantBindingDeps` seam, so every assertion exercises the REAL
// best-effort resolve-and-attach logic with fully fake deps. The scope/preset
// assertions read the catalog module directly.
//
// We assert:
//   (a) a token mapped to an ACTIVE tenant yields `tenantId` + a working
//       `getSql()` (lazy keystone handle);
//   (b) a legacy / unmapped token (resolver → null) yields NO `tenantId`
//       (undefined) and NO `getSql`, and the binding still resolves (auth
//       would still succeed);
//   (c) a control-DB throw still returns an empty binding (best-effort — never
//       breaks auth);
//   (d) `research:read` exists in the SCOPES catalog and the `client_research`
//       preset carries it (and it is NOT bolted onto an agent preset).

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

// secrets.ts (pulled in transitively by skill-auth's imports) reads an
// encryption key at module load — give it a throwaway BEFORE importing.
// Never logged, never persisted.
process.env.SECRETS_ENCRYPTION_KEY =
  process.env.SECRETS_ENCRYPTION_KEY || crypto.randomBytes(32).toString("base64");
// mongoose.ts reads MONGODB_URI at module load; a dummy keeps the import from
// throwing. We never connect — the resolver is injected.
process.env.MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:0/test";

import {
  buildTenantBinding,
  __setTenantBindingDeps,
  type TenantBindingDeps,
} from "@/lib/skill-auth";
import { SCOPES, PRESETS, isScope } from "@/lib/skill-scopes";

// A sentinel SQL handle the fake `loadTenantSql` returns so we can assert
// `getSql()` actually routes to the keystone loader with the right tenantId.
const FAKE_SQL_HANDLE = { __fake: "tenant-sql-handle" } as any;

beforeEach(() => {
  // Default to a benign resolver so a test that forgets to set deps fails loud
  // rather than hitting the real control DB. Each test overrides as needed.
  __setTenantBindingDeps({
    resolveTenant: async () => null,
    loadTenantSql: async () => FAKE_SQL_HANDLE,
  });
});

// -----------------------------------------------------------------------------
// (a) Mapped → tenantId + working getSql()
// -----------------------------------------------------------------------------

test("(a) a token mapped to an active tenant yields tenantId + lazy getSql()", async () => {
  let resolveCalledWith: string | undefined;
  let loadCalledWith: string | undefined;

  const restore = __setTenantBindingDeps({
    resolveTenant: async (hash) => {
      resolveCalledWith = hash;
      return { tenantId: "tenant_abc" };
    },
    loadTenantSql: async (tenantId) => {
      loadCalledWith = tenantId;
      return FAKE_SQL_HANDLE;
    },
  });

  try {
    const binding = await buildTenantBinding("HASH_FOR_ACTIVE");

    assert.equal(binding.tenantId, "tenant_abc", "tenantId is attached");
    assert.equal(resolveCalledWith, "HASH_FOR_ACTIVE", "resolver got the hash");
    assert.equal(typeof binding.getSql, "function", "getSql is present");

    // getSql is LAZY: the keystone loader must NOT have been called until we
    // invoke it (identity routes that skip getSql never trigger a Neon wake).
    assert.equal(loadCalledWith, undefined, "loader not called before getSql()");

    const handle = await binding.getSql!();
    assert.equal(handle, FAKE_SQL_HANDLE, "getSql resolves the keystone handle");
    assert.equal(loadCalledWith, "tenant_abc", "loader scoped to the tenant id");
  } finally {
    restore();
  }
});

// -----------------------------------------------------------------------------
// (b) Legacy / unmapped → no tenantId, no getSql, still resolves
// -----------------------------------------------------------------------------

test("(b) a legacy/unmapped token yields a binding WITHOUT tenantId (undefined)", async () => {
  const restore = __setTenantBindingDeps({
    resolveTenant: async () => null, // unknown hash / no tenant for token
  });

  try {
    const binding = await buildTenantBinding("HASH_LEGACY");

    assert.equal(binding.tenantId, undefined, "no tenantId for legacy tokens");
    assert.equal(binding.getSql, undefined, "no getSql for legacy tokens");
    // The binding still resolves to a plain object — auth would still succeed
    // and spread `{}` over the SkillAuthSuccess, leaving the optional fields off.
    assert.deepEqual(binding, {}, "empty binding (callers fall back to DEFAULT_TENANT)");
  } finally {
    restore();
  }
});

// -----------------------------------------------------------------------------
// (c) Control-DB throw → still a successful (empty) binding
// -----------------------------------------------------------------------------

test("(c) a control-DB throw still returns an empty binding (best-effort, never breaks auth)", async () => {
  const restore = __setTenantBindingDeps({
    resolveTenant: async () => {
      throw new Error("control DB unavailable");
    },
  });

  try {
    // Must NOT reject — the try/catch swallows the control-DB failure.
    const binding = await buildTenantBinding("HASH_DB_DOWN");

    assert.deepEqual(binding, {}, "throw is swallowed → empty binding");
    assert.equal(binding.tenantId, undefined, "no tenantId on control-DB error");
    assert.equal(binding.getSql, undefined, "no getSql on control-DB error");
  } finally {
    restore();
  }
});

// -----------------------------------------------------------------------------
// (d) research:read scope + client_research preset
// -----------------------------------------------------------------------------

test("(d) 'research:read' exists in the catalog and the client_research preset", () => {
  // In the SCOPES catalog…
  assert.ok(
    (SCOPES as readonly string[]).includes("research:read"),
    "research:read is in SCOPES",
  );
  assert.ok(isScope("research:read"), "isScope() recognizes research:read");

  // …and the dedicated client_research preset carries it.
  const preset = PRESETS.client_research;
  assert.ok(preset, "client_research preset exists");
  assert.ok(
    preset.scopes.includes("research:read"),
    "client_research grants research:read",
  );

  // It must NOT have leaked into the existing agent presets (build_plan §5:
  // 'NOT added to agent presets').
  for (const id of ["content_drafting", "lead_aware", "full_workspace"] as const) {
    assert.equal(
      PRESETS[id].scopes.includes("research:read"),
      false,
      `${id} preset must not include research:read`,
    );
  }
});
