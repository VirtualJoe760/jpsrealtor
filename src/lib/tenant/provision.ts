// src/lib/tenant/provision.ts
//
// SELF-SERVE tenant provisioning (ship-strategy Phase P, 2026-07-23): a valid
// crt_live token → a live, dedicated ChatRealty database. No human at
// ChatRealty in the loop — "ask ChatRealty" was declared a missing API, and
// this is that API.
//
// Flow (idempotent per owner):
//   1. Existing ACTIVE tenant for this owner → bind the calling token (new
//      tokens keep working after re-mints) and return the decrypted
//      connection strings. The bearer token IS the credential; anyone holding
//      it could read the tenant's data through the API anyway, so re-issuing
//      the connection string to it grants nothing new.
//   2. Otherwise: create a dedicated Neon project (Neon returns the conn URIs
//      exactly once, at creation), enable PostGIS + pg_trgm over the DIRECT
//      connection, apply the full data-plane migration, verify the `property`
//      table, then persist the Tenant control record with AES-256-GCM
//      encrypted conn strings and the token binding.
//
// NAMING RULE: everything customer-facing calls this "your ChatRealty
// database". Neon is an implementation detail and never appears in responses.

import fs from "fs";
import path from "path";
import { Client } from "pg";
import { createProject, deleteProject, getProject } from "@/lib/neon/client";
import TenantModel from "@/models/control/Tenant";
import { encryptSecret, decryptSecret } from "@/lib/secrets";

export interface ProvisionInput {
  /** Mongo User._id (opaque string) of the agent. */
  ownerUserId: string;
  /** Slug seed — the agent's subdomain or name. */
  slugSeed: string;
  displayName?: string;
  /** sha256 of the calling crt_live token — bound to the tenant. */
  tokenHash: string;
  tokenLast4: string;
  tokenName: string;
}

export interface ProvisionResult {
  created: boolean;
  tenantId: string;
  /** Pooled connection URL — what the customer's sync uses (CHATREALTY_DB_URL). */
  dbUrl: string;
  /** Direct connection URL — DDL/maintenance only. */
  directDbUrl: string;
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "tenant"
  );
}

