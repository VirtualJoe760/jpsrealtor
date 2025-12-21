// src/app/api/chat-v2/route.ts
// Chat V2 - Industry standard "all tools at once" pattern

import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { ALL_TOOLS } from "@/lib/chat-v2/tools";
import { SYSTEM_PROMPT } from "@/lib/chat-v2/system-prompt";
import { streamWithToolSupport, getSSEHeaders } from "@/lib/chat-v2/streaming";
import type { ChatRequest, ChatMessage } from "@/lib/chat-v2/types";
import { detectCommand, getCommandResponse } from "@/lib/chat-v2/commands";

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

/**
 * POST /api/chat-v2
 * Simple, clean chat endpoint with all tools available
 */
export async function POST(req: NextRequest) {
  try {
    const body: ChatRequest = await req.json();
    const { messages, userId, userTier = "free", locationSnapshot } = body;

    // Validate request
    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages are required" },
        { status: 400 }
      );
    }

    console.log("[Chat V2] Processing request:", {
      userId,
      userTier,
      messageCount: messages.length,
      locationSnapshot,
      lastMessage: messages[messages.length - 1]?.content?.substring(0, 100)
    });

    // Check if the last message is a command
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "user") {
      const command = detectCommand(lastMessage.content);

      if (command) {
        console.log("[Chat V2] Command detected:", command);

        // Get command response
        const commandResponse = getCommandResponse(command);

        // Create a simple streaming response with the markdown content
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            // Send the markdown response as a single chunk
            const chunk = `data: ${JSON.stringify({ content: commandResponse })}\n\n`;
            controller.enqueue(encoder.encode(chunk));

            // Send done signal
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        });

        return new NextResponse(stream, {
          headers: getSSEHeaders()
        });
      }
    }

    // Build full message array with system prompt
    let systemPrompt = SYSTEM_PROMPT;

    // If this is a location snapshot from map search, add special instructions
    if (locationSnapshot) {
      systemPrompt = `${SYSTEM_PROMPT}

## LOCATION SNAPSHOT MODE (FROM MAP SEARCH) - OVERRIDE NORMAL BEHAVIOR!

The user just searched for "${locationSnapshot.name}" in the map search bar. They want a BRIEF markdown overview of this ${locationSnapshot.type}.

**CRITICAL RULES FOR LOCATION SNAPSHOT:**
1. DO NOT use any tools (no searchHomes, no getAppreciation, no searchArticles)
2. Respond with 2-3 short paragraphs in pure markdown
3. Include general market info, notable features, and community highlights
4. Keep it conversational and under 150 words
5. End with a helpful suggestion about viewing listings or market data

**Example Response for "Indio":**
Indio is the easternmost city in the Coachella Valley, known for hosting the famous Coachella and Stagecoach music festivals. The city offers more affordable housing compared to western valley cities like Palm Desert and La Quinta.

The market has shown steady growth over the past five years, with median home prices rising from around $350K to about $480K. This translates to an average annual appreciation of ~6%.

Indio's growth is driven by expanding job opportunities, the annual festivals, and continued development of new residential communities on the city's outskirts. Let me know if you'd like to see current listings or compare appreciation with neighboring cities!

Now respond to the user's query about "${locationSnapshot.name}" following these rules.`;
    }

    const fullMessages = [
      { role: "system" as const, content: systemPrompt },
      ...messages.map(msg => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content
      }))
    ];

    // ONE AI call with ALL tools available
    // This is the industry standard pattern used by OpenAI, Anthropic, Google
    const groqResponse = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b", // GPT-OSS 120B has function calling support
      messages: fullMessages,
      tools: ALL_TOOLS, // Give AI access to all tools at once
      tool_choice: "auto", // Let AI decide which tools to use
      stream: true, // Enable streaming for better UX
      temperature: 0.7,
      max_tokens: 2048
    });

    console.log("[Chat V2] Groq request sent with", ALL_TOOLS.length, "tools available");

    // Stream response with tool execution support
    // Pass groq client and messages for multi-turn tool calling
    const stream = await streamWithToolSupport(groqResponse, {
      groq,
      messages: fullMessages,
      userId
    });

    // Return SSE stream
    return new NextResponse(stream, {
      headers: getSSEHeaders()
    });
  } catch (error: any) {
    console.error("[Chat V2] Error:", error);

    // Graceful error handling
    return NextResponse.json(
      {
        error: error.message || "Chat processing failed",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chat-v2
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    version: "2.0",
    pattern: "industry-standard all-tools-at-once",
    toolCount: ALL_TOOLS.length,
    tools: ALL_TOOLS.map(t => t.function.name)
  });
}
