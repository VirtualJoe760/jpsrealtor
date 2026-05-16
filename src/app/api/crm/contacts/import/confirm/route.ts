/**
 * Smart Contact Import - Confirm & Process API
 *
 * Accepts user-confirmed column mappings and processes the full import
 * Creates ImportBatch record and tracks progress/errors
 */

import { NextRequest, NextResponse, after } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import Contact from '@/models/Contact';
import ImportBatch from '@/models/ImportBatch';
import Campaign from '@/models/Campaign';
import Label from '@/models/Label';
import * as Papa from 'papaparse';
import * as XLSX from 'xlsx';

// Serverless runtimes terminate the function after the HTTP response is sent.
// `after()` keeps the worker alive until the queued work finishes (up to maxDuration).
export const maxDuration = 300;

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
    const label = formData.get('label') as string | null;

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

    // Queue the heavy work to run after the response is sent. `after()` keeps
    // the serverless worker alive past the return statement; a bare
    // fire-and-forget Promise gets killed the moment Vercel sends the 200.
    after(async () => {
      try {
        await processImportAsync(
          importBatch._id.toString(),
          rows,
          mappingLookup,
          userId,
          campaignId,
          campaignTag,
          context,
          label
        );
      } catch (error) {
        console.error('[Confirm] Async processing error:', error);
        try {
          await ImportBatch.findByIdAndUpdate(importBatch._id, {
            status: 'failed',
            completedAt: new Date(),
          });
        } catch (updateErr) {
          console.error('[Confirm] Failed to mark batch failed:', updateErr);
        }
      }
    });

    // Return batchId immediately so frontend can start polling
    return NextResponse.json({
      success: true,
      batchId: importBatch._id,
      progress: {
        status: 'processing',
        total: rows.length,
        processed: 0,
        successful: 0,
        failed: 0,
        duplicates: 0,
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
// Async Import Processing
// ============================================================================

async function processImportAsync(
  batchId: string,
  rows: any[],
  mappingLookup: Record<string, string>,
  userId: string,
  campaignId: string | null,
  campaignTag: string | null,
  context: 'campaign' | 'regular' | null,
  label: string | null
) {
  await dbConnect();

  // ------------------------------------------------------------------
  // Pre-flight: hoist label creation + dedup fetch out of the row loop.
  // The original implementation ran `ensureLabelExists` and `Contact.findOne`
  // on every single row — N×267 round trips to Atlas, which routinely
  // blew past Vercel's function timeout on imports of a few hundred rows.
  // ------------------------------------------------------------------
  if (campaignTag) await ensureLabelExists(campaignTag, userId);
  if (label) await ensureLabelExists(label, userId);

  const existingForUser = await Contact.find(
    { userId },
    { _id: 1, phone: 1, email: 1, tags: 1 }
  ).lean();
  const existingByPhone = new Map<string, any>();
  const existingByEmail = new Map<string, any>();
  for (const c of existingForUser) {
    if (c.phone) existingByPhone.set(c.phone, c);
    if (c.email) existingByEmail.set(c.email.toLowerCase(), c);
  }
  console.log(
    `[Confirm] Pre-fetched ${existingForUser.length} existing contacts for dedup ` +
    `(${existingByPhone.size} with phone, ${existingByEmail.size} with email)`
  );

  // Process each row
  let successCount = 0;
  let errorCount = 0;
  let skipCount = 0;
  const importedContactIds: string[] = [];
  const errors: any[] = [];
  const toInsert: any[] = [];                 // staged for bulk insertMany
  const toInsertRowNumbers: number[] = [];    // row numbers parallel to toInsert
  const existingTagWrites: any[] = [];        // bulkWrite ops for scenario-1 tag adds

  for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 because row 1 is headers, and array is 0-indexed

      try {
        // Map row data to contact fields
        const contactData: any = {
          userId,
          source: 'csv_import',
          importBatchId: batchId,
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

          // Numeric fields that should be converted to numbers
          const numericFields = [
            'latitude', 'longitude', 'lat', 'lng', 'long',
            'bedrooms', 'bedroomsTotal', 'bathrooms', 'bathroomsFull',
            'bathroomsHalf', 'bathroomsTotalDecimal', 'bathroomsTotalInteger',
            'sqft', 'squareFeet', 'yearBuilt', 'lotSizeAcres', 'lotSizeSqFt',
            'purchasePrice', 'salePrice', 'homeValue', 'propertyValue',
            'assessedValue', 'marketValue'
          ];

          // Convert value based on field type
          let finalValue: any = cleanedValue;
          if (numericFields.includes(targetField)) {
            const numValue = parseFloat(cleanedValue);
            if (!isNaN(numValue)) {
              finalValue = numValue;
            }
          }

          // Handle nested fields (e.g., address.street)
          if (targetField.includes('.')) {
            const [parent, child] = targetField.split('.');
            if (!contactData[parent]) {
              contactData[parent] = {};
            }
            contactData[parent][child] = finalValue;
          } else {
            contactData[targetField] = finalValue;
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

        // Process multiple phone numbers into phones array
        const phones: any[] = [];
        const phoneFields = [
          { phone: contactData.phone, lineType: contactData.lineType, order: 0 },
          { phone: contactData.phone2, lineType: contactData.lineType1, order: 1 },
          { phone: contactData.phone3, lineType: contactData.lineType2, order: 2 },
          { phone: contactData.phone4, lineType: contactData.lineType3, order: 3 },
          { phone: contactData.phone5, lineType: contactData.lineType4, order: 4 },
          { phone: contactData.phone6, lineType: contactData.lineType5, order: 5 },
        ];

        for (const field of phoneFields) {
          if (field.phone && field.phone.toString().trim()) {
            const normalized = normalizePhoneNumber(field.phone.toString().trim());
            if (normalized) {
              // Map line type to label
              let label: 'mobile' | 'home' | 'work' | 'other' = 'mobile';
              const typeStr = (field.lineType || '').toString().toLowerCase();
              if (typeStr.includes('landline') || typeStr.includes('home')) {
                label = 'home';
              } else if (typeStr.includes('work') || typeStr.includes('office')) {
                label = 'work';
              } else if (typeStr.includes('voip') || typeStr.includes('other')) {
                label = 'other';
              }

              phones.push({
                number: normalized,
                label,
                isPrimary: field.order === 0,
                isValid: true,
                country: 'US',
              });
            }
          }
        }

        // Set phones array if we have any
        if (phones.length > 0) {
          contactData.phones = phones;
          // Keep legacy phone field for backward compatibility
          contactData.phone = phones[0].number;
        } else if (contactData.phone) {
          // Fallback: normalize legacy phone field
          contactData.phone = normalizePhoneNumber(contactData.phone);
        }

        // Clean up temporary phone fields
        delete contactData.phone2;
        delete contactData.phone3;
        delete contactData.phone4;
        delete contactData.phone5;
        delete contactData.phone6;
        delete contactData.lineType;
        delete contactData.lineType1;
        delete contactData.lineType2;
        delete contactData.lineType3;
        delete contactData.lineType4;
        delete contactData.lineType5;

        // Process multiple email addresses into emails array
        const emails: any[] = [];
        const emailFields = [
          { email: contactData.email, order: 0 },
          { email: contactData.email2, order: 1 },
          { email: contactData.email3, order: 2 },
        ];

        for (const field of emailFields) {
          if (field.email && field.email.toString().trim()) {
            const emailStr = field.email.toString().trim().toLowerCase();
            // Basic email validation
            if (emailStr.includes('@') && emailStr.includes('.')) {
              // Determine label based on domain or order
              let label: 'personal' | 'work' | 'other' = 'personal';
              if (field.order === 1) {
                label = 'work';
              } else if (field.order === 2) {
                label = 'other';
              }

              emails.push({
                address: emailStr,
                label,
                isPrimary: field.order === 0,
                isValid: true,
              });
            }
          }
        }

        // Set emails array if we have any
        if (emails.length > 0) {
          contactData.emails = emails;
          // Keep legacy email field for backward compatibility
          contactData.email = emails[0].address;
        }

        // Clean up temporary email fields
        delete contactData.email2;
        delete contactData.email3;

        // Add campaign tag and/or label (labels were ensured up-front, before the loop)
        const tagsToAdd = [];
        if (campaignTag) tagsToAdd.push(campaignTag);
        if (label) tagsToAdd.push(label);
        if (tagsToAdd.length > 0) {
          contactData.tags = tagsToAdd;
        }

        // Dedup against the in-memory map built before the loop. Also covers
        // within-CSV dupes because we register every new contact into the map
        // as we go (see "stage for bulk insert" below).
        const existingContact = contactData.phone
          ? existingByPhone.get(contactData.phone)
          : contactData.email
            ? existingByEmail.get(contactData.email.toLowerCase())
            : null;

        if (existingContact) {
          console.log(`[Confirm] Row ${rowNumber}: Duplicate detected - Contact ${existingContact._id} already exists`);
          console.log(`[Confirm] Row ${rowNumber}: Existing tags: [${existingContact.tags?.join(', ') || 'none'}]`);
          console.log(`[Confirm] Row ${rowNumber}: Context - context: ${context || 'regular'}, campaignId: ${campaignId || 'null'}, campaignTag: ${campaignTag || 'null'}`);

          // THREE SCENARIOS:
          // 1. Existing campaign with tag (campaignTag exists) - tag and select
          // 2. Campaign import (context === 'campaign') - select without tagging
          // 3. Regular import - skip duplicates

          if (campaignTag) {
            // Scenario 1: Existing campaign - stage a tag update (flushed via bulkWrite below)
            const hadTag = existingContact.tags?.includes(campaignTag);
            if (!hadTag) {
              existingTagWrites.push({
                updateOne: {
                  filter: { _id: existingContact._id },
                  update: { $addToSet: { tags: campaignTag } },
                },
              });
            }
            importedContactIds.push(existingContact._id.toString());
            successCount++;
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

        // Stage for bulk insertMany. Register in the dedup maps so the next
        // CSV row with the same phone/email is caught as an in-CSV duplicate.
        toInsert.push(contactData);
        toInsertRowNumbers.push(rowNumber);
        if (contactData.phone) existingByPhone.set(contactData.phone, contactData);
        if (contactData.email) existingByEmail.set(contactData.email.toLowerCase(), contactData);
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

  // ------------------------------------------------------------------
  // Flush staged scenario-1 tag updates (existing contacts that need a
  // campaign tag added). Single bulkWrite instead of N findByIdAndUpdate.
  // ------------------------------------------------------------------
  if (existingTagWrites.length > 0) {
    try {
      await Contact.bulkWrite(existingTagWrites, { ordered: false });
      console.log(`[Confirm] Tagged ${existingTagWrites.length} existing contacts with "${campaignTag}"`);
    } catch (err: any) {
      console.error('[Confirm] bulkWrite (tag updates) failed:', err);
    }
  }

  // ------------------------------------------------------------------
  // Bulk insert new contacts in chunks. ordered:false so a single bad
  // row (e.g. unexpected schema validation failure) doesn't abort the
  // remainder of the chunk. Each chunk also flushes progress to Mongo
  // so the UI advances during the bulk-insert phase.
  // ------------------------------------------------------------------
  const CHUNK = 100;
  // Rows that didn't make it into `toInsert` (skipped or hit prep errors)
  // are already accounted for; "processed" counts forward as we insert.
  let processed = rows.length - toInsert.length;

  for (let start = 0; start < toInsert.length; start += CHUNK) {
    const chunk = toInsert.slice(start, start + CHUNK);
    const chunkRowNumbers = toInsertRowNumbers.slice(start, start + CHUNK);
    let inserted: any[] = [];
    try {
      inserted = await Contact.insertMany(chunk, { ordered: false });
    } catch (err: any) {
      // BulkWriteError: some succeeded, some failed (e.g. unique-index race)
      inserted = err?.insertedDocs || [];
      const writeErrors = err?.writeErrors || [];
      for (const we of writeErrors) {
        const failedIdx = we?.index ?? -1;
        errors.push({
          row: failedIdx >= 0 ? chunkRowNumbers[failedIdx] : -1,
          field: 'unknown',
          value: '',
          error: we?.errmsg || 'insertMany failed',
        });
      }
      errorCount += chunk.length - inserted.length;
      console.error(
        `[Confirm] insertMany chunk ${start}-${start + chunk.length}: ` +
        `${inserted.length} succeeded, ${chunk.length - inserted.length} failed`
      );
    }
    for (const doc of inserted) {
      importedContactIds.push(doc._id.toString());
    }
    successCount += inserted.length;
    processed += chunk.length;

    await ImportBatch.findByIdAndUpdate(batchId, {
      'progress.processed': processed,
      'progress.successful': successCount,
      'progress.failed': errorCount,
      'progress.duplicates': skipCount,
    });
  }

  // Final batch update
  await ImportBatch.findByIdAndUpdate(batchId, {
    'progress.processed': rows.length,
    'progress.successful': successCount,
    'progress.failed': errorCount,
    'progress.duplicates': skipCount,
    status: errorCount === rows.length ? 'failed' : 'completed',
    completedAt: new Date(),
    importedContactIds: importedContactIds,
    importErrors: errors.slice(0, 100),
  });

  console.log(
    `[Confirm] Import completed: ${successCount} success, ${errorCount} errors, ${skipCount} skipped`
  );
  console.log(`[Confirm] Imported contact IDs (${importedContactIds.length}): [${importedContactIds.join(', ')}]`);
}

// ============================================================================
// Helper: Ensure label exists, create if it doesn't
// ============================================================================

async function ensureLabelExists(labelName: string, userId: string): Promise<void> {
  try {
    // Check if label already exists for this user
    const existingLabel = await Label.findOne({ userId, name: labelName });

    if (!existingLabel) {
      // Generate a random color for the label
      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      // Create new label
      await Label.create({
        userId,
        name: labelName,
        color: randomColor,
        icon: 'Tag',
        contactCount: 0,
        isSystem: false,
        isArchived: false,
      });

      console.log(`[ensureLabelExists] Created new label "${labelName}" for user ${userId}`);
    }
  } catch (error) {
    console.error(`[ensureLabelExists] Error ensuring label "${labelName}":`, error);
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
