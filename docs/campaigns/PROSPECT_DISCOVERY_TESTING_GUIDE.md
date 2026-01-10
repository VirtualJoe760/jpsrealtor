# Prospect Discovery - Testing Guide

**Version:** 1.0.0
**Date:** January 8, 2026
**Status:** Ready for Testing

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Test Environment Setup](#test-environment-setup)
3. [Phase 1: CSV Analysis Testing](#phase-1-csv-analysis-testing)
4. [Phase 2: Import Configuration Testing](#phase-2-import-configuration-testing)
5. [Phase 3: Swipe Interface Testing](#phase-3-swipe-interface-testing)
6. [Phase 4: Label Management Testing](#phase-4-label-management-testing)
7. [Phase 5: Campaign Integration Testing](#phase-5-campaign-integration-testing)
8. [Phase 6: Analytics Testing](#phase-6-analytics-testing)
9. [End-to-End Workflow Testing](#end-to-end-workflow-testing)
10. [Edge Cases & Error Handling](#edge-cases--error-handling)
11. [Performance Testing](#performance-testing)
12. [Mobile Responsiveness Testing](#mobile-responsiveness-testing)

---

## Prerequisites

### Required Items
- [ ] MongoDB database running
- [ ] User account created and logged in
- [ ] Sample CSV file with contacts (3,393 contacts recommended)
- [ ] Access to development/staging environment
- [ ] Browser: Chrome, Firefox, Safari, or Edge
- [ ] Mobile device or emulator for touch testing

### Sample CSV Preparation
Create or obtain a CSV file with the following columns:
```
First Name, Last Name, Organization Name, Phone 1 - Value, Phone 2 - Value,
E-mail 1 - Value, Labels
```

**Recommended test data mix:**
- 50+ contacts with emoji in names (e.g., "🔥John Smith")
- 20+ organization-only contacts (no person name)
- 30+ contacts with multiple phones
- 10+ duplicate phone numbers
- 5+ junk entries (test data)
- 100+ clean, valid contacts

---

## Test Environment Setup

### Test 1: Verify Database Connection

**Command:**
```bash
# Check MongoDB connection
npm run dev
# Navigate to http://localhost:3000
```

**Expected Result:**
✅ Application loads without database errors
✅ User can log in successfully

**Status:** [ ] Pass  [ ] Fail

---

### Test 2: Seed Default Labels

**Command:**
```bash
npx tsx scripts/seed-default-labels.ts <YOUR_USER_ID>
```

**Expected Result:**
✅ Script completes successfully
✅ Console shows: "✅ Created 9 default labels"
✅ Labels created:
   - Hot Leads (Red)
   - Past Clients (Blue)
   - Sphere of Influence (Purple)
   - First Time Buyers (Green)
   - Sellers (Orange)
   - Investors (Yellow)
   - Relocations (Cyan)
   - Nurture (Lime)
   - Do Not Contact (Slate)

**How to Find Your User ID:**
```bash
# Open MongoDB shell or use a GUI tool
# Find your user document and copy the _id field
```

**Status:** [ ] Pass  [ ] Fail

---

## Phase 1: CSV Analysis Testing

### Test 3: Analyze CSV File (Command Line)

**Command:**
```bash
npx tsx scripts/analyze-messy-contacts.ts "path/to/your/contacts.csv"
```

**Expected Output:**
```
📊 Contact Analysis Report
==========================

Total Rows: 3,393

Data Quality Issues:
✗ No Name: 45
✗ No Phone: 12
✗ Multiple Phones: 892
✗ Multiple Emails: 234
✗ Invalid Phone Format: 67
✗ Emoji in Name: 123
✗ Organization Only: 234
✗ Duplicates: 89
✗ Junk Entries: 5
✗ Special Characters: 156

Overall Quality Score: 67/100

Recommendations:
• Split contacts with multiple phone numbers
• Remove emoji from contact names
• Fix invalid phone number formats
...
```

**Verify:**
- [ ] Script runs without errors
- [ ] Quality score is calculated (0-100)
- [ ] Issues are detected and counted
- [ ] Recommendations are provided
- [ ] Examples are shown for each issue type

**Status:** [ ] Pass  [ ] Fail

---

### Test 4: Upload CSV via UI

**Steps:**
1. Navigate to `/contacts/import` or contact upload page
2. Click "Upload CSV" button
3. Select your test CSV file
4. Wait for analysis to complete

**Expected Result:**
✅ File uploads successfully
✅ Analysis runs automatically
✅ `ImportAnalysisDashboard` component displays
✅ Quality score badge shown (Excellent/Good/Fair/Poor)
✅ Issue breakdown with counts and percentages
✅ Examples section shows problematic data
✅ Recommendations list is displayed

**Verify Data Quality Dashboard:**
- [ ] Total rows count matches CSV
- [ ] Quality score is displayed with color-coded badge
- [ ] Issue breakdown shows all 10 issue types
- [ ] Examples show actual data from CSV
- [ ] Recommendations are actionable
- [ ] "Proceed to Import" button is visible

**Status:** [ ] Pass  [ ] Fail

---

## Phase 2: Import Configuration Testing

### Test 5: Configure Import Settings

**Steps:**
1. After CSV analysis, click "Configure Import"
2. Review default settings
3. Test toggling each skip option
4. Test toggling auto-fix options
5. Test merge strategy radio buttons

**Expected Behavior:**

**Skip Options:**
- [ ] "Skip emoji" checkbox toggles (default: checked)
- [ ] "Skip junk" checkbox toggles (default: checked)
- [ ] "Skip duplicates" checkbox toggles (default: checked)
- [ ] "Skip organization-only" checkbox toggles (default: unchecked)

**Auto-Fix Options:**
- [ ] "Auto-clean names" checkbox toggles (default: checked)
- [ ] "Normalize phones" checkbox toggles (default: checked)

**Merge Strategy:**
- [ ] "Skip existing" radio (default: selected)
- [ ] "Update existing" radio
- [ ] "Create duplicate" radio

**Live Preview:**
- [ ] Import count updates when toggling skip options
- [ ] Skip count updates dynamically
- [ ] Button shows correct count: "Start Import (X contacts)"

**Status:** [ ] Pass  [ ] Fail

---

### Test 6: Import Contacts

**Steps:**
1. Configure import settings
2. Click "Start Import (X contacts)"
3. Wait for import to complete

**Expected Result:**
✅ Import progress indicator shown
✅ Import completes without errors
✅ Success message displayed with count
✅ Contacts are saved to database

**Verify in Database:**
```javascript
// Check contact count
db.contacts.countDocuments({ userId: YOUR_USER_ID })

// Check data quality fields
db.contacts.findOne({ userId: YOUR_USER_ID })
// Should have: phones[], emails[], dataQuality.score, labels[]
```

**Verify Data Transformations:**
- [ ] Phone numbers in E.164 format (+17603333676)
- [ ] Names cleaned (no emoji if skipped, no special chars)
- [ ] Quality score calculated (0-100)
- [ ] Issues array populated
- [ ] Import batch ID assigned

**Status:** [ ] Pass  [ ] Fail

---

## Phase 3: Swipe Interface Testing

### Test 7: Launch Swipe Interface

**Steps:**
1. Navigate to contact organization page
2. Load imported contacts
3. Launch swipe interface (ContactBottomPanel)

**Expected Result:**
✅ Bottom panel slides up from bottom
✅ Card stack visible with current + 2 background cards
✅ Progress bar shows 0% initially
✅ Label selector shows all available labels
✅ Contact card displays properly formatted data

**Verify UI Elements:**
- [ ] Panel has rounded top corners
- [ ] Card stack shows depth (3 cards visible)
- [ ] Progress bar and percentage displayed
- [ ] "X contacts remaining" counter shown
- [ ] Undo button present (disabled initially)
- [ ] Label selector chips displayed
- [ ] Swipe action buttons (✗ and ✓) visible

**Status:** [ ] Pass  [ ] Fail

---

### Test 8: Mouse Swipe Gestures

**Steps:**
1. Click and hold on current card
2. Drag left (at least 100px)
3. Release mouse

**Expected Result:**
✅ Card follows cursor during drag
✅ Card rotates based on drag distance
✅ "SKIP ✗" indicator appears when dragging left
✅ Card animates off screen on release
✅ Next card becomes current card
✅ Progress updates

**Repeat for Right Swipe:**
1. Drag card right (at least 100px)
2. Release

**Expected Result:**
✅ "ADD ✓" indicator appears when dragging right
✅ Card animates off screen
✅ Contact assigned to selected label
✅ Next card appears

**Verify:**
- [ ] Smooth drag animation
- [ ] Card rotation effect
- [ ] Opacity fade during drag
- [ ] Direction indicators show at correct threshold
- [ ] Card returns to center if drag < 100px
- [ ] Progress bar updates after each swipe

**Status:** [ ] Pass  [ ] Fail

---

### Test 9: Touch Swipe Gestures (Mobile)

**Steps:**
1. Open swipe interface on mobile device or emulator
2. Touch and hold card
3. Swipe left with finger
4. Release

**Expected Result:**
✅ Same behavior as mouse swipe
✅ Touch events handled correctly
✅ No scrolling interference

**Test on Multiple Devices:**
- [ ] iPhone (Safari)
- [ ] Android phone (Chrome)
- [ ] iPad/tablet

**Status:** [ ] Pass  [ ] Fail

---

### Test 10: Action Buttons

**Steps:**
1. Click the red ✗ button (skip)
2. Click the green ✓ button (add to label)

**Expected Result:**
✅ Same result as swiping
✅ Card animates away
✅ Progress updates
✅ Fallback for users who don't discover swipe gesture

**Status:** [ ] Pass  [ ] Fail

---

### Test 11: Undo Functionality

**Steps:**
1. Swipe 3 cards in any direction
2. Click undo button (↶)
3. Verify current card reverts to previous

**Expected Result:**
✅ Previous card returns
✅ Progress decreases
✅ Contact label assignment reversed (if applicable)
✅ Can undo multiple times (up to history length)
✅ Undo button disabled when at beginning

**Status:** [ ] Pass  [ ] Fail

---

### Test 12: Label Selection

**Steps:**
1. Click different label chips before swiping right
2. Swipe right to add contact
3. Verify contact assigned to selected label

**Expected Result:**
✅ Selected label highlighted with color
✅ Contact assigned to correct label
✅ Can switch labels between swipes

**Verify in Database:**
```javascript
db.contacts.findOne({ _id: CONTACT_ID })
// labels array should contain selected label ObjectId
```

**Status:** [ ] Pass  [ ] Fail

---

### Test 13: Completion Screen

**Steps:**
1. Swipe through all contacts
2. Reach the end

**Expected Result:**
✅ Completion screen displays
✅ Green checkmark icon shown
✅ "All Done!" message
✅ Shows total contacts reviewed
✅ Can close panel or navigate away

**Status:** [ ] Pass  [ ] Fail

---

## Phase 4: Label Management Testing

### Test 14: Create Custom Label

**Steps:**
1. Navigate to label management page
2. Click "Create Label" button
3. Enter label name: "VIP Clients"
4. Select color from palette (e.g., Gold)
5. Add description (optional)
6. Click "Save"

**Expected Result:**
✅ Label created successfully
✅ Appears in label list
✅ Color displays correctly
✅ Contact count shows 0 initially

**Verify in Database:**
```javascript
db.labels.findOne({ name: "VIP Clients", userId: YOUR_USER_ID })
// Should have: name, color, contactCount: 0, isSystem: false
```

**Status:** [ ] Pass  [ ] Fail

---

### Test 15: Edit Label

**Steps:**
1. Click edit button on existing label
2. Change name or color
3. Save changes

**Expected Result:**
✅ Label updates successfully
✅ Changes reflected immediately in UI
✅ Cannot edit system labels (should be disabled)

**Status:** [ ] Pass  [ ] Fail

---

### Test 16: Delete Label

**Steps:**
1. Create a test label with no contacts
2. Click delete button
3. Confirm deletion

**Expected Result:**
✅ Label deleted (soft delete - isArchived: true)
✅ Removed from label list
✅ Cannot delete system labels
✅ Warning shown if label has contacts

**Status:** [ ] Pass  [ ] Fail

---

### Test 17: Label Color Palette

**Steps:**
1. Open create/edit label modal
2. View 18-color palette
3. Select different colors

**Expected Result:**
✅ All 18 colors displayed
✅ Current selection highlighted
✅ Color updates in preview
✅ Colors: Red, Blue, Green, Yellow, Purple, Orange, Pink, Cyan, Lime, Indigo, Teal, Rose, Amber, Violet, Sky, Emerald, Fuchsia, Slate

**Status:** [ ] Pass  [ ] Fail

---

## Phase 5: Campaign Integration Testing

### Test 18: Create Campaign from Label

**Steps:**
1. Navigate to label campaign grid page
2. Find label with contacts (e.g., "Hot Leads")
3. Enter campaign name
4. Click "Create Campaign (X contacts)"

**Expected Result:**
✅ API call to `/api/crm/labels/[id]/create-campaign`
✅ Campaign created successfully
✅ Redirects to campaign details page
✅ Campaign pre-populated with all contacts from label
✅ Campaign name matches input
✅ `sourceLabel` field set to label ID

**Verify in Database:**
```javascript
db.campaigns.findOne({ name: "Hot Leads Campaign" })
// Should have: contacts array with all label contacts, sourceLabel: LABEL_ID
```

**Status:** [ ] Pass  [ ] Fail

---

### Test 19: Label Selector in Campaign Builder

**Steps:**
1. Create new campaign manually
2. Go to contact selection step
3. Open label selector component
4. Select multiple labels
5. View filtered contacts

**Expected Result:**
✅ Label selector displays all labels with contact counts
✅ Can select multiple labels (checkboxes)
✅ Contact count updates as labels selected
✅ Filtered contacts shown below
✅ Can search labels by name
✅ "Clear All" button works

**Test Multi-Select:**
- [ ] Select "Hot Leads" (50 contacts)
- [ ] Select "Past Clients" (30 contacts)
- [ ] Total shows 80 contacts (no duplicates)
- [ ] Deselect one label updates count correctly

**Status:** [ ] Pass  [ ] Fail

---

### Test 20: Campaign Creation Flow

**Steps:**
1. Create campaign from label
2. Navigate through campaign setup:
   - Name & type
   - Contact selection (pre-filled)
   - Recording selection
   - Drop Cowboy settings
3. Launch campaign

**Expected Result:**
✅ All steps work with pre-populated contacts
✅ Can add/remove contacts after label population
✅ Drop Cowboy API called correctly
✅ Campaign status updated

**Status:** [ ] Pass  [ ] Fail

---

## Phase 6: Analytics Testing

### Test 21: Label Analytics Dashboard

**Steps:**
1. Navigate to analytics dashboard
2. View key metrics
3. Check top labels chart
4. Review breakdowns

**Expected Result:**

**Key Metrics:**
- [ ] Total Labels count displayed
- [ ] Total Contacts count (sum of all label contacts)
- [ ] Active Labels count (labels with contacts > 0)
- [ ] Avg per Label calculated correctly

**Top Labels Chart:**
- [ ] Shows top 5 labels by contact count
- [ ] Progress bars with correct percentages
- [ ] Color-coded by label color
- [ ] Sorted by contact count (highest first)

**Breakdowns:**
- [ ] System vs Custom labels count
- [ ] Labeled contacts total
- [ ] Empty labels count

**Status:** [ ] Pass  [ ] Fail

---

## End-to-End Workflow Testing

### Test 22: Complete User Journey

**Scenario:** Real estate agent imports 500 contacts, organizes them, and creates targeted campaigns.

**Steps:**

**1. Upload & Analyze (5 min)**
1. Upload CSV with 500 contacts
2. Review analysis dashboard
3. Note quality score and issues

**2. Configure & Import (3 min)**
1. Skip emoji contacts
2. Skip junk entries
3. Auto-clean names
4. Normalize phones
5. Import 450 clean contacts

**3. Organize with Swipe (10 min)**
1. Launch swipe interface
2. Swipe through 100 contacts:
   - 30 → Hot Leads
   - 25 → Past Clients
   - 20 → Sphere of Influence
   - 15 → First Time Buyers
   - 10 → Skip
3. Use undo 2-3 times to correct mistakes

**4. Create Campaigns (5 min)**
1. Create campaign from "Hot Leads" label (30 contacts)
2. Name: "Hot Leads January Outreach"
3. Select recording
4. Configure Drop Cowboy settings
5. Launch campaign

**5. Verify Analytics (2 min)**
1. Check analytics dashboard
2. Verify contact counts
3. See "Hot Leads" in top labels

**Expected Total Time:** ~25 minutes

**Success Criteria:**
✅ All steps complete without errors
✅ Contacts properly imported and organized
✅ Campaign launched successfully
✅ Analytics reflect accurate data
✅ User experience is smooth and intuitive

**Status:** [ ] Pass  [ ] Fail

---

## Edge Cases & Error Handling

### Test 23: Empty CSV

**Steps:**
1. Upload CSV with headers only (no data rows)

**Expected Result:**
✅ Analysis shows "0 rows"
✅ Graceful error message
✅ No crash or undefined errors

**Status:** [ ] Pass  [ ] Fail

---

### Test 24: Malformed CSV

**Steps:**
1. Upload CSV with missing columns or incorrect format

**Expected Result:**
✅ Parser error caught
✅ User-friendly error message
✅ Instructions to fix CSV format

**Status:** [ ] Pass  [ ] Fail

---

### Test 25: Very Large CSV (5000+ contacts)

**Steps:**
1. Upload CSV with 5000+ contacts
2. Monitor analysis performance
3. Import contacts

**Expected Result:**
✅ Analysis completes within 10 seconds
✅ Import completes within 30 seconds
✅ No browser freezing
✅ Progress indicators work

**Status:** [ ] Pass  [ ] Fail

---

### Test 26: Duplicate Import

**Steps:**
1. Import same CSV twice
2. Verify merge strategy works

**Expected Result:**
✅ Skip strategy: No duplicates created
✅ Update strategy: Existing contacts updated
✅ Duplicate count matches in analysis

**Status:** [ ] Pass  [ ] Fail

---

### Test 27: Delete Label with Contacts

**Steps:**
1. Try to delete label that has contacts

**Expected Result:**
✅ Warning message shown
✅ Requires confirmation
✅ Label soft deleted (archived)
✅ Contacts keep label reference (for data integrity)

**Status:** [ ] Pass  [ ] Fail

---

### Test 28: Network Error Handling

**Steps:**
1. Disconnect network
2. Try to import contacts or create campaign

**Expected Result:**
✅ Error message displayed
✅ User instructed to check connection
✅ Can retry after reconnection
✅ No data corruption

**Status:** [ ] Pass  [ ] Fail

---

## Performance Testing

### Test 29: Analysis Speed

**CSV Sizes to Test:**
- 100 contacts: < 1 second
- 1,000 contacts: < 3 seconds
- 5,000 contacts: < 10 seconds
- 10,000 contacts: < 20 seconds

**Status:** [ ] Pass  [ ] Fail

---

### Test 30: Swipe Interface Performance

**Steps:**
1. Load 1000 contacts into swipe interface
2. Swipe rapidly for 1 minute
3. Monitor for lag or memory leaks

**Expected Result:**
✅ Smooth 60fps animation
✅ No frame drops
✅ Memory usage stable
✅ No memory leaks after 100+ swipes

**Status:** [ ] Pass  [ ] Fail

---

### Test 31: Database Query Performance

**Steps:**
1. Create 10 labels with 1000+ contacts each
2. Load analytics dashboard
3. Filter campaigns by multiple labels

**Expected Result:**
✅ Analytics load < 2 seconds
✅ Label filtering < 1 second
✅ No database timeout errors

**Status:** [ ] Pass  [ ] Fail

---

## Mobile Responsiveness Testing

### Test 32: Mobile UI - Swipe Interface

**Devices to Test:**
- iPhone SE (small screen)
- iPhone 14 Pro (medium screen)
- iPad (tablet)
- Android phone

**Verify:**
- [ ] Cards fit screen without overflow
- [ ] Touch gestures work smoothly
- [ ] Progress bar visible
- [ ] Label selector accessible
- [ ] Buttons properly sized for touch

**Status:** [ ] Pass  [ ] Fail

---

### Test 33: Mobile UI - Analysis Dashboard

**Verify:**
- [ ] Issue breakdown readable
- [ ] Examples don't overflow
- [ ] Buttons accessible
- [ ] Scrolling works correctly

**Status:** [ ] Pass  [ ] Fail

---

## Testing Checklist Summary

### Phase 1: CSV Analysis
- [ ] Command-line analysis
- [ ] UI upload and analysis
- [ ] Quality score calculation
- [ ] Issue detection accuracy

### Phase 2: Import Configuration
- [ ] Skip options work correctly
- [ ] Auto-fix options apply transformations
- [ ] Merge strategies function properly
- [ ] Live preview updates accurately

### Phase 3: Swipe Interface
- [ ] Mouse gestures smooth
- [ ] Touch gestures responsive
- [ ] Action buttons work
- [ ] Undo functionality correct
- [ ] Label selection accurate
- [ ] Completion screen displays

### Phase 4: Label Management
- [ ] Create labels
- [ ] Edit labels
- [ ] Delete labels
- [ ] Color palette complete
- [ ] System label protection

### Phase 5: Campaign Integration
- [ ] Create campaign from label
- [ ] Label selector in campaign builder
- [ ] Contact pre-population
- [ ] Drop Cowboy integration

### Phase 6: Analytics
- [ ] Key metrics accurate
- [ ] Top labels chart correct
- [ ] Breakdowns calculated properly

### Edge Cases
- [ ] Empty CSV handled
- [ ] Malformed CSV handled
- [ ] Large CSV performance
- [ ] Duplicate handling
- [ ] Error messages clear

### Performance
- [ ] Analysis speed acceptable
- [ ] Swipe performance smooth
- [ ] Database queries optimized

### Mobile
- [ ] Responsive on all devices
- [ ] Touch gestures work
- [ ] UI elements accessible

---

## Test Results Summary

**Date Tested:** __________________

**Tested By:** __________________

**Environment:** __________________

**Total Tests:** 33

**Tests Passed:** ______

**Tests Failed:** ______

**Pass Rate:** ______%

---

## Issues Found

| Test # | Issue Description | Severity | Status |
|--------|------------------|----------|--------|
|        |                  |          |        |
|        |                  |          |        |
|        |                  |          |        |

**Severity Levels:**
- **Critical:** Blocks core functionality
- **High:** Major feature broken
- **Medium:** Minor feature issue
- **Low:** Cosmetic or edge case

---

## Sign-Off

**Developer:** _________________________ Date: __________

**QA Tester:** _________________________ Date: __________

**Product Owner:** _____________________ Date: __________

---

## Next Steps

After testing completion:

1. **If all tests pass:**
   - [ ] Deploy to staging
   - [ ] User acceptance testing (UAT)
   - [ ] Deploy to production
   - [ ] Monitor for errors

2. **If tests fail:**
   - [ ] Document all issues
   - [ ] Prioritize fixes
   - [ ] Re-test after fixes
   - [ ] Repeat testing cycle

3. **Post-deployment:**
   - [ ] Monitor error logs
   - [ ] Track usage analytics
   - [ ] Gather user feedback
   - [ ] Plan improvements

---

**Testing Guide Version:** 1.0.0
**Last Updated:** January 8, 2026
**Status:** ✅ Ready for Testing
