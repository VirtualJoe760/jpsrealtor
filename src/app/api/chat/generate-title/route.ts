// src/app/api/chat/generate-title/route.ts
// API endpoint to generate concise chat titles using Groq AI

import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userMessage, aiResponse } = body;

    if (!userMessage) {
      return NextResponse.json(
        { error: 'userMessage is required' },
        { status: 400 }
      );
    }

    // Build context from conversation
    const context = aiResponse
      ? `User asked: "${userMessage}"\n\nAssistant responded: "${aiResponse.substring(0, 200)}..."`
      : `User asked: "${userMessage}"`;

    // Ask Groq to generate a concise title
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a title generator. Generate a short, concise title (3-6 words max) that captures the essence of a conversation.

Rules:
- Maximum 6 words
- No quotes or punctuation at the end
- Capitalize properly (Title Case)
- Be specific and descriptive
- Focus on the main topic or question

Examples:
- "show me homes in palm springs" → "Homes in Palm Springs"
- "what's the hoa range in indian wells country club?" → "Indian Wells HOA Range"
- "3 bed homes under 500k in la quinta" → "La Quinta 3BR Under 500K"
- "tell me about pga west" → "PGA West Community Info"
- "what are the best golf communities?" → "Best Golf Communities"

Generate ONLY the title, nothing else.`,
        },
        {
          role: 'user',
          content: context,
        },
      ],
      temperature: 0.3,
      max_tokens: 30,
    });

    let title = completion.choices[0]?.message?.content?.trim() || '';

    // Clean up the title
    title = title.replace(/^["']|["']$/g, ''); // Remove quotes
    title = title.replace(/[.!?]+$/, ''); // Remove trailing punctuation
    title = title.substring(0, 40); // Enforce max length

    // Fallback if AI returns empty or too long
    if (!title || title.length < 3) {
      title = userMessage.length > 25
        ? userMessage.substring(0, 25) + '...'
        : userMessage;
    }

    return NextResponse.json({
      success: true,
      title,
    });
  } catch (error: any) {
    console.error('Error generating title:', error);

    // Return fallback title on error
    const { userMessage } = await req.json();
    const fallbackTitle = userMessage?.length > 25
      ? userMessage.substring(0, 25) + '...'
      : userMessage || 'New Conversation';

    return NextResponse.json({
      success: true,
      title: fallbackTitle,
      fallback: true,
    });
  }
}
