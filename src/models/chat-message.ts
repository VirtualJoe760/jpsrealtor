// src/models/chat-message.ts
// MongoDB schema for chat message history

import mongoose, { Schema, Document, Model } from "mongoose";

export interface IChatMessage extends Document {
  userId: string; // User ID or anonymousId for logged-out users
  sessionId: string; // Unique session identifier
  context: "homepage" | "listing" | "dashboard" | "general"; // Where the chat occurred
  listingKey?: string; // If context is "listing", which listing
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: {
    listingData?: Record<string, any>; // Listing context if applicable
    extractedGoals?: Record<string, any>; // Any goals extracted from this message
    modelUsed?: string; // e.g., "gemma2:2b"
    processingTime?: number; // ms
  };
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    context: {
      type: String,
      enum: ["homepage", "listing", "dashboard", "general"],
      default: "general",
      index: true,
    },
    listingKey: {
      type: String,
      index: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    metadata: {
      listingData: Schema.Types.Mixed,
      extractedGoals: Schema.Types.Mixed,
      modelUsed: String,
      processingTime: Number,
    },
  },
  {
    timestamps: true,
    collection: "chat_messages",
  }
);

// Indexes for efficient queries
ChatMessageSchema.index({ userId: 1, createdAt: -1 });
ChatMessageSchema.index({ sessionId: 1, createdAt: 1 });
ChatMessageSchema.index({ userId: 1, context: 1, createdAt: -1 });

// Automatically delete messages older than 90 days (optional)
ChatMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const ChatMessage: Model<IChatMessage> =
  mongoose.models.ChatMessage || mongoose.model<IChatMessage>("ChatMessage", ChatMessageSchema);

export default ChatMessage;
