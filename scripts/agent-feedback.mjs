// scripts/agent-feedback.mjs — CLI for the judge-loop's repo side.
//
//   node scripts/agent-feedback.mjs check              exit 0 + JSON if a NEW report exists, exit 3 if none
//   node scripts/agent-feedback.mjs show <id>          print a report's markdown
//   node scripts/agent-feedback.mjs claim <id>         mark in_progress (routine takes it)
//   node scripts/agent-feedback.mjs complete <id> "notes"   mark complete + turn testing ON
//   node scripts/agent-feedback.mjs toggle on|off      flip the toggle by hand
//
// `check` is the routine's cheap poll: distinct exit codes let the scheduled
// task bail in one command when there is nothing to do, which matters for a
// job that fires every few minutes. Reads MONGODB_URI from .env.local, same as
// cr-bugs.mjs. Full protocol: docs/testing/README.md.
import { config } from "dotenv";
import mongoose from "mongoose";

config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });

const [, , cmd, arg1, arg2] = process.argv;

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const reports = db.collection("agenttestreports");
  const state = db.collection("testingstates");

  if (cmd === "check") {
    const fresh = await reports.find({ status: "new" }).sort({ createdAt: 1 }).toArray();
    if (!fresh.length) {
      console.log("no new reports");
      process.exitCode = 3;
      return;
    }
    console.log(
      JSON.stringify(
        fresh.map((r) => ({ id: String(r._id), title: r.title, submittedAt: r.createdAt })),
        null,
        1
      )
    );
    return;
  }

  if (cmd === "show" && arg1) {
    const r = await reports.findOne({ _id: new mongoose.Types.ObjectId(arg1) });
    if (!r) throw new Error("report not found");
    console.log(`# ${r.title}\n(status: ${r.status}, submitted ${r.createdAt})\n`);
    console.log(r.markdown);
    return;
  }

  if (cmd === "claim" && arg1) {
    const r = await reports.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(arg1), status: "new" },
      { $set: { status: "in_progress", updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    if (!r) throw new Error("report not found or not in 'new' state");
    console.log("claimed:", String(r._id));
    return;
  }

  if (cmd === "complete" && arg1) {
    const r = await reports.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(arg1) },
      {
        $set: {
          status: "complete",
          completedAt: new Date(),
          resolutionNotes: (arg2 || "").slice(0, 20000) || null,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );
    if (!r) throw new Error("report not found");
    // Completing a report re-arms the loop: this is the routine's half of the
    // handshake, so the two writes belong in one command.
    await state.updateOne(
      { key: "testing" },
      { $set: { testingOn: true, updatedBy: "routine", updatedAt: new Date() } },
      { upsert: true }
    );
    console.log("completed:", String(r._id), "| testingOn -> true");
    return;
  }

  if (cmd === "toggle" && (arg1 === "on" || arg1 === "off")) {
    await state.updateOne(
      { key: "testing" },
      { $set: { testingOn: arg1 === "on", updatedBy: "admin", updatedAt: new Date() } },
      { upsert: true }
    );
    console.log("testingOn ->", arg1 === "on");
    return;
  }

  console.error('usage: check | show <id> | claim <id> | complete <id> "notes" | toggle on|off');
  process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error("ERROR:", e.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
