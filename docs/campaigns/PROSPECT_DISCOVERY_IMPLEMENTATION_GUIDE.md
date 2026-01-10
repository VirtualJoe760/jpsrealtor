# Prospect Discovery Implementation Guide

## Overview

Prospect Discovery is a comprehensive contact management system that provides intelligent CSV analysis, data quality scoring, and a Tinder-style swipe interface for organizing contacts into labeled groups.

---

## Architecture

### Backend (Phase 1)

#### 1. Data Models

**Contact Model** (`src/models/contact.ts`)
```typescript
{
  // Enhanced with Prospect Discovery
  phones: IPhone[]          // Structured array with labels
  emails: IEmail[]          // Structured array with labels
  labels: ObjectId[]        // References to Label model
  dataQuality: {
    score: number           // 0-100
    issues: string[]        // ['emoji_in_name', 'invalid_phone', ...]
  }
  isPersonal: boolean       // Flag for personal contacts
  importBatchId: ObjectId   // Track import source
  duplicateOf: ObjectId     // Merge tracking
}
```

**Label Model** (`src/models/Label.ts`)
```typescript
{
  userId: ObjectId
  name: string              // "Hot Leads", "Past Clients"
  color: string             // Hex color code
  icon: string              // Optional icon name
  contactCount: number      // Denormalized count
  isSystem: boolean         // System vs user labels
  isArchived: boolean       // Soft delete
}
```

**ImportBatch Model** (`src/models/ImportBatch.ts`)
```typescript
{
  userId: ObjectId
  fileName: string
  status: 'analyzing' | 'ready' | 'processing' | 'completed' | 'failed'
  analysis: {
    totalRows: number
    dataQualityIssues: {...}
    qualityScore: number
    recommendedActions: string[]
  }
  config: {
    skipEmoji: boolean
    autoCleanNames: boolean
    normalizePhones: boolean
    mergeStrategy: 'skip' | 'update' | 'create_duplicate'
  }
}
```

#### 2. Utility Functions

**Contact Cleaning** (`src/lib/utils/contact-cleaning.utils.ts`)
```typescript
// Name cleaning
detectEmoji(text: string): boolean
cleanName(name: string): { cleaned: string; issues: string[] }
splitFullName(fullName: string): { firstName, lastName, middleName }

// Phone handling
normalizePhone(phone: string): { normalized: string; isValid: boolean }
splitMultiplePhones(phoneString: string): string[]
normalizeMultiplePhones(phoneString: string): IPhone[]

// Email handling
validateEmail(email: string): { isValid: boolean; normalized: string }
splitMultipleEmails(emailString: string): string[]

// Quality analysis
detectJunkEntry(contactData): { isJunk: boolean; reasons: string[] }
analyzeContactQuality(contactData): { score, metrics, issues, recommendations }
calculateQualityScore(metrics): number

// Duplicate detection
generateContactHash(phone: string): string
arePotentialDuplicates(contact1, contact2): { isDuplicate, matchedOn }
```

#### 3. Services

**Contact Analysis Service** (`src/lib/services/contact-analysis.service.ts`)
```typescript
class ContactAnalysisService {
  // Analyze CSV file
  static async analyzeCSV(fileContent: string): Promise<AnalysisReport>

  // Analyze contact array
  static analyzeContacts(contacts: ContactRow[]): AnalysisReport

  // Generate recommendations
  static generateRecommendations(report: AnalysisReport): string[]

  // Save analysis to database
  static async saveAnalysisToImportBatch(userId, fileName, fileSize, analysis): Promise<IImportBatch>
}
```

#### 4. API Endpoints

**CSV Analysis API** (`/api/crm/contacts/analyze`)
```typescript
// POST - Analyze CSV file
// Request: FormData with 'file' field
// Response: { success, batchId, analysis }

// GET - Retrieve saved analysis
// Query: ?batchId=xxx
// Response: { success, batch }
```

**Label API** (`/api/crm/labels`)
```typescript
// GET - List all labels
// Query: ?includeArchived=true
// Response: { success, labels }

// POST - Create label
// Body: { name, description, color, icon }
// Response: { success, label }

// PATCH /api/crm/labels/[id] - Update label
// DELETE /api/crm/labels/[id] - Archive label
```

### Frontend (Phase 2)

#### 1. Import Workflow Components

