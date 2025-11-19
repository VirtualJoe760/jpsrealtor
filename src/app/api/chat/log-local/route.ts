// src/app/api/chat/log-local/route.ts
// API endpoint to log chat messages to local filesystem

import { NextRequest, NextResponse } from "next/server";
import { chatLogger, logChatMessage } from "@/lib/chat-logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { role, content, userId, metadata } = body;

    if (!role || !content || !userId) {
      return NextResponse.json(
        { error: "Missing required fields: role, content, userId" },
        { status: 400 }
      );
    }

    // Log the message
    await logChatMessage(role, content, userId, metadata);

    return NextResponse.json({
      success: true,
      sessionId: chatLogger.getSessionId(),
      messageCount: chatLogger.getLogs().length
    });
  } catch (error: any) {
    console.error("Error logging chat message:", error);
    return NextResponse.json(
      { error: "Failed to log message", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await chatLogger.getSession();

    if (!session) {
      return NextResponse.json(
        { error: "No active session" },
        { status: 404 }
      );
    }

    return NextResponse.json(session);
  } catch (error: any) {
    console.error("Error retrieving session:", error);
    return NextResponse.json(
      { error: "Failed to retrieve session", details: error.message },
      { status: 500 }
    );
  }
}
