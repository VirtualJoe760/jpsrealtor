/**
 * Import Batch Status API
 *
 * GET /api/crm/contacts/import/status/[batchId]
 * Returns the current status of an import batch for polling progress
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import ImportBatch from '@/models/ImportBatch';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    const { batchId } = await params;

    // Find the import batch
    // @ts-expect-error Mongoose typing issue with overloaded signatures
    const batch = await ImportBatch.findOne({
      _id: batchId,
      userId: session.user.id,
    });

    if (!batch) {
      return NextResponse.json(
        { success: false, error: 'Import batch not found' },
        { status: 404 }
      );
    }

    // Return progress data in the format expected by ImportProgress component
    return NextResponse.json({
      success: true,
      progress: {
        status: batch.status,
        total: batch.progress.total,
        processed: batch.progress.processed,
        successful: batch.progress.successful,
        failed: batch.progress.failed,
        duplicates: batch.progress.duplicates,
        importErrors: batch.importErrors?.map((err: any) => ({
          row: err.row,
          field: err.data?.field || 'unknown',
          value: err.data?.value || '',
          error: err.error,
        })),
      },
    });
  } catch (error: any) {
    console.error('[Import Status API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
