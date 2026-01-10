/**
 * Contact CSV Analysis Script
 * Analyzes messy Google Contacts CSV to identify data quality issues
 *
 * Uses Prospect Discovery utilities for comprehensive data quality analysis.
 *
 * Usage: npx tsx scripts/analyze-messy-contacts.ts [path-to-csv]
 */

import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
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
} from '../src/lib/utils/contact-cleaning.utils';

interface ContactRow {
  'First Name': string;
  'Last Name': string;
  'Organization Name': string;
  'Phone 1 - Label': string;
  'Phone 1 - Value': string;
  'Phone 2 - Label': string;
  'Phone 2 - Value': string;
  'Phone 3 - Label': string;
  'Phone 3 - Value': string;
  'E-mail 1 - Label': string;
  'E-mail 1 - Value': string;
  'E-mail 2 - Label': string;
  'E-mail 2 - Value': string;
  'Labels': string;
  [key: string]: string;
}

interface AnalysisReport {
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
  phoneFormatExamples: string[];
  emailFormatExamples: string[];
  organizationOnlyExamples: string[];
  multiplePhoneExamples: Array<{ contact: string; phones: string[] }>;
  emojiExamples: string[];
  junkExamples: string[];
}

function analyzeContacts(filePath: string): AnalysisReport {
  console.log('🔍 Reading CSV file...');
  const fileContent = fs.readFileSync(filePath, 'utf-8');

  console.log('📊 Parsing CSV data...');
  const parsed = Papa.parse<ContactRow>(fileContent, {
    header: true,
    skipEmptyLines: true,
  });

  const contacts = parsed.data;
  console.log(`✅ Parsed ${contacts.length} contacts\n`);

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
  };

  const seenPhones = new Set<string>();
  const seenEmails = new Set<string>();
  const phoneFormats = new Set<string>();
  const emailFormats = new Set<string>();

  console.log('🔬 Analyzing data quality issues...\n');

  contacts.forEach((contact, index) => {
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
    qualityAnalysis.issues.forEach(issue => {
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

    // Check for multiple phones (separated by :::)
    const allPhones = [phone1, phone2, phone3].filter(p => p);
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

    // Check for multiple emails (separated by :::)
    const allEmails = [email1, email2].filter(e => e);
    const hasMultipleEmailsSeparator = allEmails.some(e => e.includes(':::'));
    if (hasMultipleEmailsSeparator || allEmails.length > 1) {
      report.dataQualityIssues.multipleEmails++;
    }

    // Collect phone format examples
    if (phone1) {
      phoneFormats.add(phone1);
    }

    // Collect email format examples
    if (email1) {
      emailFormats.add(email1);
    }

    // Check for duplicates using hash-based detection
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
  });

  // Sample phone formats
  report.phoneFormatExamples = Array.from(phoneFormats).slice(0, 20);
  report.emailFormatExamples = Array.from(emailFormats).slice(0, 20);

  return report;
}

function printReport(report: AnalysisReport) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 CONTACT DATA QUALITY ANALYSIS REPORT');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log(`📈 Total Contacts: ${report.totalRows.toLocaleString()}\n`);

  console.log('🚨 DATA QUALITY ISSUES:\n');
  console.log(`  ❌ No Name:                    ${report.dataQualityIssues.noName.toLocaleString()} (${((report.dataQualityIssues.noName / report.totalRows) * 100).toFixed(1)}%)`);
  console.log(`  ❌ No Phone:                   ${report.dataQualityIssues.noPhone.toLocaleString()} (${((report.dataQualityIssues.noPhone / report.totalRows) * 100).toFixed(1)}%)`);
  console.log(`  ⚠️  Multiple Phones (:::):     ${report.dataQualityIssues.multiplePhones.toLocaleString()} (${((report.dataQualityIssues.multiplePhones / report.totalRows) * 100).toFixed(1)}%)`);
  console.log(`  ⚠️  Multiple Emails (:::):     ${report.dataQualityIssues.multipleEmails.toLocaleString()} (${((report.dataQualityIssues.multipleEmails / report.totalRows) * 100).toFixed(1)}%)`);
  console.log(`  ⚠️  Emoji in Name:             ${report.dataQualityIssues.emojiInName.toLocaleString()} (${((report.dataQualityIssues.emojiInName / report.totalRows) * 100).toFixed(1)}%)`);
  console.log(`  ⚠️  Organization Only:         ${report.dataQualityIssues.organizationOnly.toLocaleString()} (${((report.dataQualityIssues.organizationOnly / report.totalRows) * 100).toFixed(1)}%)`);
  console.log(`  ⚠️  Special Chars in Name:     ${report.dataQualityIssues.specialCharactersInName.toLocaleString()} (${((report.dataQualityIssues.specialCharactersInName / report.totalRows) * 100).toFixed(1)}%)`);
  console.log(`  ⚠️  Duplicate Phone Numbers:   ${report.dataQualityIssues.duplicates.toLocaleString()} (${((report.dataQualityIssues.duplicates / report.totalRows) * 100).toFixed(1)}%)`);
  console.log(`  🗑️  Junk Entries:              ${report.dataQualityIssues.junkEntries.toLocaleString()} (${((report.dataQualityIssues.junkEntries / report.totalRows) * 100).toFixed(1)}%)`);

  console.log('\n📞 PHONE FORMAT EXAMPLES (first 10):\n');
  report.phoneFormatExamples.slice(0, 10).forEach((phone, i) => {
    console.log(`  ${i + 1}. "${phone}"`);
  });

  console.log('\n📧 EMAIL FORMAT EXAMPLES (first 10):\n');
  report.emailFormatExamples.slice(0, 10).forEach((email, i) => {
    console.log(`  ${i + 1}. "${email}"`);
  });

  if (report.multiplePhoneExamples.length > 0) {
    console.log('\n📱 MULTIPLE PHONES EXAMPLES:\n');
    report.multiplePhoneExamples.forEach((example, i) => {
      console.log(`  ${i + 1}. ${example.contact}:`);
      example.phones.forEach(phone => {
        console.log(`     - ${phone}`);
      });
    });
  }

  if (report.emojiExamples.length > 0) {
    console.log('\n😀 EMOJI IN NAME EXAMPLES:\n');
    report.emojiExamples.forEach((name, i) => {
      console.log(`  ${i + 1}. "${name}"`);
    });
  }

  if (report.organizationOnlyExamples.length > 0) {
    console.log('\n🏢 ORGANIZATION-ONLY EXAMPLES (first 10):\n');
    report.organizationOnlyExamples.forEach((org, i) => {
      console.log(`  ${i + 1}. "${org}"`);
    });
  }

  if (report.junkExamples.length > 0) {
    console.log('\n🗑️  JUNK ENTRY EXAMPLES:\n');
    report.junkExamples.forEach((junk, i) => {
      console.log(`  ${i + 1}. "${junk}"`);
    });
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('💡 RECOMMENDATIONS');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('1. ✅ **Split Multiple Phones/Emails** - Handle ":::" separator');
  console.log('2. ✅ **Normalize Phone Numbers** - Convert all formats to E.164');
  console.log('3. ✅ **Clean Names** - Remove special characters, emojis, leading slashes');
  console.log('4. ✅ **Handle Organization-Only** - Use org name as last name or skip');
  console.log('5. ✅ **Detect Duplicates** - Skip or merge duplicate phone numbers');
  console.log('6. ✅ **Filter Junk** - Reject test numbers (555-555-5555) and obvious spam');
  console.log('7. ✅ **Validate Data** - Ensure at least one valid phone before importing\n');

  console.log('═══════════════════════════════════════════════════════════\n');
}

// Main execution
const csvPath = process.argv[2] || 'C:\\Users\\DellaMSI\\Downloads\\contacts (2).csv';

if (!fs.existsSync(csvPath)) {
  console.error(`❌ Error: File not found: ${csvPath}`);
  console.log('\nUsage: npx tsx scripts/analyze-messy-contacts.ts [path-to-csv]');
  process.exit(1);
}

console.log(`📂 Analyzing: ${csvPath}\n`);

try {
  const report = analyzeContacts(csvPath);
  printReport(report);
} catch (error: any) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
