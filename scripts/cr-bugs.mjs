// scripts/cr-bugs.mjs — owner-side bug-report queue tool (the /check-cr-bugs skill's engine).
//
//   node scripts/cr-bugs.mjs list                 # all new + triaged reports (full detail, JSON)
//   node scripts/cr-bugs.mjs triage <id>          # mark a report triaged (being worked)
//   node scripts/cr-bugs.mjs resolve <id> fixed "notes / commit hash"
//   node scripts/cr-bugs.mjs resolve <id> wont_fix "reason"
//
// Reads MONGODB_URI from .env.local. Run from the repo root.

import fs from "node:fs";
import { MongoClient, ObjectId } from "mongodb";

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const uri = process.env.MONGODB_URI || env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI not found in env or .env.local");
  process.exit(1);
}

const [cmd, id, status, ...noteParts] = process.argv.slice(2);
const client = new MongoClient(uri);
await client.connect();
const col = client.db().collection("bugreports");

try {
  if (cmd === "list" || !cmd) {
    const docs = await col
      .find({ status: { $in: ["new", "triaged"] } })
      .sort({ severity: 1, createdAt: 1 })
      .toArray();
    console.log(JSON.stringify({ open: docs.length, reports: docs }, null, 2));
  } else if (cmd === "triage" && id) {
    const r = await col.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: "triaged", updatedAt: new Date() } }
    );
    console.log(r.matchedCount ? `triaged ${id}` : `NOT FOUND: ${id}`);
  } else if (cmd === "resolve" && id && ["fixed", "wont_fix"].includes(status)) {
    const r = await col.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, resolutionNotes: noteParts.join(" ") || undefined, updatedAt: new Date() } }
    );
    console.log(r.matchedCount ? `${status}: ${id}` : `NOT FOUND: ${id}`);
  } else {
    console.error("usage: list | triage <id> | resolve <id> fixed|wont_fix \"notes\"");
    process.exit(1);
  }
} finally {
  await client.close();
}