**ImportAnalysisDashboard** (`src/app/components/crm/ImportAnalysisDashboard.tsx`)
- Displays quality score (0-100) with color-coded badge
- Shows issue breakdown with counts and percentages
- Displays examples of problematic data
- Lists recommended actions

**ImportConfigPanel** (`src/app/components/crm/ImportConfigPanel.tsx`)
- Skip options (emoji, junk, duplicates, organization-only)
- Auto-fix options (clean names, normalize phones)
- Merge strategy selection
- Live import count preview

#### 2. Swipe Interface Components

**ContactCard** (`src/app/components/crm/ContactCard.tsx`)
- Beautiful card design with photo/avatar
- Quality badge and personal flag
- Contact info display (phone, email, address)
- Multiple contact indicators
- Data quality issue chips

**ContactBottomPanel** (`src/app/components/crm/ContactBottomPanel.tsx`)
- Tinder-style swipe interface
- Touch and mouse gesture support
- Card stack with smooth animations
- Label selector for right swipes
- Progress bar and undo functionality
- Visual feedback ("ADD ✓" / "SKIP ✗")

#### 3. Label Management

**LabelManagement** (`src/app/components/crm/LabelManagement.tsx`)
- Create/edit/delete labels
- 18-color palette selector
- Label usage statistics
- System label protection

---

## Usage Guide

### 1. CSV Import Workflow

```typescript
// Step 1: Upload and Analyze CSV
const formData = new FormData();
formData.append('file', csvFile);

const response = await fetch('/api/crm/contacts/analyze', {
  method: 'POST',
  body: formData,
});

const { batchId, analysis } = await response.json();

// Step 2: Display Analysis
<ImportAnalysisDashboard
  analysis={analysis}
  fileName={csvFile.name}
  onProceed={() => setStep('config')}
/>

// Step 3: Configure Import
<ImportConfigPanel
  analysis={analysis}
  onSave={(config) => {
    // Start import with config
    startImport(batchId, config);
  }}
/>
```

### 2. Swipe Interface

```typescript
// Initialize swipe panel
<ContactBottomPanel
  contacts={unorganizedContacts}
  labels={availableLabels}
  onSwipeLeft={(contact) => {
    // Skip contact
    console.log('Skipped:', contact._id);
  }}
  onSwipeRight={(contact, labelId) => {
    // Add to label
    addContactToLabel(contact._id, labelId);
  }}
  onComplete={() => {
    // All contacts organized
    console.log('Complete!');
  }}
/>
```

### 3. Label Management

```typescript
// Render label management
<LabelManagement
  labels={labels}
  onCreateLabel={async (label) => {
    const res = await fetch('/api/crm/labels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(label),
    });
    const { label: newLabel } = await res.json();
    setLabels([...labels, newLabel]);
  }}
  onUpdateLabel={async (id, updates) => {
    const res = await fetch(`/api/crm/labels/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    // Update local state
  }}
  onDeleteLabel={async (id) => {
    await fetch(`/api/crm/labels/${id}`, { method: 'DELETE' });
    // Update local state
  }}
/>
```

---

## Scripts

### Analyze CSV

```bash
# Analyze CSV file for data quality issues
npx tsx scripts/analyze-messy-contacts.ts path/to/contacts.csv
```

Output:
- Total contacts count
- Issue breakdown with percentages
- Phone/email format examples
- Quality recommendations

### Seed Default Labels

```bash
# Create default system labels for a user
npx tsx scripts/seed-default-labels.ts <userId>
```

Creates 9 default labels:
- Hot Leads (Red)
- Past Clients (Blue)
- Sphere of Influence (Purple)
- First Time Buyers (Green)
- Sellers (Orange)
- Investors (Yellow)
- Relocations (Cyan)
- Nurture (Lime)
- Do Not Contact (Slate)

---

## Data Quality Metrics

### Quality Score Calculation

```typescript
// Scoring algorithm (0-100)
score = 0

// Critical fields (50 points)
if (hasFirstName) score += 15
if (hasLastName) score += 10
if (hasValidPhone) score += 25  // Phone is most important

// Important fields (30 points)
if (hasValidEmail) score += 15
if (hasAddress) score += 15

// Quality penalties (max -20)
if (hasEmoji) score -= 10
if (hasSpecialChars) score -= 5
if (isJunk) score -= 20
if (organizationOnly) score -= 10

