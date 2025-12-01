import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

export async function POST(request: NextRequest) {
  try {
    const { slugId, draft } = await request.json();

    if (!slugId) {
      return NextResponse.json(
        { success: false, error: 'slugId is required' },
        { status: 400 }
      );
    }

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
    });
  } catch (error: any) {
    console.error('Error setting draft status:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to set draft status' },
      { status: 500 }
    );
  }
}
