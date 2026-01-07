# Smart Contact Import System

## Overview

The Smart Contact Import System allows flexible importing of contacts from various CSV/Excel sources with automatic column detection, fuzzy matching, and user-friendly mapping confirmation.

## Supported Sources

- **Google Contacts** - Exported CSV format
- **MOJO Dialer** - Lead export format
- **Title Rep** - Property owner lists
- **Outlook/Office 365** - Contact exports
- **Custom CSV/Excel** - Any format with user-guided mapping

## Architecture

### Three-Phase Import Process

#### Phase 1: Upload & Auto-Detection
1. User uploads CSV or Excel file
2. System parses file and detects columns
3. Fuzzy matching on column headers (e.g., "First Name" matches "first_name", "fname")
4. Content-based pattern detection (regex for phones, emails, addresses)
5. Provider-specific templates applied if detected

#### Phase 2: Mapping & Confirmation
1. User sees mapping UI with auto-suggestions
2. Each column shows:
   - Detected field type with confidence score
   - Sample data preview
   - Dropdown to confirm or change mapping
3. User can save mapping as reusable template
4. System validates mappings before proceeding

#### Phase 3: Validation & Import
1. Data validation (phone format, email format, required fields)
2. Duplicate detection (phone/email matching)
3. Preview summary with counts
4. Batch import with progress tracking
5. Error reporting with specific row numbers

## Technology Stack

### Core Libraries

```json
{
  "papaparse": "^5.4.1",              // CSV parsing with proper encoding
  "xlsx": "^0.18.5",                  // Excel file parsing
  "string-similarity": "^4.0.4",      // Fuzzy column name matching
  "libphonenumber-js": "^1.10.0",     // Phone validation/formatting
  "email-validator": "^2.0.4"         // Email validation
}
```

### Services

- **`ColumnDetectionService`** - Smart column detection with fuzzy matching
- **`ContactImportService`** - Main import orchestration
- **`FieldValidationService`** - Phone/email/address validation
- **`TemplateService`** - Save/load user mapping templates

## Column Detection Logic

### 1. Fuzzy Name Matching

Uses string-similarity to match column names:

```typescript
// Examples that would match to "firstName":
"First Name" → 0.95 similarity
"first_name" → 0.90 similarity
"fname" → 0.75 similarity
"Contact First Name" → 0.85 similarity
"Given Name" → 0.70 similarity
```

### 2. Content-Based Detection

Examines first 10 rows of data:

```typescript
// Phone number patterns
/(\+\d{1,3})?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/

// Email patterns
/^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Address patterns
/\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir)/i
```

### 3. Provider Templates

Pre-configured mappings for known formats:

```typescript
const PROVIDER_TEMPLATES = {
  google_contacts: {
    'Phone 1 - Value': 'phone',
    'E-mail 1 - Value': 'email',
    'First Name': 'firstName',
    // ... full mapping
  },
  mojo_dialer: {
    'first_name': 'firstName',
    'last_name': 'lastName',
    // ... full mapping
  },
  title_rep: {
    'Owner Name': 'fullName',
    'Property Address': 'address.street',
    // ... full mapping
  }
}
```

## Complex Scenarios

### Multiple Contacts Per Row

Handles rows with multiple people:

```csv
Owner1First,Owner1Last,Owner1Phone,Owner2First,Owner2Last,Owner2Phone
John,Smith,(555)123-4567,Jane,Smith,(555)123-4568
```

System creates TWO contacts:
1. John Smith - (555)123-4567
2. Jane Smith - (555)123-4568

### Husband/Wife Detection

Automatically splits combined fields:

```csv
FullName,Phone
John & Jane Smith,(555)123-4567
```

Creates:
1. John Smith - (555)123-4567
2. Jane Smith - (555)123-4567 (same phone)

### Phone Number Normalization

Uses `libphonenumber-js` for proper formatting:

```typescript
// Input variations → Normalized output
"555-123-4567" → "+15551234567"
"(555) 123-4567" → "+15551234567"
"1-555-123-4567" → "+15551234567"
"+1 555 123 4567" → "+15551234567"
```

## API Endpoints

### POST /api/crm/contacts/import/preview
Upload file and get column detection results

**Request:**
```typescript
{
  file: File,
  source?: 'google_contacts' | 'mojo_dialer' | 'title_rep' | 'custom'
}
```

**Response:**
```typescript
{
  success: boolean,
  previewId: string,
  columns: [{
    csvColumn: string,
    suggestedField: string,
    confidence: number,
    sampleData: string[],
    pattern: 'name' | 'phone' | 'email' | 'address' | 'unknown'
  }],
  rowCount: number,
  previewRows: any[]
}
```

