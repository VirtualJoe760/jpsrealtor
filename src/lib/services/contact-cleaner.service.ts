import fs from 'fs';
import path from 'path';
import { parse as csvParse } from 'csv-parse/sync';
import { stringify as csvStringify } from 'csv-stringify/sync';
import * as XLSX from 'xlsx';
import { parsePhoneNumber, CountryCode } from 'libphonenumber-js';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface CleanContactsOptions {
  phoneFields: string[];
  phoneFormat?: 'e164' | 'national' | 'raw';
  defaultCountryCode?: CountryCode;
  zipFields?: string[];
  requiredFields?: string[];
  skipInvalidPhones?: boolean;
  skipDuplicates?: boolean;
  exportFormat?: 'generic' | 'drop_cowboy' | 'sendfox' | 'mojo_dialer';
  previewMode?: boolean; // When true, skip CSV write and return data in-memory
}

export interface CleanContactsResult {
  success: boolean;
  outputPath?: string; // Optional in preview mode
  cleanedData?: any[]; // Returned in preview mode instead of writing file
  statistics: {
    totalRows: number;
    cleanedRows: number;
    skippedRows: number;
    duplicatesRemoved: number;
    warnings: Warning[];
  };
  error?: string;
}

interface Warning {
  row: number;
  type: 'missing_required' | 'invalid_phone' | 'invalid_zip' | 'duplicate';
  field?: string;
  value?: string;
  message: string;
}

// ============================================================================
// MAIN CLEANING FUNCTION
// ============================================================================

/**
 * Clean and normalize contact data from CSV or Excel files
 *
 * This is the core deterministic function that performs ALL data transformations.
 * The LLM decides WHEN and HOW to call this, but NEVER manipulates data directly.
 *
 * @param filePath - Absolute path to input CSV or Excel file
 * @param outputPath - Optional output path (auto-generated if not provided)
 * @param options - Cleaning and normalization options
 * @returns Result with statistics and warnings
 */
