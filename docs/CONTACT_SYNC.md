# Contact Sync - Google & Apple Integration

**Date**: December 9, 2025
**Status**: ✅ FULLY IMPLEMENTED
**Features**: Google Contacts OAuth, vCard Import (Apple/Outlook), Duplicate Detection

---

## 🎯 Overview

Instant contact import for agents from their existing contact lists:
- **Google Contacts** - OAuth 2.0 integration with automatic sync
- **Apple Contacts** - vCard (.vcf) file import
- **Outlook** - vCard export support
- **Duplicate Detection** - Skip contacts that already exist
- **TCPA Compliance** - All imports default to SMS opt-out

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     USER FLOW                                │
├─────────────────────────────────────────────────────────────┤
│  Agent clicks "Import" button in Contacts tab               │
│         ↓                                                    │
│  ContactSyncModal opens with two options:                   │
│    1. Sync from Google Contacts (OAuth)                     │
│    2. Upload vCard File (.vcf)                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              OPTION 1: GOOGLE CONTACTS                       │
├─────────────────────────────────────────────────────────────┤
│  1. User clicks "Connect Google Account"                    │
│  2. Redirect to Google OAuth consent screen                 │
│  3. User grants permission for Contacts API (read-only)     │
│  4. Google redirects back with auth code                    │
│  5. Exchange code for access token                          │
│  6. Fetch contacts from People API (max 1000)               │
│  7. Parse name, email, phone, address                       │
│  8. Format phone to E.164 (+17605551234)                    │
│  9. Check for duplicates (by phone number)                  │
│  10. Create contacts in MongoDB                             │
│  11. Redirect to CRM with success message                   │
│                                                              │
│  API Route: GET /api/crm/contacts/import/google             │
│  Scopes: https://www.googleapis.com/auth/contacts.readonly  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              OPTION 2: vCARD FILE UPLOAD                     │
├─────────────────────────────────────────────────────────────┤
│  1. User selects .vcf file from computer                    │
│  2. File uploaded to API via FormData                       │
│  3. Parse vCard format (FN, N, TEL, EMAIL, ADR, ORG)        │
│  4. Extract multiple contacts from single file              │
│  5. Format phone to E.164                                   │
│  6. Check for duplicates                                    │
│  7. Create contacts in MongoDB                              │
│  8. Return success with stats (imported/skipped/errors)     │
│                                                              │
│  API Route: POST /api/crm/contacts/import/vcard             │
│  Supports: Apple Contacts, Outlook, Gmail exports           │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 File Structure

```
F:/web-clients/joseph-sardella/jpsrealtor/

├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── crm/
│   │   │       └── contacts/
│   │   │           └── import/
│   │   │               ├── google/
│   │   │               │   └── route.ts      # Google OAuth + People API
│   │   │               └── vcard/
│   │   │                   └── route.ts      # vCard file parser
│   │   │
│   │   └── components/
│   │       └── crm/
│   │           ├── ContactSyncModal.tsx       # Import UI modal
│   │           └── ContactsTab.tsx            # Updated with Import button
│   │
│   └── .env.local
│       GOOGLE_CLIENT_ID=...                   # Already configured
│       GOOGLE_CLIENT_SECRET=...               # Already configured
│       NEXT_PUBLIC_BASE_URL=http://localhost:3000
│
└── docs/
    └── CONTACT_SYNC.md                        # This file
```

---

## 🔑 Google OAuth Setup

### Existing Credentials
Your Google OAuth is already configured for Sign In:
- **Client ID**: `[REDACTED]`
- **Client Secret**: `[REDACTED]`

### Add Contacts API Scope

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Select your OAuth 2.0 Client ID
3. Add authorized redirect URI:
   ```
   http://localhost:3000/api/crm/contacts/import/google
   https://yourdomain.com/api/crm/contacts/import/google
   ```
