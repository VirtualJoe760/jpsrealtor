// src/app/api/articles/search/route.ts
// AI-powered article search for chat integration

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import Article from "@/models/article";

export interface ArticleSearchResult {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  featuredImage: {
    url: string;
    alt: string;
  };
  seo: {
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

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Missing required field: query (string)" },
        { status: 400 }
      );
    }

    // Connect to MongoDB
    await connectDB();

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
      const results: ArticleSearchResult[] = textSearchResults.map((article: any) => ({
        _id: article._id.toString(),
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        category: article.category,
        featuredImage: {
          url: article.featuredImage.url,
          alt: article.featuredImage.alt
        },
        seo: {
          description: article.seo.description,
          keywords: article.seo.keywords
        },
        publishedAt: article.publishedAt.toISOString(),
        relevanceScore: article.score || 1.0
      }));

      return NextResponse.json({
        success: true,
        results,
        query,
        method: "text_search"
      });
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
      const results: ArticleSearchResult[] = keywordSearchResults.map((article: any, index: number) => ({
        _id: article._id.toString(),
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        category: article.category,
        featuredImage: {
          url: article.featuredImage.url,
          alt: article.featuredImage.alt
        },
        seo: {
          description: article.seo.description,
          keywords: article.seo.keywords
        },
        publishedAt: article.publishedAt.toISOString(),
        relevanceScore: 1.0 - (index * 0.1) // Descending relevance
      }));

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
