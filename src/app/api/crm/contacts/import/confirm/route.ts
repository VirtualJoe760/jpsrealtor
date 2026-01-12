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
import Contact from '@/models/Contact';
import ImportBatch from '@/models/ImportBatch';
import Campaign from '@/models/Campaign';
import Label from '@/models/Label';
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

    // Start async processing (fire and forget)
    // This allows us to return the batchId immediately while processing continues
    processImportAsync(
      importBatch._id.toString(),
      rows,
      mappingLookup,
      userId,
      campaignId,
      campaignTag,
      context,
      label
    ).catch((error) => {
      console.error('[Confirm] Async processing error:', error);
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

        // Add campaign tag and/or label
        const tagsToAdd = [];
        if (campaignTag) {
          tagsToAdd.push(campaignTag);
          // Ensure label exists for campaign tag
          await ensureLabelExists(campaignTag, userId);
        }
        if (label) {
          tagsToAdd.push(label);
          // Ensure label exists for import label
          await ensureLabelExists(label, userId);
        }
        if (tagsToAdd.length > 0) {
          contactData.tags = tagsToAdd;
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
          await ImportBatch.findByIdAndUpdate(batchId, {
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
  await ImportBatch.findByIdAndUpdate(batchId, {
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