/** Split a Drizzle migration into executable statements. */
function migrationStatements(): string[] {
  const file = path.join(process.cwd(), "src", "lib", "db", "migrations", "0000_supreme_maginty.sql");
  const sql = fs.readFileSync(file, "utf8");
  return sql
    .split(/-->\s*statement-breakpoint/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * The lead-loop repair DDL (`end_user`, `saved_search`, and the `contact`
 * columns the Drizzle placeholder is missing). Idempotent — see the header of
 * the SQL file for why it exists.
 */
function leadLoopDdl(): string {
  const file = path.join(
    process.cwd(),
    "src",
    "lib",
    "reso",
    "migrations",
    "0004_leadloop_repair.sql"
  );
  return fs.readFileSync(file, "utf8");
}

/**
 * Bring a tenant database to the lead-loop schema. Idempotent, so it runs on
 * every provision AND on every reconnect — that is what heals the tenants
 * provisioned before 0004 existed, whose lead form returned 500 on every
 * submission because `end_user` was never created (session 14, 2026-08-05).
 *
 * Multi-statement DDL goes over the DIRECT connection in one round-trip; the
 * script is written so re-running changes nothing.
 */
export async function ensureLeadLoopSchema(directUri: string): Promise<void> {
  const client = new Client({ connectionString: directUri });
  await client.connect();
  try {
    await client.query(leadLoopDdl());
  } finally {
    await client.end().catch(() => {});
  }
}

async function prepareDataPlane(directUri: string): Promise<void> {
  const client = new Client({ connectionString: directUri });
  await client.connect();
  try {
    await client.query("CREATE EXTENSION IF NOT EXISTS postgis;");
    await client.query("CREATE EXTENSION IF NOT EXISTS pg_trgm;");
    for (const stmt of migrationStatements()) {
      await client.query(stmt);
    }
    // The CRM/lead-loop tables the Drizzle migration never shipped. Without
    // these, every lead the site captures 500s.
    await client.query(leadLoopDdl());

    // Verify BOTH halves: listings (`property`) and lead capture (`end_user`).
    // Verifying only `property` is how a tenant went live with a lead form that
    // could never succeed.
    const check = await client.query(
      `SELECT
         EXISTS (SELECT 1 FROM information_schema.tables
                  WHERE table_schema = 'public' AND table_name = 'property') AS has_property,
         EXISTS (SELECT 1 FROM information_schema.tables
                  WHERE table_schema = 'public' AND table_name = 'end_user') AS has_end_user;`
    );
    if (!check.rows[0]?.has_property) {
      throw new Error("data-plane verification failed: `property` table missing after migration");
    }
    if (!check.rows[0]?.has_end_user) {
      throw new Error("data-plane verification failed: `end_user` table missing after migration");
    }
  } finally {
    await client.end().catch(() => {});
  }
}

/**
 * Returns the project id when Neon says it is GONE, else null.
 *
 * Deliberately one-directional: only a hard 404 counts as deleted. No API key,
 * a timeout, a 5xx, or a malformed id all return null — "I could not check" is
 * not "it is missing", and treating it as such would throw away live databases
 * on a transient blip.
 */
async function findDeletedProject(projectId?: string | null): Promise<string | null> {
  if (!projectId) return null;
  if (!process.env.NEON_API_KEY) return null;
  try {
    await getProject(projectId);
    return null; // alive
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status;
    if (status === 404) return projectId;
    console.error(
      `[provision] could not verify Neon project ${projectId} (status ${status ?? "?"}) — assuming alive`,
    );
    return null;
  }
}

/**
 * The stored project is gone. Build a new one and point the EXISTING tenant
 * record at it.
 *
 * In place, not a new row: `ownerUserId` is unique, so a second document is
 * impossible — and reusing the record keeps `tenantId` and every minted token
 * working, which is what makes this a recovery rather than a migration. The
 * operator re-runs `init` and their site keeps its identity; only the (empty,
 * unreachable) database underneath is replaced.
 */
async function reprovisionInPlace(
  existing: any,
  deadProjectId: string,
): Promise<ProvisionResult> {
  console.warn(
    `[provision] Neon project ${deadProjectId} for tenant ${existing.tenantId} is gone — rebuilding`,
  );
  const project = await createProject({ name: `chatrealty-${existing.slug}` });
  try {
    await prepareDataPlane(project.directConnUri);
    await ensureLeadLoopSchema(project.directConnUri);
  } catch (err) {
    // Same rule as a fresh provision: never leave a half-built project behind,
    // because Neon only returns the connection string at creation time.
    await deleteProject(project.projectId).catch(() => {});
    throw err;
  }

  existing.neon = {
    projectId: project.projectId,
    databaseName: project.defaultDatabase,
    roleName: project.defaultRole,
    provisionedAt: new Date(),
  };
  existing.connStringEncrypted = encryptSecret(project.pooledConnUri);
  existing.directConnStringEncrypted = encryptSecret(project.directConnUri);
  await existing.save();

  return {
    created: true,
    tenantId: existing.tenantId,
    dbUrl: project.pooledConnUri,
    directDbUrl: project.directConnUri,
  };
}

export async function provisionTenant(input: ProvisionInput): Promise<ProvisionResult> {
  // 1. Idempotent path — the owner already has a tenant.
  const existing = await TenantModel.findOne({ ownerUserId: input.ownerUserId });
  if (existing) {
    if (existing.status !== "active") {
      throw Object.assign(new Error(`tenant_${existing.status}`), { code: "tenant_not_active" });
    }
    if (!existing.tokenHashes.includes(input.tokenHash)) {
      existing.tenant_tokens.push({
        tokenHash: input.tokenHash,
        last4: input.tokenLast4,
        name: input.tokenName,
        scopes: [],
        createdAt: new Date(),
      } as any);
      existing.tokenHashes.push(input.tokenHash);
      await existing.save();
    }
    if (!existing.connStringEncrypted || !existing.directConnStringEncrypted) {
      throw Object.assign(new Error("tenant exists but has no stored connection"), {
        code: "tenant_conn_missing",
      });
    }
    // IS THE DATABASE STILL THERE? (CRBR 6a7a4742, 2026-08-10)
    //
    // Reconnect used to hand back the stored credential unconditionally. When
    // the underlying Neon project is gone, that is a key to a door that no
    // longer exists: `doctor` reports "password authentication failed", tells
    // the operator the problem is CHATREALTY_DB_URL and to re-run `init` — and
    // `init` returns the same dead credential. A closed loop with no
    // client-side exit, and the tenant is permanently unreachable.
    //
    // Neon's own API is the authority, not a Postgres error string: a 404 on
    // the project id means DELETED, full stop. Anything else — a timeout, a
    // 5xx, no NEON_API_KEY configured — is NOT evidence of deletion, and must
    // fall through to the old behaviour. A brief network hiccup must never
    // cost someone a working database.
    const deadProjectId = await findDeletedProject(existing.neon?.projectId);
    if (deadProjectId) {
      return await reprovisionInPlace(existing, deadProjectId);
    }

    const directDbUrl = decryptSecret(existing.directConnStringEncrypted);

    // Self-heal on reconnect. Tenants provisioned before migration 0004 have no
    // `end_user` table, so every lead their site captured returned a 500. The
    // repair is idempotent and takes one round-trip; making it best-effort means
    // a DDL hiccup degrades `init` to exactly its old behaviour instead of
    // failing a reconnect that has nothing to do with the CRM.
    try {
      await ensureLeadLoopSchema(directDbUrl);
    } catch (err: any) {
      console.error("[provision] lead-loop schema repair failed:", err?.message);
    }

    return {
      created: false,
      tenantId: existing.tenantId,
      dbUrl: decryptSecret(existing.connStringEncrypted),
      directDbUrl,
    };
  }

  // 2. Fresh provision.
  const slug = slugify(input.slugSeed);
  const tenantId = `t-${slug}-${Date.now().toString(36)}`;
  const project = await createProject({ name: `chatrealty-${slug}` });

  try {
    await prepareDataPlane(project.directConnUri);
  } catch (err) {
    // Don't leave a half-provisioned project behind — the conn string would be
    // lost forever (Neon only returns it at creation).
    await deleteProject(project.projectId).catch(() => {});
    throw err;
  }

  await TenantModel.create({
    tenantId,
    slug,
    displayName: input.displayName || slug,
    ownerUserId: input.ownerUserId,
    status: "active",
    license: {},
    neon: {
      projectId: project.projectId,
      databaseName: project.defaultDatabase,
      roleName: project.defaultRole,
      provisionedAt: new Date(),
    },
    connStringEncrypted: encryptSecret(project.pooledConnUri),
    directConnStringEncrypted: encryptSecret(project.directConnUri),
    secrets: {},
    metering: {},
    tenant_tokens: [
      {
        tokenHash: input.tokenHash,
        last4: input.tokenLast4,
        name: input.tokenName,
        scopes: [],
        createdAt: new Date(),
      },
    ],
    tokenHashes: [input.tokenHash],
  });

  return {
    created: true,
    tenantId,
    dbUrl: project.pooledConnUri,
    directDbUrl: project.directConnUri,
  };
}
