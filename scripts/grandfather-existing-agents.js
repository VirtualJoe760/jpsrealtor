#!/usr/bin/env node
// scripts/grandfather-existing-agents.js
//
// One-off (2026-10-28): paid onboarding began — becoming an agent now requires
// the Basic plan. Every user who ALREADY had the realEstateAgent role keeps
// Basic-level access free forever: this sets agentProfile.grandfathered=true,
// which getAgentTier() (src/lib/subscription-helpers.ts) resolves to
// "beginner". Run once, before/with the deploy that adds the paywall.
//
// Usage:
//   node scripts/grandfather-existing-agents.js --dry-run
//   node scripts/grandfather-existing-agents.js

require("dotenv").config({ path: ".env.local" });
const mongoose = require("mongoose");

const dryRun = process.argv.includes("--dry-run");

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = mongoose.connection.db.collection("users");
  const filter = { roles: "realEstateAgent", "agentProfile.grandfathered": { $ne: true } };
  const targets = await users.find(filter, { projection: { name: 1, email: 1 } }).toArray();
  console.log(`${dryRun ? "[dry run] " : ""}${targets.length} agent(s) to grandfather:`);
  for (const u of targets) console.log(`  - ${u.name || "(no name)"} <${u.email}>`);
  if (!dryRun && targets.length) {
    const r = await users.updateMany(filter, {
      $set: { "agentProfile.grandfathered": true },
    });
    console.log(`updated ${r.modifiedCount}`);
  }
  console.log(`total grandfathered now: ${await users.countDocuments({ "agentProfile.grandfathered": true })}`);
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
