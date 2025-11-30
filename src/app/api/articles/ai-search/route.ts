import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface Article {
  title: string;
  excerpt: string;
  image: string;
  category: string;
  date: string;
  slug: string;
  topics?: string[];
  content?: string;
}

interface SearchIntent {
  action?: 'buying' | 'selling' | 'investing' | 'learning' | 'research';
  location?: string;
  topics: string[];
  keywords: string[];
}

interface SearchResult {
  article: Article;
  relevanceScore: number;
  matchReasons: string[];
}

/**
 * POST /api/articles/ai-search
 *
 * AI-powered article search with natural language understanding
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { query, filters = {}, limit = 20 } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid query parameter' },
        { status: 400 }
      );
    }

    // Step 1: Extract intent from query using Groq
    const intent = await extractIntent(query);

    // Step 2: Load all articles from MDX files
    const articles = await loadAllArticles();

    // Step 3: Filter articles based on filters
    let filteredArticles = articles;

    if (filters.category) {
      filteredArticles = filteredArticles.filter(
        (a) => a.category === filters.category
      );
    }

    if (filters.dateFrom) {
      const dateFrom = new Date(filters.dateFrom);
      filteredArticles = filteredArticles.filter(
        (a) => new Date(a.date) >= dateFrom
      );
    }

    if (filters.dateTo) {
      const dateTo = new Date(filters.dateTo);
      filteredArticles = filteredArticles.filter(
        (a) => new Date(a.date) <= dateTo
      );
    }

    if (filters.topics && filters.topics.length > 0) {
      filteredArticles = filteredArticles.filter((a) =>
        a.topics?.some((t) => filters.topics.includes(t))
      );
    }

    // Step 4: Rank articles by relevance using AI
    const rankedResults = await rankArticles(query, intent, filteredArticles);

    // Step 5: Limit results
    const limitedResults = rankedResults.slice(0, limit);

    // Step 6: Generate search suggestions
    const suggestions = await generateSuggestions(query, intent);

    return NextResponse.json({
      success: true,
      results: limitedResults,
      intent,
      suggestions,
      total: rankedResults.length,
    });
  } catch (error) {
    console.error('AI search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

/**
 * Extract search intent from natural language query
 */
async function extractIntent(query: string): Promise<SearchIntent> {
  try {
    const prompt = `You are a real estate search intent analyzer. Analyze this search query and extract the user's intent.

Query: "${query}"

Extract:
1. Action (buying, selling, investing, learning, or research)
2. Location (if mentioned - Coachella Valley cities like Palm Desert, Cathedral City, Indian Wells, etc.)
3. Topics (main topics like "market trends", "first-time buyers", "luxury homes", etc.)
4. Keywords (important search terms)

Respond in JSON format:
{
  "action": "buying" | "selling" | "investing" | "learning" | "research",
  "location": "location name or null",
  "topics": ["topic1", "topic2"],
  "keywords": ["keyword1", "keyword2"]
}`;

    const response = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const intent = JSON.parse(content);

    return {
      action: intent.action || 'research',
      location: intent.location || undefined,
      topics: intent.topics || [],
      keywords: intent.keywords || [],
    };
  } catch (error) {
    console.error('Intent extraction error:', error);
    // Fallback to basic keyword extraction
    return {
      topics: [],
      keywords: query.toLowerCase().split(/\s+/),
    };
  }
}

/**
 * Load all articles from src/posts directory
 */
async function loadAllArticles(): Promise<Article[]> {
  const postsDirectory = path.join(process.cwd(), 'src/posts');

  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  const filenames = fs.readdirSync(postsDirectory);
  const articles: Article[] = [];

  for (const filename of filenames) {
    if (!filename.endsWith('.mdx')) continue;

    const filePath = path.join(postsDirectory, filename);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContent);

    // Skip drafts in search results
    if (data.draft === true) continue;

    articles.push({
      title: data.title || '',
      excerpt: data.metaDescription || '',
      image: data.image || data.ogImage || '',
      category: data.section || 'articles',
      date: data.date || '',
      slug: data.slugId || filename.replace('.mdx', ''),
      topics: data.keywords || [],
      content: content.substring(0, 1000), // First 1000 chars for relevance
    });
  }

  return articles;
}

