# Contact Cleaning System

**Version:** 1.0.0
**Status:** ✅ Production Ready

A deterministic contact data cleaning system with Groq LLM integration for natural language processing.

---

## 🎯 Overview

This system separates concerns between AI reasoning and data transformation:

- **Groq LLM**: Understands intent, selects parameters, communicates with users
- **Deterministic Tools**: Executes ALL data transformations with 100% reproducibility

**The LLM NEVER manipulates CSV/Excel data directly.**

---

## 🚀 Quick Start

### Option 1: Natural Language API (Groq-powered)

```bash
POST /api/contact-cleaning/assistant
{
  "message": "Clean my contacts from /uploads/contacts.xlsx for Drop Cowboy"
}
```

The LLM will:
1. Understand you want Drop Cowboy format
2. Determine likely phone field names
3. Call the cleaning tool with appropriate parameters
4. Explain results in plain English

### Option 2: Direct API (Programmatic)

```bash
POST /api/contact-cleaning/clean
{
  "filePath": "/uploads/contacts.xlsx",
  "options": {
    "phoneFields": ["Phone 1 - Value", "Mobile", "Phone"],
    "phoneFormat": "national",
    "defaultCountryCode": "US",
    "zipFields": ["ZIP", "Zip Code"],
    "skipDuplicates": true,
    "exportFormat": "drop_cowboy"
  }
}
```

### Option 3: Direct Function Call

```typescript
import { cleanContacts } from '@/lib/services/contact-cleaner.service';

const result = await cleanContacts('/uploads/contacts.xlsx', undefined, {
  phoneFields: ['Phone 1 - Value', 'Mobile'],
  phoneFormat: 'national',
  defaultCountryCode: 'US',
  exportFormat: 'drop_cowboy',
  skipDuplicates: true,
});

console.log(result);
// {
//   success: true,
//   outputPath: '/uploads/contacts_cleaned.csv',
//   statistics: { totalRows: 1247, cleanedRows: 1244, ... }
// }
```

---

## 📋 Features

### Data Cleaning
- ✅ Remove Excel .0 artifacts from phone numbers and ZIP codes
- ✅ Normalize phone numbers to E.164, national, or raw format
- ✅ Preserve leading zeros in ZIP codes (01234, not 1234)
- ✅ Phone field fallback logic (Primary → Mobile → Phone)
- ✅ Duplicate detection and removal
- ✅ Required field validation

### Platform Support
- ✅ **Drop Cowboy** - RVM platform format
- ✅ **SendFox** - Email marketing format
- ✅ **MOJO Dialer** - Power dialer format
- ✅ **Google Contacts** - Import/export format
- ✅ **Generic** - Keep all fields as-is

### File Support
- ✅ CSV files (.csv)
- ✅ Excel files (.xlsx, .xls)
- ✅ Auto-detection and parsing

### Validation Rules
- ✅ Email domain whitelist
- ✅ Test phone number detection
- ✅ Complete name validation
- ✅ US ZIP code format validation
- ✅ DNC (Do Not Call) detection
- ✅ Emoji in name detection
- ✅ US state code validation

---

## 🛠️ Configuration

### Phone Format Options

```typescript
phoneFormat: 'e164'     // +12345678900
phoneFormat: 'national' // (234) 567-8900
phoneFormat: 'raw'      // 2345678900
```

### Export Format Presets

```typescript
exportFormat: 'drop_cowboy'  // Drop Cowboy RVM
exportFormat: 'sendfox'      // SendFox Email
exportFormat: 'mojo_dialer'  // MOJO Dialer
exportFormat: 'generic'      // Keep all fields
```

### Common Phone Field Names

**Google Contacts:**
```typescript
phoneFields: ['Phone 1 - Value', 'Phone 2 - Value', 'Phone 3 - Value']
```

**MOJO Export:**
```typescript
phoneFields: ['Primary Phone', 'Mobile', 'Phone']
```

**Generic:**
```typescript
phoneFields: ['phone', 'mobile', 'cell', 'telephone']
```

---

## 📖 Examples

### Example 1: Clean for Drop Cowboy

```typescript
const result = await cleanContacts('/uploads/google_contacts.xlsx', undefined, {
  phoneFields: ['Phone 1 - Value', 'Mobile'],
  phoneFormat: 'national',
  defaultCountryCode: 'US',
  zipFields: ['ZIP', 'Postal Code'],
  skipDuplicates: true,
  exportFormat: 'drop_cowboy',
});
```

**Output Fields:**
- First Name
- Last Name
- Phone (formatted as (555) 123-4567)
- Email
- Address
- City
- State
- ZIP

### Example 2: Clean for SendFox

```typescript
const result = await cleanContacts('/uploads/contacts.csv', undefined, {
  phoneFields: [], // SendFox doesn't need phone
  exportFormat: 'sendfox',
  requiredFields: ['email'], // Must have email
});
```

**Output Fields:**
- email
- first_name
- last_name

### Example 3: Custom Validation

