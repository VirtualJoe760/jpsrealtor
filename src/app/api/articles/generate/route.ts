import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createChatCompletion, GROQ_MODELS, GroqTool } from '@/lib/groq';
import { digestAIResponse } from '@/lib/article-digester';

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
                description: "Full article content in MDX/Markdown format. Use regular paragraphs (NOT bold). Use bold (**text**) ONLY for critical emphasis (1-2 times per section max). Use ## for main headings, ### for subheadings. Use bullet points with ✅ emoji in regular text."
              },
              altText: {
                type: "string",
                description: "Alt text for featured image describing the article topic"
              },
              metaTitle: {
                type: "string",
                description: "SEO meta title (max 60 chars)"
              },
              metaDescription: {
                type: "string",
                description: "SEO meta description (max 160 chars)"
              },
              keywords: {
                type: "array",
                items: { type: "string" },
                description: "5-10 SEO keywords including location (Coachella Valley, Palm Desert, La Quinta, Indian Wells, Rancho Mirage) and topic-specific terms"
              }
            },
            required: ["title", "excerpt", "content", "altText", "metaTitle", "metaDescription", "keywords"]
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

BOLD TEXT USAGE - EXTREMELY IMPORTANT:
- Use bold (**text**) MAXIMUM 1-2 times per major section
- NEVER use bold for entire sentences or bullet points
- NEVER use bold for contact information (phone/email already shown)
- Body paragraphs should be 95% regular text
- Only use bold for critical emphasis of single words or short phrases
- If in doubt, DO NOT use bold

WRITING STYLE:
- Professional yet conversational tone
- Action-oriented and opportunity-focused
- Expert but accessible (no jargon)
- Transparent and empowering
- Include local market insights

PARAGRAPH FORMATTING:
- Opening paragraph: Regular text ONLY, no bold
- Body paragraphs: Regular text, max 1 bold phrase if critical
- Bullet points: ✅ emoji + regular text (ZERO bold allowed)
- Headings: Use ## for main sections, ### for subsections
- Contact section: Regular text for context, bold ONLY for phone/email values

CORRECT BULLET FORMAT (NO BOLD):
- ✅ Inventory levels rising in Palm Desert
- ✅ Strong buyer demand across Coachella Valley
- ✅ Median home prices stabilizing around $785,000

INCORRECT BULLET FORMAT (NEVER DO THIS):
- ✅ **Inventory levels rising** – after a historic low...
- ✅ **Strong buyer demand** – properties selling fast...
- ✅ **Median prices** stabilizing around $785,000

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
    const rawArticleData = JSON.parse(toolCall.function.arguments);

    // NEW: Digest and validate AI response using Layer 1
    const digested = await digestAIResponse(rawArticleData, category);

    // Check validation
    if (!digested.validation.isValid) {
      return NextResponse.json({
        success: false,
        errors: digested.validation.errors,
      }, { status: 400 });
    }

    // Log warnings if any
    if (digested.validation.warnings.length > 0) {
      console.warn('AI generation warnings:', digested.validation.warnings);
    }

    // Category becomes the primary tag
    const tags = [category];

    // Return structured response matching CMS form fields
    return NextResponse.json({
      success: true,
      article: {
        title: digested.title,
        slugId: digested.slugId, // Auto-generated by digester
        excerpt: digested.excerpt,
        content: digested.content,
        category: category, // Maps to "section" in frontmatter
        tags: tags, // Primary tag is the category
        featuredImage: {
          url: "",
          publicId: "",
          alt: digested.altText,
        },
        seo: {
          title: digested.metaTitle,
          description: digested.metaDescription,
          keywords: digested.keywords
        }
      },
      warnings: digested.validation.warnings, // Include warnings in response
    });

  } catch (error: any) {
    console.error('Error generating article:', error);
    return NextResponse.json(
      { error: 'Failed to generate article', details: error.message },
      { status: 500 }
    );
  }
}
