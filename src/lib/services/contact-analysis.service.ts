/**
 * Contact Analysis Service
 *
 * Analyzes contact data from CSV imports for data quality issues.
 * Used by Prospect Discovery to provide users with detailed feedback
 * before importing contacts.
 */

import Papa from 'papaparse';
import { Types } from 'mongoose';
import ImportBatch, { IImportBatch } from '@/models/ImportBatch';
import {
  detectEmoji,
  cleanName,
  normalizePhone,
  validateEmail,
  detectJunkEntry,
  analyzeContactQuality,
  generateContactHash,
  splitMultiplePhones,
  splitMultipleEmails,
} from '@/lib/utils/contact-cleaning.utils';

// ========================================
// TYPE DEFINITIONS
// ========================================

export interface ContactRow {
  'First Name': string;
  'Last Name': string;
  'Organization Name'?: string;
  'Phone 1 - Label'?: string;
  'Phone 1 - Value': string;
  'Phone 2 - Label'?: string;
  'Phone 2 - Value'?: string;
  'Phone 3 - Label'?: string;
  'Phone 3 - Value'?: string;
  'E-mail 1 - Label'?: string;
  'E-mail 1 - Value'?: string;
  'E-mail 2 - Label'?: string;
  'E-mail 2 - Value'?: string;
  'Labels'?: string;
  [key: string]: string | undefined;
}

export interface AnalysisReport {
  totalRows: number;

  dataQualityIssues: {
    noName: number;
    noPhone: number;
    multiplePhones: number;
    multipleEmails: number;
    invalidPhoneFormat: number;
    emojiInName: number;
    organizationOnly: number;
    duplicates: number;
    junkEntries: number;
    specialCharactersInName: number;
  };

  // Examples for UI display
  phoneFormatExamples: string[];
  emailFormatExamples: string[];
  organizationOnlyExamples: string[];
  multiplePhoneExamples: Array<{ contact: string; phones: string[] }>;
  emojiExamples: string[];
  junkExamples: string[];

  // Summary
  qualityScore: number;  // 0-100 overall quality score
  recommendedActions: string[];  // List of recommended cleanup actions
}

// ========================================
// ANALYSIS SERVICE
// ========================================

