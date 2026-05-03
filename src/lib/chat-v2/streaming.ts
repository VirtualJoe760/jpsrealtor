// src/lib/chat-v2/streaming.ts
// Bounded agent loop with SSE streaming + tool execution support.
//
// Phase 3 rewrite. Replaces the fixed two-turn (turn1: tools, turn2: text-only)
// pipeline with a real loop:
//
//   while (iterations < MAX_ITERATIONS) {
//     stream = groq.create({ tools, parallel_tool_calls: true, ...})
//     consume stream → accumulate text + tool_calls
//     if no tool_calls → done
//     if same batch as last iteration → break (model is stuck)
//     execute each tool_call, emit components, append result to messages
//   }
//
// Tools are passed on EVERY iteration so the model can chain calls. There is
// no canned-text bypass for any tool result — when a tool returns
// listingOptions or a clarification, the model sees the result on the next
// iteration and writes its own response. The component is rendered by the
// frontend regardless.

import type { ChatCompletionChunk } from "groq-sdk/resources/chat/completions";
import type Groq from "groq-sdk";
import { executeTool } from "./tool-executors";
import { ALL_TOOLS } from "./tools";
import { ThinkStripper } from "./reasoning-routing";

const MAX_ITERATIONS = 6;

interface StreamOptions {
  groq: Groq;
  messages: Array<{ role: string; content: string }>;
  userId?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  /**
   * Strip <think>...</think> chain-of-thought blocks from streamed content
   * before SSE-emitting tokens. Required when routing to a reasoning model
   * (DeepSeek R1 distill, Qwen QwQ); harmless but pointless on the primary
   * model. Set by route.ts based on resolveRouting().
   */
  stripThinkBlocks?: boolean;
}

interface AccumulatedToolCall {
  id: string;
  name: string;
  arguments: string;
  index: number;
}

/** Map a tool result's data.component → the {components: {...}} SSE payload. */
function projectComponent(data: any): Record<string, any> {
  const out: Record<string, any> = {};
  switch (data?.component) {
    case "neighborhood":
      out.neighborhood = data.neighborhood;
      break;
    case "appreciation":
      out.appreciation = { location: data.location, period: data.period };
      break;
    case "articles":
      out.articles = { query: data.query };
      break;
    case "listingOptions":
      out.listingOptions = data.listingOptions;
      break;
    case "listingDetail":
      out.listingDetail = data.listingDetail;
      break;
    case "cmaReport":
      out.cmaReport = data.cmaReport;
      break;
    case "clarification":
      out.clarification = data.clarification;
      break;
    case "listingResults":
      out.listingResults = data.listingResults;
      break;
    case "areaStats":
      out.areaStats = data.areaStats;
      break;
  }
  return out;
}

/**
 * Run the bounded agent loop and stream the result as SSE.
 *
 * Termination conditions, in order of precedence:
 *   1. Model emits an iteration with no tool_calls → natural finish.
 *   2. Same batch of (toolName, args) tuples as the previous iteration →
 *      model is stuck, break with a hint.
 *   3. iteration === MAX_ITERATIONS → break with a hint.
 *   4. Stream throws → emit error event, close.
 */
