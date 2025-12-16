// src/app/api/articles/search/route.ts
// AI-powered article search for chat integration

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import Article from "@/models/article";

export interface ArticleSearchResult {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  image?: string; // Changed from featuredImage to match MDX format
  seo?: {
    description: string;
    keywords: string[];
  };
  publishedAt: string;
  relevanceScore: number;
}

/**
 * Search articles using MongoDB text search and keyword matching
 * POST /api/articles/search
 * Body: { query: string, limit?: number }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, limit = 5 } = body;

    console.log('[Article Search API] Called with query:', query, 'limit:', limit);

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Missing required field: query (string)" },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    await dbConnect();
    console.log('[Article Search API] Connected to MongoDB');

    // Extract keywords from query for better matching
    const keywords = extractKeywords(query);

    // Perform text search on published articles
    const textSearchResults = await Article.find(
      {
        status: "published",
        $text: { $search: query }
      },
      {
        score: { $meta: "textScore" }
      }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(limit)
      .select("title slug excerpt category featuredImage seo publishedAt")
      .lean();

    // If text search returns results, use those
    if (textSearchResults.length > 0) {
      console.log('[Article Search] Found', textSearchResults.length, 'text search results');
      console.log('[Article Search] First result featuredImage:', textSearchResults[0]?.featuredImage);

      const results: ArticleSearchResult[] = textSearchResults.map((article: any) => ({
        _id: article._id.toString(),
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        category: article.category,
        image: article.featuredImage?.url || undefined, // Convert featuredImage.url to image
        seo: article.seo ? {
          description: article.seo.description || '',
          keywords: article.seo.keywords || []
        } : undefined,
        publishedAt: article.publishedAt ? article.publishedAt.toISOString() : new Date().toISOString(),
        relevanceScore: article.score || 1.0
      }));

      console.log('[Article Search] Mapped first result image:', results[0]?.image);
      console.log('[Article Search] Full mapped first result:', JSON.stringify(results[0], null, 2));

      const response = {
        success: true,
        results,
        query,
        method: "text_search"
      };

      console.log('[Article Search] Returning response with', results.length, 'results');

      return NextResponse.json(response);
    }

    // Fallback: Keyword-based search on title, excerpt, keywords
    const keywordSearchResults = await Article.find({
      status: "published",
      $or: [
        { title: { $regex: keywords.join("|"), $options: "i" } },
        { excerpt: { $regex: keywords.join("|"), $options: "i" } },
        { "seo.keywords": { $in: keywords.map(k => new RegExp(k, "i")) } }
      ]
    })
      .limit(limit)
      .select("title slug excerpt category featuredImage seo publishedAt")
      .lean();

    if (keywordSearchResults.length > 0) {
      console.log('[Article Search] Found', keywordSearchResults.length, 'keyword search results');
      console.log('[Article Search] First keyword result featuredImage:', keywordSearchResults[0]?.featuredImage);

      const results: ArticleSearchResult[] = keywordSearchResults.map((article: any, index: number) => ({
        _id: article._id.toString(),
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        category: article.category,
        image: article.featuredImage?.url || undefined, // Convert featuredImage.url to image
        seo: article.seo ? {
          description: article.seo.description || '',
          keywords: article.seo.keywords || []
        } : undefined,
        publishedAt: article.publishedAt ? article.publishedAt.toISOString() : new Date().toISOString(),
        relevanceScore: 1.0 - (index * 0.1) // Descending relevance
      }));

      console.log('[Article Search] Mapped first keyword result image:', results[0]?.image);

      return NextResponse.json({
        success: true,
        results,
        query,
        method: "keyword_search"
      });
    }

    // No results found
    return NextResponse.json({
      success: true,
      results: [],
      query,
      method: "none"
    });

  } catch (error: any) {
    console.error("Article search error:", error);
    return NextResponse.json(
      {
        error: "Failed to search articles",
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * Extract meaningful keywords from a search query
 */
function extractKeywords(query: string): string[] {
  // Common stop words to filter out
  const stopWords = new Set([
    "the", "is", "are", "was", "were", "a", "an", "and", "or", "but",
    "in", "on", "at", "to", "for", "of", "with", "by", "from", "about",
    "what", "how", "why", "when", "where", "who", "which", "can", "do",
    "does", "i", "you", "it", "they", "we", "like", "tell", "me"
  ]);

  // Split query into words and filter
  const words = query
    .toLowerCase()
    .replace(/[^\w\s]/g, " ") // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));

  return [...new Set(words)]; // Remove duplicates
}

/**
 * GET endpoint for testing
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const query = searchParams.get("query");
  const limit = parseInt(searchParams.get("limit") || "5");

  if (!query) {
    return NextResponse.json(
      { error: "Missing query parameter" },
      { status: 400 }
    );
  }

  // Redirect to POST method
  return POST(
    new NextRequest(req.url, {
      method: "POST",
      body: JSON.stringify({ query, limit })
    })
  );
}
