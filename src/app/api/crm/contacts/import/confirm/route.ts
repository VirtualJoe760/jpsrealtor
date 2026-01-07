/**
 * Smart Contact Import - Confirm & Process API
 *
 * Accepts user-confirmed column mappings and processes the full import
 * Creates ImportBatch record and tracks progress/errors
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Contact from '@/models/contact';
import ImportBatch from '@/models/ImportBatch';
import Campaign from '@/models/Campaign';
import * as Papa from 'papaparse';
import * as XLSX from 'xlsx';

// ============================================================================
// POST /api/crm/contacts/import/confirm
// Process full import with user-confirmed mappings
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

    const userId = session.user.id;
    await dbConnect();

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const mappingsJson = formData.get('mappings') as string;
    const provider = formData.get('provider') as string | null;
    const campaignId = formData.get('campaignId') as string | null;
    const context = formData.get('context') as 'campaign' | 'regular' | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!mappingsJson) {
      return NextResponse.json(
        { success: false, error: 'No column mappings provided' },
        { status: 400 }
      );
    }

    // Parse mappings from client
    let mappings: { csvColumn: string; suggestedField: string }[];
    try {
      mappings = JSON.parse(mappingsJson);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid mappings format' },
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
        console.error('[Confirm] CSV Parse errors:', parseResult.errors);
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

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No data rows found in file' },
        { status: 400 }
      );
    }

    // Create mapping lookup from CSV column to target field
    const mappingLookup: Record<string, string> = {};
    mappings.forEach((m) => {
      if (m.suggestedField !== 'ignore') {
        mappingLookup[m.csvColumn] = m.suggestedField;
      }
    });

    // Fetch campaign details if campaignId is provided (for tagging contacts)
    let campaignTag: string | null = null;
    if (campaignId) {
      try {
        const campaign = await Campaign.findById(campaignId);
        if (campaign) {
          campaignTag = `campaign:${campaign.name}`;
          console.log(`[Confirm] Tagging contacts with campaign: ${campaign.name}`);
        }
      } catch (error) {
        console.error(`[Confirm] Error fetching campaign ${campaignId}:`, error);
      }
    }

    // Map provider to source (align with ImportBatch model enum)
    const sourceMap: Record<string, string> = {
      'google_contacts': 'google_contacts',
      'mojo_dialer': 'mojo_dialer',
      'title_rep': 'title_rep',
      'outlook': 'csv_import',
      'custom': 'csv_import',
    };
    const source = sourceMap[provider || 'custom'] || 'csv_import';

    // Create ImportBatch record
    const importBatch = await ImportBatch.create({
      userId,
      campaignId: campaignId || undefined,
      source,
      fileName: file.name,
      status: 'processing',
      progress: {
        total: rows.length,
        processed: 0,
        successful: 0,
        failed: 0,
        duplicates: 0,
      },
      fieldMapping: mappings.reduce((acc, m) => {
        acc[m.csvColumn] = m.suggestedField;
        return acc;
      }, {} as Record<string, string>),
      importedContactIds: [],
      importErrors: [],
    });

    console.log(
      `[Confirm] Starting import batch ${importBatch._id} for user ${userId}: ${rows.length} rows`
    );
    console.log(`[Confirm] Import context: context=${context || 'regular'}, campaignId=${campaignId || 'null'}, campaignTag=${campaignTag || 'null'}`);

    // Process each row
    let successCount = 0;
    let errorCount = 0;
    let skipCount = 0;
    const importedContactIds: string[] = [];
    const errors: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 because row 1 is headers, and array is 0-indexed

      try {
        // Map row data to contact fields
        const contactData: any = {
          userId,
          source: 'csv_import',
          importBatchId: importBatch._id,
        };

        // Helper: Clean Google Contacts multi-value fields (separated by :::)
        const cleanMultiValue = (value: string): string => {
          if (!value) return '';
          // Split by ::: and take first non-empty value
          const parts = value.split(':::').map((p: string) => p.trim()).filter((p: string) => p);
          return parts[0] || '';
        };

        // Apply mappings
        for (const [csvColumn, targetField] of Object.entries(mappingLookup)) {
          const value = row[csvColumn];
          if (!value || value === '') continue;

          // Clean multi-value fields (Google Contacts uses ::: as delimiter)
          const cleanedValue = cleanMultiValue(String(value).trim());
          if (!cleanedValue) continue;

          // Handle nested fields (e.g., address.street)
          if (targetField.includes('.')) {
            const [parent, child] = targetField.split('.');
            if (!contactData[parent]) {
              contactData[parent] = {};
            }
            contactData[parent][child] = cleanedValue;
          } else {
            contactData[targetField] = cleanedValue;
          }
        }

        // Validate required fields
        if (!contactData.phone && !contactData.email) {
          skipCount++;
          errors.push({
            row: rowNumber,
            field: 'phone/email',
            value: '',
            error: 'Contact must have at least a phone number or email',
          });
          continue;
        }

        // ============================================================================
        // SMART NAME HANDLING: Detect full names incorrectly stored in firstName
        // ============================================================================

        // Case 1: Full name in "fullName" field
        if (contactData.fullName && !contactData.firstName && !contactData.lastName) {
          const parts = contactData.fullName.trim().split(' ');
          if (parts.length >= 2) {
            contactData.firstName = parts[0];
            contactData.lastName = parts.slice(1).join(' ');
          } else {
            contactData.firstName = contactData.fullName;
          }
          delete contactData.fullName;
        }

        // Case 2: Full name incorrectly stored in firstName field (contains space)
        // Split even if lastName exists - the space indicates incorrect storage
        if (contactData.firstName && contactData.firstName.includes(' ')) {
          const parts = contactData.firstName.trim().split(' ');
          if (parts.length >= 2 && !contactData.lastName) {
            // No lastName exists - use split version
            contactData.firstName = parts[0];
            contactData.lastName = parts.slice(1).join(' ');
            console.log(
              `[Confirm] Row ${rowNumber}: Split firstName "${parts.join(' ')}" → ` +
              `firstName="${contactData.firstName}", lastName="${contactData.lastName}"`
            );
          } else if (parts.length >= 2 && contactData.lastName) {
            // lastName exists - just take first part, keep existing lastName
            const originalFirst = contactData.firstName;
            contactData.firstName = parts[0];
            console.log(
              `[Confirm] Row ${rowNumber}: Cleaned firstName "${originalFirst}" → ` +
              `firstName="${contactData.firstName}", lastName="${contactData.lastName}" (kept existing lastName)`
            );
          }
        }

        // Normalize phone number
        if (contactData.phone) {
          contactData.phone = normalizePhoneNumber(contactData.phone);
        }

        // Add campaign tag if provided
        if (campaignTag) {
          contactData.tags = [campaignTag];
        }

        // Check for duplicate by phone or email
        const duplicateFilter: any = { userId };
        if (contactData.phone) {
          duplicateFilter.phone = contactData.phone;
        } else if (contactData.email) {
          duplicateFilter.email = contactData.email;
        }

        const existingContact = await Contact.findOne(duplicateFilter);
        if (existingContact) {
          console.log(`[Confirm] Row ${rowNumber}: Duplicate detected - Contact ${existingContact._id} already exists`);
          console.log(`[Confirm] Row ${rowNumber}: Existing tags: [${existingContact.tags?.join(', ') || 'none'}]`);
          console.log(`[Confirm] Row ${rowNumber}: Context - context: ${context || 'regular'}, campaignId: ${campaignId || 'null'}, campaignTag: ${campaignTag || 'null'}`);

          // THREE SCENARIOS:
          // 1. Existing campaign with tag (campaignTag exists) - tag and select
          // 2. Campaign import (context === 'campaign') - select without tagging
          // 3. Regular import - skip duplicates

          if (campaignTag) {
            // Scenario 1: Existing campaign - tag the contact and add to selection
            console.log(`[Confirm] Row ${rowNumber}: Scenario 1 - Existing campaign import (has tag) - tagging contact`);

            // Add campaign tag if not already present
            const hadTag = existingContact.tags?.includes(campaignTag);
            if (!hadTag) {
              await Contact.findByIdAndUpdate(existingContact._id, {
                $addToSet: { tags: campaignTag }
              });
              console.log(`[Confirm] Row ${rowNumber}: Added tag "${campaignTag}" to existing contact`);
            } else {
              console.log(`[Confirm] Row ${rowNumber}: Contact already has tag "${campaignTag}"`);
            }

            // Add to imported list so it gets selected
            importedContactIds.push(existingContact._id.toString());
            successCount++;
            console.log(`[Confirm] Row ${rowNumber}: Added existing contact to selection (successCount: ${successCount})`);
          } else if (context === 'campaign') {
            // Scenario 2: Campaign import (creation or no tag yet) - add to selection without tagging
            console.log(`[Confirm] Row ${rowNumber}: Scenario 2 - Campaign import (context='campaign') - adding to selection without tag`);
            importedContactIds.push(existingContact._id.toString());
            successCount++;
            console.log(`[Confirm] Row ${rowNumber}: Added existing contact to selection (successCount: ${successCount})`);
          } else {
            // Scenario 3: Regular import - skip duplicates
            console.log(`[Confirm] Row ${rowNumber}: Scenario 3 - Regular import - skipping duplicate`);
            skipCount++;
            errors.push({
              row: rowNumber,
              field: contactData.phone ? 'phone' : 'email',
              value: contactData.phone || contactData.email,
              error: 'Duplicate contact already exists',
            });
            console.log(`[Confirm] Row ${rowNumber}: Skipped (skipCount: ${skipCount})`);
          }
          continue;
        }

        // Create contact
        console.log(`[Confirm] Row ${rowNumber}: Creating new contact`);
        const newContact = await Contact.create(contactData);
        importedContactIds.push(newContact._id.toString());
        successCount++;
        console.log(`[Confirm] Row ${rowNumber}: Created new contact ${newContact._id} (successCount: ${successCount})`);

        // Update batch progress every 10 rows
        if ((i + 1) % 10 === 0) {
          await ImportBatch.findByIdAndUpdate(importBatch._id, {
            'progress.processed': i + 1,
            'progress.successful': successCount,
            'progress.failed': errorCount,
            'progress.duplicates': skipCount,
          });
        }
      } catch (error: any) {
        errorCount++;
        errors.push({
          row: rowNumber,
          field: 'unknown',
          value: '',
          error: error.message || 'Failed to create contact',
        });
        console.error(`[Confirm] Error processing row ${rowNumber}:`, error);
      }
    }

    // Final batch update
    await ImportBatch.findByIdAndUpdate(importBatch._id, {
      'progress.processed': rows.length,
      'progress.successful': successCount,
      'progress.failed': errorCount,
      'progress.duplicates': skipCount,
      status: errorCount === rows.length ? 'failed' : 'completed',
      completedAt: new Date(),
      importedContactIds: importedContactIds,
      importErrors: errors.slice(0, 100), // Limit to first 100 errors
    });

    console.log(
      `[Confirm] Import completed: ${successCount} success, ${errorCount} errors, ${skipCount} skipped`
    );
    console.log(`[Confirm] Imported contact IDs (${importedContactIds.length}): [${importedContactIds.join(', ')}]`);

    return NextResponse.json({
      success: true,
      batchId: importBatch._id,
      importedContactIds, // Return imported contact IDs for auto-selection
      progress: {
        status: errorCount === rows.length ? 'failed' : 'completed',
        total: rows.length,
        processed: rows.length,
        successful: successCount,
        failed: errorCount,
        duplicates: skipCount,
        importErrors: errors.slice(0, 20), // Return first 20 errors to client
      },
    });
  } catch (error: any) {
    console.error('[Confirm] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process import' },
      { status: 500 }
    );
  }
}

// ============================================================================
// Helper: Normalize phone number to consistent format
// ============================================================================

function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');

  // Remove leading 1 if present (US country code)
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.substring(1);
  }

  // Validate length
  if (digits.length !== 10) {
    return phone; // Return original if can't normalize
  }

  // Format as (XXX) XXX-XXXX
  return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
}
