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

const MAX_ITERATIONS = 6;

interface StreamOptions {
  groq: Groq;
  messages: Array<{ role: string; content: string }>;
  userId?: string;
  model: string;
  temperature: number;
  maxTokens: number;
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
  const { groq, userId, model, temperature, maxTokens } = options;

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

      try {
        for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
          console.log(`[Streaming] Iteration ${iteration}/${MAX_ITERATIONS}`);

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
          let assistantText = "";
          const toolCalls: AccumulatedToolCall[] = [];

          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta as any;
            if (!delta) continue;

            if (delta.content) {
              assistantText += delta.content;
              send({ token: delta.content });
            }

            if (delta.tool_calls) {
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

          // No tool calls → model produced its final answer. We're done.
          if (toolCalls.length === 0) {
            console.log(`[Streaming] ✅ Loop complete at iteration ${iteration} (no tool calls)`);
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
          }

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
