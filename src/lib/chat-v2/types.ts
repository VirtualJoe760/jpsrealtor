// src/lib/chat-v2/types.ts
// TypeScript types for Chat V2

import type { ChatCompletionMessageParam, ChatCompletionChunk } from "groq-sdk/resources/chat/completions";

/**
 * Chat message from frontend
 */
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * Chat request body
 */
export interface ChatRequest {
  messages: ChatMessage[];
  userId?: string;
  userTier?: "free" | "premium" | "enterprise";
  locationSnapshot?: {
    name: string;
    type: string;
  };
}

/**
 * Tool call result
 */
export interface ToolCallResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * User behavior tracking event
 */
export interface UserBehaviorEvent {
  userId: string;
  tool: "searchHomes" | "getAppreciation" | "searchArticles";
  location?: {
    name: string;
    type: "city" | "subdivision" | "county" | "zip";
    normalized: string;
  };
  filters?: any;
  timestamp: Date;
}

/**
 * User interest data (stored in User model)
 */
export interface UserInterestArea {
  name: string;
  type: "city" | "subdivision" | "county";
  searchCount: number;
  lastSearched: Date;
  filters?: {
    priceRange?: { min?: number; max?: number };
    beds?: number;
    baths?: number;
    features?: string[];
  };
}

export interface UserInvestmentInterest {
  name: string;
  type: "city" | "subdivision" | "county";
  appreciationChecks: number;
  lastChecked: Date;
  periodsViewed?: string[];
}

/**
 * SSE stream events
 */
export type StreamEvent =
  | { type: "token"; content: string }
  | { type: "tool_call"; toolName: string; args: any }
  | { type: "tool_result"; result: any }
  | { type: "error"; error: string }
  | { type: "done" };
