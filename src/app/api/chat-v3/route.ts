// src/app/api/chat-v3/route.ts
//
// Search-first chat endpoint. The default path is parser → preview →
// narrate (fast, deterministic). Falls back to the chat-v2 agent loop for
// conversational queries, multi-turn follow-ups, and locationSnapshot
// overviews from the map search bar.
//
// SSE event shapes emitted:
//   { content: string }           full markdown payload (commands, snapshots)
//   { token: string }             one narration token (search-first path)
//   { preview: PreviewResult }    Layer 1 component payload (search-first path)
//   { components: ComponentData } legacy chat-v2 component payload (Layer 3 path)
//   { tool_calls: ... }           Layer 3 tool-call metadata
//   { done: true }                stream terminator
//
// Both shapes coexist so the new ChatWidgetV3 can render from `preview` for
// search-first turns and from `components` for Layer-3 turns.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Groq from "groq-sdk";

import { ALL_TOOLS } from "@/lib/chat-v2/tools";
import { SYSTEM_PROMPT } from "@/lib/chat-v2/system-prompt";
import { streamWithToolSupport, getSSEHeaders } from "@/lib/chat-v2/streaming";
import { detectCommand, getCommandResponse } from "@/lib/chat-v2/commands";
import { resolveRouting } from "@/lib/chat-v2/reasoning-routing";
import type { ChatRequest } from "@/lib/chat-v2/types";

import { parse } from "@/lib/chat-search/parse";
import { runPreview } from "@/lib/chat-search/preview";
import { streamNarration } from "@/lib/chat-search/narrate";
import type { ParsedQuery } from "@/lib/chat-search/types";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// =============================================================================
// Route handler
// =============================================================================

export async function POST(req: NextRequest) {
  try {
    // Authenticate — force userId from session to prevent impersonation
    const session = await getServerSession(authOptions);
    const authenticatedUserId = (session?.user as any)?.id;

    const body: ChatRequest = await req.json();
    const { messages, locationSnapshot } = body;
    const userId = authenticatedUserId || body.userId;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "Messages are required" }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1];

    // ----- Fast path: slash commands -----
    if (lastMessage?.role === "user") {
      const command = detectCommand(lastMessage.content);
      if (command) {
        return new NextResponse(
          singleShotStream([
            { content: getCommandResponse(command) },
            { done: true },
          ]),
          { headers: getSSEHeaders() }
        );
      }
    }

    // ----- locationSnapshot mode: brief markdown overview, no tools -----
    // Falls through to the agent loop with the snapshot-specific system
    // prompt that disables tool use and caps response length.
    if (locationSnapshot) {
      console.log("[Chat V3] locationSnapshot mode →", locationSnapshot.name);
      return runAgentLoop(messages, userId, buildSnapshotPrompt(locationSnapshot));
    }

    // ----- Multi-turn → Layer 3 -----
    // First-cut behavior: any conversation longer than the first user turn
    // goes through the agent loop, which already handles follow-ups with
    // full message history. Phase 6 will revisit with entity-carry-forward.
    if (messages.length > 2) {
      console.log("[Chat V3] Multi-turn (n=" + messages.length + ") → Layer 3");
      return runAgentLoop(messages, userId);
    }

    // ----- Search-first attempt -----
    const parsed = await parse(lastMessage.content);
    console.log(
      `[Chat V3] parsed: intent=${parsed.intent} confidence=${parsed.confidence.toFixed(2)} entities=${parsed.entities?.length ?? 0}`
    );

    // Low confidence or conversational → fall through to agent loop
    if (parsed.intent === "conversational" || parsed.confidence < 0.5) {
      console.log("[Chat V3] Low-confidence or conversational → Layer 3");
      return runAgentLoop(messages, userId);
    }

    // High-confidence: run preview + stream narration
    return runSearchFirst(parsed, lastMessage.content, req.nextUrl.origin);
  } catch (error: any) {
    console.error("[Chat V3] Error:", error);
    return NextResponse.json(
      {
        error: error.message || "Chat processing failed",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chat-v3
 * Health check
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    version: "3.0",
    pattern: "search-first (parser → preview → narrate) with agent-loop fallback",
    fallbackToolCount: ALL_TOOLS.length,
  });
}

// =============================================================================
// Search-first stream
// =============================================================================
//
// Order:
//   1. Run preview → emit one `preview` event so components mount immediately
//   2. Stream narration tokens (one event per token)
//   3. Emit `done`
//
// Preview-first ordering matters for perceived latency: components show up
// in the UI before the first token, even though the narrator starts
// streaming as soon as the preview resolves.

async function runSearchFirst(parsed: ParsedQuery, message: string, origin: string) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: any) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      try {
        const t0 = Date.now();
        const preview = await runPreview(parsed, { origin });
        console.log(
          `[Chat V3] preview ${Date.now() - t0}ms · component=${preview.component}`
        );
        send({ preview });

        for await (const token of streamNarration({ message, parsed, preview })) {
          send({ token });
        }

        send({ done: true });
      } catch (err: any) {
        console.error("[Chat V3] search-first error:", err);
        send({ error: err?.message || "search-first failed", done: true });
      }
      controller.close();
    },
  });

  return new NextResponse(stream, { headers: getSSEHeaders() });
}

// =============================================================================
// Agent-loop fallback (Layer 3) — reuses chat-v2 streaming engine verbatim
// =============================================================================

async function runAgentLoop(
  messages: ChatRequest["messages"],
  userId: string | undefined,
  systemPromptOverride?: string
) {
  const lastMessage = messages[messages.length - 1];
  const systemPrompt = systemPromptOverride || SYSTEM_PROMPT;

  const fullMessages = [
    { role: "system" as const, content: systemPrompt },
    ...messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
      ...(msg.tool_calls && { tool_calls: msg.tool_calls }),
      ...(msg.tool_call_id && { tool_call_id: msg.tool_call_id }),
      ...(msg.name && { name: msg.name }),
    })),
  ];

  const routing = resolveRouting(lastMessage?.content || "");
  console.log(
    `[Chat V3] Agent loop · model=${routing.model} (${routing.reason})`
  );

  const stream = await streamWithToolSupport({
    groq,
    messages: fullMessages as any,
    userId,
    model: routing.model,
    temperature: 0.7,
    maxTokens: 2048,
    stripThinkBlocks: routing.stripThinkBlocks,
  });

  return new NextResponse(stream, { headers: getSSEHeaders() });
}

// =============================================================================
// locationSnapshot system prompt — same wording as chat-v2 for parity
// =============================================================================

function buildSnapshotPrompt(snapshot: NonNullable<ChatRequest["locationSnapshot"]>): string {
  return `${SYSTEM_PROMPT}

## LOCATION SNAPSHOT MODE (FROM MAP SEARCH) - OVERRIDE NORMAL BEHAVIOR!

The user just searched for "${snapshot.name}" in the map search bar. They want a BRIEF markdown overview of this ${snapshot.type}.

**CRITICAL RULES FOR LOCATION SNAPSHOT:**
1. DO NOT use any tools (no searchHomes, no getAppreciation, no searchArticles)
2. Respond with 2-3 short paragraphs in pure markdown
3. Include general market info, notable features, and community highlights
4. Keep it conversational and under 150 words
5. End with a helpful suggestion about viewing listings or market data

Now respond to the user's query about "${snapshot.name}" following these rules.`;
}

// =============================================================================
// Tiny SSE helper for one-shot responses (commands)
// =============================================================================

function singleShotStream(events: any[]): ReadableStream {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const ev of events) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
      }
      controller.close();
    },
  });
}
