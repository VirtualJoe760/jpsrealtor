// src/app/api/chat/research-community/route.ts
// API endpoint for AI to research and auto-record community facts

import { NextRequest, NextResponse } from 'next/server';
import {
  answerCommunityQuestion,
  analyzeListingsForFacts,
  recordCommunityFact,
  countHomesInSubdivision,
} from '@/lib/ai-community-research';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, question, subdivisionName, city, factType, factValue, dataSource } = body;

    if (!subdivisionName) {
      return NextResponse.json(
        { error: 'subdivisionName is required' },
        { status: 400 }
      );
    }

    // Action: Answer a question and optionally record the fact
    if (action === 'answer') {
      if (!question) {
        return NextResponse.json(
          { error: 'question is required for answer action' },
          { status: 400 }
        );
      }

      const result = await answerCommunityQuestion(question, subdivisionName, city);

      // Auto-record if confidence is high and shouldRecord is true
      if (result.shouldRecord && result.confidence === 'high') {
        await recordCommunityFact(
          subdivisionName,
          city || '',
          result.factType,
          result.factValue,
          result.dataSource
        );
      }

      return NextResponse.json({
        success: true,
        ...result,
        recorded: result.shouldRecord && result.confidence === 'high',
      });
    }

    // Action: Analyze listings and get all facts
    if (action === 'analyze') {
      const facts = await analyzeListingsForFacts(subdivisionName, city);

      return NextResponse.json({
        success: true,
        subdivisionName,
        city,
        facts,
        timestamp: new Date().toISOString(),
      });
    }

    // Action: Record a specific fact
    if (action === 'record') {
      if (!factType || factValue === undefined) {
        return NextResponse.json(
          { error: 'factType and factValue are required for record action' },
          { status: 400 }
        );
      }

      const recorded = await recordCommunityFact(
        subdivisionName,
        city || '',
        factType,
        factValue,
        dataSource || 'AI research'
      );

      return NextResponse.json({
        success: recorded,
        message: recorded
          ? `Recorded ${factType} for ${subdivisionName}`
          : `Failed to record ${factType}`,
      });
    }

    // Action: Count total homes
    if (action === 'count-homes') {
      const count = await countHomesInSubdivision(subdivisionName, city);

      return NextResponse.json({
        success: true,
        subdivisionName,
        city,
        totalHomes: count,
        message: `${subdivisionName} has approximately ${count} homes (based on unique addresses in our database)`,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: answer, analyze, record, or count-homes' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error in research-community API:', error);
    return NextResponse.json(
      { error: 'Failed to research community', details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint for quick lookups
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const subdivisionName = searchParams.get('name');
    const city = searchParams.get('city');
    const action = searchParams.get('action') || 'analyze';

    if (!subdivisionName) {
      return NextResponse.json(
        { error: 'name parameter is required' },
        { status: 400 }
      );
    }

    if (action === 'count-homes') {
      const count = await countHomesInSubdivision(subdivisionName, city || undefined);
      return NextResponse.json({
        success: true,
        subdivisionName,
        city,
        totalHomes: count,
      });
    }

    // Default: analyze
    const facts = await analyzeListingsForFacts(subdivisionName, city || undefined);

    return NextResponse.json({
      success: true,
      subdivisionName,
      city,
      facts,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in research-community GET:', error);
    return NextResponse.json(
      { error: 'Failed to research community', details: error.message },
      { status: 500 }
    );
  }
}
