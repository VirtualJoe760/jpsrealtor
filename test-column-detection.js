/**
 * Test Column Detection Service
 * Run with: node test-column-detection.js
 */

const { ColumnDetectionService } = require('./src/lib/services/column-detection.service.ts');

// Sample CSV data - Google Contacts format
const googleContactsHeaders = [
  'First Name',
  'Last Name',
  'Phone 1 - Value',
  'E-mail 1 - Value',
  'Address 1 - Street',
  'Address 1 - City',
  'Organization Name'
];

const googleContactsRows = [
  {
    'First Name': 'John',
    'Last Name': 'Smith',
    'Phone 1 - Value': '(555) 123-4567',
    'E-mail 1 - Value': 'john.smith@example.com',
    'Address 1 - Street': '123 Main St',
    'Address 1 - City': 'Los Angeles',
    'Organization Name': 'Acme Corp'
  },
  {
    'First Name': 'Jane',
    'Last Name': 'Doe',
    'Phone 1 - Value': '555-987-6543',
    'E-mail 1 - Value': 'jane.doe@example.com',
    'Address 1 - Street': '456 Oak Ave',
    'Address 1 - City': 'San Diego',
    'Organization Name': 'Tech Inc'
  }
];

// Sample CSV data - MOJO Dialer format
const mojoHeaders = [
  'first_name',
  'last_name',
  'phone',
  'email',
  'address',
  'city',
  'state',
  'zip'
];

const mojoRows = [
  {
    'first_name': 'Bob',
    'last_name': 'Johnson',
    'phone': '+15551234567',
    'email': 'bob@example.com',
    'address': '789 Pine St',
    'city': 'Irvine',
    'state': 'CA',
    'zip': '92618'
  }
];

// Sample CSV data - Title Rep format
const titleRepHeaders = [
  'Owner Name',
  'Property Address',
  'City',
  'State',
  'ZIP',
  'Phone Number',
  'Sale Date'
];

const titleRepRows = [
  {
    'Owner Name': 'Michael Williams',
    'Property Address': '321 Elm Street',
    'City': 'Palm Desert',
    'State': 'CA',
    'ZIP': '92260',
    'Phone Number': '(760) 555-1234',
    'Sale Date': '2024-01-15'
  }
];

// Sample CSV data - Unknown/Custom format
const customHeaders = [
  'fname',
  'lname',
  'telephone',
  'email_addr',
  'street_address',
  'town'
];

const customRows = [
  {
    'fname': 'Sarah',
    'lname': 'Brown',
    'telephone': '5559876543',
    'email_addr': 'sarah.brown@example.com',
    'street_address': '555 Maple Dr',
    'town': 'Newport Beach'
  }
];

console.log('='.repeat(80));
console.log('TESTING COLUMN DETECTION SERVICE');
console.log('='.repeat(80));

// Test 1: Google Contacts (with provider hint)
console.log('\n📋 Test 1: Google Contacts Format (with provider hint)');
console.log('-'.repeat(80));
const googleResults = ColumnDetectionService.detectColumns(
  googleContactsHeaders,
  googleContactsRows,
  'google_contacts'
);

googleResults.forEach(mapping => {
  console.log(`Column: "${mapping.csvColumn}"`);
  console.log(`  → Suggested: ${mapping.suggestedField}`);
  console.log(`  → Confidence: ${(mapping.confidence * 100).toFixed(0)}%`);
  console.log(`  → Pattern: ${mapping.pattern}`);
  console.log(`  → Sample: ${mapping.sampleData.slice(0, 2).join(', ')}`);
  if (mapping.alternativeMatches && mapping.alternativeMatches.length > 0) {
    console.log(`  → Alternatives: ${mapping.alternativeMatches.map(a => `${a.field} (${(a.confidence * 100).toFixed(0)}%)`).join(', ')}`);
  }
  console.log();
});

// Test 2: MOJO Dialer (with provider hint)
console.log('\n📋 Test 2: MOJO Dialer Format (with provider hint)');
console.log('-'.repeat(80));
const mojoResults = ColumnDetectionService.detectColumns(
  mojoHeaders,
  mojoRows,
  'mojo_dialer'
);

mojoResults.forEach(mapping => {
  console.log(`Column: "${mapping.csvColumn}"`);
  console.log(`  → Suggested: ${mapping.suggestedField}`);
  console.log(`  → Confidence: ${(mapping.confidence * 100).toFixed(0)}%`);
  console.log(`  → Pattern: ${mapping.pattern}`);
  console.log();
});

// Test 3: Title Rep (with provider hint)
console.log('\n📋 Test 3: Title Rep Format (with provider hint)');
console.log('-'.repeat(80));
const titleResults = ColumnDetectionService.detectColumns(
  titleRepHeaders,
  titleRepRows,
  'title_rep'
);

titleResults.forEach(mapping => {
  console.log(`Column: "${mapping.csvColumn}"`);
  console.log(`  → Suggested: ${mapping.suggestedField}`);
  console.log(`  → Confidence: ${(mapping.confidence * 100).toFixed(0)}%`);
  console.log(`  → Pattern: ${mapping.pattern}`);
  console.log();
});

// Test 4: Custom/Unknown format (NO provider hint - fuzzy matching only)
console.log('\n📋 Test 4: Custom Format (NO provider hint - fuzzy matching)');
console.log('-'.repeat(80));
const customResults = ColumnDetectionService.detectColumns(
  customHeaders,
  customRows
);

customResults.forEach(mapping => {
  console.log(`Column: "${mapping.csvColumn}"`);
  console.log(`  → Suggested: ${mapping.suggestedField}`);
  console.log(`  → Confidence: ${(mapping.confidence * 100).toFixed(0)}%`);
  console.log(`  → Pattern: ${mapping.pattern}`);
  console.log(`  → Sample: ${mapping.sampleData.slice(0, 2).join(', ')}`);
  if (mapping.alternativeMatches && mapping.alternativeMatches.length > 0) {
    console.log(`  → Alternatives: ${mapping.alternativeMatches.map(a => `${a.field} (${(a.confidence * 100).toFixed(0)}%)`).join(', ')}`);
  }
  console.log();
});

// Test 5: Phone validation
console.log('\n📞 Test 5: Phone Validation');
console.log('-'.repeat(80));
const phoneTests = [
  '(555) 123-4567',
  '555-123-4567',
  '5551234567',
  '+1 555 123 4567',
  '1-555-123-4567',
  'invalid'
];

phoneTests.forEach(phone => {
  const isValid = ColumnDetectionService.validatePhone(phone);
  const formatted = ColumnDetectionService.formatPhone(phone);
  console.log(`Input: "${phone}"`);
  console.log(`  → Valid: ${isValid}`);
  console.log(`  → Formatted: ${formatted || 'N/A'}`);
  console.log();
});

// Test 6: Email validation
console.log('\n📧 Test 6: Email Validation');
console.log('-'.repeat(80));
const emailTests = [
  'john@example.com',
  'jane.doe@company.co.uk',
  'invalid@',
  '@invalid.com',
  'not-an-email'
];

emailTests.forEach(email => {
  const isValid = ColumnDetectionService.validateEmail(email);
  console.log(`Input: "${email}"`);
  console.log(`  → Valid: ${isValid}`);
  console.log();
});

console.log('='.repeat(80));
console.log('✅ TESTING COMPLETE');
console.log('='.repeat(80));
