// src/app/api/chat/save/route.ts
// API endpoint to save chat conversations to database

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import SavedChat from '@/models/saved-chat';

export async function POST(req: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in to save chats' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { conversationId, title, messages, tags, notes } = body;

    if (!conversationId || !title || !messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'conversationId, title, and messages are required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Check if chat is already saved
    const existingChat = await SavedChat.findOne({
      userId: session.user.email,
      conversationId,
    });

    if (existingChat) {
      // Update existing saved chat
      existingChat.title = title;
      existingChat.messages = messages;
      if (tags) existingChat.tags = tags;
      if (notes !== undefined) existingChat.notes = notes;
      await existingChat.save();

      return NextResponse.json({
        success: true,
        message: 'Chat updated successfully',
        chatId: existingChat._id,
      });
    }

    // Create new saved chat
    const savedChat = await SavedChat.create({
      userId: session.user.email,
      conversationId,
      title,
      messages,
      tags: tags || [],
      notes: notes || '',
      isFavorite: false,
    });

    return NextResponse.json({
      success: true,
      message: 'Chat saved successfully',
      chatId: savedChat._id,
    });
  } catch (error: any) {
    console.error('Error saving chat:', error);
    return NextResponse.json(
      { error: 'Failed to save chat', details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve saved chats
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId');
    const favorites = searchParams.get('favorites') === 'true';

    if (conversationId) {
      // Get specific chat
      const chat = await SavedChat.findOne({
        userId: session.user.email,
        conversationId,
      });

      if (!chat) {
        return NextResponse.json(
          { error: 'Chat not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        chat,
      });
    }

    // Get all saved chats for user
    const query: any = { userId: session.user.email };
    if (favorites) {
      query.isFavorite = true;
    }

    const chats = await SavedChat.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      success: true,
      chats,
      count: chats.length,
    });
  } catch (error: any) {
    console.error('Error fetching saved chats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chats', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove saved chat
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const result = await SavedChat.deleteOne({
      userId: session.user.email,
      conversationId,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Chat deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting chat:', error);
    return NextResponse.json(
      { error: 'Failed to delete chat', details: error.message },
      { status: 500 }
    );
  }
}
