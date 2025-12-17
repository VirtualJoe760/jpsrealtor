// src/app/api/chat/stream/route.ts
// Groq-powered AI chat with Server-Sent Events (SSE) streaming

import { NextRequest, NextResponse } from "next/server";
import { logChatMessage } from "@/lib/chat-logger";
import { createChatCompletion, GROQ_MODELS } from "@/lib/groq";
import type { GroqChatMessage } from "@/lib/groq";
import { CHAT_TOOLS } from "@/lib/chat/tools";
import { buildSystemPrompt } from "@/lib/chat/prompts";
import { executeToolCall } from "@/lib/chat/tool-executor";
import { parseComponentData, cleanResponseText } from "@/lib/chat/response-parser";
import { isHelpCommand, getHelpContent } from "@/lib/chat/prompts/help-commands";
import groq from "@/lib/groq";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, userId, userTier = "free", textOnly = false } = body;

    if (!messages || !Array.isArray(messages) || !userId) {
      return NextResponse.json(
        { error: "Missing required fields: messages (array) and userId" },
        { status: 400 }
      );
    }

    // Check if Groq API key is configured
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

    // Determine which model to use based on tier
    const model = userTier === "premium" ? GROQ_MODELS.PREMIUM : GROQ_MODELS.FREE;

    // Log API request with user query
    const userQuery = messages[messages.length - 1]?.content || "No query";
    await logChatMessage("system", `Groq chat request (${model})`, userId, {
      messageCount: messages.length,
      userTier,
      timestamp: new Date().toISOString(),
      userQuery: userQuery,
    });

    // Log the actual user query
    await logChatMessage("user", userQuery, userId, {
      timestamp: new Date().toISOString(),
    });

    // Check if user is requesting help/directory
    const helpCommand = isHelpCommand(userQuery);
    if (helpCommand) {
      console.log(`[AI] Help command detected: ${helpCommand}`);
      const helpContent = getHelpContent(helpCommand);

      // Stream the help content immediately (no AI call needed)
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Stream help content word-by-word for consistent UX
            const words = helpContent.split(' ');
            for (let i = 0; i < words.length; i++) {
              const word = words[i] + (i < words.length - 1 ? ' ' : '');
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: word })}\n\n`));
            }

            // Log help response
            await logChatMessage("assistant", helpContent, userId, {
              model: "help-system",
              processingTime: Date.now() - startTime,
              helpCommand,
            });

            // Send done signal
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  done: true,
                  metadata: {
                    model: "help-system",
                    processingTime: Date.now() - startTime,
                    tier: userTier,
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

    // Build system prompt using modular composition
    // textOnly mode provides focused markdown-only responses for map digests
    const systemPrompt = buildSystemPrompt({ textOnly });

    // Convert messages to Groq format, adding system prompt if not already present
    const groqMessages: GroqChatMessage[] = [];

    // Add system prompt if first message isn't already a system message
    if (messages.length === 0 || messages[0].role !== "system") {
      groqMessages.push({
        role: "system",
        content: systemPrompt
      });
    }

    // Add user messages
    groqMessages.push(...messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    })));

    // STEP 1: MULTI-ROUND TOOL EXECUTION (non-streaming)
    // Execute all tool calls FIRST before streaming the final response
    const MAX_TOOL_ROUNDS = 3;
    let toolRound = 0;
    let messagesWithTools: GroqChatMessage[] = [...groqMessages];
    let needsStreaming = true;

    while (toolRound < MAX_TOOL_ROUNDS) {
      console.log(`[AI] Starting round ${toolRound + 1} with ${messagesWithTools.length} messages`);

      // Get AI response with tool support (non-streaming for tool calls)
      const completion = await createChatCompletion({
        messages: messagesWithTools,
        model,
        temperature: 0.3,
        maxTokens: toolRound === 0 ? 500 : 4000,
        stream: false, // Tool calls cannot be streamed
        tools: CHAT_TOOLS,
        tool_choice: "auto",
      });

      const assistantMessage: any = 'choices' in completion ? completion.choices[0]?.message : null;

      console.log(`[AI] Round ${toolRound + 1} response:`, {
        hasToolCalls: !!assistantMessage?.tool_calls,
        toolCallCount: assistantMessage?.tool_calls?.length || 0,
        hasContent: !!assistantMessage?.content,
        contentLength: assistantMessage?.content?.length || 0
      });

      // If no tool calls, break out to stream the response
      if (!assistantMessage?.tool_calls || assistantMessage.tool_calls.length === 0) {
        // No tools needed - this is the final response
        // Add the assistant's message to the conversation
        messagesWithTools.push(assistantMessage);
        needsStreaming = false;
        break;
      }

      toolRound++;
      console.log(`[AI] Round ${toolRound}: Using tools:`, assistantMessage.tool_calls.map((tc: any) => tc.function.name).join(', '));

      // Log tool usage
      await logChatMessage("system", `Tool calls in round ${toolRound}`, userId, {
        tools: assistantMessage.tool_calls.map((tc: any) => ({
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments || '{}')
        })),
        timestamp: new Date().toISOString(),
      });

      // Execute all tool calls
      const toolResults = await Promise.all(
        assistantMessage.tool_calls.map((toolCall: any) => executeToolCall(toolCall, userId))
      );

      console.log(`[AI] Round ${toolRound}: Tool results:`, toolResults.map((r: any) => {
        const content = JSON.parse(r.content || '{}');
        return `${r.name}: ${content.error ? 'ERROR' : 'SUCCESS'}`;
      }).join(', '));

      // Log sample of tool result content for debugging
      if (toolResults.length > 0) {
        const firstResult = JSON.parse(toolResults[0].content || '{}');
        console.log(`[AI] Sample tool result:`, JSON.stringify(firstResult).substring(0, 500) + '...');
      }

      // Append tool results to conversation for next round
      messagesWithTools.push(assistantMessage);
      messagesWithTools.push(...toolResults);

      // Safety check: prevent infinite loops
      if (toolRound >= MAX_TOOL_ROUNDS) {
        console.warn(`[AI] Max tool rounds reached - will stream final response`);
        needsStreaming = true;
        break;
      }
    }

    // STEP 2: STREAM THE FINAL RESPONSE
    // Create a ReadableStream for Server-Sent Events (SSE)
    const encoder = new TextEncoder();
    let fullResponseText = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // If we already have a non-streaming response (no tools), use it
          if (!needsStreaming && messagesWithTools.length > 0) {
            // Stream the existing response word-by-word for consistent UX
            const lastMessage = messagesWithTools[messagesWithTools.length - 1];
            console.log(`[SSE] Using cached response. Last message role: ${lastMessage.role}, has content: ${!!lastMessage.content}, length: ${lastMessage.content?.length || 0}`);

            const responseText = lastMessage.role === 'assistant' ? lastMessage.content : "";

            if (responseText) {
              fullResponseText = responseText;
              const words = responseText.split(' ');
              for (let i = 0; i < words.length; i++) {
                const word = words[i] + (i < words.length - 1 ? ' ' : '');
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: word })}\n\n`));
              }
            } else {
              console.error(`[SSE] No response text found! Last message:`, JSON.stringify(lastMessage).substring(0, 200));
            }
          } else {
            // Stream the AI response in real-time
            console.log(`[AI] Starting final streaming response with ${messagesWithTools.length} messages`);
            const streamResponse = await groq.chat.completions.create({
              messages: messagesWithTools as any,
              model,
              temperature: 0.3,
              max_tokens: 4000,
              stream: true,
              tool_choice: "none", // Explicitly disable tools in final response
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

          // If response is empty, send error message
          if (!fullResponseText || fullResponseText.trim().length === 0) {
            console.error('[AI] Empty response from AI - sending error message');
            const errorMessage = "I apologize, but I'm having trouble generating a response right now. Please try rephrasing your question or try again in a moment.";
            fullResponseText = errorMessage;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: errorMessage })}\n\n`));
          }

          // Parse component data from the full response
          const componentData = parseComponentData(fullResponseText);

          // Send component data if present
          if (Object.keys(componentData).length > 0) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ components: componentData })}\n\n`)
            );
          }

          // Log final response
          await logChatMessage("assistant", fullResponseText, userId, {
            model,
            processingTime: Date.now() - startTime,
          });

          // Send done signal with metadata
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                done: true,
                metadata: {
                  model,
                  processingTime: Date.now() - startTime,
                  tier: userTier,
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

    return NextResponse.json(
      { error: "Failed to process chat request", details: error.message },
      { status: 500 }
    );
  }
}
