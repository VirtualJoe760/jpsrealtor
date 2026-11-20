// scripts/backfill-agent-onboarding.ts
//
//   npx tsx scripts/backfill-agent-onboarding.ts [--dry-run]
//
// Set agentProfile.onboardingComplete = true for agents who are ALREADY set
// up, so the forced-setup gate doesn't trap them.
//
// Why this exists: on 2026-11-04 the form wizard was removed and
// /agent/settings?onboarding=true stopped being the onboarding destination.
// The middleware gate in src/proxy.ts now sends any agent whose token says
// onboardingComplete === false to /agent/setup, and the client-side
// localStorage cushion that used to spare legacy agents was removed with the
// wizard. Three things then combine against an agent who predates the flag:
//
//   1. src/models/User.ts declares `onboardingComplete: { default: false }`,
//      so every user document saved through Mongoose since already carries an
//      explicit false — not a missing field. `$exists: false` would miss them.
//   2. src/lib/auth.ts stamps the token with `!!agentProfile?.onboardingComplete`
//      at sign-in, so undefined also collapses to a hard false.
//   3. The silent permission refresh in the same file re-stamps every live
//      session once a minute, so even an old JWT carrying undefined flips to
//      false within 60 seconds.
//
// Result without this backfill: an established agent signs in and is bounced
// to /agent/setup, unable to reach their dashboard.
//
// WHO GETS FLIPPED: an agent is treated as already set up when they have both
// a licenseNumber and a brokerageName — exactly the bar finish_setup enforces
// in /api/agent/setup-chat before it will flip the flag itself. An agent
// missing either one legitimately needs to go through setup (it is the
// compliance gate, not a convenience), so they are left alone and stay gated.
// The flag alone cannot tell the two cohorts apart, because of (1) above.
//
// Idempotent — safe to re-run any time.

import mongoose from "mongoose";
import path from "path";
import { config } from "dotenv";

// Resolved from this file, not hardcoded: the repo is checked out on both a
// Windows (F:\) and a macOS path (see AGENTS.md §1).
config({ path: path.resolve(__dirname, "..", ".env.local") });

function nonEmpty(v: unknown): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

async function main() {
  const dry = process.argv.includes("--dry-run");
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI missing from .env.local");
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db!;

  // Every agent not already marked complete. Admins are exempt from the gate
  // in proxy.ts anyway, but flipping them too keeps the data honest.
  const candidates = await db
    .collection("users")
    .find(
      {
        roles: "realEstateAgent",
        "agentProfile.onboardingComplete": { $ne: true },
      },
      {
        projection: {
          licenseNumber: 1,
          brokerageName: 1,
          isAdmin: 1,
          "agentProfile.onboardingComplete": 1,
          "agentProfile.subdomain": 1,
        },
      }
    )
    .toArray();

  const ready = candidates.filter(
    (u: any) => nonEmpty(u.licenseNumber) && nonEmpty(u.brokerageName)
  );
  const needsSetup = candidates.filter(
    (u: any) => !nonEmpty(u.licenseNumber) || !nonEmpty(u.brokerageName)
  );

  console.log(
    `${candidates.length} agent(s) not marked complete\n` +
      `  already set up (license + brokerage present) → flip to true: ${ready.length}\n` +
      `  genuinely incomplete → left gated for /agent/setup: ${needsSetup.length}\n`
  );

  for (const u of needsSetup) {
    const missing = [
      nonEmpty((u as any).licenseNumber) ? null : "licenseNumber",
      nonEmpty((u as any).brokerageName) ? null : "brokerageName",
    ]
      .filter(Boolean)
      .join(" + ");
    // Identify by subdomain/id, not email — these logs get pasted around.
    const who = (u as any).agentProfile?.subdomain || String((u as any)._id).slice(-6);
    console.log(`  LEAVING GATED   ${who}  (missing ${missing})`);
  }

  if (!ready.length) {
    console.log("\nnothing to backfill.");
    await mongoose.disconnect();
    return;
  }

  for (const u of ready) {
    const who = (u as any).agentProfile?.subdomain || String((u as any)._id).slice(-6);
    console.log(`  ${dry ? "WOULD FLIP" : "FLIPPED   "}      ${who}`);
  }

  if (dry) {
    console.log(`\ndry run — nothing written. Re-run without --dry-run to apply.`);
    await mongoose.disconnect();
    return;
  }

  const res = await db.collection("users").updateMany(
    { _id: { $in: ready.map((u: any) => u._id) } },
    { $set: { "agentProfile.onboardingComplete": true } }
  );
  console.log(`\nmatched ${res.matchedCount} · modified ${res.modifiedCount}`);

  // The gate reads the JWT, and src/lib/auth.ts re-reads this field at most
  // once a minute per session, so anyone currently bounced is freed within a
  // minute without signing out.
  console.log("Live sessions pick this up within ~60s (auth.ts permission refresh).");
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exitCode = 1;
});
