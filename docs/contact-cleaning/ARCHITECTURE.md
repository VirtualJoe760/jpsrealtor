# Contact Cleaning System - Architecture & Implementation

**Version:** 1.0.0
**Date:** January 8, 2026
**Status:** Design Complete, Implementation Pending

---

## 1. HIGH-LEVEL ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER REQUEST                             │
│  "Clean my contact list and export for Drop Cowboy"            │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GROQ LLM (OSS 120B)                          │
│  Responsibilities:                                               │
│  • Understand user intent                                        │
│  • Identify file type and location                              │
│  • Determine field mapping strategy                             │
│  • Select validation rules                                      │
│  • Decide tool parameters                                       │
│  • Ask clarifying questions ONLY when needed                    │
│  • NEVER manipulate data directly                               │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ Tool Call
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              DETERMINISTIC TOOLS (Node.js)                      │
│                                                                  │
│  clean_contacts(filePath, options)                              │
│  ├── Parse CSV/Excel                                            │
│  ├── Normalize phone numbers                                    │
│  │   └── Remove .0, strip formatting, apply E.164               │
│  ├── Normalize ZIP codes                                        │
│  │   └── Remove .0, preserve leading zeros                      │
│  ├── Apply field fallback logic                                 │
│  │   └── Primary Phone → Mobile → Phone → null                 │
│  ├── Execute validation rules                                   │
│  ├── Generate statistics                                        │
│  └── Export clean CSV                                           │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ Tool Response
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GROQ LLM (OSS 120B)                          │
│  • Interpret tool results                                       │
│  • Explain what was cleaned                                     │
│  • Report statistics to user                                    │
│  • Suggest next steps                                           │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                       USER RESPONSE                              │
│  "Cleaned 1,247 contacts. 3 warnings. Download ready."         │
└─────────────────────────────────────────────────────────────────┘
```

### Separation of Concerns

| Component | Responsibilities | Anti-Patterns |
|-----------|-----------------|---------------|
| **LLM** | Intent parsing, field mapping decisions, parameter selection, user communication | ❌ Direct data manipulation, ❌ CSV parsing, ❌ Phone formatting |
| **Deterministic Tools** | All data transformations, file I/O, validation execution, statistics | ❌ Intent guessing, ❌ User communication, ❌ Ambiguity resolution |

---

## 2. GROQ TOOL CALLING SCHEMA

```json
{
  "type": "function",
  "function": {
    "name": "clean_contacts",
    "description": "Clean and normalize contact data from CSV or Excel files. Handles phone number formatting, ZIP code preservation, field fallbacks, and validation. Returns statistics and cleaned file path.",
    "parameters": {
      "type": "object",
      "properties": {
        "filePath": {
          "type": "string",
          "description": "Absolute path to the input CSV or Excel file"
        },
        "outputPath": {
          "type": "string",
          "description": "Absolute path for the cleaned output CSV file. If not provided, will use input filename with '_cleaned' suffix"
        },
        "options": {
          "type": "object",
          "description": "Cleaning and normalization options",
          "properties": {
            "phoneFields": {
              "type": "array",
              "items": { "type": "string" },
              "description": "Ordered list of phone field names to try (first available wins). Example: ['Primary Phone', 'Mobile', 'Phone']"
            },
            "phoneFormat": {
              "type": "string",
              "enum": ["e164", "national", "raw"],
              "description": "Output phone format. 'e164' = +12345678900, 'national' = (234) 567-8900, 'raw' = 2345678900"
            },
            "defaultCountryCode": {
              "type": "string",
              "description": "ISO country code for phone parsing (e.g., 'US', 'CA', 'GB')",
              "default": "US"
            },
            "zipFields": {
              "type": "array",
              "items": { "type": "string" },
              "description": "ZIP/postal code field names to normalize"
            },
            "requiredFields": {
              "type": "array",
              "items": { "type": "string" },
              "description": "Fields that must have values. Rows missing these will be flagged"
            },
            "skipInvalidPhones": {
              "type": "boolean",
              "description": "Skip rows with invalid phone numbers",
              "default": false
            },
            "skipDuplicates": {
              "type": "boolean",
              "description": "Skip duplicate phone numbers (keep first occurrence)",
              "default": false
            },
            "exportFormat": {
              "type": "string",
              "enum": ["generic", "drop_cowboy", "sendfox", "mojo_dialer"],
              "description": "Output format preset with field mappings for specific platforms",
              "default": "generic"
            }
          },
          "required": ["phoneFields"]
        }
      },
      "required": ["filePath", "options"]
    }
  }
}
```

---

## 3. EXAMPLE INTERACTION

### User Input
```
User: "I have a contact list from Google Contacts exported to Excel.
       The phone numbers have weird .0 at the end and some ZIP codes
       lost their leading zeros. I need to clean it for Drop Cowboy.
       File is at /uploads/contacts_2026.xlsx"
