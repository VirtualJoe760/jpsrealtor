// src/app/api/chat/history/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import SavedChat from "@/models/saved-chat";

// GET: Fetch user's chat history
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    // Get user's recent chats (limit to 50)
    const chats = await SavedChat.find({ userId: session.user.email })
      .sort({ updatedAt: -1 })
      .limit(50)
      .select('conversationId title messages createdAt updatedAt')
      .lean();

    // Transform to conversation history format
    const history = chats.map(chat => ({
      id: chat.conversationId,
      title: chat.title,
      timestamp: new Date(chat.updatedAt).getTime(),
      messageCount: chat.messages.length,
    }));

    return NextResponse.json({ history });
  } catch (error) {
    console.error("Error fetching chat history:", error);
    return NextResponse.json({ error: "Failed to fetch chat history" }, { status: 500 });
  }
}

// POST: Save or update a chat
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId, title, messages } = await req.json();

    if (!conversationId || !title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectToDatabase();

    // Upsert the chat
    const chat = await SavedChat.findOneAndUpdate(
      { conversationId, userId: session.user.email },
      {
        userId: session.user.email,
        conversationId,
        title,
        messages: messages || [],
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, chat });
  } catch (error) {
    console.error("Error saving chat:", error);
    return NextResponse.json({ error: "Failed to save chat" }, { status: 500 });
  }
}

// DELETE: Delete a specific chat
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json({ error: "Missing conversationId" }, { status: 400 });
    }

    await connectToDatabase();

    await SavedChat.deleteOne({
      conversationId,
      userId: session.user.email,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting chat:", error);
    return NextResponse.json({ error: "Failed to delete chat" }, { status: 500 });
  }
}
