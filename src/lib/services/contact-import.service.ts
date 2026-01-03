/**
 * Contact Import Service
 *
 * Handles importing and normalizing contacts from multiple sources:
 * - CSV/Excel files (Title Rep, manual imports)
 * - Google Contacts API
 * - Mojo Dialer API
 * - Existing database contacts
 */

import { Types } from 'mongoose';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import Contact, { IContact } from '@/models/contact';
import ContactCampaign, { ContactSource } from '@/models/ContactCampaign';
import ImportBatch, { IImportBatch } from '@/models/ImportBatch';
import Campaign from '@/models/Campaign';

// Type definitions for import results
export interface ImportResult {
  success: boolean;
  batchId: Types.ObjectId;
  imported: number;
  duplicates: number;
  errors: number;
  message: string;
}

export interface ContactData {
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  [key: string]: any; // Allow additional fields
}

export interface DuplicateCheck {
  isDuplicate: boolean;
  existingContactId?: Types.ObjectId;
  matchedOn: 'phone' | 'email' | 'none';
}

// Field mapping configurations for different sources
const FIELD_MAPPINGS: Record<string, Record<string, string>> = {
  title_rep: {
    'Owner Name': 'fullName',
    'Property Owner': 'fullName',
    'Owner': 'fullName',
    'Property Address': 'address.street',
    'Address': 'address.street',
    'City': 'address.city',
    'State': 'address.state',
    'ZIP': 'address.zip',
    'Zip': 'address.zip',
    'Phone': 'phone',
    'Phone Number': 'phone',
    'Email': 'email',
    'Sale Date': 'metadata.saleDate',
    'Sale Price': 'metadata.salePrice',
  },
  mojo_dialer: {
    'first_name': 'firstName',
    'last_name': 'lastName',
    'phone': 'phone',
    'email': 'email',
    'address': 'address.street',
    'city': 'address.city',
    'state': 'address.state',
    'zip': 'address.zip',
    'property_type': 'metadata.propertyType',
    'status': 'metadata.listingStatus',
  },
  csv_import: {
    // Generic CSV mapping (flexible)
    'First Name': 'firstName',
    'Last Name': 'lastName',
    'Phone': 'phone',
    'Email': 'email',
    'Address': 'address.street',
    'City': 'address.city',
    'State': 'address.state',
    'ZIP': 'address.zip',
    'Zip': 'address.zip',
  },
};

export class ContactImportService {
  /**
   * Import contacts from a CSV or Excel file
   */
  static async importFromFile(
    file: File | Buffer,
    userId: Types.ObjectId,
    campaignId: Types.ObjectId,
    source: ContactSource,
    fileName?: string
  ): Promise<ImportResult> {
    try {
      // Create import batch record
      const batch = await (ImportBatch as any).create({
        userId,
        campaignId,
        source,
        fileName: fileName || 'unknown',
        status: 'processing',
      });

      // Parse file based on type
      let data: any[];
      if (typeof file === 'string') {
        // File path - read and parse
        throw new Error('File path import not yet implemented');
      } else if (file instanceof Buffer) {
        // Parse Buffer
        data = await this.parseFileBuffer(file, fileName);
      } else {
        // Parse File object
        data = await this.parseFile(file as File);
      }

      // Get field mapping for source
      const fieldMapping = FIELD_MAPPINGS[source] || FIELD_MAPPINGS.csv_import;

      // Update batch with total count
      batch.progress.total = data.length;
      await batch.save();

      // Process each row
      const results = await this.processRows(
        data,
        userId,
        campaignId,
        source,
        batch._id,
        fieldMapping
      );

      // Update batch with results
      await batch.updateProgress(
        results.processed,
        results.successful,
        results.failed,
        results.duplicates
      );
      await batch.markAsCompleted();

      return {
        success: true,
        batchId: batch._id,
        imported: results.successful,
        duplicates: results.duplicates,
        errors: results.failed,
        message: `Successfully imported ${results.successful} contacts`,
      };
    } catch (error: any) {
      console.error('[ContactImportService] Import failed:', error);
      return {
        success: false,
        batchId: new Types.ObjectId(),
        imported: 0,
        duplicates: 0,
        errors: 0,
        message: error.message || 'Import failed',
      };
    }
  }

