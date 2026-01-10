# Chat-Based Contact Import - Orchestration Guide

**Version:** 1.0.0
**Date:** January 8, 2026
**Status:** Implementation Complete

---

## 🎯 Overview

This document describes the chat orchestration layer that sits between the user and the contact import system. The chat provides a safe, guided workflow with explicit confirmation steps.

---

## 🔄 Complete Chat Orchestration Flow

### State Machine Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    CHAT STATE MACHINE                         │
└──────────────────────────────────────────────────────────────┘

[IDLE] ──upload file──> [FILE_UPLOADED] ──auto preview──> [PREVIEW_SHOWN]
                                                                  │
                                    ┌─────────────────────────────┘
                                    │
                   ┌────────────────┴──────────────────┐
                   │                                   │
              User: "Yes"                         User: "No"
                   │                                   │
                   ▼                                   ▼
        [AWAITING_LIST_ASSIGNMENT]                 [IDLE]
                   │
                   │
              get_user_lists
                   │
                   ▼
          Show available lists
                   │
         User selects/creates list
                   │
                   ▼
             [IMPORTING]
                   │
          import_contacts
                   │
                   ▼
             [COMPLETED]
                   │
                   ▼
               [IDLE]
```

---

## 💬 Chat Orchestration Logic

### 1. File Upload Event

**Trigger:** User uploads a contact file (CSV or Excel)

**Chat Response:**
```
I've received your contact file! Let me preview the data first...

[Automatically calls preview_contacts tool]
```

**Tool Call:**
```javascript
{
  "tool": "preview_contacts",
  "args": {
    "filePath": "/uploads/contacts.xlsx",
    "options": {
      "phoneFields": ["Phone 1 - Value", "Phone 2 - Value", "Mobile"],
      "phoneFormat": "national",
      "exportFormat": "generic",
      "skipDuplicates": true
    }
  }
}
```

---

### 2. Preview Display

**Chat Response Format:**
```markdown
Here's a preview of your contacts:

| First Name | Last Name | Phone | Email | City |
|------------|-----------|-------|-------|------|
| John | Smith | (555) 123-4567 | john@example.com | Phoenix |
| Jane | Doe | (555) 987-6543 | jane@example.com | Scottsdale |
| Robert | Johnson | (480) 555-1234 | robert@example.com | Tempe |
| Maria | Garcia | (602) 555-7890 | maria@example.com | Mesa |
| David | Lee | (623) 555-4321 | david@example.com | Glendale |

_... and 242 more contacts_

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

**State:** `PREVIEW_SHOWN` → `AWAITING_CONFIRMATION`

---

### 3. Confirmation Phase

**User Input Variations:**
- ✅ "Yes" → Proceed to list assignment
- ✅ "Yeah, looks good" → Proceed
- ✅ "Proceed" → Proceed
- ✅ "Import them" → Proceed
- ❌ "No" → Cancel and return to IDLE
- ❌ "Cancel" → Cancel
- ❌ "Not right" → Cancel

**Confirmation Detection Logic:**
```typescript
const confirmKeywords = [
  'yes', 'yeah', 'yep', 'sure', 'okay', 'ok',
  'proceed', 'continue', 'confirm', 'looks good',
  'correct', 'go ahead', 'import'
];

const rejectKeywords = [
  'no', 'nope', 'cancel', 'stop', 'abort',
  'wrong', 'incorrect', 'not right'
];
```

---

### 4. List Assignment Phase

**Chat Response:**
```markdown
Great! Which list should I assign these contacts to?

Available lists:
1. Warm Leads (234 contacts)
2. Cold Prospects (1,247 contacts)
3. Past Clients (89 contacts)
4. January 2026 Prospects (0 contacts)

You can also create a new list by saying "Create list: [name]"
```

**Tool Call:**
```javascript
{
  "tool": "get_user_lists",
  "args": {}
}
```

**User Input Variations:**

**Option A - Select Existing List:**
```
User: "1"  OR  "list 1"  OR  "warm leads"
```

**Option B - Create New List:**
```
User: "Create list: January 2026 Import"
```

**State:** `AWAITING_LIST_ASSIGNMENT` → `IMPORTING`

---

### 5. Import Execution

**Chat Response (During Import):**
```
Importing 245 contacts to "Warm Leads"...
```

**Tool Call:**
```javascript
{
  "tool": "import_contacts",
  "args": {
    "cleanedData": [...], // From preview step
    "options": {
      "listId": "507f1f77bcf86cd799439011", // OR
      "listName": "January 2026 Import",
      "skipDuplicates": true
    }
  }
}
```

**State:** `IMPORTING` → `COMPLETED`

---

### 6. Completion

**Chat Response:**
```markdown
✅ **Import Complete!**

**Results:**
- Imported: 245 contacts
- Skipped: 0
- Duplicates: 0

Contacts have been assigned to the "Warm Leads" list.

Your contacts are now in the CRM and ready to use!
```

**State:** `COMPLETED` → `IDLE`

---

