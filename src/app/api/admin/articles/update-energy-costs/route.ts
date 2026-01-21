// src/app/api/admin/articles/update-energy-costs/route.ts
// API route to update energy cost articles with accurate 2025 data

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Article from '@/models/article';

export async function GET() {
  try {
    await dbConnect();

    // Find the 3 energy cost articles
    const articles = await Article.find({
      $or: [
        { slug: 'understanding-energy-costs-in-coachella-valley' },
        { slug: 'coachella-valley-energy-costs' },
        { slug: 'hidden-costs-of-home-ownership' }
      ]
    }).select('title slug content');

    return NextResponse.json({
      success: true,
      articles: articles.map(article => ({
        title: article.title,
        slug: article.slug,
        contentLength: article.content?.length || 0,
        contentPreview: article.content?.substring(0, 1000)
      }))
    });
  } catch (error) {
    console.error('[Update Energy Costs API] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch articles' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { dryRun = true } = await req.json();

    await dbConnect();

    const updates = [];

    // Article 1: "Understanding Energy Costs in Coachella Valley"
    const article1 = await Article.findOne({ slug: 'understanding-energy-costs-in-coachella-valley' });

    if (article1) {
      const oldContent1 = article1.content;

      // Update inaccurate cost estimates with 2025 data
      let newContent1 = oldContent1;

      // Update IID rate (was 19.8¢, now 19.76¢ as of Feb 2025)
      newContent1 = newContent1.replace(/IID residential base rate.*?19\.8¢ per kWh/g,
        'IID residential base rate**: ~19.76¢ per kWh (as of February 2025)');

      // Update SCE rate (was 30-35¢, now ~37¢)
      newContent1 = newContent1.replace(/SCE residential rate.*?30–35¢ per kWh/g,
        'SCE residential rate**: ~37¢ per kWh (after 9% increase in 2025)');

      updates.push({
        slug: article1.slug,
        changed: oldContent1 !== newContent1
      });

      if (!dryRun && oldContent1 !== newContent1) {
        article1.content = newContent1;
        await article1.save();
      }
    }

    // Article 2: "What you need to know about energy costs..."
    const article2 = await Article.findOne({ slug: 'coachella-valley-energy-costs' });

    if (article2) {
      // This article needs updates based on what we find
      updates.push({
        slug: article2.slug,
        status: 'needs_review'
      });
    }

    // Article 3: "Hidden Costs of Home Ownership"
    const article3 = await Article.findOne({ slug: 'hidden-costs-of-home-ownership' });

    if (article3) {
      updates.push({
        slug: article3.slug,
        status: 'needs_review'
      });
    }

    return NextResponse.json({
      success: true,
      dryRun,
      updates,
      message: dryRun ? 'Dry run complete - no changes made' : 'Articles updated successfully'
    });

  } catch (error) {
    console.error('[Update Energy Costs API] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update articles' }, { status: 500 });
  }
}
