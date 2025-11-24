// scripts/ai-index/build-insights-index.ts
// Scrapes all insights posts and creates vector embeddings using Ollama

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { execSync } from 'child_process';

// Configuration
const POSTS_DIR = path.join(process.cwd(), 'src', 'posts');
const OUTPUT_DIR = path.join(process.cwd(), 'ai-data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'insights.index.json');
const EMBEDDING_MODEL = 'nomic-embed-text'; // Ollama model for embeddings
const CHUNK_SIZE = 600; // Target token size per chunk
const OLLAMA_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';

interface PostMetadata {
  title: string;
  slugId: string;
  date: string;
  section: string;
  description: string;
  image?: string;
  altText?: string;
  keywords?: string[];
}

interface TextChunk {
  postSlug: string;
  postTitle: string;
  postSection: string;
  postUrl: string;
  chunkIndex: number;
  heading?: string;
  text: string;
  tokenCount: number;
}

interface IndexedChunk extends TextChunk {
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
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Strip MDX/Markdown syntax for cleaner text
 */
function stripMarkdown(content: string): string {
  return content
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code
    .replace(/`[^`]+`/g, '')
    // Remove images
    .replace(/!\[.*?\]\(.*?\)/g, '')
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    // Remove headings markers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic
    .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1')
    // Remove HTML tags
    .replace(/<[^>]+>/g, '')
    // Remove YouTube embeds
    .replace(/<YouTube[^>]*\/>/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract headings from markdown content
 */
function extractHeadings(content: string): { level: number; text: string; position: number }[] {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const headings: { level: number; text: string; position: number }[] = [];

  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    headings.push({
      level: match[1].length,
      text: match[2].trim(),
      position: match.index
    });
  }

  return headings;
}

/**
 * Chunk text into ~600 token segments with context awareness
 */
function chunkText(
  content: string,
  metadata: PostMetadata
): TextChunk[] {
  const chunks: TextChunk[] = [];
  const headings = extractHeadings(content);
  const strippedContent = stripMarkdown(content);

  // Split by sentences
  const sentences = strippedContent.split(/[.!?]+\s+/).filter(s => s.trim());

  let currentChunk = '';
  let currentHeading: string | undefined;
  let chunkIndex = 0;
  let currentPosition = 0;

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);
    const currentTokens = estimateTokens(currentChunk);

    // Find current heading based on position
    const relevantHeading = headings
      .filter(h => h.position <= currentPosition)
      .sort((a, b) => b.position - a.position)[0];

    if (relevantHeading && relevantHeading.text !== currentHeading) {
      // New section - save current chunk and start new one
      if (currentChunk.trim()) {
        chunks.push({
          postSlug: metadata.slugId,
          postTitle: metadata.title,
          postSection: metadata.section,
          postUrl: `/insights/${metadata.section}/${metadata.slugId}`,
          chunkIndex: chunkIndex++,
          heading: currentHeading,
          text: currentChunk.trim(),
          tokenCount: estimateTokens(currentChunk)
        });
      }

      currentChunk = sentence + '. ';
      currentHeading = relevantHeading.text;
    } else if (currentTokens + sentenceTokens > CHUNK_SIZE) {
      // Chunk too large - save and start new
      if (currentChunk.trim()) {
        chunks.push({
          postSlug: metadata.slugId,
          postTitle: metadata.title,
          postSection: metadata.section,
          postUrl: `/insights/${metadata.section}/${metadata.slugId}`,
          chunkIndex: chunkIndex++,
          heading: currentHeading,
          text: currentChunk.trim(),
          tokenCount: estimateTokens(currentChunk)
        });
      }

      currentChunk = sentence + '. ';
    } else {
      // Add to current chunk
      currentChunk += sentence + '. ';
    }

    currentPosition += sentence.length;
  }

  // Save final chunk
  if (currentChunk.trim()) {
    chunks.push({
      postSlug: metadata.slugId,
      postTitle: metadata.title,
      postSection: metadata.section,
      postUrl: `/insights/${metadata.section}/${metadata.slugId}`,
      chunkIndex: chunkIndex++,
      heading: currentHeading,
      text: currentChunk.trim(),
      tokenCount: estimateTokens(currentChunk)
    });
  }

  return chunks;
}

/**
 * Generate embedding using Ollama API
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        prompt: text
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    return data.embedding;
  } catch (error) {
    console.error(`❌ Failed to generate embedding:`, error);
    throw error;
  }
}

/**
 * Check if Ollama is running and model is available
 */
async function checkOllamaAvailability(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!response.ok) return false;

    const data = await response.json();
    const hasModel = data.models?.some((m: any) => m.name.includes(EMBEDDING_MODEL));

    if (!hasModel) {
      console.log(`\n⚠️  Model ${EMBEDDING_MODEL} not found locally.`);
      console.log(`   Pulling model from Ollama registry...`);

      try {
        execSync(`ollama pull ${EMBEDDING_MODEL}`, { stdio: 'inherit' });
        return true;
      } catch (pullError) {
        console.error(`❌ Failed to pull model:`, pullError);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error(`❌ Ollama is not running or not accessible at ${OLLAMA_URL}`);
    console.log(`   Please start Ollama: ollama serve`);
    return false;
  }
}

/**
 * Main execution
 */
async function buildInsightsIndex() {
  console.log('🚀 Building Insights Vector Index\n');
  console.log(`📁 Posts directory: ${POSTS_DIR}`);
  console.log(`💾 Output file: ${OUTPUT_FILE}`);
  console.log(`🤖 Embedding model: ${EMBEDDING_MODEL}`);
  console.log(`🔗 Ollama URL: ${OLLAMA_URL}\n`);

  // Check Ollama availability
  console.log('🔍 Checking Ollama availability...');
  const ollamaReady = await checkOllamaAvailability();

  if (!ollamaReady) {
    console.error('\n❌ Cannot proceed without Ollama. Exiting.\n');
    process.exit(1);
  }

  console.log('✅ Ollama is ready\n');

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Read all posts
  console.log('📖 Reading posts...');
  const fileNames = fs.readdirSync(POSTS_DIR)
    .filter(name => /\.(md|mdx)$/.test(name));

  console.log(`   Found ${fileNames.length} posts\n`);

  // Process all posts into chunks
  const allChunks: TextChunk[] = [];

  for (const fileName of fileNames) {
    const filePath = path.join(POSTS_DIR, fileName);
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContents);

    const metadata: PostMetadata = {
      title: data.title || '',
      slugId: path.basename(fileName, path.extname(fileName)),
      date: new Date(data.date).toISOString(),
      section: data.section || '',
      description: data.metaDescription || '',
      image: data.image,
      altText: data.altText,
      keywords: data.keywords || []
    };

    const chunks = chunkText(content, metadata);
    allChunks.push(...chunks);

    console.log(`   ✓ ${metadata.title} → ${chunks.length} chunks`);
  }

  console.log(`\n📊 Total chunks: ${allChunks.length}\n`);

  // Generate embeddings
  console.log('🔮 Generating embeddings...');
  const indexedChunks: IndexedChunk[] = [];

  for (let i = 0; i < allChunks.length; i++) {
    const chunk = allChunks[i];
    process.stdout.write(`\r   Progress: ${i + 1}/${allChunks.length} (${Math.round((i + 1) / allChunks.length * 100)}%)`);

    try {
      const embedding = await generateEmbedding(chunk.text);
      indexedChunks.push({
        ...chunk,
        embedding
      });
    } catch (error) {
      console.error(`\n   ❌ Failed to embed chunk ${i + 1}:`, error);
      // Continue with next chunk
    }
  }

  console.log('\n');

  // Build final index
  const index: InsightsIndex = {
    generatedAt: new Date().toISOString(),
    embeddingModel: EMBEDDING_MODEL,
    totalPosts: fileNames.length,
    totalChunks: indexedChunks.length,
    chunks: indexedChunks
  };

  // Save to file
  console.log('💾 Saving index...');
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(index, null, 2));

  const fileSizeMB = (fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2);

  console.log('\n✨ Index built successfully!\n');
  console.log(`📊 Statistics:`);
  console.log(`   Posts indexed: ${index.totalPosts}`);
  console.log(`   Total chunks: ${index.totalChunks}`);
  console.log(`   Avg chunks per post: ${(index.totalChunks / index.totalPosts).toFixed(1)}`);
  console.log(`   Index file size: ${fileSizeMB} MB`);
  console.log(`   Output: ${OUTPUT_FILE}\n`);
}

// Run the indexer
buildInsightsIndex().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
