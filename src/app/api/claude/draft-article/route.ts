// src/app/api/claude/draft-article/route.ts
// API endpoint to have Claude draft articles in real-time

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import dbConnect from "@/lib/mongoose";
import Article from "@/models/article";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// POST /api/claude/draft-article
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!(session?.user as any)?.isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    await dbConnect();

    const body = await req.json();
    const {
      topic,
      category,
      keywords,
      tone,
      length,
      existingArticleId,
      userMessage,
    } = body;

    // Build context for Claude
    let systemPrompt = `You are an expert real estate content writer for JPSRealtor.com, specializing in the Coachella Valley market. Your articles should be:

**Writing Style:**
- Professional yet conversational
- SEO-optimized with natural keyword integration
- Data-driven with market insights
- Action-oriented with practical advice
- Engaging and easy to read

**Content Structure:**
- Clear, compelling headlines
- Strong introductions that hook readers
- Well-organized sections with subheadings
- Bullet points and lists for readability
- Strong conclusions with clear CTAs

**Expertise Areas:**
- Coachella Valley real estate market
- Palm Desert, La Quinta, Indian Wells, Rancho Mirage
- Investment properties and ROI analysis
- Luxury real estate
- Golf communities and resort living
- Market trends and economics
- Buyer/seller guidance

**Output Format:**
Return articles in MDX format with:
- Frontmatter (title, excerpt, category, tags, seo fields)
- Well-structured content with proper headings
- Custom components where appropriate (YouTube embeds, callouts)
- Internal links to relevant listings/communities
- SEO-optimized content

**Categories:**
- articles: Broader real estate topics, economics, trends
- market-insights: Coachella Valley specific market data
- real-estate-tips: Practical buying/selling advice`;

    let userPrompt = "";

    if (existingArticleId) {
      // Editing existing article
      const existingArticle = await Article.findById(existingArticleId);
      if (!existingArticle) {
        return NextResponse.json(
          { error: "Article not found" },
          { status: 404 }
        );
      }

      userPrompt = `I need help editing this existing article:

**Current Title:** ${existingArticle.title}
**Category:** ${existingArticle.category}
**Current Content:**
${existingArticle.content}

**Requested Changes:**
${userMessage}

Please provide the updated article in MDX format with frontmatter.`;
    } else {
      // Creating new article
      userPrompt = `Please write a new ${length || "medium-length"} article about: ${topic}

**Category:** ${category || "articles"}
**Target Keywords:** ${keywords?.join(", ") || "real estate, Coachella Valley"}
**Tone:** ${tone || "professional yet approachable"}
${userMessage ? `\n**Additional Instructions:**\n${userMessage}` : ""}

Please provide a complete article in MDX format with proper frontmatter including:
- title
- excerpt (max 300 characters)
- category
- tags (array of relevant keywords)
- seo.title (max 60 characters)
- seo.description (max 160 characters)
- seo.keywords (array)

The content should be well-structured, engaging, and optimized for SEO.`;
    }

    // Stream response from Claude
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const messageStream = await anthropic.messages.create({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 4096,
            temperature: 0.7,
            system: systemPrompt,
            messages: [
              {
                role: "user",
                content: userPrompt,
              },
            ],
            stream: true,
          });

          let fullContent = "";

          for await (const event of messageStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const text = event.delta.text;
              fullContent += text;

              // Send chunk to client
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
              );
            }

            if (event.type === "message_stop") {
              // Parse the complete MDX content
              const parsed = parseMDXContent(fullContent);

              // Send completion event with parsed data
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "complete",
                    parsed,
                  })}\n\n`
                )
              );
            }
          }

          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                error: "Failed to generate content",
              })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Claude draft error:", error);
    return NextResponse.json(
      { error: "Failed to draft article" },
      { status: 500 }
    );
  }
}

// Helper function to parse MDX frontmatter and content
function parseMDXContent(mdxString: string) {
  try {
    // Extract frontmatter
    const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = mdxString.match(frontmatterRegex);

    if (!match) {
      return {
        frontmatter: {},
        content: mdxString,
      };
    }

    const frontmatterText = match[1];
    const content = match[2].trim();

    // Parse frontmatter YAML
    const frontmatter: any = {};
    const lines = frontmatterText.split("\n");
    let currentKey = "";
    let isArray = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith("-")) {
        // Array item
        const value = trimmed.substring(1).trim();
        if (isArray && currentKey) {
          if (!Array.isArray(frontmatter[currentKey])) {
            frontmatter[currentKey] = [];
          }
          frontmatter[currentKey].push(value);
        }
      } else if (trimmed.includes(":")) {
        // Key-value pair
        const colonIndex = trimmed.indexOf(":");
        const key = trimmed.substring(0, colonIndex).trim();
        const value = trimmed.substring(colonIndex + 1).trim();

        if (value === "") {
          // Start of array or object
          currentKey = key;
          isArray = true;
          frontmatter[key] = [];
        } else {
          // Simple value
          currentKey = key;
          isArray = false;

          // Handle nested objects (like seo.title)
          if (key.includes(".")) {
            const parts = key.split(".");
            if (!frontmatter[parts[0]]) {
              frontmatter[parts[0]] = {};
            }
            frontmatter[parts[0]][parts[1]] = value.replace(/^["']|["']$/g, "");
          } else {
            frontmatter[key] = value.replace(/^["']|["']$/g, "");
          }
        }
      }
    }

    return {
      frontmatter,
      content,
    };
  } catch (error) {
    console.error("Failed to parse MDX:", error);
    return {
      frontmatter: {},
      content: mdxString,
    };
  }
}