  /**
   * Import from Google Contacts API
   */
  static async importFromGoogleContacts(
    accessToken: string,
    userId: Types.ObjectId,
    campaignId: Types.ObjectId
  ): Promise<ImportResult> {
    try {
      // Create import batch
      const batch = await (ImportBatch as any).create({
        userId,
        campaignId,
        source: 'google_contacts',
        status: 'processing',
      });

      // Fetch contacts from Google People API
      const contacts = await this.fetchGoogleContacts(accessToken);

      batch.progress.total = contacts.length;
      await batch.save();

      // Process Google contacts
      const results = await this.processGoogleContacts(
        contacts,
        userId,
        campaignId,
        batch._id
      );

      await batch.updateProgress(
        results.processed,
        results.successful,
        results.failed,
        results.duplicates
      );
      await batch.markAsCompleted();

      return {
        success: true,
        batchId: batch._id,
        imported: results.successful,
        duplicates: results.duplicates,
        errors: results.failed,
        message: `Successfully imported ${results.successful} contacts from Google`,
      };
    } catch (error: any) {
      console.error('[ContactImportService] Google import failed:', error);
      return {
        success: false,
        batchId: new Types.ObjectId(),
        imported: 0,
        duplicates: 0,
        errors: 0,
        message: error.message || 'Google import failed',
      };
    }
  }

  /**
   * Import from Mojo Dialer API
   */
  static async importFromMojoDialer(
    credentials: { apiKey: string; userId: string },
    listId: string,
    userId: Types.ObjectId,
    campaignId: Types.ObjectId
  ): Promise<ImportResult> {
    try {
      const batch = await (ImportBatch as any).create({
        userId,
        campaignId,
        source: 'mojo_dialer',
        status: 'processing',
      });

      // Fetch leads from Mojo Dialer API
      const leads = await this.fetchMojoDialerLeads(credentials, listId);

      batch.progress.total = leads.length;
      await batch.save();

      // Process Mojo contacts
      const results = await this.processMojoContacts(
        leads,
        userId,
        campaignId,
        batch._id
      );

      await batch.updateProgress(
        results.processed,
        results.successful,
        results.failed,
        results.duplicates
      );
      await batch.markAsCompleted();

      return {
        success: true,
        batchId: batch._id,
        imported: results.successful,
        duplicates: results.duplicates,
        errors: results.failed,
        message: `Successfully imported ${results.successful} contacts from Mojo Dialer`,
      };
    } catch (error: any) {
      console.error('[ContactImportService] Mojo import failed:', error);
      return {
        success: false,
        batchId: new Types.ObjectId(),
        imported: 0,
        duplicates: 0,
        errors: 0,
        message: error.message || 'Mojo import failed',
      };
    }
  }

  /**
   * Import from existing database contacts
   */
  static async importFromDatabase(
    contactIds: Types.ObjectId[],
    userId: Types.ObjectId,
    campaignId: Types.ObjectId
  ): Promise<ImportResult> {
    try {
      // Verify all contacts belong to this user
      const contacts = await (Contact as any).find({
        _id: { $in: contactIds },
        userId,
      });

      if (contacts.length !== contactIds.length) {
        throw new Error('Some contacts not found or unauthorized');
      }

      // Create ContactCampaign records
      const contactCampaigns = await Promise.all(
        contacts.map((contact) =>
          (ContactCampaign as any).create({
            contactId: contact._id,
            campaignId,
            userId,
            source: 'database',
            status: 'pending',
          })
        )
      );

      // Update campaign stats
      const campaign = await (Campaign as any).findById(campaignId);
      if (campaign) {
        campaign.stats.totalContacts += contacts.length;
        await campaign.save();
      }

      return {
        success: true,
        batchId: new Types.ObjectId(),
        imported: contacts.length,
        duplicates: 0,
        errors: 0,
        message: `Successfully added ${contacts.length} contacts to campaign`,
      };
    } catch (error: any) {
      console.error('[ContactImportService] Database import failed:', error);
      return {
        success: false,
        batchId: new Types.ObjectId(),
        imported: 0,
        duplicates: 0,
        errors: 0,
        message: error.message || 'Database import failed',
      };
    }
  }