export async function cleanContacts(
  filePath: string,
  outputPath?: string,
  options?: CleanContactsOptions
): Promise<CleanContactsResult> {
  try {
    console.log('\n┌──────────────────────────────────────────────────────────┐');
    console.log('│ 📋 [Contact Cleaner] Starting contact cleaning          │');
    console.log('└──────────────────────────────────────────────────────────┘\n');
    console.log('📁 Input file path:', filePath);
    console.log('📂 Output path:', outputPath || 'auto-generated');
    console.log('⚙️ Options:', JSON.stringify(options, null, 2));

    // 1. Parse input file (CSV or Excel)
    console.log('📖 Parsing input file...');
    const contacts = await parseInputFile(filePath);
    console.log('✅ File parsed successfully');
    console.log('📊 Total contacts found:', contacts.length);

    if (contacts.length > 0) {
      console.log('👀 First contact sample:', JSON.stringify(contacts[0], null, 2));
      console.log('🔑 Available fields:', Object.keys(contacts[0]).join(', '));
    }

    if (contacts.length === 0) {
      console.error('❌ No contacts found in file');
      return {
        success: false,
        outputPath: '',
        statistics: {
          totalRows: 0,
          cleanedRows: 0,
          skippedRows: 0,
          duplicatesRemoved: 0,
          warnings: [],
        },
        error: 'No contacts found in file',
      };
    }

    // 2. Initialize tracking
    const warnings: Warning[] = [];
    const cleanedContacts: any[] = [];
    const seenPhones = new Set<string>();
    let skippedRows = 0;
    let duplicatesRemoved = 0;

    // 3. Process each contact row
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      const rowNumber = i + 2; // Excel/CSV row (1-indexed + header)

      // Validate required fields
      if (options?.requiredFields) {
        const missingFields = options.requiredFields.filter(
          field => !contact[field] || String(contact[field]).trim() === ''
        );

        if (missingFields.length > 0) {
          warnings.push({
            row: rowNumber,
            type: 'missing_required',
            field: missingFields.join(', '),
            message: `Missing required fields: ${missingFields.join(', ')}`,
          });
          skippedRows++;
          continue;
        }
      }

      // Clean and select best phone number using fallback logic
      const phoneResult = selectAndCleanPhone(contact, options || { phoneFields: [] });

      if (!phoneResult.phone) {
        if (options?.skipInvalidPhones) {
          warnings.push({
            row: rowNumber,
            type: 'invalid_phone',
            message: 'No valid phone number found',
          });
          skippedRows++;
          continue;
        }
      } else {
        contact._cleanedPhone = phoneResult.phone;
        contact._phoneSource = phoneResult.source;
      }

      // Check for duplicate phone numbers
      if (options?.skipDuplicates && phoneResult.phone) {
        if (seenPhones.has(phoneResult.phone)) {
          warnings.push({
            row: rowNumber,
            type: 'duplicate',
            field: '_cleanedPhone',
            value: phoneResult.phone,
            message: `Duplicate phone number: ${phoneResult.phone}`,
          });
          duplicatesRemoved++;
          continue;
        }
        seenPhones.add(phoneResult.phone);
      }

      // Clean ZIP codes (remove .0, preserve leading zeros)
      if (options?.zipFields) {
        options.zipFields.forEach(field => {
          if (contact[field]) {
            contact[field] = cleanZipCode(contact[field]);
          }
        });
      }

      // Clean all fields to remove Excel .0 artifacts
      Object.keys(contact).forEach(key => {
        if (typeof contact[key] === 'number') {
          // Check if it's a whole number with .0 artifact
          if (Number.isInteger(contact[key])) {
            contact[key] = String(Math.floor(contact[key]));
          } else {
            contact[key] = String(contact[key]);
          }
        }
      });

      cleanedContacts.push(contact);
    }

    // 4. Apply export format transformations
    const exportContacts = applyExportFormat(cleanedContacts, options?.exportFormat || 'generic');

    // 5. PREVIEW MODE: Return cleaned data in-memory without writing file
    if (options?.previewMode) {
      return {
        success: true,
        cleanedData: exportContacts, // Return data in-memory
        statistics: {
          totalRows: contacts.length,
          cleanedRows: cleanedContacts.length,
          skippedRows,
          duplicatesRemoved,
          warnings,
        },
      };
    }

    // 6. Generate output path
    const finalOutputPath = outputPath || generateOutputPath(filePath);

    // 7. Write cleaned CSV
    await writeCleanedCSV(exportContacts, finalOutputPath);

    // 8. Return results with statistics
    return {
      success: true,
      outputPath: finalOutputPath,
      statistics: {
        totalRows: contacts.length,
        cleanedRows: cleanedContacts.length,
        skippedRows,
        duplicatesRemoved,
        warnings,
      },
    };
  } catch (error: any) {
    console.error('\n❌❌❌ [Contact Cleaner] ERROR ❌❌❌');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return {
      success: false,
      outputPath: '',
      statistics: {
        totalRows: 0,
        cleanedRows: 0,
        skippedRows: 0,
        duplicatesRemoved: 0,
        warnings: [],
      },
      error: error.message,
    };
  }
}

// ============================================================================
// PARSING FUNCTIONS
// ============================================================================

/**
 * Parse CSV or Excel file into array of contact objects
 * Handles both .csv and .xlsx/.xls formats
 */