## 🛡️ Safety Mechanisms

### 1. Preview Before Import (Enforced)

**System Prompt Constraint:**
> "ALWAYS preview contacts BEFORE importing (use preview_contacts tool first)"

**Code Enforcement:**
```typescript
if (toolCall.function.name === 'import_contacts' && !context.cleanedData) {
  throw new Error('Cannot import without preview. Please run preview_contacts first.');
}
```

---

### 2. Explicit Confirmation Required

**System Prompt Constraint:**
> "NEVER import without explicit user confirmation ('yes', 'proceed', 'confirm', etc.)"

**LLM Instruction:**
The system prompt explicitly forbids the LLM from calling `import_contacts` without detecting user confirmation in the conversation.

**Example of LLM Following Constraint:**
```
User: "Here's my file /uploads/contacts.xlsx"
LLM: [Calls preview_contacts, shows preview, WAITS for confirmation]
LLM: "Does this look correct?"

User: "Maybe, let me think about it"
LLM: [DOES NOT call import_contacts, continues waiting]

User: "Yes, go ahead"
LLM: [NOW calls import_contacts]
```

---

### 3. List Assignment Required

**System Prompt Constraint:**
> "ALWAYS ask about list assignment before importing"

**Code Enforcement:**
```typescript
if (!options.listId && !options.listName) {
  throw new Error('List assignment required. Specify listId or listName.');
}
```

---

### 4. Non-Destructive Preview

**Technical Guarantee:**
```typescript
// In contact-cleaner.service.ts
if (options?.previewMode) {
  return {
    success: true,
    cleanedData: exportContacts, // In-memory only
    statistics: { ... },
    // NO outputPath - no file written
    // NO database insert - just return data
  };
}
```

Preview mode:
- ✅ Reads file
- ✅ Cleans data in-memory
- ✅ Returns statistics
- ❌ Does NOT write CSV
- ❌ Does NOT touch database

---

## 📊 Conversation Context Management

### Context Structure

```typescript
interface ChatContext {
  state: ChatState;
  filePath?: string;
  cleanedData?: any[];
  statistics?: {
    totalRows: number;
    cleanedRows: number;
    skippedRows: number;
    duplicatesRemoved: number;
    warnings: Warning[];
  };
  listId?: string;
  listName?: string;
  confirmationReceived?: boolean;
  importResult?: ChatImportResult;
  error?: string;
}
```

### Context Updates

**After File Upload:**
```typescript
context = {
  state: 'FILE_UPLOADED',
  filePath: '/uploads/contacts.xlsx'
}
```

**After Preview:**
```typescript
context = {
  ...context,
  state: 'PREVIEW_SHOWN',
  cleanedData: [...], // Store for later import
  statistics: { ... }
}
```

**After Confirmation:**
```typescript
context = {
  ...context,
  state: 'AWAITING_LIST_ASSIGNMENT',
  confirmationReceived: true
}
```

**After Import:**
```typescript
context = {
  ...context,
  state: 'COMPLETED',
  listId: '507f1f77bcf86cd799439011',
  importResult: { imported: 245, ... }
}
```

---

## 🎬 Complete Example Interactions

### Example 1: Successful Import Flow

```
USER: I just uploaded contacts.xlsx

ASSISTANT: I've received your contact file! Let me preview the data first...

[Calls preview_contacts tool]

ASSISTANT:
Here's a preview of your contacts:

| First Name | Last Name | Phone | Email | City |
|------------|-----------|-------|-------|------|
| John | Smith | (555) 123-4567 | john@example.com | Phoenix |
| Jane | Doe | (555) 987-6543 | jane@example.com | Scottsdale |
| Robert | Johnson | (480) 555-1234 | robert@example.com | Tempe |

_... and 242 more contacts_

**Statistics:**
- Total rows: 247
- Cleaned successfully: 245
- Skipped (invalid data): 2
- Duplicates removed: 0

Does this look correct? Should I proceed with importing these 245 contacts?

USER: Yes, looks good

ASSISTANT:
[Calls get_user_lists tool]

Great! Which list should I assign these contacts to?

Available lists:
1. Warm Leads (234 contacts)
2. Cold Prospects (1,247 contacts)
3. Past Clients (89 contacts)

You can also create a new list by saying "Create list: [name]"

USER: Create list: January 2026 Import

ASSISTANT:
[Calls import_contacts tool with listName: "January 2026 Import"]

✅ **Import Complete!**

**Results:**
- Imported: 245 contacts
- Skipped: 0
- Duplicates: 0

Contacts have been assigned to the "January 2026 Import" list (newly created).

Your contacts are now in the CRM and ready to use!
```

---

### Example 2: User Cancels After Preview

