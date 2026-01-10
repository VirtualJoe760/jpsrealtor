# Prospect Discovery - Quick Testing Checklist

**Date:** _____________  **Tester:** _____________  **Environment:** _____________

---

## ⚙️ Setup (5 min)

- [ ] MongoDB running and connected
- [ ] Logged in as test user
- [ ] User ID obtained: _______________________
- [ ] Default labels seeded: `npx tsx scripts/seed-default-labels.ts <USER_ID>`
- [ ] Test CSV prepared (500+ contacts recommended)

---

## 📊 Phase 1: CSV Analysis (5 min)

- [ ] **Command-line test:** `npx tsx scripts/analyze-messy-contacts.ts "path/to/contacts.csv"`
  - Quality score displayed: ____/100
  - Issues detected correctly
  - Recommendations shown

- [ ] **UI upload test:**
  - CSV uploads successfully
  - Analysis dashboard displays
  - Quality badge shown (Excellent/Good/Fair/Poor)
  - Issue breakdown with counts
  - Examples section populated

---

## ⚙️ Phase 2: Import Configuration (5 min)

- [ ] Configure import settings:
  - Skip emoji contacts: ☑ (default)
  - Skip junk entries: ☑ (default)
  - Skip duplicates: ☑ (default)
  - Auto-clean names: ☑ (default)
  - Normalize phones: ☑ (default)

- [ ] Live preview updates:
  - Import count: ______
  - Skip count: ______
  - Button shows: "Start Import (X contacts)"

- [ ] **Import contacts:**
  - Import completes successfully
  - Success message with count
  - Contacts in database verified

---

## 🃏 Phase 3: Swipe Interface (10 min)

- [ ] **UI loads correctly:**
  - Bottom panel slides up
  - Card stack visible (3 cards)
  - Progress bar at 0%
  - Label selector shows all labels

- [ ] **Mouse gestures:**
  - Drag left → "SKIP ✗" appears → Card exits left
  - Drag right → "ADD ✓" appears → Card exits right
  - Drag < 100px → Card returns to center
  - Smooth animations

- [ ] **Touch gestures (mobile):**
  - Swipe left works
  - Swipe right works
  - No scroll interference

- [ ] **Action buttons:**
  - Red ✗ button skips contact
  - Green ✓ button adds to label

- [ ] **Undo:**
  - Undo button reverses last swipe
  - Can undo multiple times
  - Disabled at beginning

- [ ] **Label selection:**
  - Can switch between labels
  - Contact assigned to correct label
  - Selected label highlighted

- [ ] **Progress tracking:**
  - Progress bar updates
  - Percentage shown
  - "X remaining" counter updates

- [ ] **Completion:**
  - "All Done!" screen after last card
  - Checkmark icon shown
  - Total count displayed

---

## 🏷️ Phase 4: Label Management (5 min)

- [ ] **Create label:**
  - Click "Create Label"
  - Name: "VIP Clients"
  - Color: Gold
  - Saves successfully

- [ ] **Edit label:**
  - Change name or color
  - Updates immediately
  - System labels protected (can't edit)

- [ ] **Delete label:**
  - Empty labels can be deleted
  - Warning for labels with contacts
  - System labels protected (can't delete)

- [ ] **Color palette:**
  - All 18 colors displayed
  - Selection works
  - Preview updates

---

## 📞 Phase 5: Campaign Integration (10 min)

- [ ] **Create campaign from label:**
  - Navigate to label campaign grid
  - Select label: "Hot Leads"
  - Campaign name: "Hot Leads January"
  - Click "Create Campaign"
  - Redirects to campaign page
  - Contacts pre-populated

- [ ] **Verify campaign:**
  - Contact count matches label: ______
  - All contacts from label included
  - Can proceed to recording selection

- [ ] **Label selector in campaign builder:**
  - Open label selector
  - Select multiple labels
  - Contact count updates
  - Filtered contacts shown
  - Search works

---

## 📈 Phase 6: Analytics (3 min)

- [ ] **Key metrics:**
  - Total Labels: ______
  - Total Contacts: ______
  - Active Labels: ______
  - Avg per Label: ______

- [ ] **Top labels chart:**
  - Shows top 5 labels
  - Progress bars correct
  - Percentages accurate
  - Color-coded

- [ ] **Breakdowns:**
  - System vs Custom count
  - Labeled contacts total
  - Empty labels count

---

## 🧪 Edge Cases (5 min)

- [ ] **Empty CSV:**
  - Graceful error handling
  - No crash

- [ ] **Large CSV (1000+ contacts):**
  - Analysis < 10 seconds
  - Import < 30 seconds
  - No freezing

- [ ] **Duplicate import:**
  - Merge strategy works
  - No unwanted duplicates

- [ ] **Network error:**
  - Error message clear
  - Can retry
  - No data corruption

---

## 📱 Mobile Testing (10 min)

- [ ] **iPhone/Safari:**
  - Swipe interface works
  - Touch gestures smooth
  - UI fits screen

- [ ] **Android/Chrome:**
  - Swipe interface works
  - Touch gestures smooth
  - UI fits screen

- [ ] **Tablet/iPad:**
  - Responsive layout
  - Touch gestures work
  - All features accessible

---

## ✅ End-to-End Test (25 min)

**Complete user journey:**

1. [ ] Upload CSV (500 contacts) → Analysis
2. [ ] Configure import → Import 450 clean contacts
3. [ ] Launch swipe → Organize 100 contacts:
   - 30 → Hot Leads
   - 25 → Past Clients
   - 20 → Sphere of Influence
   - 15 → First Time Buyers
   - 10 → Skip
4. [ ] Create campaign from "Hot Leads" (30 contacts)
5. [ ] Name: "Hot Leads January Outreach"
6. [ ] Select recording
7. [ ] Launch campaign
8. [ ] Verify analytics dashboard

**Total time:** ______ minutes (Target: <25 min)

---

## 📊 Results Summary

**Tests Attempted:** ______

**Tests Passed:** ✅ ______

**Tests Failed:** ❌ ______

**Pass Rate:** ______%

---

## 🐛 Issues Found

| Priority | Description | Component |
|----------|-------------|-----------|
| [ ] Critical | | |
| [ ] High | | |
| [ ] Medium | | |
| [ ] Low | | |

---

## ✍️ Sign-Off

**Tested By:** ______________________ Date: __________

**Status:** [ ] ✅ Approved  [ ] ⚠️ Issues Found  [ ] ❌ Failed

**Notes:**
___________________________________________________________
___________________________________________________________
___________________________________________________________
___________________________________________________________

---

## 🔗 Resources

- **Full Testing Guide:** `PROSPECT_DISCOVERY_TESTING_GUIDE.md`
- **Implementation Guide:** `PROSPECT_DISCOVERY_IMPLEMENTATION_GUIDE.md`
- **Quick Start:** `PROSPECT_DISCOVERY_README.md`

---

**Version:** 1.0.0  |  **Last Updated:** January 8, 2026
