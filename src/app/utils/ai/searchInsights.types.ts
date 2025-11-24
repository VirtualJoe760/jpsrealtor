// src/app/utils/ai/searchInsights.types.ts
// Types for JPS Insights search results (safe for client/server import)

export interface InsightResult {
  postSlug: string;
  postTitle: string;
  postSection: string;
  postUrl: string;
  chunkIndex: number;
  heading?: string;
  excerpt: string;
  similarity: number;
}
