// Seed preflight — "will this feed fit this database?", answered BEFORE any
// row is written.
//
// The 512 MB wall used to be discovered by hitting it: the first seeded tenant
// pulled the whole 8-association feed (~85k listings), died at row ~26,400
// with a raw Postgres storage error, and left a database that could neither
// finish nor start over. Association size spans three orders of magnitude
// (GPS ≈ 4.5k listings ≈ 90 MB; CRMLS ≈ 53k ≈ 1 GB+), so "just seed" is a
// coin-flip against the plan ceiling. This module turns the wall into a
// priced choice made up front:
//
//   1. exact $count of what THIS config will pull (same network filter the
//      seed uses — not a sample),
//   2. bytes/row measured from the database itself when it has enough rows,
//      else the observed ~20 KB default,
//   3. the account's storage allowance from the platform
//      (GET /api/skill/tenant — tier-aware), falling back to the free limit
//      when unreachable,
//   4. a verdict in plain English: fits / tight / exceeds, with the upgrade
//      URL and the RESO_NETWORKS alternative spelled out.
//
// The caller decides what to do with "exceeds" (the CLI refuses without
// --force). This module only ever reads.

import { Client } from "pg";
import { pgConnString } from "./pgconn.js";
import { ResoClient } from "./reso-fetch.js";
import { STORAGE_LIMIT_BYTES } from "./errors.js";

const DEFAULT_BYTES_PER_ROW = 20 * 1024; // measured on GPS/Spark with raw retention
const MEASURE_FLOOR_ROWS = 500; // below this, a per-row measure is noise

export type PreflightVerdict = "fits" | "tight" | "exceeds" | "unknown";

export interface PreflightResult {
  verdict: PreflightVerdict;
  lines: string[];
  feedCount: number | null;
  projectedBytes: number | null;
  limitBytes: number;
  tier: string;
  upgradeUrl: string;
}

async function fetchAllowance(env: NodeJS.ProcessEnv): Promise<{
  limitBytes: number;
  tier: string;
  upgradeUrl: string;
  fromPlatform: boolean;
}> {
  const fallback = {
    limitBytes: STORAGE_LIMIT_BYTES,
    tier: "free (assumed — platform unreachable)",
    upgradeUrl: "https://www.chatrealty.io/agent/settings",
    fromPlatform: false,
  };
  const token = env.CHATREALTY_API_TOKEN?.trim();
  if (!token) return fallback;
  const base = (env.CHATREALTY_API_BASE || "https://www.chatrealty.io").replace(/\/+$/, "");
  try {
    const res = await fetch(`${base}/api/skill/tenant`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return fallback;
    const d = (await res.json()) as {
      storageLimitBytes?: number;
      tier?: string;
      upgradeUrl?: string;
    };
    if (!d.storageLimitBytes) return fallback;
    return {
      limitBytes: d.storageLimitBytes,
      tier: d.tier || "unknown",
      upgradeUrl: d.upgradeUrl || fallback.upgradeUrl,
      fromPlatform: true,
    };
  } catch {
    return fallback;
  }
}

const mb = (b: number) => `${Math.round(b / (1024 * 1024))} MB`;

export async function seedPreflight(opts: {
  dbUrl: string;
  reso: ConstructorParameters<typeof ResoClient>[0];
  env?: NodeJS.ProcessEnv;
}): Promise<PreflightResult> {
  const env = opts.env ?? process.env;
  const lines: string[] = [];

  // What does the account's plan allow?
  const allowance = await fetchAllowance(env);

  // What's already in the database, and what does a row cost here?
  let usedBytes = 0;
  let rows = 0;
  try {
    const client = new Client({
      connectionString: pgConnString(opts.dbUrl),
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();
    const sz = await client.query(
      `SELECT pg_database_size(current_database())::bigint AS bytes,
              (SELECT count(*)::int FROM property) AS rows;`
    );
    await client.end();
    usedBytes = Number(sz.rows[0]?.bytes ?? 0);
    rows = Number(sz.rows[0]?.rows ?? 0);
  } catch {
    lines.push("[preflight] could not read the database size — verdict is count-only.");
  }
  const bytesPerRow =
    rows >= MEASURE_FLOOR_ROWS && usedBytes > 0 ? usedBytes / rows : DEFAULT_BYTES_PER_ROW;

  // What will this config actually pull? Exact count, same filter as the seed.
  let feedCount: number | null = null;
  try {
    const client = new ResoClient(opts.reso);
    feedCount = await client.countScope();
  } catch {
    // A feed that rejects $count still gets a size line from what we know.
  }

  const scope =
    opts.reso.networks && opts.reso.networks.length > 0
      ? `networks: ${opts.reso.networks.join(", ")}`
      : "ALL networks this key can see (RESO_NETWORKS is unset)";

  if (feedCount == null) {
    lines.push(
      `[preflight] the feed did not answer a $count — cannot project the seed size (${scope}).`,
      `[preflight] plan allows ${mb(allowance.limitBytes)} (${allowance.tier}). Proceeding without a projection.`
    );
    return {
      verdict: "unknown",
      lines,
      feedCount,
      projectedBytes: null,
      limitBytes: allowance.limitBytes,
      tier: allowance.tier,
      upgradeUrl: allowance.upgradeUrl,
    };
  }

  const projectedBytes = Math.max(usedBytes, Math.round(feedCount * bytesPerRow));
  const pct = Math.round((projectedBytes / allowance.limitBytes) * 100);
  const verdict: PreflightVerdict = pct >= 100 ? "exceeds" : pct >= 70 ? "tight" : "fits";

  lines.push(
    `[preflight] this seed will pull ~${feedCount.toLocaleString()} listings (${scope}).`,
    `[preflight] projected size ≈ ${mb(projectedBytes)} at ~${Math.round(bytesPerRow / 1024)} KB/listing` +
      (rows >= MEASURE_FLOOR_ROWS ? " (measured from your database)" : " (typical)") +
      `. Your plan (${allowance.tier}) allows ${mb(allowance.limitBytes)}.`
  );

  if (verdict === "fits") {
    lines.push(`[preflight] fits comfortably (~${pct}% of your allowance). Seeding.`);
  } else if (verdict === "tight") {
    lines.push(
      `[preflight] TIGHT — ~${pct}% of your allowance. It should complete, but there is little`,
      `[preflight] headroom for growth. Narrow RESO_NETWORKS to the associations you serve,`,
      `[preflight] or upgrade your storage at ${allowance.upgradeUrl}.`
    );
  } else {
    lines.push(
      `[preflight] EXCEEDS YOUR PLAN — this feed needs ~${mb(projectedBytes)}, your plan allows ${mb(allowance.limitBytes)}.`,
      `[preflight] Seeding would die mid-run at the storage wall and leave the database`,
      `[preflight] neither finished nor restartable. Two ways forward:`,
      `[preflight]   1. Serve fewer associations: set RESO_NETWORKS in .env.local to just`,
      `[preflight]      yours (run \`npx @chatrealty/sync networks\` to see sizes), then`,
      `[preflight]      \`init\` a fresh database and seed that.`,
      `[preflight]   2. Upgrade your data plan: ${allowance.upgradeUrl}`
    );
  }

  return {
    verdict,
    lines,
    feedCount,
    projectedBytes,
    limitBytes: allowance.limitBytes,
    tier: allowance.tier,
    upgradeUrl: allowance.upgradeUrl,
  };
}
