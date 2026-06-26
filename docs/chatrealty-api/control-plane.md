---
title: ChatRealty API — Control Plane (Tenant registry + token resolver)
status: current
last_verified: 2026-06-25
related:
  - ./build_plan.md
  - ./architecture.md
  - ./neon-setup.md
  - ./db-adapter.md
  - ./connection-resolver.md
---

# Control Plane — Tenant registry & token resolver

> **TL;DR.** The control plane is the registry that maps an API token to a
> tenant and to that tenant's dedicated Neon data-plane database. It lives on the
> **existing shared MongoDB** (Mongoose), *not* Postgres (build_plan §3.3) — the
> human `User` already lives there and `ownerUserId` is a same-store reference.
> A request bearing a `crt_live_*` token is sha256-hashed and resolved to the
> **active** tenant in one indexed lookup. This is the cheap, Neon-free half of
> the keystone; the connection resolver (Agent 10) builds on it.

## Linchpin files

| File | Role |
|---|---|
| `src/models/control/Tenant.ts` | Mongoose `Tenant` model (registry). Hot-reload-safe. Carries `neon{}`, encrypted conn strings, `tokenHashes[]` + `tenant_tokens[]`. |
| `src/lib/tenant/resolve-tenant.ts` | `resolveTenantByTokenHash`, `resolveTenantById`, `decryptTenantConnUri`. The Neon-free resolve half. |
| `src/lib/tenant/errors.ts` | `TenantUnavailableError` (→503), `TenantNotFoundError` (→404), base `TenantError` with stable `code`. |
| `src/lib/control/store.ts` | The single control-store binding: `TenantRepo` / `TenantTokenRepo` thin functions over the model. The ONLY supported way to mint/revoke tokens. |
| `src/lib/tenant/provisioning-gate.ts` | The approval gate: `approveTenant` / `rejectTenant` / `getTenantAutoApprove`. Mints the once-only crt_live token and hands off to provisioning. |
| `src/models/PlatformConfig.ts` | `moderation.tenantAutoApprove` toggle (default **OFF**) consumed by `getTenantAutoApprove`. |
| `src/lib/secrets.ts` | AES-256-GCM encrypt/decrypt + `hashToken` + `generateApiToken`. Reused unchanged. |

## How a token resolves (O(1))

1. Request arrives with `Authorization: Bearer crt_live_…`.
2. `hashToken(plaintext)` → sha256 hex.
3. `resolveTenantByTokenHash(hash)` runs **one** indexed lookup:
   `{ status: "active", tokenHashes: hash }`.
4. The matched tenant's `tenant_tokens[]` record is re-checked: if `revokedAt`
   is set (the flat `tokenHashes[]` mirror can lag a revoke), resolve to `null`.
5. The keystone (Agent 10, `src/lib/tenant/resolve-connection.ts`) then
   `decryptTenantConnUri(tenant, "pooled")` and builds the pooled, LRU-cached
   `DbAdapter`. See [connection-resolver.md](./connection-resolver.md).

## The denormalization invariant

`tokenHashes[]` is a **flat, indexed mirror** of every *active* (non-revoked)
token's hash — it exists purely for the O(1) resolve. `tenant_tokens[]` is the
authoritative per-token record (scopes, last4, `revokedAt`). They MUST stay in
sync:

- **Mint** (`TenantTokenRepo.attachToken`): `$push` the record AND `$addToSet`
  the hash.
- **Revoke** (`TenantTokenRepo.revokeToken`): `$set …revokedAt` on the record
  AND `$pull` the hash from the mirror.

During cutover, the legacy `User.agentProfile.aiIntegrations.apiTokens` path must
also be kept in sync on every mint/revoke (build_plan §6.1).

## The approval gate (`provisioning-gate.ts`)

The BaaS analogue of `partner-moderation.ts` — the one place a tenant application
moves from `pending` to a live data plane, so status / token mint / license audit
/ provisioning hand-off / notification stay consistent across the admin review,
signup auto-approve, and cron backstop (Agent 22) callers.

- **`approveTenant(tenantId, approvedBy)`** — asserts `pending`, mints **exactly
  one** crt_live token (`generateApiToken`), attaches its **hash** (denormalized
  invariant), stamps `status:"approved"` + `approvedAt` + `license.verifiedAt`/
  `license.verifiedBy` (`approvedBy` doubles as the license verifier), then calls
  `provisionTenant` (Agent 16). Returns the token **plaintext exactly once** —
  never logged, never returned again. Throws `TenantNotFoundError` (missing) /
  `TenantUnavailableError` (not pending).
- **`rejectTenant(tenantId, reason)`** — `status:"rejected"` + reason +
  `rejectedAt`. No token, no provisioning. Defaults the reason to "Rejected by
  admin" when blank.
- **`getTenantAutoApprove()`** — reads `PlatformConfig.moderation.tenantAutoApprove`,
  default **FALSE**. Unlike partner auto-approve (default ON), a tenant approval
  mints a live token + a dedicated Postgres data plane, so the safe default is
  manual admin review. The **license is the real gate** (build_plan §7).

Every external system is reachable through an injectable `deps` object swapped via
`__setProvisioningGateDeps` (mirrors the provision-service seam), so the unit test
runs the real gate logic with zero Mongo / Neon / secrets. Email notifications are
best-effort no-ops today (no tenant-specific template yet) — wire a real sender at
the `notifyApproved` / `notifyRejected` deps.

## Gotchas

- **`status` is a security boundary, not a directory filter.** Only `active`
  serves data. The resolve query filters on `status:"active"`, so a
  suspended/pending/teardown tenant resolves to `null` — never silently served.
- **Conn strings are ciphertext at rest.** `connStringEncrypted` (pooled,
  runtime) and `directConnStringEncrypted` (direct, DDL only) are AES-256-GCM.
  Decrypted ONLY inside the resolver, NEVER returned to a client, NEVER logged.
- **No Neon imports in this layer.** This is deliberately the Neon-free half of
  the keystone so it can resolve tenants without spinning a data-plane pool
  (identity-only paths like `whoami` never open a Neon connection).
- **Hot-reload-safe registration.** `mongoose.models.Tenant ?? model(...)` — or
  Next dev / repeated test imports throw `OverwriteModelError`.
- **`ownerUserId` is opaque.** It's a Mongo `User._id` *string* used only for
  cross-store correlation — never JOINed (the data plane is a different DB).

## Tests

`src/lib/tenant/__tests__/resolve-tenant.test.ts` — Node built-in runner, **no
live Mongo**. Mongoose is mocked at two seams (`dbConnect` cache short-circuit +
`mock.method(TenantModel,"findOne")`). Asserts: active+token-hash filter shape,
suspended exclusion, revoked-token rejection, decrypt round-trip through the real
`secrets.ts`, error-class codes. Run:

```
npx tsx --test src/lib/tenant/__tests__/resolve-tenant.test.ts
```

`src/lib/tenant/__tests__/provisioning-gate.test.ts` — Node built-in runner, **no
live Mongo / Neon / secrets** (all injected via `__setProvisioningGateDeps`).
Asserts: approve flips `pending→approved`, mints exactly one token (plaintext
returned once), attaches the **hash** (not plaintext), stamps the license-verified
audit fields, and calls `provisionTenant`; non-pending → `TenantUnavailableError`;
missing → `TenantNotFoundError`; reject sets `rejected`+reason+`rejectedAt`;
`getTenantAutoApprove` defaults false. Run:

```
npx tsx --test src/lib/tenant/__tests__/provisioning-gate.test.ts
```
