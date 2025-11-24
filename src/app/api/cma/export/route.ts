// src/app/api/cma/export/route.ts
// API route for CMA PDF export

import { NextRequest, NextResponse } from 'next/server';
import { getCMAById } from '@/app/utils/cma/saveCMA';
import { exportCMA, type CMAReportType } from '@/app/utils/cma/exportCMAtoPDF';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const type = (searchParams.get('type') || 'full') as CMAReportType;

    console.debug(`📄 CMA Export API called: id=${id}, type=${type}`);

    // Validate parameters
    if (!id) {
      return NextResponse.json(
        { error: 'Missing CMA ID' },
        { status: 400 }
      );
    }

    if (!['full', 'mini', 'buyer', 'seller'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid export type. Must be: full, mini, buyer, or seller' },
        { status: 400 }
      );
    }

    // Load CMA from storage
    const savedCMA = getCMAById(id);

    if (!savedCMA) {
      return NextResponse.json(
        { error: 'CMA not found' },
        { status: 404 }
      );
    }

    // Generate PDF
    const { blob, filename } = await exportCMA(savedCMA, type, {
      agentInfo: {
        name: 'Joseph Sardella',
        phone: '(555) 123-4567',
        email: 'joseph@jpsrealtor.com',
      },
    });

    // Convert Blob to Buffer for Next.js response
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Return PDF with correct headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('❌ CMA export API error:', error);
    return NextResponse.json(
      { error: 'Failed to export CMA', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Support OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'GET, OPTIONS',
    },
  });
}