async function parseInputFile(filePath: string): Promise<any[]> {
  console.log('\n📂 [parseInputFile] Starting file parse...');
  console.log('📁 File path:', filePath);

  const ext = path.extname(filePath).toLowerCase();
  console.log('📎 File extension:', ext);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.error('❌ File does not exist!');
    throw new Error(`File not found: ${filePath}`);
  }
  console.log('✅ File exists');

  // Get file size
  const stats = fs.statSync(filePath);
  console.log('📏 File size:', (stats.size / 1024).toFixed(2), 'KB');

  if (ext === '.csv') {
    console.log('📄 Parsing CSV file...');
    const content = fs.readFileSync(filePath, 'utf-8');
    console.log('📝 File content length:', content.length, 'characters');
    console.log('📝 First 200 chars:', content.substring(0, 200));

    const parsed = csvParse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true, // Allow rows with inconsistent column counts (common in real-world data)
      relax_quotes: true, // Be lenient with quotes
    });
    console.log('✅ CSV parsed successfully, rows:', parsed.length);
    return parsed;
  } else if (ext === '.xlsx' || ext === '.xls') {
    console.log('📊 Parsing Excel file...');
    const workbook = XLSX.readFile(filePath);
    console.log('📑 Sheets found:', workbook.SheetNames.join(', '));
    const sheetName = workbook.SheetNames[0];
    console.log('📄 Using sheet:', sheetName);
    const worksheet = workbook.Sheets[sheetName];
    const parsed = XLSX.utils.sheet_to_json(worksheet);
    console.log('✅ Excel parsed successfully, rows:', parsed.length);
    return parsed;
  } else {
    console.error('❌ Unsupported file type:', ext);
    throw new Error(`Unsupported file type: ${ext}. Use .csv, .xlsx, or .xls`);
  }
}

// ============================================================================
// PHONE CLEANING FUNCTIONS
// ============================================================================

interface PhoneResult {
  phone: string | null;
  source: string | null;
}

/**
 * Select best phone field and clean it
 * Uses fallback logic: tries each field in order until valid phone found
 *
 * Example: ['Primary Phone', 'Mobile', 'Phone'] → tries Primary first, falls back to Mobile, etc.
 */
function selectAndCleanPhone(
  contact: any,
  options: CleanContactsOptions
): PhoneResult {
  // Try each phone field in order (fallback logic)
  for (const field of options.phoneFields) {
    const rawValue = contact[field];

    if (!rawValue) continue;

    const cleaned = cleanPhoneNumber(
      rawValue,
      options.phoneFormat || 'e164',
      options.defaultCountryCode || 'US'
    );

    if (cleaned) {
      return { phone: cleaned, source: field };
    }
  }

  return { phone: null, source: null };
}

/**
 * Clean and format a single phone number
 * Removes Excel .0 artifacts, validates, and formats according to requested format
 *
 * @param value - Raw phone value (may have .0 from Excel)
 * @param format - Desired output format (e164/national/raw)
 * @param countryCode - Country for parsing (default US)
 * @returns Cleaned phone number or null if invalid
 */
function cleanPhoneNumber(
  value: any,
  format: 'e164' | 'national' | 'raw',
  countryCode: CountryCode
): string | null {
  try {
    // Convert to string and remove .0 artifacts from Excel
    let phoneStr = String(value).trim();

    // Remove Excel .0 artifact (e.g., "5551234567.0" → "5551234567")
    if (phoneStr.endsWith('.0')) {
      phoneStr = phoneStr.slice(0, -2);
    }

    // Parse phone number using libphonenumber-js
    const parsed = parsePhoneNumber(phoneStr, countryCode);

    if (!parsed || !parsed.isValid()) {
      return null;
    }

    // Format based on requested format
    switch (format) {
      case 'e164':
        return parsed.format('E.164'); // +12345678900
      case 'national':
        return parsed.formatNational(); // (234) 567-8900
      case 'raw':
        return parsed.nationalNumber.toString(); // 2345678900
      default:
        return parsed.format('E.164');
    }
  } catch (error) {
    return null;
  }
}

// ============================================================================
// ZIP CODE CLEANING FUNCTIONS
// ============================================================================

/**
 * Clean ZIP code by removing .0 and preserving leading zeros
 *
 * Excel converts "01234" to number 1234, then exports as "1234.0"
 * This function reverses that damage:
 * - "1234.0" → "01234"
 * - "12345.0" → "12345"
 * - "123456789.0" → "12345-6789" (ZIP+4 format)
 */
