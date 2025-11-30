import { z } from 'zod';

/**
 * Layer 1: AI Response Processor
 *
 * Validates and sanitizes AI-generated content before using it.
 * Uses Zod for schema validation to ensure all fields meet requirements.
 */

// Validation schema for AI-generated articles
const ArticleSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters').max(200, 'Title must be less than 200 characters'),
  excerpt: z.string().min(50, 'Excerpt must be at least 50 characters').max(300, 'Excerpt must be less than 300 characters'),
  content: z.string().min(500, 'Content must be at least 500 characters'),
  altText: z.string().min(10, 'Alt text must be at least 10 characters'),
  metaTitle: z.string().min(10, 'SEO title must be at least 10 characters').max(60, 'SEO title must be less than 60 characters'),
  metaDescription: z.string().min(50, 'SEO description must be at least 50 characters').max(160, 'SEO description must be less than 160 characters'),
  keywords: z.array(z.string()).min(3, 'At least 3 keywords required').max(10, 'Maximum 10 keywords allowed'),
});

export interface DigestedArticle {
  title: string;
  slugId: string;
  excerpt: string;
  content: string;
  altText: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

/**
 * Process AI response and validate all fields
 *
 * @param rawResponse - Raw response from AI function calling
 * @param category - Article category (used for default tags)
 * @returns Digested and validated article data
 */
export async function digestAIResponse(
  rawResponse: any,
  category: string
): Promise<DigestedArticle> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Validate with Zod
    const validated = ArticleSchema.parse(rawResponse);

    // Check for bold text overuse
    const boldCount = (validated.content.match(/\*\*/g) || []).length / 2;
    const paragraphCount = validated.content.split('\n\n').filter(p => p.trim().length > 0).length;

    if (boldCount > paragraphCount * 2) {
      warnings.push(`Excessive bold text detected (${boldCount} uses in ${paragraphCount} paragraphs) - consider reducing`);
    }

    // Check for proper MDX structure
    const h2Count = (validated.content.match(/^## /gm) || []).length;
    if (h2Count === 0) {
      warnings.push('No H2 headings found - article may lack structure');
    }

    // Check for labels that shouldn't be there
    const labelPattern = /(Hook|Introduction|Body|Conclusion):/gi;
    if (labelPattern.test(validated.content)) {
      warnings.push('AI included section labels (Hook:, Introduction:, etc.) - these should be removed');
    }

    // Generate slugId from title
    const slugId = validated.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return {
      ...validated,
      slugId,
      validation: {
        isValid: errors.length === 0,
        errors,
        warnings,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.issues.forEach(err => {
        errors.push(`${err.path.join('.')}: ${err.message}`);
      });
    } else {
      errors.push('Unknown validation error');
    }

    return {
      title: '',
      slugId: '',
      excerpt: '',
      content: '',
      altText: '',
      metaTitle: '',
      metaDescription: '',
      keywords: [],
      validation: {
        isValid: false,
        errors,
        warnings,
      },
    };
  }
}

/**
 * Validate a single field value
 * Used for field regeneration validation
 */
export function validateField(
  field: 'title' | 'excerpt' | 'content' | 'seoTitle' | 'seoDescription' | 'keywords',
  value: string | string[]
): { isValid: boolean; error?: string } {
  try {
    switch (field) {
      case 'title':
        z.string().min(10).max(200).parse(value);
        break;
      case 'excerpt':
        z.string().min(50).max(300).parse(value);
        break;
      case 'content':
        z.string().min(500).parse(value);
        break;
      case 'seoTitle':
        z.string().min(10).max(60).parse(value);
        break;
      case 'seoDescription':
        z.string().min(50).max(160).parse(value);
        break;
      case 'keywords':
        z.array(z.string()).min(3).max(10).parse(value);
        break;
    }
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.issues[0].message };
    }
    return { isValid: false, error: 'Validation failed' };
  }
}
