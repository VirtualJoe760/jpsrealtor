// src/app/api/chat/stream/route.ts
// Groq-powered AI chat for real estate assistance

import { NextRequest, NextResponse } from "next/server";
import { logChatMessage } from "@/lib/chat-logger";
import { createChatCompletion, GROQ_MODELS } from "@/lib/groq";
import type { GroqChatMessage } from "@/lib/groq";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, userId, userTier = "free" } = body;

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

    // Log API request
    await logChatMessage("system", `Groq chat request (${model})`, userId, {
      messageCount: messages.length,
      userTier,
      timestamp: new Date().toISOString(),
    });

    // Convert messages to Groq format
    const groqMessages: GroqChatMessage[] = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Get AI response from Groq
    const completion = await createChatCompletion({
      messages: groqMessages,
      model,
      temperature: 0.3,
      maxTokens: 500,
      stream: false, // Explicitly set to false to get non-streaming response
    });

    // Type guard to ensure we have a ChatCompletion, not a Stream
    const responseText = 'choices' in completion ? (completion.choices[0]?.message?.content || "") : "";

    // Log response
    await logChatMessage("assistant", responseText, userId, {
      model,
      processingTime: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      response: responseText,
      metadata: {
        model,
        processingTime: Date.now() - startTime,
        tier: userTier,
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

// Example integration with OpenAI (commented out - uncomment and configure when ready):
/*
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { messages, userId, temperature = 0.6, maxTokens = 1000 } = await req.json();

    const stream = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: messages,
      temperature: temperature,
      max_tokens: maxTokens,
      stream: true,
    });

    // Create streaming response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content || '';
          controller.enqueue(encoder.encode(text));
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
*/