return Math.max(0, Math.min(100, score))
```

### Issue Types

| Issue | Severity | Description |
|-------|----------|-------------|
| no_phone | Critical | No phone number provided |
| no_name | Critical | No first or last name |
| junk_entry | Critical | Test numbers, spam |
| duplicates | Warning | Duplicate phone number |
| invalid_phone | Warning | Phone format invalid |
| multiple_phones | Info | Multiple phones (" ::: ") |
| emoji_in_name | Warning | Emoji in name |
| organization_only | Info | Organization without person |
| special_characters | Info | Special chars in name |

---

## Integration Examples

### Campaign Contact Selection

```typescript
// Add swipe interface to campaign workflow
function CampaignContactSelection({ campaignId }) {
  const [contacts, setContacts] = useState([]);
  const [selectedLabel, setSelectedLabel] = useState(null);

  return (
    <div>
      <LabelSelector
        labels={labels}
        onSelect={setSelectedLabel}
      />

      {selectedLabel && (
        <ContactBottomPanel
          contacts={contacts.filter(c => !c.labels.includes(selectedLabel._id))}
          labels={[selectedLabel]}
          onSwipeRight={(contact, labelId) => {
            addContactToCampaign(campaignId, contact._id);
            addContactToLabel(contact._id, labelId);
          }}
        />
      )}
    </div>
  );
}
```

### Import Flow Integration

```typescript
// Complete import workflow
function ImportWorkflow() {
  const [step, setStep] = useState('upload');
  const [batchId, setBatchId] = useState(null);
  const [analysis, setAnalysis] = useState(null);

  const steps = {
    upload: <FileUpload onUpload={handleUpload} />,
    analyze: <ImportAnalysisDashboard analysis={analysis} onProceed={() => setStep('config')} />,
    config: <ImportConfigPanel analysis={analysis} onSave={handleImport} />,
    importing: <ImportProgress batchId={batchId} />,
    organize: <ContactBottomPanel contacts={newContacts} labels={labels} />,
  };

  return steps[step];
}
```

---

## Best Practices

### 1. Data Quality

- Always analyze CSVs before importing
- Set quality threshold (e.g., score > 40)
- Auto-clean names and normalize phones
- Skip emoji contacts for business use
- Handle duplicates by skipping (recommended)

### 2. Label Organization

- Use clear, descriptive names
- Consistent color scheme by category
- Limit to 10-15 active labels
- Archive unused labels
- Use system labels for common categories

### 3. Swipe Interface

- Process in batches (50-100 contacts)
- Provide clear visual feedback
- Enable undo for mistakes
- Show progress prominently
- Allow bulk actions as fallback

### 4. Performance

- Analyze CSVs server-side
- Paginate large contact lists
- Denormalize contact counts
- Index frequently queried fields
- Cache analysis results

---

## Troubleshooting

### Issue: Phone numbers not normalizing

**Solution:** Ensure libphonenumber-js is installed:
```bash
npm install libphonenumber-js
```

### Issue: Swipe gestures not working on mobile

**Solution:** Check touch event handlers:
```typescript
onTouchStart={handleDragStart}
onTouchMove={handleDragMove}
onTouchEnd={handleDragEnd}
```

### Issue: Duplicate labels for user

**Solution:** Unique index prevents this:
```typescript
LabelSchema.index({ userId: 1, name: 1 }, { unique: true });
```

---

## Future Enhancements

1. **Bulk Import** - Process large CSVs in chunks
2. **ML Classification** - Auto-categorize contacts
3. **Merge Duplicates** - Smart merge interface
4. **Export Functionality** - Export by label to CSV
5. **Analytics Dashboard** - Label usage statistics
6. **Smart Recommendations** - AI-powered label suggestions
7. **Keyboard Shortcuts** - Arrow keys for swipe
8. **Voice Commands** - Hands-free organization

---

## Support

For questions or issues, refer to:
- Contact Model: `src/models/contact.ts`
- Cleaning Utils: `src/lib/utils/contact-cleaning.utils.ts`
- Analysis Service: `src/lib/services/contact-analysis.service.ts`
- API Routes: `src/app/api/crm/`

---

**Version:** 1.0.0
**Last Updated:** 2026-01-08
