#!/usr/bin/env npx tsx
// Backfill subdomains for existing agents who don't have one.
// Usage: npx tsx src/scripts/backfill-agent-subdomains.ts

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set");

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  // Import after connection so model registers
  const User = (await import("@/models/User")).default;
  const { generateSubdomain } = await import("@/lib/generate-subdomain");

  const agents = await User.find({
    roles: "realEstateAgent",
    $or: [
      { "agentProfile.subdomain": { $exists: false } },
      { "agentProfile.subdomain": null },
      { "agentProfile.subdomain": "" },
    ],
  });

  console.log(`Found ${agents.length} agents without subdomains`);

  for (const agent of agents) {
    const subdomain = await generateSubdomain(agent.name, agent.email, agent._id);
    if (!agent.agentProfile) {
      agent.agentProfile = {} as any;
    }
    agent.agentProfile.subdomain = subdomain;
    agent.markModified("agentProfile");
    await agent.save({ validateBeforeSave: false });
    console.log(`  ${agent.email} → ${subdomain}.chatrealty.io`);
  }

  console.log("Done");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