```

### LLM Processing (Internal)
```json
{
  "reasoning": {
    "file_type": "xlsx",
    "issues_identified": ["phone .0 artifacts", "ZIP leading zero loss"],
    "target_platform": "Drop Cowboy",
    "phone_fields_likely": ["Phone", "Primary Phone", "Mobile"],
    "action": "call clean_contacts tool"
  }
}
```

### LLM Tool Call
```json
{
  "tool_calls": [{
    "id": "call_abc123",
    "type": "function",
    "function": {
      "name": "clean_contacts",
      "arguments": {
        "filePath": "/uploads/contacts_2026.xlsx",
        "options": {
          "phoneFields": ["Phone 1 - Value", "Primary Phone", "Mobile", "Phone"],
          "phoneFormat": "national",
          "defaultCountryCode": "US",
          "zipFields": ["ZIP", "Zip Code", "Postal Code"],
          "skipInvalidPhones": false,
          "skipDuplicates": true,
          "exportFormat": "drop_cowboy"
        }
      }
    }
  }]
}
```

### Tool Response
```json
{
  "success": true,
  "outputPath": "/uploads/contacts_2026_cleaned.csv",
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

### LLM Response to User
```
✅ Contact list cleaned successfully!

**Results:**
- **1,244 contacts** cleaned and ready for Drop Cowboy
- **3 duplicates** removed (same phone number appeared multiple times)
- Phone numbers formatted as: (555) 123-4567
- ZIP codes preserved with leading zeros (e.g., 01234)

**File saved:** /uploads/contacts_2026_cleaned.csv

**What was fixed:**
- Removed .0 artifacts from phone numbers
- Normalized all phone numbers to US national format
- Restored leading zeros in ZIP codes
- Mapped fields to Drop Cowboy format

**Warnings:**
- 3 duplicate phone numbers were found and removed (keeping first occurrence)

You can now upload `contacts_2026_cleaned.csv` directly to Drop Cowboy!
```

---

## 4. EXTENSIBILITY GUIDE

### Adding New Export Formats

```typescript
// 1. Add format to enum in tool schema
"exportFormat": {
  "enum": ["generic", "drop_cowboy", "sendfox", "mojo_dialer", "YOUR_NEW_FORMAT"]
}

// 2. Add case to applyExportFormat function
case 'YOUR_NEW_FORMAT':
  return contacts.map(c => ({
    'CustomField1': c.firstName || '',
    'CustomField2': c._cleanedPhone || '',
  }));
```

### Adding New Validation Rules

Create configuration-based validation rules without modifying core code:

```typescript
export const VALIDATION_RULES: Record<string, ValidationRule> = {
  'has_email_domain': {
    name: 'Email domain check',
    check: (contact) => /@(gmail|yahoo|outlook)\.com$/.test(contact.email),
    message: (contact) => `Email domain not allowed: ${contact.email}`,
  },
};
```

### Configuration-Based Field Mapping

```json
{
  "drop_cowboy": {
    "name": "Drop Cowboy RVM",
    "requiredFields": ["Phone"],
    "mapping": {
      "First Name": ["firstName", "first_name", "fname"],
      "Last Name": ["lastName", "last_name", "lname"],
      "Phone": ["_cleanedPhone"]
    }
  }
}
```

---

## 5. CRITICAL DESIGN PRINCIPLES

### ✅ DO
- Use LLM for intent understanding and parameter selection
- Execute all data transformations in deterministic code
- Return structured results for LLM interpretation
- Make all operations auditable and testable
- Use configuration over code for platform mappings

### ❌ DON'T
- Let LLM manipulate CSV/Excel data directly
- Fine-tune or use LoRAs (this is a tool-use system)
- Inline CSV content in LLM prompts
- Hallucinate cleaned data
- Hard-code platform-specific logic

---

## 6. IMPLEMENTATION FILES

### Core Service
- `src/lib/services/contact-cleaner.service.ts` - Main cleaning logic
- `src/lib/services/contact-validators.ts` - Validation rules
- `src/lib/services/groq-contact-assistant.service.ts` - Groq integration

### Configuration
- `src/config/platform-mappings.json` - Export format definitions
- `src/config/validation-rules.json` - Reusable validation rules

### API Routes
- `src/app/api/contact-cleaning/clean/route.ts` - HTTP endpoint
- `src/app/api/contact-cleaning/assistant/route.ts` - Groq chat endpoint

---

## 7. TESTING REQUIREMENTS

```typescript
describe('Contact Cleaner', () => {
  test('removes .0 from phone numbers');
  test('preserves leading zeros in ZIP codes');
  test('uses fallback phone fields in order');
  test('removes duplicates when enabled');
  test('validates required fields');
  test('applies export format transformations');
  test('handles Excel and CSV inputs');
  test('generates proper statistics');
});
```

---

## 8. PRODUCTION CHECKLIST

- [ ] Implement core contact-cleaner.service.ts
- [ ] Implement Groq integration wrapper
- [ ] Create platform-mappings.json configuration
- [ ] Add validation rules system
- [ ] Create API endpoints
- [ ] Write comprehensive tests
- [ ] Add error handling and logging
- [ ] Document API usage
- [ ] Performance test with large files (10k+ contacts)
- [ ] Security audit for file upload handling

---

**Status:** Architecture approved, ready for implementation
**Next Step:** Implement `src/lib/services/contact-cleaner.service.ts`
