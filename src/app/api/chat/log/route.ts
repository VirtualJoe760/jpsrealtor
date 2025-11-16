// src/app/api/chat/log/route.ts
// API route for logging chat messages to MongoDB

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/db";
import ChatMessage from "@/models/chat-message";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();

    const {
      userId,
      sessionId,
      context,
      listingKey,
      role,
      content,
      metadata,
    } = body;

    // Validate required fields
    if (!userId || !sessionId || !role || !content) {
      return NextResponse.json(
        { error: "Missing required fields: userId, sessionId, role, content" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Create chat message
    const chatMessage = await ChatMessage.create({
      userId,
      sessionId,
      context: context || "general",
      listingKey,
      role,
      content,
      metadata,
    });

    return NextResponse.json({
      success: true,
      messageId: chatMessage._id,
    });
  } catch (error) {
    console.error("Error logging chat message:", error);
    return NextResponse.json(
      { error: "Failed to log chat message" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);

    const userId = searchParams.get("userId");
    const sessionId = searchParams.get("sessionId");
    const context = searchParams.get("context");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Build query
    const query: any = { userId };
    if (sessionId) query.sessionId = sessionId;
    if (context) query.context = context;

    // Fetch messages
    const messages = await ChatMessage.find(query)
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat messages" },
      { status: 500 }
    );
  }
}
