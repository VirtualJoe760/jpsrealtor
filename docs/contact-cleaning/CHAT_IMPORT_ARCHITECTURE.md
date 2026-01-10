# Chat-Based Contact Import Architecture

**Version:** 1.0.0
**Date:** January 8, 2026
**Status:** Architecture Proposal

---

## 🎯 Overview

This document outlines the architecture for a **chat-driven contact import system** that integrates with the existing CRM. This is distinct from the standalone contact cleaning API.

**Key Difference:**
- **Standalone Cleaning API**: User calls API → Cleans data → Returns CSV file
- **Chat Import System**: User uploads file → Chat previews → User confirms → Writes to CRM database

---

## 🏗️ Architecture Changes

### 1. Extended Preview Mode

**File:** `src/lib/services/contact-cleaner.service.ts`

**Change:** Add `previewMode` to `CleanContactsOptions`

```typescript
export interface CleanContactsOptions {
  // ... existing fields
  previewMode?: boolean; // NEW: When true, skip CSV file write
}

export interface CleanContactsResult {
  success: boolean;
  outputPath?: string; // Optional when previewMode=true
  cleanedData?: any[]; // NEW: Return cleaned data in-memory
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

**Logic:**
```typescript
export async function cleanContacts(
  filePath: string,
  outputPath?: string,
  options?: CleanContactsOptions
): Promise<CleanContactsResult> {
  // ... existing parsing and cleaning logic

  if (options?.previewMode) {
    // Return cleaned data in-memory WITHOUT writing CSV
    return {
      success: true,
      cleanedData: cleanedRows, // NEW field
      statistics: {
        totalRows: allRows.length,
        cleanedRows: cleanedRows.length,
        skippedRows: skippedCount,
        duplicatesRemoved: duplicateCount,
        warnings,
      },
    };
  }

  // ... existing CSV write logic for non-preview mode
}
```

---

### 2. New CRM Import Service

**File:** `src/lib/services/contact-import.service.ts` (NEW)

**Purpose:** Handle database insertion into existing CRM

```typescript
import { Contact } from '@/models/Contact';
import { List } from '@/models/List';
import connectDB from '@/lib/mongodb';

export interface ImportContactsOptions {
  listId?: string;  // Existing list to assign contacts to
  listName?: string; // Create new list with this name
  skipDuplicates?: boolean; // Skip if phone/email already exists
}

export interface ImportContactsResult {
  success: boolean;
  imported: number;
  skipped: number;
  duplicates: number;
  listId?: string;
  errors: Array<{ row: number; error: string }>;
}

/**
 * Import cleaned contacts into CRM database
 *
 * @param cleanedData - Array of cleaned contact objects
 * @param options - Import configuration
 */
export async function importContacts(
  cleanedData: any[],
  options: ImportContactsOptions
): Promise<ImportContactsResult> {
  await connectDB();

  let imported = 0;
  let skipped = 0;
  let duplicates = 0;
  const errors: Array<{ row: number; error: string }> = [];

  // Step 1: Resolve or create list
  let listId = options.listId;
  if (!listId && options.listName) {
    const list = await List.create({ name: options.listName });
    listId = list._id.toString();
  }

  // Step 2: Import each contact
  for (let i = 0; i < cleanedData.length; i++) {
    const contactData = cleanedData[i];

    try {
      // Check for duplicates
      if (options.skipDuplicates) {
        const existing = await Contact.findOne({
          $or: [
            { phone: contactData.phone },
            { email: contactData.email },
          ],
        });

        if (existing) {
          duplicates++;
          continue;
        }
      }

      // Create contact
      await Contact.create({
        firstName: contactData.firstName,
        lastName: contactData.lastName,
        phone: contactData.phone,
        phone2: contactData.phone2,
        phone3: contactData.phone3,
        email: contactData.email,
        email2: contactData.email2,
        email3: contactData.email3,
        address: contactData.address,
        city: contactData.city,
        state: contactData.state,
        zip: contactData.zip,
        organization: contactData.organization,
        lists: listId ? [listId] : [],
      });

      imported++;

    } catch (error: any) {
      errors.push({ row: i + 1, error: error.message });
      skipped++;
    }
  }

  return {
    success: errors.length === 0,
    imported,
    skipped,
    duplicates,
    listId,
    errors,
  };
}
```

---

### 3. List Management Service

**File:** `src/lib/services/list-management.service.ts` (NEW)

**Purpose:** Handle list operations

```typescript
import { List } from '@/models/List';
import connectDB from '@/lib/mongodb';

/**
 * Get all available lists for user
 */