function cleanZipCode(value: any): string {
  let zipStr = String(value).trim();

  // Remove Excel .0 artifact
  if (zipStr.endsWith('.0')) {
    zipStr = zipStr.slice(0, -2);
  }

  // Pad with leading zeros if needed (US ZIP codes are 5 digits)
  if (/^\d{1,4}$/.test(zipStr)) {
    zipStr = zipStr.padStart(5, '0');
  }

  // Handle ZIP+4 format (9 consecutive digits → 12345-6789)
  if (/^\d{9}$/.test(zipStr)) {
    zipStr = `${zipStr.slice(0, 5)}-${zipStr.slice(5)}`;
  }

  return zipStr;
}

// ============================================================================
// EXPORT FORMAT FUNCTIONS
// ============================================================================

/**
 * Transform contacts to platform-specific format
 * This allows adding new platforms via configuration without code changes
 *
 * Each platform has specific field requirements and naming conventions
 */
function applyExportFormat(contacts: any[], format: string): any[] {
  switch (format) {
    case 'drop_cowboy':
      // Drop Cowboy RVM requires these exact field names
      return contacts.map(c => ({
        'First Name': c.firstName || c.first_name || c['First Name'] || '',
        'Last Name': c.lastName || c.last_name || c['Last Name'] || '',
        'Phone': c._cleanedPhone || '',
        'Email': c.email || c.Email || '',
        'Address': c.address || c.Address || c.street || '',
        'City': c.city || c.City || '',
        'State': c.state || c.State || c.province || '',
        'ZIP': c.zip || c.zipCode || c.ZIP || c['Zip Code'] || c.postal_code || '',
      }));

    case 'sendfox':
      // SendFox email marketing format
      return contacts.map(c => ({
        'email': c.email || c.Email || '',
        'first_name': c.firstName || c.first_name || c['First Name'] || '',
        'last_name': c.lastName || c.last_name || c['Last Name'] || '',
      }));

    case 'mojo_dialer':
      // MOJO Dialer format
      return contacts.map(c => ({
        'First Name': c.firstName || c.first_name || c['First Name'] || '',
        'Last Name': c.lastName || c.last_name || c['Last Name'] || '',
        'Primary Phone': c._cleanedPhone || '',
        'Address': c.address || c.Address || c.street || '',
        'City': c.city || c.City || '',
        'State': c.state || c.State || '',
        'Zip': c.zip || c.zipCode || c.ZIP || c['Zip Code'] || '',
      }));

    case 'generic':
    default:
      // Return all fields as-is
      return contacts;
  }
}

// ============================================================================
// OUTPUT FUNCTIONS
// ============================================================================

/**
 * Generate output file path from input path
 * Example: "contacts.xlsx" → "contacts_cleaned.csv"
 */
function generateOutputPath(inputPath: string): string {
  const parsed = path.parse(inputPath);
  return path.join(parsed.dir, `${parsed.name}_cleaned.csv`);
}

/**
 * Write cleaned contacts to CSV file
 * Always outputs CSV regardless of input format (for maximum compatibility)
 */
async function writeCleanedCSV(contacts: any[], outputPath: string): Promise<void> {
  const csv = csvStringify(contacts, {
    header: true,
    quoted: true,
  });

  fs.writeFileSync(outputPath, csv, 'utf-8');
}

// ============================================================================
// GROQ INTEGRATION WRAPPER
// ============================================================================

/**
 * Wrapper function for Groq tool calling
 * This is what gets registered with the Groq function calling API
 *
 * The LLM calls this function with arguments, and this executes the cleaning
 */
export async function cleanContactsTool(args: {
  filePath: string;
  outputPath?: string;
  options: CleanContactsOptions;
}): Promise<CleanContactsResult> {
  return cleanContacts(args.filePath, args.outputPath, args.options);
}

/**
 * Preview contacts tool wrapper for Groq
 * This is for the chat-based import workflow - shows preview without writing files
 */
export async function previewContactsTool(args: {
  filePath: string;
  options: CleanContactsOptions;
}): Promise<CleanContactsResult> {
  // Force preview mode
  const previewOptions = { ...args.options, previewMode: true };
  return cleanContacts(args.filePath, undefined, previewOptions);
}
