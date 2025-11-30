import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createChatCompletion, GROQ_MODELS, GroqTool } from '@/lib/groq';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { topic, category, keywords, tone, length } = body;

    if (!topic || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: topic and category' },
        { status: 400 }
      );
    }

    // Define tools for article generation
    const tools: GroqTool[] = [
      {
        type: "function",
        function: {
          name: "generate_article_mdx",
          description: "Generate a complete MDX article with frontmatter for the blog",
          parameters: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Compelling SEO-optimized title (max 200 chars)"
              },
              excerpt: {
                type: "string",
                description: "Brief summary for previews (max 300 chars)"
              },
              content: {
                type: "string",
                description: "Full article content in MDX/Markdown format with proper headings, lists, and formatting"
              },
              tags: {
                type: "array",
                items: { type: "string" },
                description: "3-6 relevant search tags. Include: location tags (Palm Desert, La Quinta, Indian Wells, Rancho Mirage, Coachella Valley), topic tags (investment, luxury homes, first-time buyers, market trends, real estate tips, etc.), and category-specific keywords"
              },
              seoTitle: {
                type: "string",
                description: "SEO meta title (max 60 chars)"
              },
              seoDescription: {
                type: "string",
                description: "SEO meta description (max 160 chars)"
              },
              seoKeywords: {
                type: "array",
                items: { type: "string" },
                description: "5-10 SEO keywords"
              }
            },
            required: ["title", "excerpt", "content", "tags", "seoTitle", "seoDescription", "seoKeywords"]
          }
        }
      }
    ];

    // Create system prompt with writing guidelines
    const systemPrompt = `You are an expert real estate content writer for jpsrealtor.com, specializing in the Coachella Valley market (Palm Desert, La Quinta, Indian Wells, Rancho Mirage).

CRITICAL FORMATTING RULES:
- Output ONLY the article content, NO labels or meta-text
- NO "Hook:", "Introduction:", "Body:", or section labels
- Start directly with engaging content
- Use Markdown headings (##, ###) for sections ONLY, NOT labels
- NO placeholder text or instructions in the output
- Use regular paragraphs (NOT bold) for body text
- Use bold (**text**) SPARINGLY for emphasis only
- Each paragraph should be 2-4 sentences

WRITING STYLE:
- Professional yet conversational tone
- Action-oriented and opportunity-focused
- Expert but accessible (no jargon)
- Transparent and empowering
- Include local market insights

PARAGRAPH FORMATTING:
- Opening paragraph: Regular text, engaging hook
- Body paragraphs: Regular text with occasional bold for key terms
- Bullet points: Start with ✅ emoji, regular text (NOT all bold)
- Headings: Use ## for main sections, ### for subsections
- DO NOT make entire bullet points bold
- DO NOT make entire paragraphs bold

CORRECT BULLET FORMAT:
- ✅ Inventory levels rising in Palm Desert
- ✅ Strong buyer demand across Coachella Valley

INCORRECT BULLET FORMAT (DON'T DO THIS):
- ✅ **Inventory levels rising** – after a historic low...
- ✅ **Strong buyer demand** – properties selling fast...

STRUCTURE:
1. Opening paragraph (2-3 sentences, regular text)
2. ## Main Section Heading
3. Regular paragraphs explaining the topic
4. Bullet points with ✅ for key takeaways
5. ### Subsection if needed
6. More regular paragraphs
7. End with contact section

MDX COMPONENTS (use when appropriate):
- For YouTube videos: <YouTube id="VIDEO_ID" />
- Links: [text](url)
- Images: ![alt](url)

CONTACT INFO (always include at end):
## Get Expert Guidance

Ready to make your move in the Coachella Valley? Contact Joseph Sardella for personalized real estate guidance.

📞 Call or Text: **+1 (760) 833-6334**
📧 Email: **josephsardella@gmail.com**

KEYWORDS TO INCLUDE:
Always mention: Coachella Valley, Palm Desert, La Quinta, Indian Wells, Rancho Mirage
Category-specific: ${category === 'market-insights' ? 'market trends, ROI, investment, property values' : category === 'real-estate-tips' ? 'homebuying tips, financing, negotiation, inspection' : 'real estate market, housing trends, economics'}

COMPLETE FORMAT EXAMPLE:

The Coachella Valley real estate market is experiencing remarkable growth this year. With rising inventory levels and strong buyer demand, both investors and homebuyers have excellent opportunities across Palm Desert, La Quinta, Indian Wells, and Rancho Mirage.

## Current Market Trends

The market has shifted significantly in recent months. Properties are moving faster than anticipated, and pricing has stabilized after the post-pandemic surge.

Key indicators show:

- ✅ Inventory levels rising by 12% year-over-year
- ✅ Median prices stabilizing around $785,000 in La Quinta
- ✅ Average days on market down to 21 days in Indian Wells
- ✅ New construction permits up 15% in Rancho Mirage

### Investment Opportunities

Palm Desert offers exceptional ROI potential for savvy investors. The combination of tourism demand and limited luxury inventory creates a perfect storm for appreciation. Short-term rental properties can achieve 8-10% cap rates in well-located areas.

Use the generate_article_mdx tool to create the article.`;

    const userPrompt = `Topic: ${topic}
Category: ${category}
${keywords && keywords.length > 0 ? `Keywords to include: ${keywords.join(', ')}` : ''}
${tone ? `Tone: ${tone}` : ''}
${length ? `Length: ${length}` : 'Length: comprehensive (1000-1500 words)'}

Create a complete, engaging article following all guidelines. Make it actionable and SEO-optimized.`;

    // Call Groq with tool use
    const completion = await createChatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: GROQ_MODELS.PREMIUM, // Use gpt-oss-120b for better quality
      temperature: 0.7,
      maxTokens: 4000,
      tools,
      tool_choice: { type: "function", function: { name: "generate_article_mdx" } }
    });

    const message = completion.choices[0]?.message;

    if (!message?.tool_calls || message.tool_calls.length === 0) {
      return NextResponse.json(
        { error: 'No article generated. Please try again.' },
        { status: 500 }
      );
    }

    const toolCall = message.tool_calls[0];
    const articleData = JSON.parse(toolCall.function.arguments);

    // Create complete MDX with frontmatter
    const mdx = `---
title: "${articleData.title}"
excerpt: "${articleData.excerpt}"
date: "${new Date().toISOString().split('T')[0]}"
category: "${category}"
tags: ${JSON.stringify(articleData.tags)}
status: "draft"
featured: false
featuredImage:
  url: "/images/articles/placeholder.jpg"
  alt: "${articleData.title}"
seo:
  title: "${articleData.seoTitle}"
  description: "${articleData.seoDescription}"
  keywords: ${JSON.stringify(articleData.seoKeywords)}
author:
  name: "Joseph Sardella"
  email: "josephsardella@gmail.com"
---

${articleData.content}
`;

    return NextResponse.json({
      success: true,
      article: {
        title: articleData.title,
        excerpt: articleData.excerpt,
        content: articleData.content,
        mdx,
        tags: articleData.tags,
        seo: {
          title: articleData.seoTitle,
          description: articleData.seoDescription,
          keywords: articleData.seoKeywords
        }
      }
    });

  } catch (error: any) {
    console.error('Error generating article:', error);
    return NextResponse.json(
      { error: 'Failed to generate article', details: error.message },
      { status: 500 }
    );
  }
}
