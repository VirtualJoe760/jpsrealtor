/**
 * Contact Analysis API Endpoint
 *
 * POST /api/crm/contacts/analyze
 *
 * Analyzes a CSV file for data quality issues before importing.
 * Part of the Prospect Discovery feature.
 *
 * Request: FormData with 'file' field (CSV file)
 * Response: Analysis report with quality metrics and recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ContactAnalysisService } from '@/lib/services/contact-analysis.service';
import formidable from 'formidable';
import fs from 'fs';
import { Types } from 'mongoose';

// Note: In Next.js App Router, body parsing is handled automatically
// formidable handles the multipart form data parsing

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse the multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'Only CSV files are supported' },
        { status: 400 }
      );
    }

    // Read file contents
    const fileContent = await file.text();

    if (!fileContent || fileContent.trim().length === 0) {
      return NextResponse.json(
        { error: 'File is empty' },
        { status: 400 }
      );
    }

    // Analyze the CSV
    const analysis = await ContactAnalysisService.analyzeCSV(fileContent);

    // Optionally save to ImportBatch for tracking
    const importBatch = await ContactAnalysisService.saveAnalysisToImportBatch(
      new Types.ObjectId(session.user.id),
      file.name,
      file.size,
      analysis
    );

    // Return analysis with batch ID
    return NextResponse.json({
      success: true,
      batchId: importBatch._id,
      analysis,
    });

  } catch (error: any) {
    console.error('Error analyzing contacts:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze contacts',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/crm/contacts/analyze?batchId=xxx
 *
 * Retrieve analysis for an existing import batch
 */
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get batch ID from query params
    const { searchParams } = new URL(req.url);
    const batchId = searchParams.get('batchId');

    if (!batchId) {
      return NextResponse.json(
        { error: 'Batch ID is required' },
        { status: 400 }
      );
    }

    // Fetch the import batch
    const ImportBatch = (await import('@/models/ImportBatch')).default;
    const batch = await ImportBatch.findOne({
      _id: batchId,
      userId: session.user.id,  // Ensure user owns this batch
    });

    if (!batch) {
      return NextResponse.json(
        { error: 'Import batch not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      batch: {
        id: batch._id,
        fileName: batch.fileName,
        fileSize: batch.fileSize,
        status: batch.status,
        analysis: batch.analysis,
        analyzedAt: batch.analyzedAt,
        createdAt: batch.createdAt,
      },
    });

  } catch (error: any) {
    console.error('Error fetching analysis:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch analysis',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
