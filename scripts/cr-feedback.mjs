// scripts/cr-feedback.mjs — owner-side feedback-package tool (the /review-cr-feedback skill's engine).
//
//   node scripts/cr-feedback.mjs list                # uploaded (unreviewed) packages
//   node scripts/cr-feedback.mjs fetch <id> <dir>    # download zip from GridFS + unpack into <dir>
//   node scripts/cr-feedback.mjs reviewed <id> "notes"
//
// Reads MONGODB_URI from .env.local. Run from the repo root.

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { MongoClient, ObjectId, GridFSBucket } from "mongodb";

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const uri = process.env.MONGODB_URI || env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI not found");
  process.exit(1);
}

const [cmd, id, arg, ...noteParts] = process.argv.slice(2);
const client = new MongoClient(uri);
await client.connect();
const db = client.db();
const col = db.collection("feedbacksubmissions");

try {
  if (cmd === "list" || !cmd) {
    const docs = await col.find({ status: "uploaded" }).sort({ createdAt: 1 }).toArray();
    console.log(JSON.stringify({ pending: docs.length, submissions: docs }, null, 2));
  } else if (cmd === "fetch" && id && arg) {
    const doc = await col.findOne({ _id: new ObjectId(id) });
    if (!doc || !doc.fileId) {
      console.error("not found / no file");
      process.exit(1);
    }
    fs.mkdirSync(arg, { recursive: true });
    const zipPath = path.join(arg, `feedback-${id}.zip`);
    const bucket = new GridFSBucket(db, { bucketName: "crfeedback" });
    await new Promise((resolve, reject) =>
      bucket
        .openDownloadStream(doc.fileId)
        .pipe(fs.createWriteStream(zipPath))
        .on("finish", resolve)
        .on("error", reject)
    );
    execSync(
      `powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${arg}' -Force"`,
      { stdio: "inherit" }
    );
    console.log(`Unpacked to ${arg}`);
    console.log(`Summary: ${doc.summary}`);
    console.log(`Kind: ${doc.kind} | From: ${doc.reporter?.name} <${doc.reporter?.email}> | ${doc.fileBytes} bytes`);
  } else if (cmd === "reviewed" && id) {
    const r = await col.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: "reviewed", reviewNotes: [arg, ...noteParts].filter(Boolean).join(" ") || undefined, updatedAt: new Date() } }
    );
    console.log(r.matchedCount ? `reviewed ${id}` : `NOT FOUND: ${id}`);
  } else {
    console.error('usage: list | fetch <id> <dir> | reviewed <id> "notes"');
    process.exit(1);
  }
} finally {
  await client.close();
}