export class ContactAnalysisService {
  /**
   * Analyze CSV file contents
   */
  static async analyzeCSV(fileContent: string): Promise<AnalysisReport> {
    // Parse CSV
    const parsed = Papa.parse<ContactRow>(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    if (parsed.errors.length > 0) {
      console.error('CSV parsing errors:', parsed.errors);
    }

    const contacts = parsed.data;
    return this.analyzeContacts(contacts);
  }

  /**
   * Analyze array of contact rows
   */
  static analyzeContacts(contacts: ContactRow[]): AnalysisReport {
    const report: AnalysisReport = {
      totalRows: contacts.length,
      dataQualityIssues: {
        noName: 0,
        noPhone: 0,
        multiplePhones: 0,
        multipleEmails: 0,
        invalidPhoneFormat: 0,
        emojiInName: 0,
        organizationOnly: 0,
        duplicates: 0,
        junkEntries: 0,
        specialCharactersInName: 0,
      },
      phoneFormatExamples: [],
      emailFormatExamples: [],
      organizationOnlyExamples: [],
      multiplePhoneExamples: [],
      emojiExamples: [],
      junkExamples: [],
      qualityScore: 0,
      recommendedActions: [],
    };

    const seenPhones = new Set<string>();
    const phoneFormats = new Set<string>();
    const emailFormats = new Set<string>();
    let totalQualityScore = 0;

    // Analyze each contact
    contacts.forEach((contact) => {
      const result = this.processContactRow(contact, report, seenPhones, phoneFormats, emailFormats);
      totalQualityScore += result.qualityScore;
    });

    // Calculate overall quality score
    report.qualityScore = contacts.length > 0
      ? Math.round(totalQualityScore / contacts.length)
      : 0;

    // Sample phone and email formats
    report.phoneFormatExamples = Array.from(phoneFormats).slice(0, 20);
    report.emailFormatExamples = Array.from(emailFormats).slice(0, 20);

    // Generate recommendations
    report.recommendedActions = this.generateRecommendations(report);

    return report;
  }

  /**
   * Process a single contact row and update the report
   */
  private static processContactRow(
    contact: ContactRow,
    report: AnalysisReport,
    seenPhones: Set<string>,
    phoneFormats: Set<string>,
    emailFormats: Set<string>
  ): { qualityScore: number } {
    const firstName = contact['First Name']?.trim() || '';
    const lastName = contact['Last Name']?.trim() || '';
    const orgName = contact['Organization Name']?.trim() || '';
    const phone1 = contact['Phone 1 - Value']?.trim() || '';
    const phone2 = contact['Phone 2 - Value']?.trim() || '';
    const phone3 = contact['Phone 3 - Value']?.trim() || '';
    const email1 = contact['E-mail 1 - Value']?.trim() || '';
    const email2 = contact['E-mail 2 - Value']?.trim() || '';

    const fullName = `${firstName} ${lastName}`.trim();

    // Use Prospect Discovery utilities for comprehensive analysis
    const contactData = {
      firstName,
      lastName,
      organization: orgName,
      phone: [phone1, phone2, phone3].filter(p => p).join(' ::: '),
      email: [email1, email2].filter(e => e).join(' ::: '),
    };

    const qualityAnalysis = analyzeContactQuality(contactData);

    // Aggregate issues from quality analysis
    this.aggregateIssues(qualityAnalysis.issues, report, fullName, orgName, phone1);

    // Check for multiple phones and emails
    const allPhones = [phone1, phone2, phone3].filter(p => p);
    this.checkMultiplePhones(allPhones, report, fullName, orgName);

    const allEmails = [email1, email2].filter(e => e);
    this.checkMultipleEmails(allEmails, report);

    // Collect format examples
    if (phone1 && phoneFormats.size < 20) {
      phoneFormats.add(phone1);
    }
    if (email1 && emailFormats.size < 20) {
      emailFormats.add(email1);
    }

    // Check for duplicates using hash-based detection
    this.checkDuplicates(allPhones, seenPhones, report);

    return { qualityScore: qualityAnalysis.score };
  }

  /**
   * Aggregate quality issues into the report
   */
  private static aggregateIssues(
    issues: string[],
    report: AnalysisReport,
    fullName: string,
    orgName: string,
    phone1: string
  ): void {
    issues.forEach(issue => {
      switch (issue) {
        case 'no_name':
          report.dataQualityIssues.noName++;
          break;
        case 'no_phone':
          report.dataQualityIssues.noPhone++;
          break;
        case 'invalid_phone':
          report.dataQualityIssues.invalidPhoneFormat++;
          break;
        case 'emoji_in_name':
          report.dataQualityIssues.emojiInName++;
          if (report.emojiExamples.length < 5) {
            report.emojiExamples.push(fullName || orgName);
          }
          break;
        case 'organization_only':
          report.dataQualityIssues.organizationOnly++;
          if (report.organizationOnlyExamples.length < 10) {
            report.organizationOnlyExamples.push(orgName);
          }
          break;
        case 'special_characters':
          report.dataQualityIssues.specialCharactersInName++;
          break;
        case 'junk_entry':
          report.dataQualityIssues.junkEntries++;
          if (report.junkExamples.length < 5) {
            report.junkExamples.push(fullName || orgName || phone1);
          }
          break;
      }
    });
  }

  /**
   * Check for multiple phones in a contact
   */
  private static checkMultiplePhones(
    allPhones: string[],
    report: AnalysisReport,
    fullName: string,
    orgName: string
  ): void {
    const hasMultiplePhonesSeparator = allPhones.some(p => p.includes(':::'));
    if (hasMultiplePhonesSeparator || allPhones.length > 1) {
      report.dataQualityIssues.multiplePhones++;
      if (report.multiplePhoneExamples.length < 5) {
        const phonesArray = allPhones
          .flatMap(p => splitMultiplePhones(p))
          .filter(p => p);
        report.multiplePhoneExamples.push({
          contact: fullName || orgName || 'Unknown',
          phones: phonesArray,
        });
      }
    }
  }

  /**
   * Check for multiple emails in a contact
   */
  private static checkMultipleEmails(
    allEmails: string[],
    report: AnalysisReport
  ): void {
    const hasMultipleEmailsSeparator = allEmails.some(e => e.includes(':::'));
    if (hasMultipleEmailsSeparator || allEmails.length > 1) {
      report.dataQualityIssues.multipleEmails++;
    }
  }

  /**
   * Check for duplicate phone numbers
   */
  private static checkDuplicates(
    allPhones: string[],
    seenPhones: Set<string>,
    report: AnalysisReport
  ): void {
    allPhones.forEach(phone => {
      if (phone) {
        const hash = generateContactHash(phone);
        if (hash && seenPhones.has(hash)) {
          report.dataQualityIssues.duplicates++;
        }
        if (hash) {
          seenPhones.add(hash);
        }
      }
    });
  }

  /**
   * Generate recommended actions based on analysis
   */
  private static generateRecommendations(report: AnalysisReport): string[] {
    const recommendations: string[] = [];

    if (report.dataQualityIssues.multiplePhones > 0) {
      recommendations.push('Split contacts with multiple phone numbers into separate entries');
    }

    if (report.dataQualityIssues.emojiInName > 0) {
      recommendations.push('Remove emoji from contact names or flag as personal contacts');
    }

    if (report.dataQualityIssues.organizationOnly > 0) {
      recommendations.push('Review organization-only contacts and add person names if available');
    }

    if (report.dataQualityIssues.duplicates > 0) {
      recommendations.push('Merge or remove duplicate phone numbers');
    }

    if (report.dataQualityIssues.junkEntries > 0) {
      recommendations.push('Remove test entries and spam contacts');
    }

    if (report.dataQualityIssues.invalidPhoneFormat > 0) {
      recommendations.push('Fix invalid phone number formats (use E.164 format)');
    }

    if (report.dataQualityIssues.specialCharactersInName > 0) {
      recommendations.push('Clean special characters from contact names');
    }

    if (report.dataQualityIssues.noPhone > 0) {
      recommendations.push('Add phone numbers to contacts or remove contacts without phones');
    }

    if (recommendations.length === 0) {
      recommendations.push('Data quality looks good! Ready to import.');
    }

    return recommendations;
  }

  /**
   * Create or update an ImportBatch with analysis results
   */
  static async saveAnalysisToImportBatch(
    userId: Types.ObjectId,
    fileName: string,
    fileSize: number,
    analysis: AnalysisReport
  ): Promise<IImportBatch> {
    const importBatch = new ImportBatch({
      userId,
      source: 'csv_import',
      fileName,
      fileSize,
      status: 'ready',  // Analysis complete, ready to import
      analysis,
      analyzedAt: new Date(),
    });

    await importBatch.save();
    return importBatch;
  }

  /**
   * Update existing ImportBatch with analysis
   */
  static async updateImportBatchWithAnalysis(
    batchId: Types.ObjectId,
    analysis: AnalysisReport
  ): Promise<IImportBatch | null> {
    // @ts-expect-error Mongoose typing issue with overloaded signatures
    const batch = await ImportBatch.findByIdAndUpdate(
      batchId,
      {
        $set: {
          analysis,
          status: 'ready',
          analyzedAt: new Date(),
        },
      },
      { new: true }
    );

    return batch;
  }
}
