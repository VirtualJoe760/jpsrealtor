/**
 * =============================================================================
 * CHAT STREAM API ROUTE
 * =============================================================================
 *
 * This is the main AI chat endpoint that powers the conversational interface.
 * It uses Groq's GPT-OSS 120B model with Server-Sent Events (SSE) for real-time streaming.
 *
 * FLOW OVERVIEW:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ 1. Request Validation                                           │
 * │    ↓ Validate messages, userId, API key                        │
 * │ 2. Help Command Check (Optional Fast Path)                      │
 * │    ↓ If help request → stream canned response                  │
 * │ 3. Intent Classification                                        │
 * │    ↓ Analyze user query to determine if tool is needed         │
 * │ 4. Dynamic Tool Loading                                         │
 * │    ↓ Load ONLY the single most relevant tool (0 or 1)          │
 * │ 5. Tool Execution (Non-Streaming)                              │
 * │    ↓ Execute tool call if AI decides it needs data             │
 * │ 6. Final Response Streaming (SSE)                              │
 * │    ↓ Stream AI response word-by-word to frontend               │
 * │ 7. Component Parsing                                            │
 * │    ↓ Extract UI components from response                       │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * KEY DESIGN DECISIONS:
 * - Single tool per request: Prevents model confusion and improves reliability
 * - User-first approach: AI should ask user for clarification rather than chain tools
 * - Streaming for UX: Real-time word-by-word display feels more responsive
 * - Component-first architecture: Tools return params, frontend fetches data
 */

import { NextRequest, NextResponse } from "next/server";
import { logChatMessage } from "@/lib/chat-logger";
import { createChatCompletion, GROQ_MODELS } from "@/lib/groq";
import type { GroqChatMessage } from "@/lib/groq";
import { selectToolForQuery } from "@/lib/chat/intent-classifier";
import { getToolByName } from "@/lib/chat/tools-user-first";
import type { GroqTool } from "@/lib/groq";
import { buildSystemPrompt } from "@/lib/chat/prompts";
import { executeToolCall } from "@/lib/chat/tool-executor";
import { parseComponentData } from "@/lib/chat/response-parser";
import { isHelpCommand, getHelpContent } from "@/lib/chat/prompts/help-commands";
import groq from "@/lib/groq";

/**
 * POST /api/chat/stream
 *
 * Main chat endpoint that handles AI conversations with streaming responses.
 *
 * REQUEST BODY:
 * {
 *   messages: Array<{role: string, content: string}>,  // Conversation history
 *   userId: string,                                     // User identifier for logging
 *   textOnly?: boolean,                                 // Skip tool calls, markdown only
 *   locationSnapshot?: {name: string, type: string}     // Location overview mode
 * }
 *
 * RESPONSE:
 * Server-Sent Events (SSE) stream with the following event types:
 * - { token: string }         // Individual word/chunk of response
 * - { components: object }    // UI components to render
 * - { done: true, metadata }  // End of stream marker
 * - { error: string }         // Error message
 */
