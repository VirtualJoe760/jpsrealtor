/**
 * CSV Import API
 *
 * Import contacts from CSV files (Google Contacts, Outlook, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Contact from '@/models/contact';

// ============================================================================
// POST /api/crm/contacts/import/csv
// Parse CSV file and import contacts
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

    await connectDB();

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Read file content
    const fileContent = await file.text();

    // Parse CSV data
    const rows = parseCSV(fileContent);

    console.log(`[CSV Import] Found ${rows.length} rows`);

    const skippedContacts = [];
    const errors = [];
    const contactsToInsert = [];

    // First pass: Process and validate all rows
    for (const row of rows) {
      try {
        // Skip empty rows
        if (!row['First Name'] && !row['Last Name'] && !row['Organization Name']) {
          continue;
        }

        // Extract first phone number (Phone 1 - Value)
        const phoneValue = row['Phone 1 - Value'] || '';
        let phone: string | null = null;

        if (phoneValue) {
          // Google CSV can have multiple phones separated by :::
          const phones = phoneValue.split(':::').map(p => p.trim()).filter(p => p);
          if (phones.length > 0) {
            phone = formatPhoneForE164(phones[0]);
          }
        }

        // Skip if no phone number
        if (!phone) {
          skippedContacts.push({
            reason: 'No phone number',
            row: {
              name: `${row['First Name'] || ''} ${row['Last Name'] || ''}`.trim() || row['Organization Name'],
            },
          });
          continue;
        }

        // Extract name
        const firstName = row['First Name'] || row['Organization Name'] || 'Unknown';
        const lastName = row['Last Name'] || '';
        const middleName = row['Middle Name'] || undefined;
        const nickname = row['Nickname'] || undefined;

        // Extract ALL emails
        const emailValue = row['E-mail 1 - Value'] || '';
        const email2Value = row['E-mail 2 - Value'] || '';
        const email3Value = row['E-mail 3 - Value'] || '';
        const email4Value = row['E-mail 4 - Value'] || '';
        const email5Value = row['E-mail 5 - Value'] || '';

        const allEmailsRaw = [emailValue, email2Value, email3Value, email4Value, email5Value]
          .filter(e => e)
          .flatMap(e => e.split(':::').map(email => email.trim()))
          .filter(e => e);

        const email = allEmailsRaw.length > 0 ? allEmailsRaw[0] : undefined;
        const alternateEmails = allEmailsRaw.length > 1 ? allEmailsRaw.slice(1) : undefined;

        // Extract ALL phone numbers
        const phone2Value = row['Phone 2 - Value'] || '';
        const phone3Value = row['Phone 3 - Value'] || '';
        const phone4Value = row['Phone 4 - Value'] || '';
        const phone5Value = row['Phone 5 - Value'] || '';

        const allPhonesRaw = [phone2Value, phone3Value, phone4Value, phone5Value]
          .filter(p => p)
          .flatMap(p => p.split(':::').map(phone => phone.trim()))
          .filter(p => p)
          .map(p => formatPhoneForE164(p))
          .filter(p => p) as string[];

        const alternatePhones = allPhonesRaw.length > 0 ? allPhonesRaw : undefined;

        // Extract addresses
        const address = row['Address 1 - Street'] || row['Address 1 - Formatted']
          ? {
              street: row['Address 1 - Street'] || undefined,
              city: row['Address 1 - City'] || undefined,
              state: row['Address 1 - Region'] || undefined,
              zip: row['Address 1 - Postal Code'] || undefined,
              country: row['Address 1 - Country'] || undefined,
            }
          : undefined;

        const alternateAddress = row['Address 2 - Street'] || row['Address 2 - Formatted']
          ? {
              street: row['Address 2 - Street'] || undefined,
              city: row['Address 2 - City'] || undefined,
              state: row['Address 2 - Region'] || undefined,
              zip: row['Address 2 - Postal Code'] || undefined,
              country: row['Address 2 - Country'] || undefined,
            }
          : undefined;

        // Extract organization info
        const organization = row['Organization Name'] || undefined;
        const jobTitle = row['Organization Title'] || undefined;
        const department = row['Organization Department'] || undefined;

        // Extract website
        const website = row['Website 1 - Value'] || undefined;

        // Extract birthday
        let birthday: Date | undefined = undefined;
        if (row['Birthday']) {
          const parsedDate = new Date(row['Birthday']);
          if (!isNaN(parsedDate.getTime())) {
            birthday = parsedDate;
          }
        }

        // Extract photo
        const photo = row['Photo'] || undefined;

        // Extract labels
        const labelsRaw = row['Labels'] || '';
        const labels = labelsRaw.split(':::').map(l => l.trim()).filter(l => l);

        contactsToInsert.push({
          userId: session.user.id,
          firstName,
          lastName,
          middleName,
          nickname,
          email,
          alternateEmails,
          phone,
          alternatePhones,
          birthday,
          photo,
          address,
          alternateAddress,
          organization,
          jobTitle,
          department,
          website,
          source: 'csv_import',
          status: 'new',
          tags: organization ? [organization] : [],
          labels: labels.length > 0 ? labels : undefined,
          importedAt: new Date(),  // Track when this was imported
          preferences: {
            smsOptIn: false,
            emailOptIn: false,
            callOptIn: false,
          },
          notes: row['Notes'] || 'Imported from CSV file',
        });
      } catch (error: any) {
        console.error('[CSV Import] Error processing row:', error);
        errors.push({ row, error: error.message });
      }
    }

    // Get all existing phone numbers for this user in one query
    // @ts-expect-error Mongoose typing issue with overloaded find() signatures
    const existingPhones = await Contact.find(
      { userId: session.user.id },
      { phone: 1 }
    ).lean();
    const existingPhoneSet = new Set(existingPhones.map(c => c.phone));

    // Filter out duplicates
    const newContacts = contactsToInsert.filter(contact => {
      if (existingPhoneSet.has(contact.phone)) {
        skippedContacts.push({
          reason: 'Already exists',
          phone: contact.phone,
          row: { name: `${contact.firstName} ${contact.lastName}`.trim() },
        });
        return false;
      }
      return true;
    });

    // Bulk insert all new contacts at once
    let importedContacts = [];
    if (newContacts.length > 0) {
      try {
        importedContacts = await Contact.insertMany(newContacts, { ordered: false });
      } catch (error: any) {
        console.error('[CSV Import] Bulk insert error:', error);
        // If bulk insert fails, try one by one (slower but more resilient)
        for (const contact of newContacts) {
          try {
            // @ts-expect-error Mongoose typing issue with overloaded create() signatures
            const inserted = await Contact.create(contact);
            importedContacts.push(inserted);
          } catch (err: any) {
            errors.push({ contact, error: err.message });
          }
        }
      }
    }

    console.log(
      `[CSV Import] Imported: ${importedContacts.length}, Skipped: ${skippedContacts.length}, Errors: ${errors.length}`
    );

    return NextResponse.json({
      success: true,
      imported: importedContacts.length,
      skipped: skippedContacts.length,
      errors: errors.length,
      contacts: importedContacts,
      details: {
        skippedReasons: skippedContacts.map((s) => s.reason),
        errorMessages: errors.map((e) => e.error),
      },
    });
  } catch (error: any) {
    console.error('[CSV Import] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ============================================================================
// CSV Parser
// ============================================================================

interface CSVRow {
  [key: string]: string;
}

function parseCSV(csvContent: string): CSVRow[] {
  const lines = csvContent.split('\n').filter((line) => line.trim());

  if (lines.length < 2) {
    return [];
  }

  // Parse header row
  const headers = parseCSVLine(lines[0]);

  // Parse data rows
  const rows: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: CSVRow = {};

    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || '';
    }

    rows.push(row);
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      // Check for escaped quotes
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  // Add last value
  values.push(current);

  return values;
}

// ============================================================================
// Helper: Format phone number to E.164
// ============================================================================

function formatPhoneForE164(phone: string): string | null {
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');

  // Remove + for processing
  const digits = cleaned.replace(/\+/g, '');

  // If starts with 1 and has 11 digits (US)
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // If 10 digits (US without country code)
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // If already has + and sufficient length
  if (phone.startsWith('+') && digits.length >= 10) {
    return `+${digits}`;
  }

  // Invalid
  return null;
}
