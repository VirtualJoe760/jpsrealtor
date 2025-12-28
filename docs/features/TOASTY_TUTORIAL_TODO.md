# Toasty Tutorial - Implementation TODO List

**Last Updated:** December 27, 2025

## ✅ Completed Tasks

- [x] Add data-tour attribute to list view button
- [x] Update step 4 to target list view instead of sort dropdown
- [x] Make step 4 interactive - block Next until list view selected
- [x] Add step 5 for sort dropdown (informational only)
- [x] Shift all subsequent steps by 1 (now 15 total steps)
- [x] Update Toasty image mappings for 15 steps
- [x] Update Toasty positioning for new steps 5 and 6
- [x] Update speech bubble positioning for new steps
- [x] Update step counter to show "Step X of 15"
- [x] Update isLastStep check to stepIndex === 14
- [x] Update completion trigger to stepIndex === 14

## 🚧 In Progress

- [ ] Test step 4 - ensure Next button blocked until list view clicked
- [ ] Test all 15 tutorial steps flow correctly
- [ ] Verify Toasty positioning is correct on steps 4, 5, and 6

## 📋 Pending Testing

### Core Functionality
- [ ] Verify all data-tour attributes are present on target elements
- [ ] Test interactive step 1 (search input) blocks Next until query sent
- [ ] Test step 2 scroll detection and auto-advance
- [ ] Test auto-fill button functionality
- [ ] Test step 4 list view button blocks Next until clicked

### Visual/UX Testing
- [ ] Verify Toasty positioning on all steps (mobile and desktop)
- [ ] Verify speech bubbles don't cover UI elements
- [ ] Test tutorial in light and dark mode
- [ ] Test mobile tutorial flow and positioning

### Persistence & Navigation
- [ ] Verify localStorage persistence (tutorial doesn't repeat)
- [ ] Test Skip button works on all steps
- [ ] Test Back button navigation
- [ ] Verify tutorial completion triggers and marks as complete

## 📝 Documentation Updates

- [ ] Update CHAT_TUTORIAL_SYSTEM.md with 15-step flow
- [ ] Document step 4 (list view) as interactive
- [ ] Document step 5 (sort dropdown) as informational only
- [ ] Update step numbers in all documentation

---

## 🎯 Current Tutorial Flow (15 Steps Total)

### Desktop Steps

0. **Welcome** - Toasty introduces herself
1. **Search Input** (Interactive) - User must type and send query
2. **Scroll Step** (Auto-advance) - User scrolls to bottom of AI response
3. **Results Toggle** - Show Panels vs List view options
4. **List View Button** (Interactive) - User MUST click "List" to continue
5. **Sort Dropdown** - Show sorting options (informational only)
6. **View Listing** - Show "View Details" button on first listing
7. **Swipe Right** - Favorite/like button
8. **Swipe Left** - Unfavorite/dislike button
9. **Map Mode** - Map view button in sidebar
10. **Map Search** - Search bar on map
11. **Map Filters** - Filter controls on map
12. **Back to Chat** - Return to chat view
13. **New Chat** - Start fresh conversation
14. **Completion** - Congratulations message

---

## 📊 Progress: 11/30 tasks completed (36.7%)