  /**
   * Parse CSV or Excel file
   */
  private static async parseFile(file: File): Promise<any[]> {
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
      return this.parseCSV(file);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      return this.parseExcel(file);
    } else {
      throw new Error('Unsupported file type. Please upload CSV or Excel file.');
    }
  }

  /**
   * Parse file from Buffer
   */
  private static async parseFileBuffer(
    buffer: Buffer,
    fileName?: string
  ): Promise<any[]> {
    const name = fileName?.toLowerCase() || '';

    if (name.endsWith('.csv')) {
      return this.parseCSVBuffer(buffer);
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      return this.parseExcelBuffer(buffer);
    } else {
      // Try CSV first, then Excel
      try {
        return this.parseCSVBuffer(buffer);
      } catch {
        return this.parseExcelBuffer(buffer);
      }
    }
  }

  /**
   * Parse CSV file
   */
  private static parseCSV(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data);
        },
        error: (error) => {
          reject(error);
        },
      });
    });
  }

  /**
   * Parse CSV from Buffer
   */
  private static parseCSVBuffer(buffer: Buffer): Promise<any[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(buffer.toString('utf-8'), {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data);
        },
        error: (error) => {
          reject(error);
        },
      });
    });
  }

  /**
   * Parse Excel file
   */
  private static async parseExcel(file: File): Promise<any[]> {
    const buffer = await file.arrayBuffer();
    return this.parseExcelBuffer(Buffer.from(buffer));
  }

  /**
   * Parse Excel from Buffer
   */
  private static parseExcelBuffer(buffer: Buffer): Promise<any[]> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(firstSheet);
  }

  /**
   * Process rows of data and create contacts
   */
  private static async processRows(
    rows: any[],
    userId: Types.ObjectId,
    campaignId: Types.ObjectId,
    source: ContactSource,
    batchId: Types.ObjectId,
    fieldMapping: Record<string, string>
  ): Promise<{
    processed: number;
    successful: number;
    failed: number;
    duplicates: number;
  }> {
    let processed = 0;
    let successful = 0;
    let failed = 0;
    let duplicates = 0;

    for (const row of rows) {
      try {
        // Normalize the row data
        const normalizedData = this.normalizeContactData(row, source, fieldMapping);

        // Check for duplicates
        const duplicateCheck = await this.checkDuplicate(normalizedData, userId);

        let contactId: Types.ObjectId;

        if (duplicateCheck.isDuplicate && duplicateCheck.existingContactId) {
          // Use existing contact
          contactId = duplicateCheck.existingContactId;
          duplicates++;
        } else {
          // Create new contact
          const contact = await Contact.create({
            ...normalizedData,
            userId,
            source,
            importedAt: new Date(),
          });
          contactId = contact._id;
          successful++;
        }

        // Create ContactCampaign record
        await ContactCampaign.create({
          contactId,
          campaignId,
          userId,
          source,
          importBatchId: batchId,
          status: 'pending',
        });

        processed++;
      } catch (error: any) {
        console.error('[ContactImportService] Row processing failed:', error);
        failed++;

        // Log error to batch
        const batch = await ImportBatch.findById(batchId);
        if (batch) {
          await batch.addError(processed, error.message, row);
        }
      }
    }

    // Update campaign stats
    const campaign = await Campaign.findById(campaignId);
    if (campaign) {
      campaign.stats.totalContacts += successful;
      await campaign.save();
    }

    return { processed, successful, failed, duplicates };
  }

  /**
   * Normalize contact data from raw input
   */
  private static normalizeContactData(
    raw: any,
    source: ContactSource,
    fieldMapping: Record<string, string>
  ): Partial<IContact> {
    const normalized: any = {};

    // Apply field mapping
    for (const [sourceField, targetField] of Object.entries(fieldMapping)) {
      if (raw[sourceField]) {
        this.setNestedValue(normalized, targetField, raw[sourceField]);
      }
    }

    // Handle full name splitting (if only fullName provided)
    if (normalized.fullName && !normalized.firstName) {
      const nameParts = normalized.fullName.trim().split(/\s+/);
      normalized.firstName = nameParts[0];
      normalized.lastName = nameParts.slice(1).join(' ') || '';
      delete normalized.fullName;
    }

    // Ensure phone is in E.164 format (basic normalization)
    if (normalized.phone) {
      normalized.phone = this.normalizePhoneNumber(normalized.phone);
    }

    // Ensure email is lowercase
    if (normalized.email) {
      normalized.email = normalized.email.toLowerCase().trim();
    }

    return normalized;
  }

  /**
   * Set nested value in object (e.g., 'address.city' => obj.address.city)
   */
  private static setNestedValue(obj: any, path: string, value: any) {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * Normalize phone number to E.164 format (basic version)
   */
  private static normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');

    // If 10 digits, assume US number and add +1
    if (digits.length === 10) {
      return `+1${digits}`;
    }

    // If 11 digits starting with 1, add +
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }

    // Otherwise return as-is with + prefix
    return digits.startsWith('+') ? phone : `+${digits}`;
  }

  /**
   * Check if contact already exists (duplicate detection)
   */
  private static async checkDuplicate(
    contactData: Partial<IContact>,
    userId: Types.ObjectId
  ): Promise<DuplicateCheck> {
    // Check by phone first (most reliable)
    if (contactData.phone) {
      const existingByPhone = await Contact.findOne({
        userId,
        phone: contactData.phone,
      });

      if (existingByPhone) {
        return {
          isDuplicate: true,
          existingContactId: existingByPhone._id,
          matchedOn: 'phone',
        };
      }
    }

    // Check by email (if no phone match)
    if (contactData.email) {
      const existingByEmail = await Contact.findOne({
        userId,
        email: contactData.email,
      });

      if (existingByEmail) {
        return {
          isDuplicate: true,
          existingContactId: existingByEmail._id,
          matchedOn: 'email',
        };
      }
    }

    return {
      isDuplicate: false,
      matchedOn: 'none',
    };
  }

  /**
   * Fetch contacts from Google People API
   */
  private static async fetchGoogleContacts(accessToken: string): Promise<any[]> {
    // TODO: Implement Google People API integration
    // Reference: https://developers.google.com/people/api/rest/v1/people.connections/list
    throw new Error('Google Contacts integration not yet implemented');
  }

  /**
   * Process Google contacts format
   */
  private static async processGoogleContacts(
    googleContacts: any[],
    userId: Types.ObjectId,
    campaignId: Types.ObjectId,
    batchId: Types.ObjectId
  ): Promise<{
    processed: number;
    successful: number;
    failed: number;
    duplicates: number;
  }> {
    // TODO: Implement Google contacts processing
    throw new Error('Google Contacts processing not yet implemented');
  }

  /**
   * Fetch leads from Mojo Dialer API
   */
  private static async fetchMojoDialerLeads(
    credentials: { apiKey: string; userId: string },
    listId: string
  ): Promise<any[]> {
    // TODO: Implement Mojo Dialer API integration
    throw new Error('Mojo Dialer integration not yet implemented');
  }

  /**
   * Process Mojo Dialer contacts format
   */
  private static async processMojoContacts(
    mojoLeads: any[],
    userId: Types.ObjectId,
    campaignId: Types.ObjectId,
    batchId: Types.ObjectId
  ): Promise<{
    processed: number;
    successful: number;
    failed: number;
    duplicates: number;
  }> {
    // TODO: Implement Mojo contacts processing
    throw new Error('Mojo Dialer processing not yet implemented');
  }
}
