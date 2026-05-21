# Prospect Discovery 🎯

**Tinder-style contact organization with intelligent CSV analysis**

---

## What is Prospect Discovery?

Prospect Discovery transforms messy contact imports into organized, actionable prospect lists using intelligent data analysis and an intuitive swipe interface. Perfect for real estate agents importing thousands of contacts from Google Contacts, CRMs, or spreadsheets.

### Key Features

✅ **Smart CSV Analysis** - Automatically detect 10+ data quality issues
✅ **Quality Scoring** - 0-100 score for every contact
✅ **Auto-Cleaning** - Remove emoji, normalize phones, fix formatting
✅ **Tinder-Style Swipe** - Organize contacts with left/right gestures
✅ **Label System** - Color-coded labels for contact groups
✅ **Duplicate Detection** - Phone number hashing prevents duplicates
✅ **Import Configuration** - Skip emoji, junk, duplicates automatically
✅ **Undo Support** - Reverse swipe actions instantly

---

## Quick Start

### 1. Analyze a CSV

```bash
npx tsx scripts/analyze-messy-contacts.ts path/to/contacts.csv
```

**Output:**
```
📊 CONTACT DATA QUALITY ANALYSIS REPORT

📈 Total Contacts: 3,393

🚨 DATA QUALITY ISSUES:
  ❌ No Phone: 582 (17.2%)
  ⚠️  Multiple Phones: 494 (14.6%)
  ⚠️  Emoji in Name: 12 (0.4%)
```

### 2. Import with Configuration

```typescript
import ImportAnalysisDashboard from '@/components/crm/ImportAnalysisDashboard';
import ImportConfigPanel from '@/components/crm/ImportConfigPanel';

// Step 1: Show Analysis
<ImportAnalysisDashboard
  analysis={analysisReport}
  fileName="contacts.csv"
  onProceed={() => setStep('config')}
/>

// Step 2: Configure Import
<ImportConfigPanel
  analysis={analysisReport}
  onSave={(config) => startImport(config)}
/>
```

### 3. Organize with Swipe Interface

```typescript
import ContactBottomPanel from '@/components/crm/ContactBottomPanel';

<ContactBottomPanel
  contacts={newContacts}
  labels={labels}
  onSwipeLeft={(contact) => console.log('Skipped')}
  onSwipeRight={(contact, labelId) => addToLabel(contact, labelId)}
/>
```

### 4. Create Default Labels

```bash
npx tsx scripts/seed-default-labels.ts <userId>
```

---

## Architecture

```
Prospect Discovery
├── Backend (Phase 1)
│   ├── Models
│   │   ├── Contact (enhanced)
│   │   ├── Label (new)
│   │   └── ImportBatch (enhanced)
│   ├── Utilities
│   │   └── contact-cleaning.utils.ts (500+ lines)
│   ├── Services
│   │   └── contact-analysis.service.ts
│   └── API Endpoints
│       ├── POST /api/crm/contacts/analyze
│       ├── GET /api/crm/contacts/analyze?batchId=xxx
│       ├── GET/POST /api/crm/labels
│       └── PATCH/DELETE /api/crm/labels/[id]
│
├── Frontend (Phase 2)
│   ├── ImportAnalysisDashboard.tsx
│   ├── ImportConfigPanel.tsx
│   ├── ContactCard.tsx
│   ├── ContactBottomPanel.tsx
│   └── LabelManagement.tsx
│
└── Scripts (Phase 3)
    ├── analyze-messy-contacts.ts
    └── seed-default-labels.ts
```

---

## Data Quality Analysis

### Issue Detection

| Issue | Description | Auto-Fix |
|-------|-------------|----------|
| Emoji in Name | 🔥John Smith🔥 | Remove or flag |
| Multiple Phones | "(760) 333-3676 ::: (760) 444-4444" | Split into array |
| Invalid Phone | "555-555-5555" | Skip or fix format |
| No Phone | Missing phone number | Skip or flag |
| Junk Entries | Test numbers, spam | Skip automatically |
| Duplicates | Same phone number | Skip by default |
| Organization Only | "ABC Company" (no person) | Flag or skip |
| Special Characters | "/ John Smith" | Auto-clean |

### Quality Score (0-100)

```
Score Breakdown:
  First Name:    15 points
  Last Name:     10 points
  Valid Phone:   25 points (most important!)
  Valid Email:   15 points
  Address:       15 points

Penalties:
  Emoji:         -10 points
  Special Chars: -5 points
  Junk Entry:    -20 points
  Org Only:      -10 points
```

**Quality Levels:**
- 80-100: Excellent (green)
- 60-79: Good (blue)
- 40-59: Fair (yellow)
- 0-39: Poor (red)

---

## Components

### ImportAnalysisDashboard

Comprehensive analysis display before importing.

**Features:**
- Quality score badge
- Issue breakdown with percentages
- Examples of problematic data
- Recommended actions list
- Responsive design

**Props:**
```typescript
{
  analysis: AnalysisReport;
  fileName: string;
  onProceed?: () => void;
  onCancel?: () => void;
}
```

