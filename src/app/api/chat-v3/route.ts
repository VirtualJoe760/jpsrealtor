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
import { fetchNearbyPOIs, describePOIBundle, resolveSnapshotMeta } from "@/lib/chat-search/nearby-pois";
import type { PageLink } from "@/lib/chat-search/nearby-pois";
import type { SnapshotMeta } from "@/lib/chat-search/types";
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
    // Pulls cached Google Places POIs near the location from the
    // points_of_interest collection and injects them as AUTHORITATIVE
    // context. Without this the AI hallucinates community highlights
    // from general knowledge ("Cathedral City Waterpark" etc) — now
    // it grounds its highlights in real, rated POIs.
    if (locationSnapshot) {
      console.log("[Chat V3] locationSnapshot mode →", locationSnapshot.name);
      let poiContext = "";
      let snapshotMeta: SnapshotMeta | null = null;
      const tResolve = Date.now();
      try {
        const [bundle, meta] = await Promise.all([
          fetchNearbyPOIs(locationSnapshot.name, locationSnapshot.type),
          resolveSnapshotMeta(locationSnapshot.name, locationSnapshot.type),
        ]);
        poiContext = describePOIBundle(bundle);
        snapshotMeta = meta;
        console.log(
          `[Chat V3] snapshot resolve ${Date.now() - tResolve}ms · POIs=${bundle.total}/${Object.keys(bundle.byCategory).length}cat${bundle.center ? "" : " (no center)"} · pageLink=${meta.pageLink?.url ?? "(none)"} · heroPhoto=${meta.heroPhoto ? "yes" : "no"} · activeListings=${meta.stats?.activeListings ?? "?"}`
        );
      } catch (err) {
        console.warn("[Chat V3] POI fetch / snapshot resolve failed:", err);
      }
      const agentRes = await runAgentLoop(
        messages,
        userId,
        buildSnapshotPrompt(locationSnapshot, poiContext, snapshotMeta?.pageLink ?? null)
      );
      // The SnapshotCard now carries the page link as a styled CTA button,
      // so we no longer append a markdown link to the text — wrap the
      // agent stream just to emit the `snapshotMeta` event upfront.
      if (snapshotMeta && agentRes.body) {
        return new NextResponse(
          wrapAgentStreamWithSnapshotMeta(agentRes.body, snapshotMeta),
          { headers: getSSEHeaders() }
        );
      }
      return agentRes;
    }

    // ----- Search-first attempt -----
    // Parse the latest user message regardless of conversation length —
    // intent + confidence already encode whether the message is
    // self-contained ("cma for indian wells country club" → high confidence
    // + subdivision entity, route via search-first). True follow-ups like
    // "show me the 4-bed ones" come back conversational/low-confidence
    // and naturally route to the agent loop below.
    const parsed = await parse(lastMessage.content);
    console.log(
      `[Chat V3] parsed: intent=${parsed.intent} confidence=${parsed.confidence.toFixed(2)} entities=${parsed.entities?.length ?? 0}`
    );

    // Low confidence or conversational → fall through to agent loop
    // (which gets the full message history for follow-up context)
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

function buildSnapshotPrompt(
  snapshot: NonNullable<ChatRequest["locationSnapshot"]>,
  poiContext: string = "",
  pageLink: PageLink | null = null
): string {
  // poiContext (when present) is the AUTHORITATIVE block from
  // describePOIBundle — categorized real Google Places hits within
  // ~3 miles of the location's center. Tells the AI to source its
  // Community Highlights from this list, not general knowledge.
  const poiSection = poiContext
    ? `\n\n${poiContext}\n`
    : `\n\n(No nearby POI data available for this location — keep Community Highlights brief and avoid naming specific businesses or attractions you can't verify.)\n`;

  // When pageLink is resolved, the SnapshotCard above the text already
  // carries it as a styled CTA button — the LLM should NOT add a
  // duplicate "view the page" sentence in the prose.
  const closingRule = pageLink
    ? `Do NOT add a closing CTA or "view the page" sentence — a page link button is already shown above your response.`
    : `End with a helpful suggestion about viewing listings or market data`;

  return `${SYSTEM_PROMPT}

## LOCATION SNAPSHOT MODE (FROM MAP SEARCH) - OVERRIDE NORMAL BEHAVIOR!

The user just searched for "${snapshot.name}" in the map search bar. They want a BRIEF markdown overview of this ${snapshot.type}.
${poiSection}
**CRITICAL RULES FOR LOCATION SNAPSHOT:**
1. DO NOT use any tools (no searchHomes, no getAppreciation, no searchArticles)
2. Respond with 2-3 short paragraphs in pure markdown
3. Include general market info, notable features, and community highlights
4. Community Highlights MUST quote 2-3 specific POIs by name from the AUTHORITATIVE list above (when present). Do NOT invent businesses, parks, golf courses, or attractions that aren't on the list. If the list is empty, omit specific names and speak generally.
5. Keep it conversational and under 150 words
6. ${closingRule}

Now respond to the user's query about "${snapshot.name}" following these rules.`;
}

// =============================================================================
// Stream wrapper — emits a `snapshotMeta` event upfront so the
// SnapshotCard renders immediately, then forwards the agent loop's
// stream verbatim. Used by locationSnapshot mode only.
// =============================================================================

function wrapAgentStreamWithSnapshotMeta(
  source: ReadableStream<Uint8Array>,
  snapshotMeta: SnapshotMeta
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream({
    async start(controller) {
      const reader = source.getReader();
      const send = (obj: any) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      // Emit the card meta first — client mounts the card immediately
      // and the LLM narration streams into the text region below it.
      send({ snapshotMeta });

      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let sepIdx: number;
          while ((sepIdx = buffer.indexOf("\n\n")) !== -1) {
            const raw = buffer.slice(0, sepIdx);
            buffer = buffer.slice(sepIdx + 2);
            if (!raw.startsWith("data: ")) continue;
            controller.enqueue(encoder.encode(`${raw}\n\n`));
          }
        }
      } catch (err: any) {
        console.error("[Chat V3] snapshot stream wrap error:", err);
        send({ error: err?.message || "stream wrap failed", done: true });
      } finally {
        reader.releaseLock();
        controller.close();
      }
    },
  });
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