export async function getUserLists(userId?: string): Promise<any[]> {
  await connectDB();

  const lists = await List.find({}).select('_id name contactCount').lean();
  return lists;
}

/**
 * Create a new list
 */
export async function createList(name: string, userId?: string): Promise<string> {
  await connectDB();

  const list = await List.create({ name, contactCount: 0 });
  return list._id.toString();
}

/**
 * Check if list exists by name
 */
export async function findListByName(name: string): Promise<string | null> {
  await connectDB();

  const list = await List.findOne({ name }).select('_id');
  return list ? list._id.toString() : null;
}
```

---

### 4. Chat State Machine

**File:** `src/lib/services/contact-import-chat.service.ts` (NEW)

**Purpose:** Orchestrate chat flow with state management

```typescript
export type ChatState =
  | 'IDLE'
  | 'FILE_UPLOADED'
  | 'PREVIEW_SHOWN'
  | 'AWAITING_CONFIRMATION'
  | 'AWAITING_LIST_ASSIGNMENT'
  | 'IMPORTING'
  | 'COMPLETED'
  | 'ERROR';

export interface ChatContext {
  state: ChatState;
  filePath?: string;
  cleanedData?: any[];
  statistics?: any;
  listId?: string;
  listName?: string;
  confirmationReceived?: boolean;
}

/**
 * Process chat message with state awareness
 */
export async function processImportChatMessage(
  message: string,
  context: ChatContext,
  conversationHistory: any[]
): Promise<{
  response: string;
  newContext: ChatContext;
}> {
  // State machine logic
  switch (context.state) {
    case 'FILE_UPLOADED':
      // Run preview and move to PREVIEW_SHOWN
      // ...
      break;

    case 'PREVIEW_SHOWN':
      // Check for confirmation
      // Move to AWAITING_LIST_ASSIGNMENT or AWAITING_CONFIRMATION
      // ...
      break;

    case 'AWAITING_CONFIRMATION':
      // Parse user response (yes/no/edit)
      // ...
      break;

    case 'AWAITING_LIST_ASSIGNMENT':
      // Parse list selection
      // Move to IMPORTING
      // ...
      break;

    case 'IMPORTING':
      // Execute import
      // Move to COMPLETED
      // ...
      break;

    default:
      return {
        response: 'Please upload a contact file to begin.',
        newContext: context,
      };
  }
}
```

---

## 🔄 Chat Flow Diagram

```
┌─────────────────┐
│  User Uploads   │
│      File       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  FILE_UPLOADED  │ ← Chat auto-starts
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Run Preview     │ ← previewMode: true
│ (No DB write)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ PREVIEW_SHOWN   │ ← Show markdown table (5 rows max)
│                 │ ← Show statistics
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ AWAITING_       │ ← "Does this look correct?"
│ CONFIRMATION    │
└────────┬────────┘
         │
    ┌────┴────┐
    │ User    │
    │ Response│
    └────┬────┘
         │
    ┌────┴─────────┐
    │              │
    ▼              ▼
┌───────┐    ┌──────────┐
│  No   │    │   Yes    │
└───┬───┘    └────┬─────┘
    │             │
    ▼             ▼
┌───────┐    ┌──────────────────┐
│ IDLE  │    │ AWAITING_LIST_   │
└───────┘    │ ASSIGNMENT       │
             └────┬─────────────┘
                  │
                  ▼
             ┌──────────────────┐
             │ "Which list?"    │
             │ - Show existing  │
             │ - Allow create   │
             └────┬─────────────┘
                  │
                  ▼
             ┌──────────────────┐
             │   IMPORTING      │ ← Call importContacts()
             └────┬─────────────┘
                  │
                  ▼
             ┌──────────────────┐
             │   COMPLETED      │ ← Show success stats
             └──────────────────┘
