import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { IS_PRODUCTION } from '@/lib/environment';
import { setDraftStatus, articleExists } from '@/lib/services/article.service';
import { triggerVercelRebuild } from '@/lib/publishing-pipeline';

/**
 * POST /api/articles/set-draft
 *
 * Dual-environment draft status toggling:
 * LOCALHOST: Updates draft flag in MDX frontmatter
 * PRODUCTION: Updates status in MongoDB + triggers Vercel rebuild
 */
export async function POST(request: NextRequest) {
  try {
    const { slugId, draft } = await request.json();

    if (!slugId) {
      return NextResponse.json(
        { success: false, error: 'slugId is required' },
        { status: 400 }
      );
    }

    if (IS_PRODUCTION) {
      // PRODUCTION: Update MongoDB + trigger rebuild
      const exists = await articleExists(slugId);

      if (!exists) {
        return NextResponse.json(
          { success: false, error: `Article not found: ${slugId}` },
          { status: 404 }
        );
      }

      // Update draft status in database
      const article = await setDraftStatus(slugId, draft);

      if (!article) {
        return NextResponse.json(
          { success: false, error: `Failed to update article: ${slugId}` },
          { status: 500 }
        );
      }

      // Trigger Vercel rebuild
      const deployResult = await triggerVercelRebuild(
        `Set draft=${draft}: ${slugId}`
      );

      const message = deployResult.success
        ? `Article ${draft ? 'draft' : 'published'} status updated! Vercel is rebuilding - changes will be live in 2-3 minutes.`
        : `Article status updated in database, but rebuild failed: ${deployResult.message}`;

      return NextResponse.json({
        success: true,
        message,
        slugId,
        environment: 'production',
      });

    } else {
      // LOCALHOST: Update MDX file
      const filePath = path.join(process.cwd(), 'src/posts', `${slugId}.mdx`);

      // Check if file exists
      try {
        await fs.access(filePath);
      } catch (error) {
        return NextResponse.json(
          { success: false, error: `Article not found: ${slugId}.mdx` },
          { status: 404 }
        );
      }

      // Read the current MDX file
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const { data: frontmatter, content } = matter(fileContent);

      // Update draft flag
      frontmatter.draft = draft;

      // Rebuild the MDX file with updated frontmatter
      const updatedContent = matter.stringify(content, frontmatter);

      // Write back to file
      await fs.writeFile(filePath, updatedContent, 'utf-8');

      return NextResponse.json({
        success: true,
        message: `Article draft status updated: ${draft ? 'draft' : 'published'}`,
        slugId,
        environment: 'localhost',
      });
    }
  } catch (error: any) {
    console.error('Error setting draft status:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to set draft status' },
      { status: 500 }
    );
  }
}
