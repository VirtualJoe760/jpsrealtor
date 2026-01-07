// app/api/user/voice-training/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongoose';
import User from '@/models/User';

/**
 * Compile training responses into a cohesive AI personality prompt
 */
function compileVoicePersonality(responses: Record<string, string>): string {
  const sections = [];

  if (responses.introduction) {
    sections.push(`BACKGROUND & PERSONALITY:\n${responses.introduction}`);
  }

  if (responses.story) {
    sections.push(`COMMUNICATION EXAMPLE (storytelling style):\n${responses.story}`);
  }

  if (responses.nickname) {
    sections.push(`HOW THEY PREFER TO BE ADDRESSED:\n${responses.nickname}`);
  }

  if (responses.coldCall) {
    sections.push(`COLD CALL APPROACH (tone & style):\n${responses.coldCall}`);
  }

  if (responses.valueProposition) {
    sections.push(`UNIQUE VALUE PROPOSITION:\n${responses.valueProposition}`);
  }

  if (responses.tone) {
    sections.push(`COMMUNICATION STYLE:\n${responses.tone}`);
  }

  const compiled = sections.join('\n\n');

  return `${compiled}\n\nIMPORTANT: Match this agent's natural speaking style, tone, and personality in all generated scripts. Use their vocabulary, their pacing, their approach to building rapport. If they're casual, be casual. If they're data-driven, use data. If they tell stories, weave in narratives. Make it sound like THEM, not a generic agent.`;
}

/**
 * GET - Retrieve user's voice training responses
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const user = await User.findById(session.user.id);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Parse voice personality back into responses if it exists
    // For now, we'll store the raw responses in a new field
    const training = user.voiceTrainingResponses || {};

    return NextResponse.json({
      success: true,
      training,
      hasTraining: !!user.voicePersonality,
    });
  } catch (error: any) {
    console.error('[voice-training GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch training' },
      { status: 500 }
    );
  }
}

/**
 * POST - Save user's voice training responses
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const { responses } = await request.json();

    if (!responses || typeof responses !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid training responses' },
        { status: 400 }
      );
    }

    // Compile responses into AI personality prompt
    const voicePersonality = compileVoicePersonality(responses);

    // Save both the raw responses and the compiled personality
    const user = await User.findByIdAndUpdate(
      session.user.id,
      {
        voicePersonality,
        voiceTrainingResponses: responses,
      },
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Voice training saved successfully',
    });
  } catch (error: any) {
    console.error('[voice-training POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save training' },
      { status: 500 }
    );
  }
}
