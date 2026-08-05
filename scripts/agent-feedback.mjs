// scripts/agent-feedback.mjs — CLI for the judge-loop's repo side.
//
//   node scripts/agent-feedback.mjs check              exit 0 + JSON if actionable work exists
//                                                      (new report OR unread console message), exit 3 if none
//   node scripts/agent-feedback.mjs show <id>          print a report's markdown
//   node scripts/agent-feedback.mjs claim <id>         mark in_progress (routine takes it)
//   node scripts/agent-feedback.mjs complete <id> "notes"   mark complete + turn testing ON
//   node scripts/agent-feedback.mjs toggle on|off      flip the toggle by hand
//   node scripts/agent-feedback.mjs messages           print the repairer chat thread (pure read)
//   node scripts/agent-feedback.mjs reply "text"       reply on the repairer channel — the reply is the
//                                                      ack that marks Joe's messages answered
//   node scripts/agent-feedback.mjs tickets            open/triaged ticket fingerprints, population first
//   node scripts/agent-feedback.mjs ticket-resolve <fingerprint> "notes"   close a fingerprint when its fix lands
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
    const unread = await db
      .collection("loopmessages")
      .countDocuments({ channel: "repairer", from: "admin", readAt: null });
    if (!fresh.length && !unread) {
      console.log("no new reports");
      process.exitCode = 3;
      return;
    }
    console.log(
      JSON.stringify(
        {
          reports: fresh.map((r) => ({ id: String(r._id), title: r.title, submittedAt: r.createdAt })),
          unreadMessages: unread,
        },
        null,
        1
      )
    );
    return;
  }

  // Ack-on-reply: `messages` is a pure read; `reply` is what marks Joe's
  // messages read. If the routine reads and then dies before replying, the
  // messages stay unread and the next firing re-surfaces them — the safe
  // failure is double-delivery, never silent loss.
  if (cmd === "messages") {
    const msgs = await db
      .collection("loopmessages")
      .find({ channel: "repairer" })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();
    for (const m of msgs.reverse()) {
      const who = m.from === "admin" ? "JOE" : "ME ";
      const flag = m.from === "admin" && !m.readAt ? " [UNANSWERED]" : "";
      console.log(`[${new Date(m.createdAt).toLocaleString()}] ${who}${flag}: ${m.body}`);
    }
    if (!msgs.length) console.log("(no messages on the repairer channel)");
    return;
  }

  if (cmd === "reply" && arg1) {
    await db.collection("loopmessages").insertOne({
      channel: "repairer",
      from: "agent",
      body: String(arg1).slice(0, 10000),
      readAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const acked = await db
      .collection("loopmessages")
      .updateMany(
        { channel: "repairer", from: "admin", readAt: null },
        { $set: { readAt: new Date() } }
      );
    console.log(`sent — shows on /admin/loop (answered ${acked.modifiedCount} message(s))`);
    return;
  }

  if (cmd === "tickets") {
    const clusters = await db
      .collection("ticketfingerprints")
      .find({ status: { $in: ["open", "triaged", "in_progress"] } })
      .sort({ population: -1, lastSeenAt: -1 })
      .limit(25)
      .toArray();
    if (!clusters.length) {
      console.log("no open ticket fingerprints");
      return;
    }
    console.log(
      JSON.stringify(
        clusters.map((c) => ({
          fingerprint: c.fingerprint,
          association: c.association,
          failingStep: c.failingStep,
          errorClass: c.errorClass,
          status: c.status,
          goal: c.goal,
          population: c.population,
          lastSeenAt: c.lastSeenAt,
        })),
        null,
        1
      )
    );
    return;
  }

  if (cmd === "ticket-resolve" && arg1) {
    const r = await db.collection("ticketfingerprints").findOneAndUpdate(
      { fingerprint: arg1 },
      {
        $set: {
          status: "resolved",
          resolvedAt: new Date(),
          resolutionNotes: (arg2 || "").slice(0, 20000) || null,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    );
    if (!r) throw new Error("fingerprint not found");
    console.log("resolved:", r.fingerprint, `(population ${r.population})`);
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

  console.error(
    'usage: check | show <id> | claim <id> | complete <id> "notes" | toggle on|off | messages | reply "text" | tickets | ticket-resolve <fingerprint> "notes"'
  );
  process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error("ERROR:", e.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
