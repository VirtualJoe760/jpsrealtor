// scripts/backfill-vercel-subdomains.ts
//
//   npx tsx scripts/backfill-vercel-subdomains.ts [--dry-run]
//
// Register every agent subdomain in Mongo as a domain on the Vercel project.
//
// Why this exists: per-subdomain Vercel registration was removed on
// 2026-04-30 (7aec49bb) on the assumption that the *.chatrealty.io wildcard
// CNAME covered it. The wildcard is DNS only — Vercel's router still 404s
// (DEPLOYMENT_NOT_FOUND) any hostname not added to the project, before our
// proxy ever runs. Every subdomain minted between that commit and 2026-08-05
// resolves DNS, passes TLS on the wildcard cert, and then dies at the router.
// generate-subdomain.ts registers new ones again; this script catches up the
// gap. Idempotent — safe to re-run any time.

import mongoose from "mongoose";
import { config } from "dotenv";
import { listProjectDomains } from "../src/lib/vercel-domains";
import { ensureSubdomainRegistered } from "../src/lib/generate-subdomain";

config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });

async function main() {
  const dry = process.argv.includes("--dry-run");
  await mongoose.connect(process.env.MONGODB_URI!);
  const db = mongoose.connection.db!;

  const users = await db
    .collection("users")
    .find(
      { "agentProfile.subdomain": { $exists: true, $nin: [null, ""] } },
      { projection: { email: 1, "agentProfile.subdomain": 1 } }
    )
    .toArray();

  const attached = new Set(
    (await listProjectDomains()).map((d: { name: string }) => d.name.toLowerCase())
  );

  console.log(`${users.length} subdomain(s) in Mongo · ${attached.size} domain(s) on the Vercel project\n`);

  let ok = 0,
    missing = 0,
    failed = 0;
  for (const u of users) {
    const sub = (u as any).agentProfile.subdomain.toLowerCase();
    const domain = `${sub}.chatrealty.io`;
    if (attached.has(domain)) {
      ok++;
      continue;
    }
    missing++;
    if (dry) {
      console.log(`WOULD REGISTER  ${domain}  (${(u as any).email})`);
      continue;
    }
    const r = await ensureSubdomainRegistered(sub);
    console.log(`${r.registered ? "REGISTERED" : "FAILED    "}  ${domain}  — ${r.note}`);
    if (!r.registered) failed++;
  }

  console.log(
    `\nalready attached: ${ok} · ${dry ? "would register" : "registered"}: ${missing - failed}${failed ? ` · FAILED: ${failed}` : ""}`
  );
  await mongoose.disconnect();
  if (failed) process.exitCode = 1;
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