export async function streamWithToolSupport(
  options: StreamOptions
): Promise<ReadableStream> {
  const encoder = new TextEncoder();
  const { groq, userId, model, temperature, maxTokens, stripThinkBlocks } = options;

  return new ReadableStream({
    async start(controller) {
      let isClosed = false;
      const send = (payload: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      // Conversation state grows with each iteration's assistant + tool messages.
      const conversation: any[] = [...options.messages];
      let lastBatchSig: string | null = null;
      let iterationsHit = false;

      // Per-request timing for latency diagnosis. Logged at the end so we
      // can see which iteration was slow and whether the cost was Groq or
      // tool execution.
      const reqStart = Date.now();
      const timing: Array<{
        iteration: number;
        groqMs: number;
        firstTokenMs: number | null;
        toolCount: number;
        toolMs: Array<{ name: string; ms: number }>;
        promptTokensApprox: number;
      }> = [];

      try {
        for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
          // Approximate prompt size — chars / 4 is a rough token-count proxy.
          const promptTokensApprox = Math.round(
            conversation.reduce((n, m) => n + JSON.stringify(m).length, 0) / 4
          );
          console.log(
            `[Streaming] Iteration ${iteration}/${MAX_ITERATIONS} — prompt ~${promptTokensApprox} tokens`
          );

          const iterStart = Date.now();

          // Tools are present on EVERY iteration so the model can chain.
          // parallel_tool_calls lets the model fan out independent calls
          // (e.g., compare two areas → two getAreaStats calls in one turn).
          const stream = (await groq.chat.completions.create({
            model,
            messages: conversation,
            tools: ALL_TOOLS,
            tool_choice: "auto",
            parallel_tool_calls: true,
            stream: true,
            temperature,
            max_tokens: maxTokens,
          })) as AsyncIterable<ChatCompletionChunk>;

          // Consume this iteration's stream — accumulate text and tool-call deltas.
          // Per-iteration stripper because each iteration's stream emits a
          // complete (open + close) think block or none at all; carrying state
          // across iterations would leak inside=true into a fresh stream.
          let assistantText = "";
          const toolCalls: AccumulatedToolCall[] = [];
          const stripper = stripThinkBlocks ? new ThinkStripper() : null;
          let firstTokenAt: number | null = null;

          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta as any;
            if (!delta) continue;

            if (delta.content) {
              if (firstTokenAt === null) firstTokenAt = Date.now();
              // assistantText is what gets appended to the conversation as
              // the assistant message — keep the full raw content (including
              // think blocks if present) so the model has its own context on
              // future iterations. Only the SSE-emitted portion is stripped.
              assistantText += delta.content;
              const safeOut = stripper ? stripper.process(delta.content) : delta.content;
              if (safeOut) send({ token: safeOut });
            }

            if (delta.tool_calls) {
              if (firstTokenAt === null) firstTokenAt = Date.now();
              for (const tc of delta.tool_calls) {
                const i = tc.index;
                if (!toolCalls[i]) {
                  toolCalls[i] = { id: tc.id || "", name: "", arguments: "", index: i };
                }
                if (tc.id) toolCalls[i].id = tc.id;
                if (tc.function?.name) toolCalls[i].name = tc.function.name;
                if (tc.function?.arguments) toolCalls[i].arguments += tc.function.arguments;
              }
            }
          }

          const groqMs = Date.now() - iterStart;
          const firstTokenMs = firstTokenAt ? firstTokenAt - iterStart : null;
          const toolMs: Array<{ name: string; ms: number }> = [];

          // Flush any safe content the stripper was holding back for partial-tag
          // detection. Must happen after the iteration's stream ends but BEFORE
          // we test for tool calls / break, so trailing prose isn't lost.
          if (stripper) {
            const tail = stripper.flush();
            if (tail) send({ token: tail });
          }

          // No tool calls → model produced its final answer. We're done.
          if (toolCalls.length === 0) {
            timing.push({ iteration, groqMs, firstTokenMs, toolCount: 0, toolMs: [], promptTokensApprox });
            console.log(
              `[Streaming] ✅ Loop complete at iter ${iteration} — groq ${groqMs}ms (first-token ${firstTokenMs}ms), no tools`
            );
            break;
          }

          // Stuck-loop detector: identical (toolName, args) set as last iteration.
          // Sort+join so the comparison is order-independent (parallel calls in
          // a different order should still count as the same batch).
          const batchSig = toolCalls
            .map((tc) => `${tc.name}::${tc.arguments}`)
            .sort()
            .join("|");
          if (lastBatchSig === batchSig) {
            console.warn(
              `[Streaming] ⚠️ Same tool batch repeated at iteration ${iteration} — breaking`
            );
            send({
              token:
                "\n\n_(I'm asking for the same data twice — let me know if you want me to try a different angle.)_",
            });
            break;
          }
          lastBatchSig = batchSig;

          // Append the assistant turn (must include tool_calls plus any text).
          conversation.push({
            role: "assistant",
            content: assistantText || null,
            tool_calls: toolCalls.map((tc) => ({
              id: tc.id,
              type: "function",
              function: { name: tc.name, arguments: tc.arguments },
            })),
          });

          // Execute each tool. Failures are appended as tool results too — the
          // model sees the error on the next iteration and can recover (e.g.,
          // retry searchListings with cityName after street-without-city failed).
          for (const tc of toolCalls) {
            if (!tc.name) continue;

            let result: { success: boolean; data?: any; error?: string };
            const toolStart = Date.now();
            try {
              const args = JSON.parse(tc.arguments || "{}");
              console.log(`[Streaming] Executing ${tc.name}`, args);
              result = await executeTool(tc.name, args, userId);
            } catch (err: any) {
              console.error(`[Streaming] Tool ${tc.name} threw:`, err);
              result = {
                success: false,
                error: err?.message || "Tool execution failed",
              };
            }

            // Emit components as they resolve, in order.
            if (result.success && result.data) {
              const components = projectComponent(result.data);
              if (Object.keys(components).length > 0) {
                send({ components });
              }
            }

            conversation.push({
              role: "tool",
              tool_call_id: tc.id,
              content: JSON.stringify(result),
            });

            const ms = Date.now() - toolStart;
            toolMs.push({ name: tc.name, ms });
          }

          timing.push({ iteration, groqMs, firstTokenMs, toolCount: toolCalls.length, toolMs, promptTokensApprox });
          const toolSummary = toolMs.map((t) => `${t.name}=${t.ms}ms`).join(", ") || "none";
          console.log(
            `[Streaming] iter ${iteration} done — groq ${groqMs}ms (first-token ${firstTokenMs ?? "—"}ms), tools [${toolSummary}]`
          );

          if (iteration === MAX_ITERATIONS) {
            console.warn(`[Streaming] ⚠️ Hit max iterations (${MAX_ITERATIONS})`);
            iterationsHit = true;
            send({
              token:
                "\n\n_(I ran out of reasoning steps — happy to keep digging if you want me to take another pass.)_",
            });
            break;
          }
        }

        const totalMs = Date.now() - reqStart;
        const groqTotal = timing.reduce((n, t) => n + t.groqMs, 0);
        const toolTotal = timing.reduce(
          (n, t) => n + t.toolMs.reduce((m, x) => m + x.ms, 0),
          0
        );
        console.log(
          `[Streaming] 🏁 Total ${totalMs}ms (${timing.length} iters, groq ${groqTotal}ms, tools ${toolTotal}ms, overhead ${
            totalMs - groqTotal - toolTotal
          }ms)`
        );

        send({ done: true, ...(iterationsHit ? { iterationsHit: true } : {}) });
        controller.close();
        isClosed = true;
      } catch (err: any) {
        console.error("[Streaming] Stream error:", err);
        if (!isClosed) {
          try {
            send({ error: err?.message || "Stream processing failed" });
            controller.close();
          } catch {
            // controller already closed
          }
        }
      }
    },
  });
}

/** SSE response headers. Unchanged from pre-Phase-3. */
export function getSSEHeaders(): HeadersInit {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  };
}