4. Enable **Google People API**:
   - Go to [APIs & Services > Library](https://console.cloud.google.com/apis/library)
   - Search "People API"
   - Click "Enable"

### OAuth Consent Screen
Add scope: `https://www.googleapis.com/auth/contacts.readonly`

This allows reading contacts but **not** writing/modifying them (read-only for security).

---

## 📊 Import Process Flow

### Google Contacts Import

**Step 1: User Initiates**
```typescript
// User clicks "Connect Google Account"
window.location.href = '/api/crm/contacts/import/google';
```

**Step 2: OAuth Redirect**
```typescript
// Backend generates OAuth URL and redirects
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:3000/api/crm/contacts/import/google'
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/contacts.readonly'],
  prompt: 'consent',
});

return NextResponse.redirect(authUrl);
```

**Step 3: User Grants Permission**
Google shows consent screen:
```
JPSRealtor wants to:
  ✓ View your contacts
```

**Step 4: Google Redirects Back**
```
http://localhost:3000/api/crm/contacts/import/google?code=4/0AY...
```

**Step 5: Exchange Code for Token**
```typescript
const { tokens } = await oauth2Client.getToken(code);
oauth2Client.setCredentials(tokens);
```

**Step 6: Fetch Contacts**
```typescript
const people = google.people({ version: 'v1', auth: oauth2Client });

const response = await people.people.connections.list({
  resourceName: 'people/me',
  pageSize: 1000,
  personFields: 'names,emailAddresses,phoneNumbers,addresses,organizations',
});

const connections = response.data.connections || [];
```

**Step 7: Parse and Save**
```typescript
for (const person of connections) {
  const name = person.names?.[0];
  const phoneNumbers = person.phoneNumbers;
  const emails = person.emailAddresses;

  // Format phone to E.164
  const phone = formatPhoneForE164(phoneNumbers[0].value);

  // Check for duplicates
  const existing = await Contact.findOne({ phone });
  if (existing) {
    skipped++;
    continue;
  }

  // Create contact
  await Contact.create({
    firstName: name.givenName,
    lastName: name.familyName,
    phone,
    email: emails?.[0]?.value,
    source: 'google_import',
    status: 'new',
    preferences: { smsOptIn: false },  // TCPA compliance
  });

  imported++;
}
```

**Step 8: Redirect with Results**
```
http://localhost:3000/admin/crm?imported=127&skipped=14
```

### vCard Import

**Step 1: Export from Source**

**Apple Contacts:**
1. Open Contacts app
2. Select contacts (Cmd+A for all)
3. File → Export vCard...
4. Save .vcf file

**Outlook:**
1. File → Open & Export → Import/Export
2. Export to a file → vCard (folder of .vcf files)
3. Select Contacts folder
4. Click Finish

**Gmail (for iOS):**
1. Google Contacts → Export
2. vCard format (for iOS Contacts)
3. Download .vcf file

**Step 2: Upload File**
```typescript
// User selects file
<input type="file" accept=".vcf,.vcard" onChange={handleVCardUpload} />

// Upload to API
const formData = new FormData();
formData.append('file', file);

const response = await fetch('/api/crm/contacts/import/vcard', {
  method: 'POST',
  body: formData,
});
```

**Step 3: Parse vCard**
```
BEGIN:VCARD
VERSION:3.0
FN:John Doe
N:Doe;John;;;
TEL;TYPE=CELL:+17605551234
EMAIL;TYPE=INTERNET:john@example.com
ADR;TYPE=HOME:;;123 Main St;Palm Desert;CA;92260;USA
ORG:Acme Corp
NOTE:Met at conference
END:VCARD
```

Parsed to:
```typescript
{
  firstName: 'John',
  lastName: 'Doe',
  phone: '+17605551234',
  email: 'john@example.com',
  address: {
    street: '123 Main St',
    city: 'Palm Desert',
    state: 'CA',
    zip: '92260'
  },
  organization: 'Acme Corp',
  note: 'Met at conference'
}
```

**Step 4: Save Contacts**
Same duplicate detection and creation process as Google.

**Step 5: Return Results**
```json
{
  "success": true,
  "imported": 45,
  "skipped": 3,
  "errors": 0,
  "details": {
    "skippedReasons": ["Already exists", "No phone number", "Invalid phone format"]
  }
}
```

---

## 🛡️ Duplicate Detection

### Strategy
Contacts are considered duplicates if they have the **same phone number**.

### Logic
```typescript
// Check if contact already exists
const existingContact = await Contact.findOne({ phone });

if (existingContact) {
  skippedContacts.push({
    reason: 'Already exists',
    phone,
    person
  });
  continue;  // Skip this contact
}
```

### Why Phone Number?
- Most reliable unique identifier
- Email can be missing or changed
- Names can have variations (John vs Jonathan)
- Phone is required for SMS functionality

---

## 📞 Phone Number Formatting

All phone numbers are standardized to **E.164 format**: `+[country code][number]`

### Examples
```typescript
formatPhoneForE164('760-555-1234')      → '+17605551234'
formatPhoneForE164('(760) 555-1234')    → '+17605551234'
formatPhoneForE164('1-760-555-1234')    → '+17605551234'
formatPhoneForE164('+1 760 555 1234')   → '+17605551234'
```

### Implementation
```typescript
function formatPhoneForE164(phone: string): string | null {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // If starts with 1 and has 11 digits (US)
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // If 10 digits (US without country code)
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // If already has + and sufficient length
  if (phone.startsWith('+') && digits.length >= 10) {
    return `+${digits}`;
  }

  // Invalid
  return null;
}
```

### Invalid Numbers
Numbers are skipped if they:
- Have fewer than 10 digits
- Cannot be parsed to E.164 format
- Are missing entirely

---

## 🔐 TCPA Compliance

### Default Behavior
**All imported contacts have SMS opt-in disabled by default.**

```typescript
preferences: {
  smsOptIn: false,  // Must be manually enabled
  emailOptIn: false,
  callOptIn: false,
}
```

### Why This Matters
- **TCPA requires explicit consent** before sending marketing texts
- Importing a contact ≠ consent to receive SMS
- Agents must **manually enable** SMS opt-in for each contact
- Must obtain proper consent language (see TWILIO_INTEGRATION.md)

### Workflow
1. Import contacts from Google/Apple
2. Contact appears in CRM with `smsOptIn: false`
3. Agent calls/emails contact
4. Obtains verbal/written consent for SMS
5. Edits contact and checks "SMS Opt-In"
6. Now contact appears in Messaging tab

---

## 📊 Import Statistics

### Success Message
```
Successfully imported 127 contacts!
Skipped 14 contacts (already exist or missing required fields)
```

### Skipped Reasons
- **No name** - Contact has no first/last name
- **No phone number** - Contact missing phone
- **Invalid phone format** - Phone cannot be converted to E.164
- **Already exists** - Phone number already in database

### Error Handling
- Individual contact errors don't stop the import
- Errors are logged and counted
- Import continues for remaining contacts

---

## 🧪 Testing Guide

### Test Google Import

1. Navigate to `/admin/crm`
2. Click "Contacts" tab
3. Click "Import" button
4. Click "Connect Google Account"
5. Grant permission in OAuth screen
6. Wait for redirect back to CRM
7. Verify contacts appear in list

**Expected Result:**
```
URL: http://localhost:3000/admin/crm?imported=127&skipped=14
Toast: "Successfully imported 127 contacts!"
```

### Test vCard Import

1. Export contacts from Apple Contacts:
   - Open Contacts app
   - Select a few contacts
   - File → Export vCard...
   - Save `test.vcf`

2. Import in CRM:
   - Click "Import" button
   - Click "Choose vCard File"
   - Select `test.vcf`
   - Wait for import

**Expected Result:**
```json
{
  "success": true,
  "imported": 5,
  "skipped": 0,
  "errors": 0
}
```

### Test Duplicate Detection

1. Import contacts once
2. Import same vCard file again
3. Verify all contacts are skipped

**Expected Result:**
```
Imported: 0
Skipped: 5 (all already exist)
```

---

## 🚨 Common Issues

### Issue: Google OAuth fails
**Error**: "redirect_uri_mismatch"

**Fix**:
1. Go to Google Cloud Console
2. OAuth 2.0 Client ID settings
3. Add exact redirect URI:
   ```
   http://localhost:3000/api/crm/contacts/import/google
   ```

### Issue: No contacts imported
**Error**: "0 contacts imported, 127 skipped"

**Possible Reasons**:
1. All contacts already exist (check by phone)
2. No contacts have phone numbers
3. Phone numbers in invalid format

**Debug**:
```bash
# Check MongoDB for existing contacts
db.contacts.find({ phone: { $exists: true } }).count()

# Check specific phone
db.contacts.findOne({ phone: '+17605551234' })
```

### Issue: People API not enabled
**Error**: "Google People API has not been used in project..."

**Fix**:
1. Go to [APIs & Services > Library](https://console.cloud.google.com/apis/library)
2. Search "Google People API"
3. Click "Enable"

### Issue: vCard file won't upload
**Error**: "No file provided"

**Check**:
1. File has .vcf or .vcard extension
2. File is not empty
3. File is valid vCard format (starts with BEGIN:VCARD)

---

## 🔮 Future Enhancements

### Phase 2: Advanced Features

1. **Batch Import UI**
   - Progress bar during import
   - Real-time count updates
   - Preview contacts before saving

2. **Contact Mapping**
   - Map custom fields from source
   - Tag auto-assignment rules
   - Status auto-detection (buyer/seller keywords)

3. **Scheduled Sync**
   - Auto-sync Google Contacts daily/weekly
   - Detect new/updated contacts
   - Two-way sync (update CRM → Google)

4. **Microsoft Outlook Integration**
   - Direct OAuth connection
   - Same flow as Google
   - Microsoft Graph API

5. **CSV Import**
   - Upload spreadsheet
   - Column mapping interface
   - Validation before import

6. **Import History**
   - Track all imports
   - Show source, date, count
   - Rollback capability

---

## 📝 Summary

The contact sync system is **fully implemented** with:

- ✅ **Google Contacts** - OAuth 2.0 with People API (up to 1000 contacts)
- ✅ **vCard Import** - Apple Contacts, Outlook, Gmail exports
- ✅ **Duplicate Detection** - Skip existing contacts by phone number
- ✅ **Phone Formatting** - E.164 standardization for all numbers
- ✅ **TCPA Compliance** - SMS opt-in disabled by default
- ✅ **Beautiful UI** - Modal with clear instructions for both methods
- ✅ **Error Handling** - Comprehensive skip/error reporting
- ✅ **Import Statistics** - Real-time feedback on success/failures

**Status**: 🟢 PRODUCTION READY

Agents can now instantly import their existing contacts and start using the CRM without manual data entry!

---

**Last Updated**: December 9, 2025
**Author**: AI + Joseph Sardella
**Status**: Living Document
