// src/app/utils/ai/searchInsights.ts
// Semantic search for JPS Insights using vector embeddings
// NOTE: This file uses Node.js APIs (fs, path) and should only be called server-side
// Safe to import in client components via dynamic imports in ai-functions.ts

import type { InsightResult } from './searchInsights.types';

const OLLAMA_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';
const EMBEDDING_MODEL = 'nomic-embed-text';

interface IndexedChunk {
  postSlug: string;
  postTitle: string;
  postSection: string;
  postUrl: string;
  chunkIndex: number;
  heading?: string;
  text: string;
  tokenCount: number;
  embedding: number[];
}

interface InsightsIndex {
  generatedAt: string;
  embeddingModel: string;
  totalPosts: number;
  totalChunks: number;
  chunks: IndexedChunk[];
}

/**
 * Load insights index from disk
 */
function loadIndex(): InsightsIndex | null {
  try {
    // Lazy-load Node.js modules only when function is called
    const fs = require('fs');
    const path = require('path');
    const INDEX_PATH = path.join(process.cwd(), 'ai-data', 'insights.index.json');

    if (!fs.existsSync(INDEX_PATH)) {
      console.error(`❌ Insights index not found at ${INDEX_PATH}`);
      console.log('   Run: npx tsx scripts/ai-index/build-insights-index.ts');
      return null;
    }

    const indexData = fs.readFileSync(INDEX_PATH, 'utf8');
    return JSON.parse(indexData);
  } catch (error) {
    console.error('❌ Failed to load insights index:', error);
    return null;
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Generate embedding for query using Ollama
 */
async function embedQuery(query: string): Promise<number[] | null> {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        prompt: query
      })
    });

    if (!response.ok) {
      console.error(`❌ Ollama API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.embedding;
  } catch (error) {
    console.error('❌ Failed to generate query embedding:', error);
    return null;
  }
}

/**
 * Create excerpt from text (truncate to ~200 chars)
 */
function createExcerpt(text: string, maxLength: number = 200): string {
  if (text.length <= maxLength) return text;

  // Try to cut at sentence boundary
  const truncated = text.substring(0, maxLength);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastQuestion = truncated.lastIndexOf('?');
  const lastExclamation = truncated.lastIndexOf('!');

  const lastSentence = Math.max(lastPeriod, lastQuestion, lastExclamation);

  if (lastSentence > maxLength * 0.7) {
    return truncated.substring(0, lastSentence + 1);
  }

  // No good sentence boundary - cut at word
  const lastSpace = truncated.lastIndexOf(' ');
  return truncated.substring(0, lastSpace) + '...';
}

/**
 * Search insights for relevant content
 *
 * @param query - User's search query
 * @param limit - Maximum number of results to return (default 5)
 * @param minScore - Minimum similarity score to include (default 0.5)
 * @returns Array of relevant insight results sorted by relevance
 */
export async function searchInsights(
  query: string,
  limit: number = 5,
  minScore: number = 0.5
): Promise<InsightResult[]> {
  // Load index
  const index = loadIndex();
  if (!index) {
    console.error('❌ Cannot search: index not loaded');
    return [];
  }

  // Generate query embedding
  const queryEmbedding = await embedQuery(query);
  if (!queryEmbedding) {
    console.error('❌ Cannot search: failed to embed query');
    return [];
  }

  // Calculate similarities
  const scoredChunks = index.chunks.map(chunk => ({
    chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding)
  }));

  // Filter by minimum score and sort by relevance
  const relevantChunks = scoredChunks
    .filter(item => item.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // Format results
  const results: InsightResult[] = relevantChunks.map(item => ({
    title: item.chunk.postTitle,
    url: item.chunk.postUrl,
    excerpt: createExcerpt(item.chunk.text),
    section: item.chunk.postSection,
    heading: item.chunk.heading,
    score: Math.round(item.score * 100) / 100 // Round to 2 decimals
  }));

  return results;
}

/**
 * Search insights by category/section
 */
export async function searchInsightsBySection(
  section: string,
  query: string,
  limit: number = 3
): Promise<InsightResult[]> {
  const index = loadIndex();
  if (!index) return [];

  const queryEmbedding = await embedQuery(query);
  if (!queryEmbedding) return [];

  // Filter chunks by section first
  const sectionChunks = index.chunks.filter(
    chunk => chunk.postSection.toLowerCase() === section.toLowerCase()
  );

  // Score and sort
  const scoredChunks = sectionChunks
    .map(chunk => ({
      chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scoredChunks.map(item => ({
    title: item.chunk.postTitle,
    url: item.chunk.postUrl,
    excerpt: createExcerpt(item.chunk.text),
    section: item.chunk.postSection,
    heading: item.chunk.heading,
    score: Math.round(item.score * 100) / 100
  }));
}

/**
 * Get index statistics (useful for debugging)
 */
export function getIndexStats(): {
  available: boolean;
  generatedAt?: string;
  totalPosts?: number;
  totalChunks?: number;
  embeddingModel?: string;
} {
  const index = loadIndex();

  if (!index) {
    return { available: false };
  }

  return {
    available: true,
    generatedAt: index.generatedAt,
    totalPosts: index.totalPosts,
    totalChunks: index.totalChunks,
    embeddingModel: index.embeddingModel
  };
}

/**
 * Check if Ollama is available
 */
export async function checkOllamaStatus(): Promise<{
  available: boolean;
  modelLoaded: boolean;
  url: string;
}> {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    if (!response.ok) {
      return {
        available: false,
        modelLoaded: false,
        url: OLLAMA_URL
      };
    }

    const data = await response.json();
    const hasModel = data.models?.some((m: any) =>
      m.name.includes(EMBEDDING_MODEL)
    );

    return {
      available: true,
      modelLoaded: hasModel,
      url: OLLAMA_URL
    };
  } catch (error) {
    return {
      available: false,
      modelLoaded: false,
      url: OLLAMA_URL
    };
  }
}
