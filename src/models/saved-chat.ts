// src/models/saved-chat.ts
// MongoDB schema for saved chat conversations

import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISavedChat extends Document {
  userId: string; // User who saved the chat
  conversationId: string; // Unique conversation identifier
  title: string; // Chat title (first message or custom)
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: number;
    listings?: any[];
  }>;
  tags?: string[]; // Optional tags for categorization
  isFavorite?: boolean; // Mark as favorite
  notes?: string; // User's notes about this conversation
  createdAt: Date;
  updatedAt: Date;
}

const SavedChatSchema = new Schema<ISavedChat>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    conversationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    messages: [
      {
        role: {
          type: String,
          enum: ["user", "assistant", "system"],
          required: true,
        },
        content: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Number,
          required: true,
        },
        listings: Schema.Types.Mixed,
      },
    ],
    tags: [String],
    isFavorite: {
      type: Boolean,
      default: false,
    },
    notes: String,
  },
  {
    timestamps: true,
    collection: "saved_chats",
  }
);

// Indexes for efficient queries
SavedChatSchema.index({ userId: 1, createdAt: -1 });
SavedChatSchema.index({ userId: 1, isFavorite: 1 });
SavedChatSchema.index({ userId: 1, updatedAt: -1 }); // For recent conversations query
SavedChatSchema.index({ userId: 1, tags: 1 });

const SavedChat: Model<ISavedChat> =
  mongoose.models.SavedChat || mongoose.model<ISavedChat>("SavedChat", SavedChatSchema);

export default SavedChat;
