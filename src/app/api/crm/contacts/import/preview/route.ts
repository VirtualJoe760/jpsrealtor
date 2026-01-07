/**
 * Smart Contact Import - Preview API
 *
 * Accepts CSV/Excel files and uses AI-powered column detection
 * to automatically map fields to contact schema
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ColumnDetectionService, type Provider } from '@/lib/services/column-detection.service';
import * as Papa from 'papaparse';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// POST /api/crm/contacts/import/preview
// Upload file, detect columns, return preview with mappings
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const provider = formData.get('provider') as Provider | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    const isCSV = fileName.endsWith('.csv');
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    if (!isCSV && !isExcel) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid file type. Please upload a CSV or Excel file.',
        },
        { status: 400 }
      );
    }

    // Parse file based on type
    let headers: string[] = [];
    let rows: any[] = [];

    if (isCSV) {
      const fileContent = await file.text();
      const parseResult = Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim(),
      });

      if (parseResult.errors.length > 0) {
        console.error('[Preview] CSV Parse errors:', parseResult.errors);
      }

      headers = parseResult.meta.fields || [];
      rows = parseResult.data;
    } else if (isExcel) {
      const fileBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(fileBuffer, { type: 'array' });

      // Use first sheet
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        defval: '',
        blankrows: false,
      });

      if (jsonData.length > 0) {
        headers = Object.keys(jsonData[0] as object);
        rows = jsonData;
      }
    }

    if (headers.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No columns found in file. Please check the file format.',
        },
        { status: 400 }
      );
    }

    if (rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No data rows found in file.',
        },
        { status: 400 }
      );
    }

    // Limit preview to first 10 rows for performance
    const previewRows = rows.slice(0, 10);
    const totalRows = rows.length;

    // ============================================================================
    // FIX: Detect provider FIRST, then use it for column detection
    // ============================================================================
    const detectedProvider = ColumnDetectionService.detectProvider(headers);
    const providerToUse = provider || detectedProvider || undefined;

    console.log(
      `[Preview] Provider detection: formData=${provider}, detected=${detectedProvider}, using=${providerToUse}`
    );

    // Use ColumnDetectionService to auto-detect field mappings
    const detectedMappings = ColumnDetectionService.detectColumns(
      headers,
      previewRows,
      providerToUse
    );

    // Calculate overall confidence
    const avgConfidence = detectedMappings.reduce(
      (sum, mapping) => sum + mapping.confidence,
      0
    ) / detectedMappings.length;

    // Get statistics about the data (FIX: use 'ignore' not 'unmapped')
    const stats = {
      totalRows,
      totalColumns: headers.length,
      mappedColumns: detectedMappings.filter(m => m.suggestedField !== 'ignore').length,
      unmappedColumns: detectedMappings.filter(m => m.suggestedField === 'ignore').length,
      avgConfidence: Math.round(avgConfidence * 100),
    };

    console.log(
      `[Preview] File: ${file.name}, Rows: ${totalRows}, Cols: ${headers.length}, ` +
      `Provider: ${detectedProvider || 'unknown'}, Avg Confidence: ${stats.avgConfidence}%`
    );

    const recommendations = generateRecommendations(detectedMappings, stats);

    // ============================================================================
    // DEBUG: Save preview data to local-logs/contacts for debugging
    // ============================================================================
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const logDir = path.join(process.cwd(), 'local-logs', 'contacts');

      // Ensure directory exists
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const debugData = {
        timestamp: new Date().toISOString(),
        fileName: file.name,
        fileSize: file.size,
        detectedProvider: detectedProvider || 'none',
        headers,
        sampleRows: previewRows,
        stats,
        mappings: detectedMappings,
        recommendations,
      };

      const logFile = path.join(logDir, `preview-${timestamp}.json`);
      fs.writeFileSync(logFile, JSON.stringify(debugData, null, 2));
      console.log(`[Preview] Debug data saved to: ${logFile}`);
    } catch (logError) {
      console.error('[Preview] Failed to save debug log:', logError);
      // Don't fail the request if logging fails
    }

    return NextResponse.json({
      success: true,
      preview: {
        fileName: file.name,
        fileSize: file.size,
        headers,
        sampleRows: previewRows,
        stats,
      },
      mappings: detectedMappings,
      detectedProvider,
      recommendations,
    });
  } catch (error: any) {
    console.error('[Preview] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process file' },
      { status: 500 }
    );
  }
}

// ============================================================================
// Helper: Generate recommendations based on detection results
// ============================================================================

function generateRecommendations(mappings: any[], stats: any): string[] {
  const recommendations: string[] = [];

  // Check for critical missing fields (FIX: use suggestedField not targetField)
  const hasPrimaryPhone = mappings.some(
    m => m.suggestedField === 'phone' && m.confidence >= 0.7
  );
  const hasName = mappings.some(
    m => (m.suggestedField === 'firstName' || m.suggestedField === 'fullName') &&
        m.confidence >= 0.7
  );

  if (!hasPrimaryPhone) {
    recommendations.push(
      'No phone number column detected. Please manually map the phone field.'
    );
  }

  if (!hasName) {
    recommendations.push(
      'No name column detected. Please manually map the name field.'
    );
  }

  // Check for low confidence mappings (FIX: use 'ignore' not 'unmapped')
  const lowConfidenceMappings = mappings.filter(
    m => m.confidence < 0.6 && m.suggestedField !== 'ignore'
  );

  if (lowConfidenceMappings.length > 0) {
    recommendations.push(
      `${lowConfidenceMappings.length} field(s) have low confidence. Please review these mappings.`
    );
  }

  // Check for high unmapped ratio
  if (stats.unmappedColumns > stats.mappedColumns) {
    recommendations.push(
      'More than half of the columns could not be mapped automatically. Consider selecting a provider template or manually mapping fields.'
    );
  }

  // Success message if everything looks good
  if (recommendations.length === 0 && stats.avgConfidence >= 80) {
    recommendations.push(
      'All fields detected with high confidence! You can proceed with the import.'
    );
  }

  return recommendations;
}
