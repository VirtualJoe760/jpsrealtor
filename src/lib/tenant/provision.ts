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
import { createProject, deleteProject } from "@/lib/neon/client";
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

async function prepareDataPlane(directUri: string): Promise<void> {
  const client = new Client({ connectionString: directUri });
  await client.connect();
  try {
    await client.query("CREATE EXTENSION IF NOT EXISTS postgis;");
    await client.query("CREATE EXTENSION IF NOT EXISTS pg_trgm;");
    for (const stmt of migrationStatements()) {
      await client.query(stmt);
    }
    const check = await client.query(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'property'
       ) AS ok;`
    );
    if (!check.rows[0]?.ok) {
      throw new Error("data-plane verification failed: `property` table missing after migration");
    }
  } finally {
    await client.end().catch(() => {});
  }
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
    return {
      created: false,
      tenantId: existing.tenantId,
      dbUrl: decryptSecret(existing.connStringEncrypted),
      directDbUrl: decryptSecret(existing.directConnStringEncrypted),
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