```

---

## 🛠️ Groq Tool Schema Updates

**File:** `src/lib/services/groq-contact-assistant.service.ts`

**Changes:** Add new tools for import flow

### Tool 1: `preview_contacts` (NEW)

```typescript
{
  type: "function",
  function: {
    name: "preview_contacts",
    description: "Preview contact data without importing to database. Shows cleaned data, statistics, and potential issues. ALWAYS use this before importing.",
    parameters: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Absolute path to uploaded contact file"
        },
        options: {
          type: "object",
          description: "Cleaning options (same as clean_contacts but with previewMode: true automatically set)",
          properties: {
            phoneFields: { type: "array", items: { type: "string" } },
            phoneFormat: { type: "string", enum: ["e164", "national", "raw"] },
            exportFormat: { type: "string", enum: ["generic", "drop_cowboy", "sendfox"] },
            // ... other options
          },
          required: ["phoneFields"]
        }
      },
      required: ["filePath", "options"]
    }
  }
}
```

### Tool 2: `import_contacts` (NEW)

```typescript
{
  type: "function",
  function: {
    name: "import_contacts",
    description: "Import previewed contacts into CRM database. REQUIRES user confirmation. REQUIRES list assignment.",
    parameters: {
      type: "object",
      properties: {
        cleanedData: {
          type: "array",
          description: "Cleaned contact data from preview step (stored in context)"
        },
        options: {
          type: "object",
          properties: {
            listId: {
              type: "string",
              description: "Existing list ID to assign contacts to"
            },
            listName: {
              type: "string",
              description: "New list name to create (if listId not provided)"
            },
            skipDuplicates: {
              type: "boolean",
              description: "Skip contacts with duplicate phone/email",
              default: true
            }
          }
        }
      },
      required: ["cleanedData", "options"]
    }
  }
}
```

### Tool 3: `get_user_lists` (NEW)

```typescript
{
  type: "function",
  function: {
    name: "get_user_lists",
    description: "Retrieve all available contact lists for list assignment",
    parameters: {
      type: "object",
      properties: {}, // No parameters needed
      required: []
    }
  }
}
```

---

## 🛡️ System Prompt Constraints

**File:** `src/lib/services/groq-contact-assistant.service.ts`

**Update:** Add safety rules to SYSTEM_PROMPT

```typescript
const SYSTEM_PROMPT = `You are a contact import assistant with strict safety protocols.

CRITICAL IMPORT SAFETY RULES:
1. ALWAYS preview contacts BEFORE importing (use preview_contacts tool)
2. NEVER import without explicit user confirmation ("yes", "proceed", "import", "confirm")
3. ALWAYS ask about list assignment before importing
4. NEVER assume list assignment - user must specify or create
5. Show preview in markdown table format (max 5 rows)
6. Clearly state statistics: total rows, cleaned, skipped, duplicates
7. Highlight warnings and issues from preview

WORKFLOW ENFORCEMENT:
Step 1: User uploads file → Automatically call preview_contacts
Step 2: Show preview table + statistics → Ask "Does this look correct?"
Step 3: If confirmed → Ask "Which list should I assign these contacts to?"
Step 4: User selects/creates list → Call import_contacts
Step 5: Show import results

FORBIDDEN ACTIONS:
- ❌ NEVER call import_contacts without preview_contacts first
- ❌ NEVER import without user saying "yes" or equivalent
- ❌ NEVER skip list assignment question
- ❌ NEVER assume default list

PREVIEW FORMAT:
Show contacts as markdown table:
| First | Last | Phone | Email | City |
|-------|------|-------|-------|------|
| John  | Doe  | (555) 123-4567 | ... | ... |
... (max 5 rows shown)

**Statistics:**
- Total rows: X
- Cleaned successfully: Y
- Skipped (invalid data): Z
- Duplicates removed: W

**Warnings:**
- List any issues found

Then ask: "Does this look correct? Should I proceed with importing these contacts?"`;
```

---

## 📁 File Inventory

### New Files

1. **`src/lib/services/contact-import.service.ts`** (NEW)
   - `importContacts()` - Insert contacts into CRM database
   - Database integration with Mongoose models

2. **`src/lib/services/list-management.service.ts`** (NEW)
   - `getUserLists()` - Fetch available lists
   - `createList()` - Create new list
   - `findListByName()` - Check list existence

3. **`src/lib/services/contact-import-chat.service.ts`** (NEW)
   - `processImportChatMessage()` - Chat orchestration
   - State machine implementation
   - Context management

4. **`src/app/api/contact-import/chat/route.ts`** (NEW)
   - POST endpoint for chat-based import
   - Conversation context persistence
   - State-aware responses

### Modified Files

1. **`src/lib/services/contact-cleaner.service.ts`**
   - Add `previewMode` option
   - Add `cleanedData` to result when in preview mode
   - Skip CSV write when `previewMode: true`

2. **`src/lib/services/groq-contact-assistant.service.ts`**
   - Add 3 new tools: `preview_contacts`, `import_contacts`, `get_user_lists`
   - Update SYSTEM_PROMPT with safety constraints
   - Add state-aware message processing

---

## 🔒 Safety Guarantees

### 1. Preview Before Import
- Chat ALWAYS calls `preview_contacts` first
- Preview runs in-memory (no database writes)
- User sees cleaned data before commit

### 2. Explicit Confirmation
- System prompt enforces confirmation requirement
- Tool call to `import_contacts` only after "yes" detected
- State machine blocks import without AWAITING_CONFIRMATION → confirmed

### 3. List Assignment Required
- Cannot import without listId or listName
- Chat asks user explicitly
- Shows available lists before asking

### 4. Non-Destructive Preview
- `previewMode: true` skips all file/database writes
- Returns data in-memory only
- Can be called multiple times safely

---

## 🔗 Integration Points

### Existing CRM Models

**Contact Model** (`src/models/Contact.ts`):
```typescript
{
  firstName: String,
  lastName: String,
  phone: String,
  phone2: String,
  phone3: String,
  email: String,
  email2: String,
  email3: String,
  address: String,
  city: String,
  state: String,
  zip: String,
  organization: String,
  lists: [ObjectId], // References to List model
}
```

**List Model** (`src/models/List.ts`):
```typescript
{
  name: String,
  contactCount: Number,
  createdAt: Date,
}
```

### No New Models Needed
- Uses existing Contact and List models
- No schema changes required
- Full backward compatibility

---

## 🎬 Example Flow

**User Action:** Uploads `contacts.xlsx`

**Chat State:** `FILE_UPLOADED`

**System Response:**
```
I've received your contact file! Let me preview the data first...

