import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

interface Topic {
  name: string;
  count: number;
  category?: 'location' | 'topic' | 'audience';
  slug: string;
}

/**
 * GET /api/articles/topics
 *
 * Auto-generates topic cloud from all published articles
 */
export async function GET() {
  try {
    const postsDirectory = path.join(process.cwd(), 'src/posts');

    if (!fs.existsSync(postsDirectory)) {
      return NextResponse.json({
        success: true,
        topics: [],
      });
    }

    // Load all articles
    const filenames = fs.readdirSync(postsDirectory);
    const articles: { keywords: string[]; title: string; excerpt: string }[] = [];

    for (const filename of filenames) {
      if (!filename.endsWith('.mdx')) continue;

      const filePath = path.join(postsDirectory, filename);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const { data } = matter(fileContent);

      // Skip drafts
      if (data.draft === true) continue;

      articles.push({
        keywords: data.keywords || [],
        title: data.title || '',
        excerpt: data.metaDescription || '',
      });
    }

    // Extract all keywords and count frequency
    const keywordCount: Record<string, number> = {};

    articles.forEach((article) => {
      article.keywords.forEach((keyword) => {
        const normalized = keyword.trim();
        if (normalized) {
          keywordCount[normalized] = (keywordCount[normalized] || 0) + 1;
        }
      });
    });

    // Convert to topic array
    const topics = Object.entries(keywordCount).map(([name, count]) => ({
      name,
      count,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
    }));

    // Use AI to categorize topics (location, topic, audience)
    const categorizedTopics = await categorizeTopics(topics);

    return NextResponse.json({
      success: true,
      topics: categorizedTopics,
      total: categorizedTopics.length,
    });
  } catch (error) {
    console.error('Topic extraction error:', error);
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
 * Categorize topics using AI
 */
async function categorizeTopics(topics: Topic[]): Promise<Topic[]> {
  try {
    // Only categorize top 50 topics for efficiency
    const topTopics = topics.sort((a, b) => b.count - a.count).slice(0, 50);

    const prompt = `You are a real estate topic categorization expert for Coachella Valley.

Topics to categorize:
${topTopics.map((t) => `- ${t.name} (${t.count} articles)`).join('\n')}

Categorize each topic as:
- "location": Geographic locations (cities, neighborhoods, areas)
- "topic": General real estate topics (market trends, buying, selling, etc.)
- "audience": Target audiences (first-time buyers, investors, families, etc.)

Respond in JSON format:
{
  "categories": {
    "Palm Desert": "location",
    "First-Time Buyers": "audience",
    "Market Trends": "topic",
    ...
  }
}`;

    const response = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || '{}';
    const categories = JSON.parse(content).categories || {};

    // Apply categories to topics
    return topics.map((topic) => ({
      ...topic,
      category: categories[topic.name] || 'topic',
    }));
  } catch (error) {
    console.error('Topic categorization error:', error);

    // Fallback to basic categorization
    return topics.map((topic) => ({
      ...topic,
      category: categorizeBasic(topic.name),
    }));
  }
}

/**
 * Fallback basic categorization
 */
function categorizeBasic(topicName: string): 'location' | 'topic' | 'audience' {
  const lower = topicName.toLowerCase();

  // Location keywords
  const locations = [
    'palm desert',
    'cathedral city',
    'indian wells',
    'rancho mirage',
    'la quinta',
    'palm springs',
    'indio',
    'coachella',
    'desert hot springs',
    'thousand palms',
  ];

  if (locations.some((loc) => lower.includes(loc))) {
    return 'location';
  }

  // Audience keywords
  const audiences = [
    'buyer',
    'seller',
    'investor',
    'family',
    'families',
    'first-time',
    'senior',
    'retiree',
    'luxury',
  ];

  if (audiences.some((aud) => lower.includes(aud))) {
    return 'audience';
  }

  // Default to topic
  return 'topic';
}