### ImportConfigPanel

Configure import settings based on analysis.

**Features:**
- Skip options (emoji, junk, duplicates, org-only)
- Auto-fix options (clean names, normalize phones)
- Merge strategy selection
- Live import count preview
- Visual configuration with checkboxes

**Props:**
```typescript
{
  analysis: { totalRows, dataQualityIssues };
  initialConfig?: Partial<ImportConfig>;
  onSave?: (config: ImportConfig) => void;
  onCancel?: () => void;
}
```

### ContactCard

Beautiful card for displaying contact information.

**Features:**
- Photo/avatar with gradient background
- Quality badge (top-right)
- Personal flag for emoji contacts
- Contact info with icons
- Multiple contact indicators
- Data quality issue chips
- Drag state styling

**Props:**
```typescript
{
  contact: Contact;
  style?: React.CSSProperties;
  onSwipe?: (direction: 'left' | 'right') => void;
  isDragging?: boolean;
}
```

### ContactBottomPanel

Full-screen Tinder-style swipe interface.

**Features:**
- Touch and mouse gesture support
- Card stack with 3 visible cards
- Smooth animations with rotation
- Label selector
- Progress bar with percentage
- Undo button
- Visual feedback ("ADD ✓" / "SKIP ✗")
- Action buttons as fallback
- Completion screen

**Props:**
```typescript
{
  contacts: Contact[];
  labels: Label[];
  onSwipeLeft?: (contact: Contact) => void;
  onSwipeRight?: (contact: Contact, labelId: string) => void;
  onComplete?: () => void;
}
```

### LabelManagement

Manage contact organization labels.

**Features:**
- Create/edit/delete labels
- 18-color palette
- Label usage statistics
- System label protection
- Inline editing
- Empty state with CTA

**Props:**
```typescript
{
  labels: Label[];
  onCreateLabel?: (label) => Promise<void>;
  onUpdateLabel?: (id, updates) => Promise<void>;
  onDeleteLabel?: (id) => Promise<void>;
}
```

---

## API Reference

### POST /api/crm/contacts/analyze

Analyze CSV file for data quality.

**Request:**
```typescript
FormData {
  file: File  // CSV file
}
```

**Response:**
```typescript
{
  success: true,
  batchId: "6789...",
  analysis: {
    totalRows: 3393,
    qualityScore: 67,
    dataQualityIssues: {
      noPhone: 582,
      multiplePhones: 494,
      // ... more issues
    },
    phoneFormatExamples: [...],
    recommendedActions: [...]
  }
}
```

### GET /api/crm/labels

List all labels for user.

**Query Params:**
- `includeArchived` (optional): boolean

**Response:**
```typescript
{
  success: true,
  labels: [
    {
      _id: "abc...",
      name: "Hot Leads",
      color: "#EF4444",
      contactCount: 45,
      isSystem: true
    }
  ]
}
```

### POST /api/crm/labels

Create a new label.

**Request:**
```typescript
{
  name: "VIP Clients",
  description: "High-value repeat clients",
  color: "#8B5CF6",
  icon: "star"  // optional
}
```

**Response:**
```typescript
{
  success: true,
  label: { _id, name, color, ... }
}
```

---

## Utilities Reference

### contact-cleaning.utils.ts

Comprehensive cleaning and validation utilities.

**Key Functions:**

```typescript
// Detect emoji
detectEmoji(text: string): boolean

// Clean names
cleanName(name: string): {
  cleaned: string;
  issues: string[];
  originalName?: string;
}

// Normalize phone to E.164
normalizePhone(phone: string, country?: 'US'): {
  normalized: string | null;
  isValid: boolean;
  country?: string;
}

// Validate email
validateEmail(email: string): {
  isValid: boolean;
  normalized: string;
}

// Analyze contact quality
analyzeContactQuality(contactData): {
  score: number;         // 0-100
  metrics: ContactQualityMetrics;
  issues: string[];
  recommendations: string[];
}

// Detect junk
detectJunkEntry(contactData): {
  isJunk: boolean;
  reasons: string[];
}

// Duplicate detection
generateContactHash(phone: string): string
arePotentialDuplicates(contact1, contact2): {
  isDuplicate: boolean;
  matchedOn: string[];  // ['phone', 'email', 'name']
}
```

---

## Integration Examples

### Example 1: Complete Import Flow

```typescript
function ContactImportFlow() {
  const [step, setStep] = useState('upload');
  const [analysis, setAnalysis] = useState(null);
  const [config, setConfig] = useState(null);

  const handleAnalyze = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/crm/contacts/analyze', {
      method: 'POST',
      body: formData,
    });

    const { analysis, batchId } = await res.json();
    setAnalysis(analysis);
    setStep('analyze');
  };

  return (
    <>
      {step === 'upload' && (
        <FileUpload onUpload={handleAnalyze} />
      )}

      {step === 'analyze' && (
        <ImportAnalysisDashboard
          analysis={analysis}
          fileName={file.name}
          onProceed={() => setStep('config')}
        />
      )}

      {step === 'config' && (
        <ImportConfigPanel
          analysis={analysis}
          onSave={(cfg) => {
            setConfig(cfg);
            setStep('import');
          }}
        />
      )}

      {step === 'import' && (
        <ImportProgress config={config} />
      )}

      {step === 'organize' && (
        <ContactBottomPanel
          contacts={newContacts}
          labels={labels}
          onComplete={() => setStep('done')}
        />
      )}
    </>
  );
}
```

