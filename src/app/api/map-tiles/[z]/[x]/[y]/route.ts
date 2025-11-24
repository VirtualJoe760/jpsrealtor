// src/app/api/map-tiles/[z]/[x]/[y]/route.ts
// Serves pre-generated map tiles with aggressive caching

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ z: string; x: string; y: string }> }
) {
  try {
    const { z, x, y } = await params;

    // Construct path to tile file
    const tilePath = path.join(process.cwd(), 'public', 'tiles', z, x, `${y}.json`);

    // Check if tile exists
    if (!fs.existsSync(tilePath)) {
      // Return empty array for missing tiles
      return NextResponse.json([], {
        headers: {
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Content-Type': 'application/json',
        },
      });
    }

    // Read and parse tile file
    const tileData = fs.readFileSync(tilePath, 'utf-8');
    const clusters = JSON.parse(tileData);

    // Return tile data with immutable caching
    return NextResponse.json(clusters, {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error serving tile:', error);

    // Return empty array on error
    return NextResponse.json([], {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Type': 'application/json',
      },
    });
  }
}
