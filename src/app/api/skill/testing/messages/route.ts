// src/app/api/skill/testing/messages/route.ts
//
// The agent side of the loop console's chat. Neither agent holds a socket
// open — Tom polls every 15 minutes, the repairer every 5 — so this is a
// mailbox, not a stream, and fetching IS the delivery event.
//
//   GET  ?channel=tom|repairer          → the channel's recent thread. Reading
//                                          marks NOTHING — the reply is the ack.
//   POST { channel, body }              → the agent's reply, shown on the
//                                          /admin/loop console. This is what
//                                          marks the admin's messages read.
//
// Ack-on-reply, not ack-on-fetch: marking read inside GET stamps readAt
// before the response crosses the wire, so a dropped response left messages
// "read" that no agent ever saw — and since unreadMessages>0 is the ONLY
// automated trigger to fetch this thread, nothing would ever fetch them
// again. With the reply as the ack, a dropped GET leaves unread>0 and the
// next poll re-triggers; the failure mode is double-delivery, which is the
// safe one for a mailbox. Both agents' standing duty is to reply on the same
// firing they read, so the ack costs no extra request.
//
// The channel is claimed by the caller rather than derived from the token —
// both agents are ours and authenticate with ordinary skill tokens, and
// there is nothing on a token that says which agent holds it. What there IS:
// both loop agents' tokens are minted on the platform owner's admin account,
// and customer tokens never are. So this route requires an admin-account
// token — otherwise any customer token could read Joe's messages to the
// judge, and (worse) mark them read, silently breaking delivery.

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { authenticateSkillRequest, skillRateLimit } from "@/lib/skill-auth";
import { LoopMessage, type LoopChannel } from "@/models/LoopTicket";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

const CHANNELS: LoopChannel[] = ["tom", "repairer"];

export async function GET(req: NextRequest) {
  const auth = await authenticateSkillRequest(req);
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.reason }, { status: auth.status, headers: NO_STORE });
  }
  const rl = skillRateLimit(auth, "read");
  if (rl) return rl;

  if (auth.user?.isAdmin !== true) {
    return NextResponse.json(
      { error: "forbidden", message: "The loop console chat is an operator surface." },
      { status: 403, headers: NO_STORE }
    );
  }

  const channel = new URL(req.url).searchParams.get("channel") as LoopChannel | null;
  if (!channel || !CHANNELS.includes(channel)) {
    return NextResponse.json(
      { error: "validation_failed", message: "channel must be 'tom' or 'repairer'" },
      { status: 400, headers: NO_STORE }
    );
  }

  await dbConnect();

  // Pure read — see the header. readAt is set by the agent's POST reply.
  const messages = await LoopMessage.find({ channel }).sort({ createdAt: -1 }).limit(20).lean();
  const unreadCount = messages.filter((m: any) => m.from === "admin" && !m.readAt).length;

  return NextResponse.json(
    {
      channel,
      unread: unreadCount,
      messages: messages
        .reverse() // oldest first, reads as a conversation
        .map((m: any) => ({
          id: String(m._id),
          from: m.from,
          body: m.body,
          at: m.createdAt,
          unread: m.from === "admin" && !m.readAt,
        })),
    },
    { headers: NO_STORE }
  );
}

export async function POST(req: NextRequest) {
  const auth = await authenticateSkillRequest(req);
  if (auth.ok === false) {
    return NextResponse.json({ error: auth.reason }, { status: auth.status, headers: NO_STORE });
  }
  const rl = skillRateLimit(auth, "write");
  if (rl) return rl;

  if (auth.user?.isAdmin !== true) {
    return NextResponse.json(
      { error: "forbidden", message: "The loop console chat is an operator surface." },
      { status: 403, headers: NO_STORE }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: NO_STORE });
  }

  const channel = body.channel as LoopChannel;
  const text = typeof body.body === "string" ? body.body.trim().slice(0, 10_000) : "";
  if (!CHANNELS.includes(channel) || !text) {
    return NextResponse.json(
      { error: "validation_failed", message: "channel ('tom'|'repairer') and body are required" },
      { status: 400, headers: NO_STORE }
    );
  }

  await dbConnect();
  const msg = await LoopMessage.create({ channel, from: "agent", body: text, readAt: null });

  // The reply IS the ack: everything the admin sent on this channel before
  // now is confirmed received-and-answered by this write.
  const acked = await LoopMessage.updateMany(
    { channel, from: "admin", readAt: null, createdAt: { $lte: new Date() } },
    { $set: { readAt: new Date() } }
  );

  return NextResponse.json(
    { ok: true, id: String(msg._id), at: msg.createdAt, acked: acked.modifiedCount },
    { status: 201, headers: NO_STORE }
  );
}