export async function POST(req: NextRequest) {
  try {
    // =========================================================================
    // STEP 1: REQUEST VALIDATION & SETUP
    // =========================================================================

    const body = await req.json();
    const { messages, userId, textOnly = false, locationSnapshot } = body;

    // Validate required fields
    if (!messages || !Array.isArray(messages) || !userId) {
      return NextResponse.json(
        { error: "Missing required fields: messages (array) and userId" },
        { status: 400 }
      );
    }

    // Verify Groq API key is configured
    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === "your_groq_api_key_here") {
      console.error("⚠️  GROQ_API_KEY is not configured!");
      return NextResponse.json(
        {
          error: "AI service not configured. Please add GROQ_API_KEY to your environment variables.",
          details: "Get your API key from https://console.groq.com/"
        },
        { status: 500 }
      );
    }

    const startTime = Date.now();

    // Use GPT-OSS 120B for all requests (best reasoning + function calling)
    const model = GROQ_MODELS.PREMIUM;

    // =========================================================================
    // STEP 2: LOGGING & ANALYTICS
    // =========================================================================

    const userQuery = messages[messages.length - 1]?.content || "No query";

    // Log the request for debugging and analytics
    await logChatMessage("system", `Groq chat request (${model})`, userId, {
      messageCount: messages.length,
      timestamp: new Date().toISOString(),
      userQuery: userQuery,
    });

    // Log the user's actual query
    await logChatMessage("user", userQuery, userId, {
      timestamp: new Date().toISOString(),
    });

    // =========================================================================
    // STEP 3: HELP COMMAND FAST PATH (Optional)
    // =========================================================================
    // Check if user is requesting help (/help, /commands, etc.)
    // If so, return canned response immediately without calling AI

    const helpCommand = isHelpCommand(userQuery);
    if (helpCommand) {
      console.log(`[AI] Help command detected: ${helpCommand}`);
      const helpContent = getHelpContent(helpCommand);

      // Stream the help content word-by-word for consistent UX
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Split by words and stream each word
            const words = helpContent.split(' ');
            for (let i = 0; i < words.length; i++) {
              const word = words[i] + (i < words.length - 1 ? ' ' : '');
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: word })}\n\n`));
            }

            // Log the help response
            await logChatMessage("assistant", helpContent, userId, {
              model: "help-system",
              processingTime: Date.now() - startTime,
              helpCommand,
            });

            // Send completion signal
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  done: true,
                  metadata: {
                    model: "help-system",
                    processingTime: Date.now() - startTime,
                  },
                })}\n\n`
              )
            );

            controller.close();
          } catch (error: any) {
            console.error("[SSE] Help stream error:", error);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`)
            );
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // =========================================================================
    // STEP 4: SYSTEM PROMPT CONSTRUCTION
    // =========================================================================
    // Build the system prompt based on the mode:
    // - textOnly: Markdown-only responses (for map digests)
    // - locationSnapshot: Location overviews (for map search)
    // - Full mode: Normal chat with tools available

    const systemPrompt = buildSystemPrompt({ textOnly, locationSnapshot });

    // Debug logging for mode detection
    if (locationSnapshot) {
      console.log(`[AI] 📍 Location Snapshot Mode: ${locationSnapshot.name} (${locationSnapshot.type})`);
    } else if (textOnly) {
      console.log(`[AI] 📝 Text-Only Mode`);
    } else {
      console.log(`[AI] 🔧 Full Mode (with tools)`);
    }

    // =========================================================================
    // STEP 5: MESSAGE PREPARATION
    // =========================================================================
    // Convert messages to Groq format and inject system prompt

    const groqMessages: GroqChatMessage[] = [];

    // Add system prompt if not already present
    if (messages.length === 0 || messages[0].role !== "system") {
      groqMessages.push({
        role: "system",
        content: systemPrompt
      });
    }

    // Add conversation history
    groqMessages.push(...messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    })));

    // =========================================================================
    // STEP 6: INTENT CLASSIFICATION & DYNAMIC TOOL LOADING
    // =========================================================================
    // Analyze the user's query to determine which tool (if any) to load.
    //
    // WHY SINGLE TOOL?
    // - GPT-OSS 120B performs better with fewer tool choices
    // - Reduces hallucination and tool misuse
    // - Faster response times (less JSON to process)
    // - Forces clearer user intent classification

    const currentQuery = messages[messages.length - 1]?.content || "";
    const { toolName, intent, confidence } = selectToolForQuery(currentQuery);

    // Build tool array (0 or 1 tool)
    const CHAT_TOOLS: GroqTool[] = [];
    if (toolName) {
      const tool = getToolByName(toolName);
      if (tool) {
        CHAT_TOOLS.push(tool);
        console.log(`[AI] 🎯 Loaded tool: ${toolName} (intent: ${intent}, confidence: ${confidence.toFixed(2)})`);
      } else {
        console.warn(`[AI] ⚠️  Tool not found: ${toolName}`);
      }
    } else {
      console.log(`[AI] 💬 No tool needed (intent: ${intent})`);
    }

    // =========================================================================
    // STEP 7: TOOL EXECUTION PHASE (Non-Streaming)
    // =========================================================================
    // If a tool was loaded, give the AI a chance to use it.
    //
    // USER-FIRST APPROACH:
    // - Max 2 rounds: Tool call + Response formulation
    // - Round 1: AI calls tool, gets parameters back
    // - Round 2: AI processes result and formulates natural response
    // - If AI needs more data, it should ASK the user
    // - Prevents infinite tool calling loops
    // - Makes conversations more natural and predictable

    const MAX_TOOL_ROUNDS = 2;
    let toolRound = 0;
    let messagesWithTools: GroqChatMessage[] = [...groqMessages];
    let needsStreaming = true;
    const shouldUseTools = !textOnly && CHAT_TOOLS.length > 0;

    while (toolRound < MAX_TOOL_ROUNDS && shouldUseTools) {
      console.log(`[AI] Starting tool execution round ${toolRound + 1}`);
      console.log(`[AI] Model: ${model}, Tool: ${CHAT_TOOLS[0]?.function.name}`);

      // Call AI with tool support (non-streaming because tools can't be streamed)
      const completion = await createChatCompletion({
        messages: messagesWithTools,
        model,
        temperature: 0.3,
        maxTokens: 1500, // Enough for tool call + reasoning (increased from 500)
        stream: false, // Tool calls cannot be streamed
        tools: CHAT_TOOLS,
        tool_choice: "auto", // Let AI decide if tool is needed
      });

      const assistantMessage: any = 'choices' in completion ? completion.choices[0]?.message : null;

      console.log(`[AI] Round ${toolRound + 1} response:`, {
        hasToolCalls: !!assistantMessage?.tool_calls,
        toolCallCount: assistantMessage?.tool_calls?.length || 0,
        hasContent: !!assistantMessage?.content,
        contentLength: assistantMessage?.content?.length || 0
      });

      // Check if AI wants to use a tool
      if (!assistantMessage?.tool_calls || assistantMessage.tool_calls.length === 0) {
        // No tools needed - this is the final response
        messagesWithTools.push(assistantMessage);
        needsStreaming = false;
        break;
      }

      toolRound++;
      console.log(`[AI] Round ${toolRound}: Using tools:`, assistantMessage.tool_calls.map((tc: any) => tc.function.name).join(', '));

      // Log tool usage for debugging
      await logChatMessage("system", `Tool calls in round ${toolRound}`, userId, {
        tools: assistantMessage.tool_calls.map((tc: any) => ({
          name: tc.function.name,
          argumentsRaw: tc.function.arguments // Store raw - executor will sanitize
        })),
        timestamp: new Date().toISOString(),
      });

      // Execute all tool calls in parallel
      const toolResults = await Promise.all(
        assistantMessage.tool_calls.map((toolCall: any) => executeToolCall(toolCall, userId))
      );

      console.log(`[AI] Round ${toolRound}: Tool results:`, toolResults.map((r: any) => {
        const content = JSON.parse(r.content || '{}');
        return `${r.name}: ${content.error ? 'ERROR' : 'SUCCESS'}`;
      }).join(', '));

      // Log sample of tool result for debugging
      if (toolResults.length > 0) {
        const firstResult = JSON.parse(toolResults[0].content || '{}');
        console.log(`[AI] Sample tool result:`, JSON.stringify(firstResult).substring(0, 500) + '...');
      }

      // Add tool call and results to conversation
      messagesWithTools.push(assistantMessage);
      messagesWithTools.push(...toolResults);

      // Safety: prevent infinite loops
      if (toolRound >= MAX_TOOL_ROUNDS) {
        console.warn(`[AI] Max tool rounds reached - will stream final response`);
        needsStreaming = true;
        break;
      }
    }

    // =========================================================================
    // STEP 8: FINAL RESPONSE STREAMING (SSE)
    // =========================================================================
    // Stream the AI's response to the user in real-time using Server-Sent Events.
    //
    // TWO STREAMING PATHS:
    // 1. Cached response: AI didn't use tools, stream word-by-word from cache
    // 2. Live streaming: Make new API call and stream tokens as they arrive

    const encoder = new TextEncoder();
    let fullResponseText = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // PATH 1: Use cached response (AI didn't use tools)
          if (!needsStreaming && messagesWithTools.length > 0) {
            const lastMessage = messagesWithTools[messagesWithTools.length - 1];
            console.log(`[SSE] Using cached response. Last message role: ${lastMessage.role}, has content: ${!!lastMessage.content}, length: ${lastMessage.content?.length || 0}`);

            const responseText = lastMessage.role === 'assistant' ? lastMessage.content : "";

            if (responseText) {
              fullResponseText = responseText;
              // Stream word-by-word for consistent UX
              const words = responseText.split(' ');
              for (let i = 0; i < words.length; i++) {
                const word = words[i] + (i < words.length - 1 ? ' ' : '');
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: word })}\n\n`));
              }
            } else {
              console.error(`[SSE] No response text found! Last message:`, JSON.stringify(lastMessage).substring(0, 200));
            }
          }
          // PATH 2: Stream live from Groq
          else {
            console.log(`[AI] Starting final streaming response with ${messagesWithTools.length} messages`);

            // IMPORTANT: Don't pass tools parameter AND explicitly set tool_choice to "none"
            // This prevents "Tool choice is none, but model called a tool" error
            const streamResponse = await groq.chat.completions.create({
              messages: messagesWithTools as any,
              model,
              temperature: 0.3,
              max_tokens: 4000,
              stream: true,
              tool_choice: "none", // Explicitly tell Groq not to call tools
              // NO tools parameter - we only want a text response
            });

            // Stream each token as it arrives
            for await (const chunk of streamResponse) {
              const delta = chunk.choices[0]?.delta?.content || "";
              if (delta) {
                fullResponseText += delta;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: delta })}\n\n`));
              }
            }
          }

          console.log(`[AI] Full response text length: ${fullResponseText.length}`);

          // Handle empty response edge case
          if (!fullResponseText || fullResponseText.trim().length === 0) {
            console.error('[AI] Empty response from AI - sending error message');
            const errorMessage = "I apologize, but I'm having trouble generating a response right now. Please try rephrasing your question or try again in a moment.";
            fullResponseText = errorMessage;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: errorMessage })}\n\n`));
          }

          // ===================================================================
          // STEP 9: COMPONENT PARSING
          // ===================================================================
          // Parse any UI components from the response (appreciation cards, etc.)

          const componentData = parseComponentData(fullResponseText);

          // Send component data if present
          if (Object.keys(componentData).length > 0) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ components: componentData })}\n\n`)
            );
          }

          // ===================================================================
          // STEP 10: LOGGING & COMPLETION
          // ===================================================================

          // Log final response for analytics
          await logChatMessage("assistant", fullResponseText, userId, {
            model,
            processingTime: Date.now() - startTime,
          });

          // Send completion signal with metadata
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                done: true,
                metadata: {
                  model,
                  processingTime: Date.now() - startTime,
                },
              })}\n\n`
            )
          );

          controller.close();
        } catch (error: any) {
          console.error("[SSE] Stream error:", error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`)
          );
          controller.close();
        }
      },
    });

    // Return SSE response with proper headers
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("Groq API chat error:", error);

    // =========================================================================
    // GRACEFUL ERROR RECOVERY
    // =========================================================================
    // IMPORTANT: Always return a stream, even on error
    // This prevents breaking the frontend SSE connection and requiring reload
    //
    // Instead of returning JSON 500 error (which breaks the stream),
    // we return an error message IN THE STREAM so the chat can continue

    const encoder = new TextEncoder();
    const errorStream = new ReadableStream({
      start(controller) {
        try {
          // Send user-friendly error message
          const errorMessage = "I apologize, but I encountered an error processing your request. ";
          const errorDetail = error.message.includes("attempted to call tool")
            ? "It looks like there was an issue with one of my tools. Could you try rephrasing your question?"
            : "Please try again, or rephrase your question.";

          const fullMessage = errorMessage + errorDetail;

          // Stream the error message word-by-word
          const words = fullMessage.split(' ');
          for (let i = 0; i < words.length; i++) {
            const word = words[i] + (i < words.length - 1 ? ' ' : '');
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: word })}\n\n`));
          }

          // Send error metadata for debugging
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              error: true,
              errorMessage: error.message,
              errorType: error.name || "UnknownError"
            })}\n\n`)
          );

          // Send completion signal
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
          );

          controller.close();
        } catch (streamError) {
          console.error("[Error Stream] Failed to stream error message:", streamError);
          controller.close();
        }
      }
    });

    // Return error as SSE stream (chat stays functional)
    return new Response(errorStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  }
}
