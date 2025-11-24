// src/app/api/ai/insights-search/route.ts
// API endpoint for semantic search of JPS Insights

import { NextRequest, NextResponse } from 'next/server';
import {
  searchInsights,
  searchInsightsBySection,
  getIndexStats,
  checkOllamaStatus
} from '@/app/utils/ai/searchInsights';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/ai/insights-search
 *
 * Semantic search for JPS Insights articles
 *
 * Request Body:
 * {
 *   query: string;
 *   section?: string;
 *   limit?: number;
 *   minScore?: number;
 * }
 *
 * Response:
 * {
 *   success: true;
 *   results: InsightResult[];
 *   query: string;
 *   count: number;
 *   timestamp: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, section, limit = 5, minScore = 0.5 } = body;

    // Validate query
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    // Check if searching within specific section
    const results = section
      ? await searchInsightsBySection(section, query, limit)
      : await searchInsights(query, limit, minScore);

    return NextResponse.json({
      success: true,
      results,
      query,
      section: section || null,
      count: results.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in /api/ai/insights-search:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/insights-search
 *
 * Get index statistics and Ollama status
 *
 * Query params:
 * - status: If true, includes Ollama availability check
 *
 * Response:
 * {
 *   indexStats: { available, generatedAt, totalPosts, totalChunks, embeddingModel },
 *   ollamaStatus?: { available, modelLoaded, url }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const checkStatus = searchParams.get('status') === 'true';

    const indexStats = getIndexStats();
    const response: any = { indexStats };

    if (checkStatus) {
      response.ollamaStatus = await checkOllamaStatus();
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error in GET /api/ai/insights-search:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
