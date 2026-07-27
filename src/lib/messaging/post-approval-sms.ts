/**
 * SMS approval for queued social posts.
 *
 * The agent gets a text when carousels are ready and replies `POST A4` to
 * approve one. This is the agent talking to the PLATFORM about their own
 * content — it is not a client conversation, and must never be threaded as one.
 *
 * WHY THIS RUNS BEFORE THE CONTACT LOOKUP in the webhook: that lookup is
 * find-or-CREATE. Left to run, an agent texting their own platform number gets
 * a Contact called "Unknown Contact" created for their personal cell, in their
 * own CRM, on every approval.
 *
 * `YES` is deliberately NOT an approval keyword. It is a carrier-mandated A2P
 * opt-in keyword handled further down the webhook, and repurposing it would
 * break compliance.
 *
 * See docs/content-templates/auto-posting.md.
 */
import mongoose from "mongoose";
import PendingPost from "@/models/PendingPost";
import { formatPhoneNumber } from "@/lib/twilio";

/** `POST`, `POST A4`, `post a4` — code optional. */
const APPROVE_RE = /^post(?:\s+([A-Za-z][0-9]))?$/i;

export type PostApprovalResult = { handled: false } | { handled: true; reply: string };

/** Is this inbound from the agent's own phone rather than a client's? */
export function isAgentsOwnNumber(agent: any, from: string): boolean {
  const ap: any = agent?.agentProfile || {};
  const candidates = [ap.cellPhone, ap.officePhone, agent?.phone]
    .filter(Boolean)
    .map((p: string) => formatPhoneNumber(p))
    .filter(Boolean);
  const normalized = formatPhoneNumber(from);
  return !!normalized && candidates.includes(normalized);
}

/**
 * Handle an inbound approval. Returns `{handled:false}` when the message isn't
 * one, so the webhook falls through to its normal contact handling untouched.
 */
export async function handlePostApproval(opts: {
  agent: any;
  from: string;
  body: string;
}): Promise<PostApprovalResult> {
  const { agent, from, body } = opts;

  const m = (body || "").trim().match(APPROVE_RE);
  if (!m) return { handled: false };

  // Only the agent themselves can approve their posts by SMS. A client texting
  // "post" gets normal handling, not access to the approval queue.
  if (!isAgentsOwnNumber(agent, from)) return { handled: false };

  const code = (m[1] || "").toUpperCase();
  const agentId = new mongoose.Types.ObjectId(String(agent._id));

  // Only posts still awaiting a decision are approvable — a stale code from
  // something already posted must not match.
  const pending = await PendingPost.find({
    agentId,
    status: "awaiting_review",
  })
    .sort({ createdAt: 1 })
    .lean();

  if (pending.length === 0) {
    return { handled: true, reply: "Nothing is waiting for approval right now." };
  }

  let target: any;
  if (code) {
    target = pending.find((p: any) => p.approvalCode === code);
    if (!target) {
      const codes = pending.map((p: any) => p.approvalCode).join(", ");
      return {
        handled: true,
        reply: `No post with code ${code}. Waiting: ${codes}. Reply POST <code>.`,
      };
    }
  } else if (pending.length === 1) {
    // A bare POST is unambiguous when exactly one is queued.
    target = pending[0];
  } else {
    const lines = pending
      .map((p: any) => `${p.approvalCode} — ${p.listingSnapshot?.address || p.listingKey}`)
      .join("\n");
    return {
      handled: true,
      reply: `${pending.length} posts waiting. Reply POST <code>:\n${lines}`,
    };
  }

  await PendingPost.updateOne(
    { _id: target._id, agentId, status: "awaiting_review" },
    {
      $set: {
        status: "approved",
        approvedAt: new Date(),
        approvedVia: "sms",
        declinedAt: null,
        declineReason: null,
      },
    }
  );

  const where = target.listingSnapshot?.address || target.listingKey;
  return {
    handled: true,
    reply: `Approved — ${where}. It'll post at its next slot.`,
  };
}