### POST /api/crm/contacts/import/confirm
Confirm mapping and start import

**Request:**
```typescript
{
  previewId: string,
  campaignId: string,
  mapping: {
    [csvColumn: string]: string // target field
  },
  saveAsTemplate?: string, // template name
  source: ContactSource
}
```

**Response:**
```typescript
{
  success: boolean,
  batchId: string,
  imported: number,
  duplicates: number,
  errors: number,
  message: string
}
```

### GET /api/crm/contacts/import/templates
Get saved mapping templates

**Response:**
```typescript
{
  templates: [{
    id: string,
    name: string,
    source: string,
    mapping: Record<string, string>,
    lastUsed: Date
  }]
}
```

## UI Components

### ContactImportWizard
Multi-step wizard component:
1. File upload
2. Column mapping (with suggestions)
3. Preview & validation
4. Import progress

### ColumnMapper
Interactive mapping interface:
- Drag & drop column assignments
- Confidence indicators
- Sample data preview
- Quick templates dropdown

### ImportProgress
Real-time progress tracking:
- Processed count
- Success/duplicate/error counts
- Error details with row numbers
- Downloadable error report

## Database Models

### ImportBatch
Tracks import sessions:

```typescript
{
  userId: ObjectId,
  campaignId: ObjectId,
  source: ContactSource,
  fileName: string,
  status: 'processing' | 'completed' | 'failed',
  progress: {
    total: number,
    processed: number,
    successful: number,
    failed: number,
    duplicates: number
  },
  errors: [{
    rowNumber: number,
    error: string,
    rowData: any
  }],
  mapping: Record<string, string>,
  createdAt: Date,
  completedAt: Date
}
```

### ImportTemplate
User-saved mappings:

```typescript
{
  userId: ObjectId,
  name: string,
  source: ContactSource,
  mapping: Record<string, string>,
  lastUsed: Date,
  useCount: number
}
```

## Validation Rules

### Required Fields
- At least one of: phone OR email
- firstName (or fullName to be split)

### Phone Validation
- Must be valid format (uses libphonenumber-js)
- Automatically formatted to E.164
- Country code detection (defaults to US)

### Email Validation
- Must match email regex
- Normalized to lowercase
- Multiple emails supported

### Duplicate Detection
1. Check phone number (exact match)
2. Check email (exact match)
3. If duplicate found, link to existing contact

## Error Handling

### Import Errors
- Row-level errors logged with row number
- Invalid phone numbers → skip or use without phone
- Invalid emails → skip or use without email
- Missing required fields → skip row

### User Feedback
- Toast notifications for success/errors
- Detailed error report downloadable as CSV
- Inline validation in mapping UI

## Performance Optimization

### Large File Handling
- Stream parsing for files >10MB
- Batch processing (100 rows at a time)
- Progress updates every 100 rows
- Background processing for >1000 rows

### Duplicate Detection
- Bulk phone/email lookups
- In-memory Set for session deduplication
- Database indexes on phone and email fields

## Future Enhancements

- [ ] AI-powered column detection using LLM
- [ ] Address standardization using USPS API
- [ ] Social media profile enrichment
- [ ] Automatic contact merging suggestions
- [ ] Import scheduling (recurring imports)
- [ ] API integration for direct syncs
- [ ] Mobile app support for photo imports
- [ ] Voice-to-contact via speech recognition

## Testing

### Test Data Sources
- `docs/debug/testing/google-contacts-sample.csv`
- `docs/debug/testing/mojo-dialer-sample.csv`
- `docs/debug/testing/title-rep-sample.csv`

### Test Scenarios
1. Perfect match (all columns map correctly)
2. Missing columns (optional fields)
3. Extra columns (unmapped data)
4. Malformed data (invalid phones/emails)
5. Duplicates within file
6. Duplicates with existing contacts
7. Special characters in names
8. International phone numbers
9. Multiple phone/email fields
10. Owner1/Owner2 scenarios

## Troubleshooting

### Common Issues

**Q: Why are some contacts skipped?**
A: Contacts without both phone AND email are skipped. Check the error report CSV for details.

**Q: Why is column detection wrong?**
A: Manually adjust in the mapping UI. Consider saving as a template for future imports.

**Q: Phone numbers not formatting correctly?**
A: Ensure phone numbers include country code or are in standard US format (10 digits).

**Q: Import takes too long?**
A: Files >5000 rows process in background. Check import history for status.

## Related Documentation

- [Contact Sync](./CONTACT_SYNC.md) - Contact synchronization across platforms
- [Campaign Management](../features/CAMPAIGNS.md) - Using contacts in campaigns
- [Data Privacy](../security/DATA_PRIVACY.md) - GDPR compliance for contact data
