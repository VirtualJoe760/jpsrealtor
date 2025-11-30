import { createChatCompletion, GROQ_MODELS } from '@/lib/groq';
import { validateField } from '@/lib/article-digester';

/**
 * Layer 4: Field Regeneration Service
 *
 * Regenerates individual article fields using AI while maintaining context.
 * Each field has custom system prompts optimized for that specific type.
 */

export type RegenerableField =
  | 'title'
  | 'excerpt'
  | 'content'
  | 'seoTitle'
  | 'seoDescription'
  | 'keywords';

export interface RegenerationContext {
  field: RegenerableField;
  currentValue: string | string[];
  articleContext: {
    title?: string;
    excerpt?: string;
    content?: string;
    category: string;
    keywords: string[];
  };
  userPrompt?: string;
}

export interface RegenerationResult {
  field: RegenerableField;
  newValue: string | string[];
  success: boolean;
  error?: string;
}

/**
 * Regenerate a specific field using AI with full article context
 */
export async function regenerateField(
  context: RegenerationContext
): Promise<RegenerationResult> {
  try {
    const systemPrompt = buildSystemPrompt(context.field);
    const userPrompt = buildUserPrompt(context);

    const response = await createChatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model: GROQ_MODELS.PREMIUM,
      temperature: 0.7,
      maxTokens: context.field === 'content' ? 4000 : 500,
    });

    const newValue = extractFieldValue(
      response.choices[0]?.message?.content || '',
      context.field
    );

    // Validate the regenerated value
    const validation = validateField(context.field, newValue);
    if (!validation.isValid) {
      return {
        field: context.field,
        newValue: context.currentValue,
        success: false,
        error: validation.error,
      };
    }

    return {
      field: context.field,
      newValue,
      success: true,
    };
  } catch (error) {
    return {
      field: context.field,
      newValue: context.currentValue,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Build field-specific system prompts optimized for each type
 */
function buildSystemPrompt(field: RegenerableField): string {
  const prompts: Record<RegenerableField, string> = {
    title: `You are an expert headline writer for real estate articles about the Coachella Valley.

Generate compelling, SEO-optimized titles that:
- Are 50-200 characters long
- Include location keywords (Coachella Valley, Palm Desert, La Quinta, Indian Wells, Rancho Mirage)
- Use action-oriented language
- Create curiosity without clickbait
- Follow AP style capitalization

GOOD EXAMPLES:
✅ "Why Coachella Valley Real Estate is Booming in 2025"
✅ "Palm Desert Investment Opportunities: A Complete Guide"
✅ "5 Things to Know About Buying in La Quinta This Year"

BAD EXAMPLES:
❌ "You Won't Believe These Real Estate Secrets!" (clickbait)
❌ "real estate market trends" (not capitalized, boring)
❌ "The Ultimate Guide to Everything About Real Estate in the Entire Coachella Valley Region" (too long)

Return ONLY the title, nothing else. No quotes, no explanation, just the title text.`,

    excerpt: `You are an expert at writing compelling article excerpts for real estate content.

Generate excerpts that:
- Are 150-300 characters long
- Summarize the article's main value proposition
- Include a benefit or call-to-action
- Use active voice
- Avoid redundancy with the title
- Include location keywords naturally

STRUCTURE:
1. What problem/question does this address?
2. What value does the article provide?
3. Who should read it?

GOOD EXAMPLE:
"Discover the latest market trends, investment hotspots, and expert insights for buying or selling property in the Coachella Valley. Your guide to making smart real estate decisions in 2025."

BAD EXAMPLES:
❌ "This article talks about real estate." (too vague)
❌ "In this comprehensive guide, we will explore various aspects..." (too formal, wordy)

Return ONLY the excerpt, nothing else. No quotes, no explanation.`,

    content: `You are an expert real estate content writer for jpsrealtor.com, specializing in Coachella Valley.

CRITICAL FORMATTING RULES:
- Use ## for main headings (H2), ### for subheadings (H3)
- Use bold (**text**) SPARINGLY - max 1-2 times per section for critical emphasis
- ZERO bold in bullet points
- Professional yet conversational tone
- Include contact info at end

BOLD TEXT USAGE:
- Body paragraphs: 95% regular text
- Only bold single words or short phrases for critical emphasis
- NEVER bold entire sentences
- If in doubt, DO NOT use bold

STRUCTURE:
1. Opening paragraph (2-3 sentences, regular text)
2. ## Main Section Heading
3. Regular paragraphs explaining the topic
4. Bullet points with ✅ for key takeaways (NO BOLD)
5. ### Subsection if needed
6. More regular paragraphs
7. Contact section at end

CORRECT BULLET FORMAT:
- ✅ Inventory levels rising in Palm Desert
- ✅ Strong buyer demand across Coachella Valley
- ✅ Median home prices stabilizing around $785,000

INCORRECT (NEVER DO THIS):
- ✅ **Inventory levels rising** – after a historic low...
- ✅ **Strong buyer demand** – properties selling fast...

CONTACT SECTION (always include at end):
## Get Expert Guidance

Ready to make your move in the Coachella Valley? Contact Joseph Sardella for personalized real estate guidance.

📞 Call or Text: **+1 (760) 833-6334**
📧 Email: **josephsardella@gmail.com**

Return ONLY the MDX content, nothing else. No meta-commentary.`,

    seoTitle: `You are an SEO expert specializing in real estate meta titles.

Generate SEO meta titles that:
- Are 50-60 characters (STRICT limit for Google display)
- Include primary keyword first
- Avoid filler words (the, a, an)
- Create urgency or value proposition
- Include location

FORMULA: [Primary Keyword] [Location] [Year/Benefit] | [Brand]

GOOD EXAMPLES:
✅ "Coachella Valley Real Estate Guide 2025 | JPSRealtor" (57 chars)
✅ "Palm Desert Market Trends & Investment Tips 2025" (49 chars)

BAD EXAMPLES:
❌ "The Complete and Comprehensive Guide to Real Estate in the Beautiful Coachella Valley" (too long - 87 chars!)
❌ "Real Estate" (too short, no value)

Return ONLY the SEO title, nothing else. Maximum 60 characters.`,

    seoDescription: `You are an SEO expert specializing in real estate meta descriptions.

Generate SEO meta descriptions that:
- Are 150-160 characters (STRICT limit for Google display)
- Include primary and secondary keywords naturally
- Have a clear call-to-action
- Avoid special characters that break SERP display
- Create urgency or value

FORMULA: [What you'll learn] + [Benefit] + [CTA] + [Location]

GOOD EXAMPLE:
"Expert insights on Coachella Valley real estate. Find investment opportunities, market trends, and local expertise. Contact Joseph Sardella today!" (154 chars)

BAD EXAMPLES:
❌ "Read this article about real estate in the Coachella Valley area to learn more about buying and selling homes and investment properties with expert guidance from local realtors." (too long - 180 chars!)
❌ "Real estate tips." (too short - no value)

Return ONLY the SEO description, nothing else. Maximum 160 characters.`,

    keywords: `You are an SEO keyword researcher for real estate content.

Generate 5-8 SEO keywords for this article that:
- Include location-specific terms (Coachella Valley, Palm Desert, La Quinta, Indian Wells, Rancho Mirage)
- Include topic-specific terms
- Include long-tail keywords (3-5 words)
- Mix high-volume and low-competition terms

FORMAT: Return as a comma-separated list

GOOD EXAMPLE:
"Coachella Valley real estate, Palm Desert investment properties, La Quinta market trends 2025, buying a home in Indian Wells, Rancho Mirage luxury homes, desert real estate tips"

BAD EXAMPLE:
❌ "real estate, homes, property" (too generic, no location)

Return ONLY comma-separated keywords, nothing else.`,
  };

  return prompts[field];
}

/**
 * Build user prompt with article context
 */
function buildUserPrompt(context: RegenerationContext): string {
  let prompt = 'Article Context:\n\n';

  // Add available context
  if (context.articleContext.title) {
    prompt += `Title: ${context.articleContext.title}\n`;
  }
  if (context.articleContext.excerpt) {
    prompt += `Excerpt: ${context.articleContext.excerpt}\n`;
  }
  if (context.articleContext.category) {
    prompt += `Category: ${context.articleContext.category}\n`;
  }
  if (context.articleContext.keywords && context.articleContext.keywords.length > 0) {
    prompt += `Keywords: ${context.articleContext.keywords.join(', ')}\n`;
  }

  // Show current value
  const currentValueStr = Array.isArray(context.currentValue)
    ? context.currentValue.join(', ')
    : context.currentValue;

  prompt += `\nCurrent ${context.field}:\n${currentValueStr || `(No ${context.field} yet)`}\n`;

  // Add user instructions if provided
  if (context.userPrompt && context.userPrompt.trim()) {
    prompt += `\nUser Instructions: ${context.userPrompt}\n`;
  }

  prompt += `\nGenerate a new ${context.field} for this article. Follow all guidelines and return ONLY the new ${context.field} value.`;

  return prompt;
}

/**
 * Extract and clean field value from AI response
 */
function extractFieldValue(
  response: string,
  field: RegenerableField
): string | string[] {
  const cleaned = response.trim();

  // Remove common wrapper patterns
  const unwrapped = cleaned
    .replace(/^["']|["']$/g, '') // Remove quotes
    .replace(/^`|`$/g, '')       // Remove backticks
    .trim();

  // Keywords are comma-separated
  if (field === 'keywords') {
    return unwrapped
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
  }

  return unwrapped;
}
