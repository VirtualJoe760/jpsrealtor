// src/app/api/chat/community-facts/route.ts
// API to fetch community facts for AI chat context

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongoose';
import Subdivision from '@/models/subdivisions';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const communityName = searchParams.get('name');
    const city = searchParams.get('city');

    if (!communityName) {
      return NextResponse.json(
        { error: 'Community name is required' },
        { status: 400 }
      );
    }

    // Search for subdivision by name (case-insensitive, partial match)
    const query: any = {
      $or: [
        { name: new RegExp(communityName, 'i') },
        { normalizedName: communityName.toLowerCase() },
        { 'communityFacts.alternateNames': new RegExp(communityName, 'i') },
      ],
    };

    // If city is provided, add it to the query for better matching
    if (city) {
      query.city = new RegExp(city, 'i');
    }

    const subdivision = await Subdivision.findOne(query)
      .select('name city communityFacts description avgPrice priceRange listingCount')
      .lean();

    if (!subdivision) {
      return NextResponse.json({
        found: false,
        message: `No data found for community: ${communityName}`,
      });
    }

    // Check if community facts exist
    const hasFacts = subdivision.communityFacts && Object.keys(subdivision.communityFacts).length > 0;

    return NextResponse.json({
      found: true,
      hasFacts,
      community: {
        name: subdivision.name,
        city: subdivision.city,
        description: subdivision.description,
        avgPrice: subdivision.avgPrice,
        priceRange: subdivision.priceRange,
        listingCount: subdivision.listingCount,
        facts: hasFacts ? subdivision.communityFacts : null,
      },
    });
  } catch (error) {
    console.error('Error fetching community facts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch community facts' },
      { status: 500 }
    );
  }
}

// POST endpoint to log missing facts (for future data collection)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { communityName, missingDetail, city, userId } = body;

    if (!communityName || !missingDetail) {
      return NextResponse.json(
        { error: 'Community name and missing detail are required' },
        { status: 400 }
      );
    }

    // Log to file system for later processing
    const logEntry = {
      timestamp: new Date().toISOString(),
      communityName,
      city,
      missingDetail,
      userId,
    };

    // TODO: Store in a dedicated missing_facts collection or append to a log file
    console.log('[MISSING FACT]', JSON.stringify(logEntry));

    // For now, just acknowledge
    return NextResponse.json({
      success: true,
      message: 'Missing fact logged successfully',
      logEntry,
    });
  } catch (error) {
    console.error('Error logging missing fact:', error);
    return NextResponse.json(
      { error: 'Failed to log missing fact' },
      { status: 500 }
    );
  }
}
