/**
 * Platform → agent SMS about queued social posts.
 *
 * Two moments matter:
 *   1. Posts were generated and are waiting to be looked at.
 *   2. A post's slot is here and it still isn't approved (the last call before
 *      it rolls to the next slot).
 *
 * Sent from the platform number to the agent's own cell, same as lead alerts.
 * Always best-effort: a failed text must never fail a generation run or, worse,
 * block a publish.
 *
 * See docs/content-templates/auto-posting.md.
 */
import User from "@/models/User";
import { sendSMS, formatPhoneNumber } from "@/lib/twilio";

/** Resolve the agent's alert number the same way lead alerts do. */
async function resolveTarget(agentId: string): Promise<string | null> {
  const agent: any = await User.findById(agentId)
    .select("phone name agentProfile messaging")
    .lean();
  if (!agent) return null;
  // Reuses the lead-alert opt-out — one switch for "text me about my business".
  if (agent.messaging?.leadAlertsSms === false) return null;
  const ap: any = agent.agentProfile || {};
  const raw = ap.cellPhone || ap.officePhone || agent.phone;
  if (!raw) return null;
  return formatPhoneNumber(raw) || null;
}

function reviewUrl(): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.chatrealty.io").replace(/\/+$/, "");
  return `${base}/agent/dashboard`;
}

/**
 * "2 posts ready to review."
 * @param posts each needs its approvalCode and a human label.
 */
export async function notifyPostsReady(opts: {
  agentId: string;
  posts: Array<{ approvalCode: string; label: string }>;
}): Promise<void> {
  try {
    if (!opts.posts?.length) return;
    const to = await resolveTarget(opts.agentId);
    if (!to) return;

    const n = opts.posts.length;
    const lines = opts.posts.map((p) => `${p.approvalCode} — ${p.label}`);

    // With one post a bare POST is unambiguous, so don't make them type a code
    // they don't need. With several, the code is the whole point.
    const instruction =
      n === 1
        ? `Reply POST to approve, or review at ${reviewUrl()}`
        : `Reply POST <code> to approve, or review at ${reviewUrl()}`;

    await sendSMS({
      to,
      body: [
        `📸 ${n} post${n === 1 ? "" : "s"} ready to review`,
        ...lines,
        instruction,
      ].join("\n"),
    });
  } catch (err) {
    console.error("[notifyPostsReady] failed:", err);
  }
}

/**
 * Last call before a slot rolls. Sent at the slot itself; the agent has the
 * grace window to reply before it moves to the next date.
 */
export async function notifyPostSlotDue(opts: {
  agentId: string;
  approvalCode: string;
  label: string;
  graceMinutes: number;
}): Promise<void> {
  try {
    const to = await resolveTarget(opts.agentId);
    if (!to) return;
    await sendSMS({
      to,
      body: [
        `⏰ Ready to post: ${opts.label}`,
        `Not approved yet. Reply POST ${opts.approvalCode} within ${Math.round(opts.graceMinutes / 60)}h or it moves to the next slot.`,
      ].join("\n"),
    });
  } catch (err) {
    console.error("[notifyPostSlotDue] failed:", err);
  }
}

/** Confirmation once it's actually live. */
export async function notifyPostPublished(opts: {
  agentId: string;
  label: string;
  permalink?: string | null;
}): Promise<void> {
  try {
    const to = await resolveTarget(opts.agentId);
    if (!to) return;
    await sendSMS({
      to,
      body: [`✅ Posted: ${opts.label}`, opts.permalink || undefined]
        .filter(Boolean)
        .join("\n"),
    });
  } catch (err) {
    console.error("[notifyPostPublished] failed:", err);
  }
}
