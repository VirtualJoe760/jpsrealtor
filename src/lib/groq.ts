// src/lib/groq.ts
// Groq API client for fast, cheap AI inference

import Groq from "groq-sdk";

// Initialize Groq client
if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === "your_groq_api_key_here") {
  console.error("⚠️  GROQ_API_KEY is missing or using placeholder!");
  console.error("   Get your API key from: https://console.groq.com/");
  console.error("   Add it to .env.local as: GROQ_API_KEY=gsk_your_actual_key");
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "",
});

// Model configuration for different tiers
export const GROQ_MODELS = {
  // Free tier: Fast and cheap
  FREE: "llama-3.1-8b-instant", // 840 TPS, ~$0.013/month per user

  // Premium tier: Smarter and better quality
  PREMIUM: "gpt-oss-120b", // 500 TPS, 131K context, function calling support
} as const;

export interface GroqChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

export interface GroqTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export interface GroqChatOptions {
  messages: GroqChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  tools?: GroqTool[];
  tool_choice?: "auto" | "none" | { type: "function"; function: { name: string } };
}

/**
 * Create a chat completion using Groq
 * @param options Chat options
 * @returns Chat completion response
 */
export async function createChatCompletion(options: GroqChatOptions) {
  const {
    messages,
    model = GROQ_MODELS.FREE,
    temperature = 0.3,
    maxTokens = 500,
    stream = false,
    tools,
    tool_choice,
  } = options;

  try {
    const params: any = {
      messages,
      model,
      temperature,
      max_tokens: maxTokens,
      stream,
    };

    // Add tools if provided
    if (tools && tools.length > 0) {
      params.tools = tools;
      if (tool_choice) {
        params.tool_choice = tool_choice;
      }
    }

    const completion = await groq.chat.completions.create(params);

    return completion;
  } catch (error: any) {
    console.error("Groq API error:", error);
    throw new Error(`Groq API error: ${error.message}`);
  }
}

/**
 * Create a streaming chat completion
 * @param options Chat options
 * @returns Async iterator of chat completion chunks
 */
export async function createStreamingChatCompletion(options: GroqChatOptions) {
  const {
    messages,
    model = GROQ_MODELS.FREE,
    temperature = 0.3,
    maxTokens = 500,
  } = options;

  try {
    const stream = await groq.chat.completions.create({
      messages,
      model,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    });

    return stream;
  } catch (error: any) {
    console.error("Groq streaming API error:", error);
    throw new Error(`Groq streaming API error: ${error.message}`);
  }
}

export default groq;