```
USER: I uploaded a file at /uploads/messy_contacts.csv

ASSISTANT:
[Calls preview_contacts tool]

Here's a preview of your contacts:

| First Name | Last Name | Phone | Email |
|------------|-----------|-------|-------|
| / Campbell | Smith | Invalid | test@test.com |
| John | | (555) 000-0000 | |
| | Doe | | spam@spam.com |

**Statistics:**
- Total rows: 150
- Cleaned successfully: 47
- Skipped (invalid data): 103
- Duplicates removed: 0

**Warnings:**
- Row 1: Invalid first name pattern
- Row 2: Missing last name
- Row 3: Test phone number detected
- ... and 100 more warnings

⚠️ This file has significant data quality issues. Only 31% of contacts are valid.

Does this look correct? Should I proceed with importing these 47 contacts?

USER: No, let me fix the source file first

ASSISTANT:
That's a good idea! Cleaning up the source file will give you better results.
Feel free to upload the corrected file when you're ready, and I'll preview it again.
```

---

### Example 3: User Selects Existing List

```
USER: /uploads/leads.xlsx is ready

ASSISTANT:
[Calls preview_contacts tool]

Here's a preview... [shows table]

**Statistics:**
- Total rows: 89
- Cleaned successfully: 89
- Skipped: 0
- Duplicates removed: 0

Does this look correct?

USER: Perfect, import them

ASSISTANT:
[Calls get_user_lists tool]

Great! Which list should I assign these contacts to?

Available lists:
1. Warm Leads (234 contacts)
2. Cold Prospects (1,247 contacts)

USER: 1

ASSISTANT:
[Calls import_contacts tool with listId from "Warm Leads"]

✅ **Import Complete!**

**Results:**
- Imported: 89 contacts
- Skipped: 0
- Duplicates: 0

Contacts have been assigned to the "Warm Leads" list.

Your contacts are now in the CRM and ready to use!
```

---

## 🧪 Testing Chat Orchestration

### Test Case 1: Safety - No Import Without Preview

```typescript
// This should FAIL
POST /api/contact-cleaning/assistant
{
  "message": "Import contacts from /uploads/file.csv to list 123"
}

// Expected: LLM calls preview_contacts first, NOT import_contacts
```

### Test Case 2: Safety - No Import Without Confirmation

```typescript
// Step 1: Upload and preview
POST /api/contact-cleaning/assistant
{
  "message": "I uploaded /uploads/file.csv"
}
// Response: Shows preview, asks for confirmation

// Step 2: No confirmation given
POST /api/contact-cleaning/assistant
{
  "message": "How many contacts are there?",
  "conversationHistory": [...]
}
// Expected: LLM answers question, does NOT import
```

### Test Case 3: Safety - No Import Without List

```typescript
// User confirms but doesn't specify list
POST /api/contact-cleaning/assistant
{
  "message": "Yes, import them",
  "conversationHistory": [...]
}

// Expected: LLM calls get_user_lists and asks which list
// Expected: Does NOT call import_contacts yet
```

---

## 🔗 Integration with Existing CRM UI

### Frontend Integration Points

**1. File Upload Component:**
```typescript
// When user uploads file
const response = await fetch('/api/contact-cleaning/assistant', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: `I uploaded a contact file at ${uploadedFilePath}`
  })
});

const { response: chatMessage } = await response.json();
// Display chatMessage in chat UI
```

**2. Chat Message Display:**
```typescript
// Render markdown in chat
import ReactMarkdown from 'react-markdown';

<div className="chat-message">
  <ReactMarkdown>{chatMessage}</ReactMarkdown>
</div>
```

**3. User Response:**
```typescript
// When user sends message
const response = await fetch('/api/contact-cleaning/assistant', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: userInput,
    conversationHistory: chatHistory
  })
});
```

---

## 📝 API Endpoint

**Route:** `POST /api/contact-cleaning/assistant`

**Request:**
```json
{
  "message": "User message here",
  "conversationHistory": [
    {
      "role": "user",
      "content": "Previous user message"
    },
    {
      "role": "assistant",
      "content": "Previous assistant response"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "response": "Markdown-formatted assistant response"
}
```

---

## ✅ Implementation Checklist

- [x] Backend services implemented
  - [x] contact-cleaner.service.ts (preview mode added)
  - [x] contact-import.service.ts (importContactsForChat added)
  - [x] list-management.service.ts (created)
  - [x] contact-import-chat.service.ts (state machine created)
- [x] Groq assistant updated
  - [x] 4 tools registered (clean, preview, import, get_lists)
  - [x] System prompt updated with safety constraints
  - [x] Tool execution logic updated
- [x] Documentation created
  - [x] CHAT_IMPORT_ARCHITECTURE.md
  - [x] CHAT_IMPORT_GUIDE.md (this file)
- [ ] Frontend integration (TODO)
  - [ ] Chat UI component
  - [ ] File upload integration
  - [ ] Conversation history management
- [ ] Testing (TODO)
  - [ ] Unit tests for state machine
  - [ ] Integration tests for chat flow
  - [ ] Safety constraint tests

---

**Status:** Backend Complete ✅ | Frontend Pending ⏳ | Testing Pending ⏳

---

**Built by:** Claude Code
**Technology:** Groq AI, TypeScript, Node.js, Mongoose
**Date:** January 8, 2026