[Calls preview_contacts tool]

Here's a preview of your contacts:

| First Name | Last Name | Phone | Email | City |
|------------|-----------|-------|-------|------|
| John | Smith | (555) 123-4567 | john@example.com | Phoenix |
| Jane | Doe | (555) 987-6543 | jane@example.com | Scottsdale |
| ... | ... | ... | ... | ... |

**Statistics:**
- Total rows: 247
- Cleaned successfully: 245
- Skipped (invalid data): 2
- Duplicates removed: 0

**Warnings:**
- Row 15: Missing phone number (skipped)
- Row 89: Invalid email format (skipped)

Does this look correct? Should I proceed with importing these 245 contacts?
```

**User:** "Yes, looks good"

**Chat State:** `AWAITING_LIST_ASSIGNMENT`

**System Response:**
```
Great! Which list should I assign these contacts to?

Available lists:
1. Warm Leads (234 contacts)
2. Cold Prospects (1,247 contacts)
3. Past Clients (89 contacts)

You can also create a new list by saying "Create list: [name]"
```

**User:** "Create list: January 2026 Import"

**Chat State:** `IMPORTING`

**System Response:**
```
[Calls import_contacts tool]

✅ Import complete!

**Results:**
- Imported: 245 contacts
- Skipped: 0
- Duplicates: 0
- Assigned to: "January 2026 Import" (new list created)

Your contacts are now in the CRM and ready to use!
```

**Chat State:** `COMPLETED`

---

## ⚡ Performance Considerations

### Preview Performance
- Preview runs in-memory (no I/O except initial file read)
- Fast response for files up to 10,000 contacts
- For larger files, consider progress indicator

### Import Performance
- Batch inserts for better performance
- Consider chunking for files > 5,000 contacts
- Duplicate check queries should use indexed fields (phone, email)

### Recommended Indexes
```typescript
// In Contact model
contactSchema.index({ phone: 1 });
contactSchema.index({ email: 1 });
contactSchema.index({ lists: 1 });
```

---

## 📊 Comparison: Standalone vs Chat Import

| Feature | Standalone Cleaning API | Chat Import System |
|---------|------------------------|-------------------|
| **Entry Point** | Direct API call | File upload event |
| **User Interface** | Programmatic | Conversational chat |
| **Output** | CSV file | CRM database records |
| **Preview** | No (direct execution) | Yes (required step) |
| **Confirmation** | No | Yes (explicit) |
| **List Assignment** | N/A | Required |
| **State Management** | Stateless | Stateful (chat context) |
| **Use Case** | Batch cleaning jobs | Interactive CRM import |

---

## ✅ Architecture Validation Checklist

- [x] **Preview mode is non-destructive** - No database writes in preview
- [x] **Explicit confirmation required** - State machine enforces this
- [x] **List assignment required** - Cannot import without list
- [x] **Reuses existing cleaning logic** - No duplication
- [x] **Integrates with existing CRM** - Uses existing models
- [x] **Chat is the control plane** - All decisions flow through chat
- [x] **No invented architecture** - Extends existing patterns
- [x] **Safety constraints in system prompt** - LLM cannot bypass rules

---

**Next Step:** Implement the backend services outlined in this architecture.
