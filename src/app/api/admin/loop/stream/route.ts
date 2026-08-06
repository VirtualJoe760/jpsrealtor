// GET /api/admin/loop/stream — Server-Sent Events for the Loop Console.
//
// One open HTTP response fed by MongoDB change streams on the four loop
// collections. Design (documented in docs/testing/loop-console.md):
//
//   chat  — a new loopmessages INSERT, pushed with the full message so the
//           console can append instantly without a round-trip.
//   bump  — anything else changed (report insert/status, ticket, toggle,
//           message ack). Carries only {kind}; the client responds by
//           re-fetching GET /api/admin/loop, which is already the single
//           source of truth for page state. Deliberately NOT a typed replica
//           of every mutation: duplicating the GET's shaping logic per event
//           is how a stream and a page drift apart.
//
// Reconnect story: serverless cuts this connection at maxDuration. That is
// fine — EventSource reconnects on its own, and the client treats every
// `open` as "I may have missed things" and re-fetches the GET. No
// Last-Event-ID bookkeeping needed when a full snapshot is one cheap call.
//
// A `: ping` comment goes out every 25s so proxies don't reap the idle
// connection. Change streams require a replica set (Atlas: yes).

import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import mongoose from "mongoose";
import User from "@/models/User";

export const runtime = "nodejs"; // change streams need the Node driver
export const dynamic = "force-dynamic";
export const maxDuration = 300; // clamped to plan ceiling; client reconnects

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  await dbConnect();
  const user: any = await User.findById(session.user.id).select("isAdmin").lean();
  return user?.isAdmin ? session : null;
}

export async function GET(_req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json(
      { error: "forbidden" },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }

  const encoder = new TextEncoder();
  const db = mongoose.connection.db!;

  // Held here so cancel() can close them — an unclosed change stream is a
  // leaked cursor on the cluster, and this route dies + restarts every
  // maxDuration window.
  const watchers: Array<{ close(): Promise<void> }> = [];
  let ping: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // Controller already closed (client gone mid-write) — cleanup runs
          // via cancel(); nothing to do here.
        }
      };

      const watch = (
        collection: string,
        onChange: (c: Record<string, any>) => void
      ) => {
        const cs = db
          .collection(collection)
          .watch([], { fullDocument: "updateLookup" });
        cs.on("change", onChange);
        cs.on("error", () => send("bump", { kind: "stream-degraded" }));
        watchers.push(cs as unknown as { close(): Promise<void> });
      };

      // Chat inserts push the whole message — instant append, no round-trip.
      watch("loopmessages", (c) => {
        if (c.operationType === "insert" && c.fullDocument) {
          const m = c.fullDocument;
          send("chat", {
            id: String(m._id),
            channel: m.channel,
            from: m.from,
            body: m.body,
            at: m.createdAt,
            readAt: m.readAt ?? null,
          });
        } else {
          send("bump", { kind: "chat-ack" }); // readAt updates etc.
        }
      });

      // Everything else: nudge the client to re-fetch the composite GET.
      watch("agenttestreports", (c) => send("bump", { kind: `report-${c.operationType}` }));
      watch("ticketfingerprints", (c) => send("bump", { kind: `ticket-${c.operationType}` }));
      watch("testingstates", () => send("bump", { kind: "toggle" }));

      // Comment lines are the SSE-native keepalive — EventSource ignores
      // them, proxies see traffic.
      ping = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          /* closed */
        }
      }, 25_000);

      send("hello", { at: new Date().toISOString() });
    },
    async cancel() {
      if (ping) clearInterval(ping);
      await Promise.allSettled(watchers.map((w) => w.close()));
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      // Nginx-style proxies buffer streaming responses without this.
      "X-Accel-Buffering": "no",
    },
  });
}