### Example 2: Campaign Contact Selection

```typescript
function CampaignBuilder({ campaignId }) {
  const [contacts, setContacts] = useState([]);
  const [campaignContacts, setCampaignContacts] = useState([]);

  return (
    <div>
      <h2>Select Contacts for Campaign</h2>

      <ContactBottomPanel
        contacts={contacts.filter(c => !campaignContacts.includes(c._id))}
        labels={[{ _id: 'campaign', name: 'Add to Campaign', color: '#3B82F6' }]}
        onSwipeRight={(contact) => {
          setCampaignContacts([...campaignContacts, contact._id]);
          addContactToCampaign(campaignId, contact._id);
        }}
        onComplete={() => launchCampaign(campaignId)}
      />
    </div>
  );
}
```

---

## Default Labels

Created with `npx tsx scripts/seed-default-labels.ts <userId>`:

1. **Hot Leads** (#EF4444) - High-priority prospects
2. **Past Clients** (#3B82F6) - Previous clients
3. **Sphere of Influence** (#8B5CF6) - Personal network
4. **First Time Buyers** (#22C55E) - First-time homebuyers
5. **Sellers** (#F97316) - Homeowners selling
6. **Investors** (#EAB308) - Real estate investors
7. **Relocations** (#06B6D4) - Moving to/from area
8. **Nurture** (#84CC16) - Long-term prospects
9. **Do Not Contact** (#64748B) - Opt-out list

---

## Best Practices

### 1. Always Analyze Before Importing
```typescript
// ✅ Good
const analysis = await analyzeCSV(file);
if (analysis.qualityScore < 40) {
  alert('Low quality data - review before importing');
}

// ❌ Bad
await importCSV(file);  // No analysis
```

### 2. Use Auto-Cleaning
```typescript
// ✅ Good
config = {
  autoCleanNames: true,       // Remove special chars
  normalizePhones: true,      // Convert to E.164
  skipJunk: true,             // Filter spam
  skipDuplicates: true,       // Prevent duplicates
}

// ❌ Bad
config = {
  autoCleanNames: false,      // Manual cleanup needed
}
```

### 3. Organize in Batches
```typescript
// ✅ Good
const batches = chunk(contacts, 50);  // 50 contacts per session

// ❌ Bad
<ContactBottomPanel contacts={allContacts} />  // 5000 contacts!
```

### 4. Leverage System Labels
```typescript
// ✅ Good
await seedDefaultLabels(userId);  // Create standard labels
labels = await fetchLabels();

// ❌ Bad
// User manually creates all labels
```

---

## Troubleshooting

**Q: Swipe gestures not working?**
A: Check touch event handlers are attached and `isDragging` state is managed.

**Q: Phone numbers showing raw format?**
A: Enable `normalizePhones: true` in import config.

**Q: Duplicate labels error?**
A: Unique index on `userId + name` prevents this automatically.

**Q: Quality score seems wrong?**
A: Review scoring algorithm in `calculateQualityScore()`.

---

## Files Created

```
Backend:
  src/models/contact.ts (enhanced)
  src/models/Label.ts (new)
  src/models/ImportBatch.ts (enhanced)
  src/lib/utils/contact-cleaning.utils.ts (new)
  src/lib/services/contact-analysis.service.ts (new)
  src/app/api/crm/contacts/analyze/route.ts (new)
  src/app/api/crm/labels/route.ts (new)
  src/app/api/crm/labels/[id]/route.ts (new)

Frontend:
  src/app/components/crm/ImportAnalysisDashboard.tsx (new)
  src/app/components/crm/ImportConfigPanel.tsx (new)
  src/app/components/crm/ContactCard.tsx (new)
  src/app/components/crm/ContactBottomPanel.tsx (new)
  src/app/components/crm/LabelManagement.tsx (new)

Scripts:
  scripts/analyze-messy-contacts.ts (enhanced)
  scripts/seed-default-labels.ts (new)

Documentation:
  docs/campaigns/PROSPECT_DISCOVERY_IMPLEMENTATION_GUIDE.md (new)
  docs/campaigns/PROSPECT_DISCOVERY_README.md (new)
```

---

## Support

For detailed implementation guide, see:
📖 [PROSPECT_DISCOVERY_IMPLEMENTATION_GUIDE.md](./PROSPECT_DISCOVERY_IMPLEMENTATION_GUIDE.md)

---

**Built with:** Next.js 16, React 19, TypeScript, Mongoose, libphonenumber-js, Heroicons

**Version:** 1.0.0
**Status:** Production Ready ✅
