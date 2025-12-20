// src/lib/chat-v2/streaming.ts
// SSE streaming with tool execution support

import type { ChatCompletionChunk } from "groq-sdk/resources/chat/completions";
import type { Stream } from "groq-sdk/lib/streaming";
import type Groq from "groq-sdk";
import { executeTool } from "./tool-executors";
import { ALL_TOOLS } from "./tools";

interface StreamOptions {
  groq: Groq;
  messages: Array<{ role: string; content: string }>;
  userId?: string;
}

/**
 * Process Groq streaming response with tool execution support
 * Returns a ReadableStream for SSE
 */
export async function streamWithToolSupport(
  groqStream: Stream<ChatCompletionChunk>,
  options: StreamOptions
): Promise<ReadableStream> {
  const encoder = new TextEncoder();
  const { groq, messages, userId } = options;

  return new ReadableStream({
    async start(controller) {
      let isClosed = false;
      try {
        let fullResponse = "";
        let toolCalls: Array<{
          id: string;
          name: string;
          arguments: string;
        }> = [];

        // Process the stream from Groq
        for await (const chunk of groqStream) {
          const delta = chunk.choices[0]?.delta;

          // Handle text content
          if (delta?.content) {
            fullResponse += delta.content;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ token: delta.content })}\n\n`)
            );
          }

          // Handle tool calls
          if (delta?.tool_calls) {
            for (const toolCall of delta.tool_calls) {
              const index = toolCall.index;

              if (!toolCalls[index]) {
                toolCalls[index] = {
                  id: toolCall.id || "",
                  name: "",
                  arguments: ""
                };
              }

              if (toolCall.function?.name) {
                toolCalls[index].name = toolCall.function.name;
              }

              if (toolCall.function?.arguments) {
                toolCalls[index].arguments += toolCall.function.arguments;
              }
            }
          }
        }

        // Execute any tool calls and make second AI call
        if (toolCalls.length > 0) {
          console.log("[Streaming] Tool calls detected:", toolCalls.map(tc => tc.name));

          // Build tool messages for second AI call
          const toolMessages: any[] = [];

          // Add assistant message with tool calls
          toolMessages.push({
            role: "assistant",
            tool_calls: toolCalls.map(tc => ({
              id: tc.id,
              type: "function",
              function: {
                name: tc.name,
                arguments: tc.arguments
              }
            }))
          });

          // Execute each tool and collect results
          for (const toolCall of toolCalls) {
            if (!toolCall.name) continue;

            try {
              const args = JSON.parse(toolCall.arguments);
              console.log("[Streaming] Executing tool:", toolCall.name, args);

              // Execute the tool
              const result = await executeTool(toolCall.name, args, userId);

              // Convert tool result to components format
              // Frontend expects { components: { neighborhood: {...}, appreciation: {...}, etc } }
              if (result.success && result.data) {
                console.log("[Streaming] Tool result data:", JSON.stringify(result.data, null, 2));
                const components: any = {};

                if (result.data.component === "neighborhood") {
                  // Neighborhood query - AI passes identifier, component fetches data
                  components.neighborhood = result.data.neighborhood;
                  console.log("[Streaming] Created neighborhood component:", components.neighborhood);
                } else if (result.data.component === "appreciation") {
                  components.appreciation = {
                    location: result.data.location,
                    period: result.data.period
                  };
                } else if (result.data.component === "articles") {
                  components.articles = {
                    query: result.data.query
                  };
                }

                // Send components event
                console.log("[Streaming] Sending components event:", JSON.stringify(components));
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ components })}\n\n`
                  )
                );
              }

              // Add tool result message for second AI call
              toolMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify(result)
              });
            } catch (error: any) {
              console.error("[Streaming] Tool execution error:", error);

              // Add error result
              toolMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify({
                  success: false,
                  error: error.message || "Tool execution failed"
                })
              });
            }
          }

          // Make SECOND AI call with tool results to get final response
          console.log("[Streaming] Making second AI call with tool results...");
          const secondResponse = await groq.chat.completions.create({
            model: "openai/gpt-oss-120b",
            messages: [...messages, ...toolMessages],
            stream: true,
            temperature: 0.7,
            max_tokens: 2048
            // Don't include tools - prevents tool calling in second response
          });

          // Stream the second response (final AI text)
          for await (const chunk of secondResponse) {
            const delta = chunk.choices[0]?.delta;

            if (delta?.content) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ token: delta.content })}\n\n`)
              );
            }
          }
        }

        // Send done event
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        controller.close();
        isClosed = true;
      } catch (error: any) {
        console.error("[Streaming] Stream error:", error);
        if (!isClosed) {
          try {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  error: error.message || "Stream processing failed"
                })}\n\n`
              )
            );
            controller.close();
            isClosed = true;
          } catch (closeError) {
            // Controller already closed, ignore
          }
        }
      }
    }
  });
}

/**
 * Create SSE headers for streaming response
 */
export function getSSEHeaders(): HeadersInit {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive"
  };
}