```typescript
import { validateContact } from '@/lib/services/contact-validators';

const contact = { /* ... */ };

const validationResults = validateContact(contact, [
  'phone_not_test_number',
  'has_complete_name',
  'valid_email_format',
  'no_emoji_in_name',
]);

if (validationResults.length > 0) {
  console.log('Validation failed:', validationResults);
}
```

---

## 🔧 API Reference

### `cleanContacts(filePath, outputPath?, options?)`

**Parameters:**
- `filePath` (string): Absolute path to input CSV or Excel file
- `outputPath` (string, optional): Output file path (auto-generated if omitted)
- `options` (CleanContactsOptions, optional): Cleaning configuration

**Returns:**
```typescript
{
  success: boolean;
  outputPath: string;
  statistics: {
    totalRows: number;
    cleanedRows: number;
    skippedRows: number;
    duplicatesRemoved: number;
    warnings: Warning[];
  };
  error?: string;
}
```

### CleanContactsOptions

```typescript
{
  phoneFields: string[];              // Required: Phone field priority list
  phoneFormat?: 'e164' | 'national' | 'raw';
  defaultCountryCode?: string;        // ISO country code (default: 'US')
  zipFields?: string[];               // ZIP fields to normalize
  requiredFields?: string[];          // Must have these fields
  skipInvalidPhones?: boolean;        // Skip rows without valid phone
  skipDuplicates?: boolean;           // Remove duplicate phone numbers
  exportFormat?: string;              // Platform preset
}
```

---

## 🧪 Testing

```bash
# Run tests
npm test contact-cleaner

# Test specific functionality
npm test -- --grep "phone cleaning"
npm test -- --grep "ZIP code"
npm test -- --grep "validation"
```

---

## 🔌 Adding New Platforms

Edit `src/config/platform-mappings.json`:

```json
{
  "your_platform": {
    "name": "Your Platform Name",
    "description": "Platform description",
    "requiredFields": ["Phone"],
    "mapping": {
      "OutputField1": ["inputField1", "alt1", "alt2"],
      "OutputField2": ["inputField2"]
    },
    "phoneFormat": "national",
    "defaultCountryCode": "US"
  }
}
```

Then add case to `applyExportFormat()` in `contact-cleaner.service.ts`.

---

## 🔐 Environment Variables

```bash
# Required for Groq assistant
GROQ_API_KEY=gsk_...

# Optional: Override default Groq model
GROQ_MODEL=llama-3.3-70b-versatile
```

---

## 📊 Statistics Example

```json
{
  "success": true,
  "outputPath": "/uploads/contacts_cleaned.csv",
  "statistics": {
    "totalRows": 1247,
    "cleanedRows": 1244,
    "skippedRows": 0,
    "duplicatesRemoved": 3,
    "warnings": [
      {
        "row": 45,
        "type": "duplicate",
        "field": "_cleanedPhone",
        "value": "(555) 123-4567",
        "message": "Duplicate phone number: (555) 123-4567"
      }
    ]
  }
}
```

---

## 🚨 Common Issues

### Issue: "No valid phone number found"
**Solution:** Check your `phoneFields` array matches the actual column names in your CSV/Excel.

### Issue: "ZIP codes still have .0"
**Solution:** Add ZIP field names to `zipFields` array:
```typescript
zipFields: ['ZIP', 'Zip Code', 'Postal Code', 'ZIP Code']
```

### Issue: "Phone numbers not in right format"
**Solution:** Set `phoneFormat`:
- Drop Cowboy: Use `'national'`
- MOJO Dialer: Use `'raw'`
- General CRM: Use `'e164'`

---

## 📝 Files

```
src/
├── lib/
│   └── services/
│       ├── contact-cleaner.service.ts     # Core cleaning logic
│       ├── contact-validators.ts          # Validation rules
│       └── groq-contact-assistant.service.ts  # Groq integration
├── app/
│   └── api/
│       └── contact-cleaning/
│           ├── clean/route.ts             # Direct API
│           └── assistant/route.ts         # Groq API
└── config/
    └── platform-mappings.json             # Platform configurations

docs/
└── contact-cleaning/
    ├── ARCHITECTURE.md                     # System architecture
    └── README.md                           # This file
```

---

## 🎓 Architecture Principles

1. **LLM for Reasoning, Code for Execution**
   - LLM decides WHAT to do
   - Deterministic code executes HOW

2. **Zero Data in LLM Context**
   - LLM never sees raw CSV data
   - All transformations happen in pure functions

3. **Configuration Over Code**
   - New platforms via JSON config
   - New validation rules via registry pattern

4. **Auditability**
   - Every transformation is traceable
   - Statistics and warnings for every operation

5. **Testability**
   - Pure functions for all transformations
   - Deterministic outputs for same inputs

---

## 📞 Support

For issues or questions, see:
- Architecture details: `/docs/contact-cleaning/ARCHITECTURE.md`
- GitHub issues: Create an issue with example file and error message
- Test files: Include your CSV column names when reporting issues

---

**Built with:** Node.js, TypeScript, Groq, libphonenumber-js, csv-parse, xlsx

**License:** MIT