/**
 * Rank articles by relevance using AI
 */
async function rankArticles(
  query: string,
  intent: SearchIntent,
  articles: Article[]
): Promise<SearchResult[]> {
  try {
    // Prepare article summaries for AI ranking
    const articleSummaries = articles.map((a, idx) => ({
      index: idx,
      title: a.title,
      excerpt: a.excerpt,
      topics: a.topics?.join(', ') || '',
      category: a.category,
    }));

    const prompt = `You are a search relevance expert for real estate articles.

User query: "${query}"
Search intent: ${JSON.stringify(intent)}

Articles to rank:
${articleSummaries.map((a, i) => `${i + 1}. ${a.title}\n   Excerpt: ${a.excerpt}\n   Topics: ${a.topics}`).join('\n\n')}

For each article, assign a relevance score (0-10) based on:
- Keyword match in title/excerpt (40%)
- Semantic similarity to query (30%)
- Match with search intent (30%)

Respond in JSON format:
{
  "rankings": [
    {
      "index": 0,
      "score": 9.5,
      "reasons": ["Contains exact keyword match in title", "Highly relevant to buying intent"]
    }
  ]
}`;

    const response = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const rankings = JSON.parse(content).rankings || [];

    // Build search results
    const results: SearchResult[] = rankings
      .map((r: any) => ({
        article: articles[r.index],
        relevanceScore: r.score || 0,
        matchReasons: r.reasons || [],
      }))
      .sort((a: SearchResult, b: SearchResult) => b.relevanceScore - a.relevanceScore);

    return results;
  } catch (error) {
    console.error('Ranking error:', error);
    // Fallback to basic keyword matching
    return articles.map((article) => {
      const score = calculateBasicRelevance(query, article);
      return {
        article,
        relevanceScore: score,
        matchReasons: ['Basic keyword matching'],
      };
    }).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
}

/**
 * Fallback basic relevance calculation
 */
function calculateBasicRelevance(query: string, article: Article): number {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);

  let score = 0;

  // Title match (40%)
  const titleLower = article.title.toLowerCase();
  queryWords.forEach((word) => {
    if (titleLower.includes(word)) score += 4;
  });

  // Excerpt match (30%)
  const excerptLower = article.excerpt.toLowerCase();
  queryWords.forEach((word) => {
    if (excerptLower.includes(word)) score += 3;
  });

  // Topics match (20%)
  const topicsLower = article.topics?.join(' ').toLowerCase() || '';
  queryWords.forEach((word) => {
    if (topicsLower.includes(word)) score += 2;
  });

  // Recency bonus (10%)
  const articleDate = new Date(article.date);
  const daysSincePublish = (Date.now() - articleDate.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSincePublish < 30) score += 1;
  if (daysSincePublish < 90) score += 0.5;

  return Math.min(score, 10);
}

/**
 * Generate search suggestions
 */
async function generateSuggestions(query: string, intent: SearchIntent): Promise<string[]> {
  try {
    const prompt = `You are a real estate search assistant. Given this search query, suggest 3-5 related searches.

User query: "${query}"
Intent: ${JSON.stringify(intent)}

Suggest related searches that would help the user find relevant real estate articles about Coachella Valley.

Respond with JSON:
{
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
}`;

    const response = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 300,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const suggestions = JSON.parse(content).suggestions || [];

    return suggestions.slice(0, 5);
  } catch (error) {
    console.error('Suggestion generation error:', error);
    return [
      'Market trends in Coachella Valley',
      'Best neighborhoods for families',
      'First-time home buyer tips',
    ];
  }
}
