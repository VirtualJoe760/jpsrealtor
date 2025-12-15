# Trello Card Guidelines

**Purpose:** Maintain focus and clarity in project management by creating consolidated, actionable cards instead of overwhelming task lists.

**Created:** 2024-12-14
**Last Updated:** 2024-12-14

---

## The Essential 4 Model

### Core Principle
**Maximum 4 cards per major initiative or launch phase.**

Instead of creating 18+ granular cards that overwhelm the board, consolidate related work into 4 strategic, high-level cards that group similar tasks together.

### Why 4 Cards?
- **Manageable:** Easy to see at a glance what needs to be done
- **Focused:** Forces prioritization of what really matters
- **Actionable:** Each card represents a meaningful chunk of work
- **Trackable:** Progress is visible without micromanagement

---

## Card Structure

### Card Title Format
```
[Priority Emoji] [Clear Action-Oriented Title]
```

**Priority Emojis:**
- 🔴 **Critical** - Blocking launch, must be fixed immediately
- 🟠 **High** - Important for launch, high impact
- 🟡 **Medium** - Nice to have, adds value but not blocking
- 🟢 **Launch Prep** - Final testing, validation, go-live tasks

**Examples:**
- ✅ `🔴 Critical Chat & Mobile Fixes`
- ✅ `🟠 Map & AI Synchronization`
- ❌ `Fix mobile scroll direction` (too granular)
- ❌ `Bug fixes` (too vague)

---

### Card Description Format

**Priority:** [Critical/High/Medium/Launch Prep]

[2-3 sentences explaining WHAT this card accomplishes and WHY it matters to users/business]

**Template:**
```markdown
**Priority:** Critical

[Problem statement or goal]. [Impact on users]. [Business value].
```

**Example:**
```markdown
**Priority:** Critical - BLOCKING LAUNCH

Fix blocking issues preventing chat from working properly on mobile and handling errors gracefully. These prevent users from having a good experience and are breaking core functionality.
```

---

### Checklist Structure

**Use Trello's built-in checklist feature** - NOT bullet points in description.

**Checklist Name:** `Tasks`

**Checklist Items:**
- Action-oriented (start with verb)
- Specific enough to complete
- Not overly granular (avoid listing every file)
- Testable/verifiable

**Good Checklist Items:**
- ✅ `Fix mobile scroll direction (messages push UP instead of DOWN)`
- ✅ `Add error handling for unprepared AI questions`
- ✅ `Test on iPhone and Android devices`

**Bad Checklist Items:**
- ❌ `Update ChatWidget.tsx line 234` (too specific)
- ❌ `Make it better` (too vague)
- ❌ `Fix bugs` (not actionable)

---

## The Essential 4 Template

### For Pre-Launch / Major Features

#### Card 1: 🔴 Critical Fixes
**What:** Blocking bugs that prevent core functionality
**Why:** Must work before launch
**Examples:**
- Mobile responsiveness issues
- Critical error handling
- Core feature not working

#### Card 2: 🟠 High Priority Features
**What:** Important integrations or enhancements
**Why:** High impact on user experience
**Examples:**
- Key feature integrations (Map + AI sync)
- Major UX improvements
- Performance optimizations

#### Card 3: 🟡 Medium Priority Features
**What:** Nice-to-have features that add value
**Why:** Differentiators, not blockers
**Examples:**
- Enhanced analytics
- Additional data sources
- Secondary features

#### Card 4: 🟢 Launch Readiness
**What:** Final testing, validation, go-live prep
**Why:** Ensure quality and stability
**Examples:**
- Stress testing
- Performance monitoring
- SEO optimization
- Final QA pass

---

## Example: Pre-Launch Board

### Card 1: 🔴 Critical Chat & Mobile Fixes
**Priority:** Critical - BLOCKING LAUNCH

Fix blocking issues preventing chat from working properly on mobile and handling errors gracefully. These prevent users from having a good experience.

**Tasks:**
- [ ] Fix mobile scroll direction (messages push UP instead of DOWN)
- [ ] Add error handling for unprepared AI questions
- [ ] Fix listing swipe queue (shows wrong next/previous)
- [ ] Test on iPhone and Android devices

---

### Card 2: 🟠 Map & AI Synchronization
**Priority:** High

Make the map automatically update when users search locations in chat. Map should center on searched area while AI is generating results, creating a seamless experience.

**Tasks:**
- [ ] Create event system for AI → Map communication
- [ ] Map auto-centers when user searches city/neighborhood
- [ ] Works even when map is hidden (updates in background)
- [ ] Add geocoding for city names to coordinates
- [ ] Test with various location queries

---

### Card 3: 🟡 Neighborhoods & Auto-CMA
**Priority:** Medium

Expand neighborhood data and add AI-powered CMA generation. These are key differentiators that provide real value to users beyond basic listing search.

**Tasks:**
- [ ] Expand neighborhoods database with comprehensive data
- [ ] Add neighborhood query to AI chat
- [ ] Show neighborhood info in listing panels
- [ ] Allow users to favorite neighborhoods
- [ ] Implement AI auto-CMA generation from sold comps
- [ ] Add CMA display in chat with key metrics

---

### Card 4: 🟢 Launch Readiness
**Priority:** Before Launch

Final testing, performance optimization, and verification that all core features work correctly under load before going live.

**Tasks:**
- [ ] AI stress test (50+ consecutive messages)
- [ ] Test concurrent users (10+ simultaneous)
- [ ] Mobile responsiveness audit (all pages)
- [ ] Performance monitoring setup
- [ ] Error tracking (Sentry or similar)
- [ ] SEO optimization (meta tags, sitemap)
- [ ] Final QA pass on all core features

---

## When to Create More Cards

### Acceptable Reasons:
1. **New major initiative** starts (create new set of 4)
2. **Different workstreams** that don't overlap (e.g., Frontend vs Backend vs Infrastructure)
3. **Post-launch features** that are completely separate from current work

### NOT Acceptable:
- ❌ Breaking down existing cards into more cards (defeats the purpose)
- ❌ Creating individual cards for each bug
- ❌ Creating cards for every feature request
- ❌ Micromanaging with granular task cards

---

## Labels & Organization

### Recommended Labels

**Priority:**
- 🔴 Critical
- 🟠 High
- 🟡 Medium
- 🟢 Launch Prep

**Type:**
- 🐛 Bug
- 🚀 Feature
- 🧪 Testing
- 📊 Analytics
- 🏘️ Neighborhoods
- 💰 CMA
- 🤖 AI
- 🗺️ Map

**Status:**
- ⏸️ Blocked
- 🏃 In Progress
- 👀 In Review
- ✅ Done

### List Organization

**Recommended Lists:**
1. **To Do** - Cards not started
2. **In Progress** - Actively being worked on (1-2 cards max)
3. **Testing/Review** - Done but needs validation
4. **Done** - Completed and deployed

---

## Anti-Patterns to Avoid

### ❌ The Task Explosion
**Problem:** Creating 20+ individual cards for every small task
**Solution:** Consolidate related tasks into one card with checklist

**Example:**
- ❌ 18 separate cards for each feature
- ✅ 4 consolidated cards grouping related features

---

### ❌ The Vague Card
**Problem:** Card title doesn't explain what needs to be done
**Solution:** Use action-oriented, specific titles

**Example:**
- ❌ `Improvements`
- ❌ `Tech Debt`
- ✅ `🔴 Critical Chat & Mobile Fixes`

---

### ❌ The Novel Description
**Problem:** 500+ word descriptions with technical implementation details
**Solution:** Short description (2-3 sentences) + checklist for tasks

**Example:**
- ❌ Full implementation spec in description
- ✅ Brief goal + checklist of actionable items

---

### ❌ The Eternal Card
**Problem:** Card sits in "In Progress" for weeks with no movement
**Solution:** Break into smaller achievable chunks or reprioritize

**Example:**
- ❌ Card with 30 unchecked items, been "in progress" for 2 months
- ✅ Card with 4-7 items, can be completed in 1-2 weeks

---

## Card Lifecycle

### 1. Creation
- Maximum 4 cards per initiative
- Clear priority emoji and title
- Brief description (2-3 sentences)
- Actionable checklist (4-10 items)

### 2. In Progress
- Move to "In Progress" list
- Check off items as completed
- Update description if scope changes
- Add comments for important updates

### 3. Review
- All checklist items completed
- Move to "Testing/Review"
- Assign reviewer
- Address feedback

### 4. Done
- All items verified working
- Move to "Done" list
- Archive after 2 weeks

---

## Automation Script Template

Use this script template to create cards programmatically:

```bash
#!/bin/bash
source .env.local

BOARD_ID="wfo1DQly"
LIST_ID="<your-list-id>"

create_card_with_checklist() {
  local name="$1"
  local desc="$2"
  local priority="$3"
  shift 3
  local checklist_items=("$@")

  # Create card
  CARD_RESPONSE=$(curl -s -X POST "https://api.trello.com/1/cards" \
    -d "key=${TRELLO_API_KEY}" \
    -d "token=${TRELLO_TOKEN}" \
    -d "idList=${LIST_ID}" \
    -d "name=${name}" \
    -d "desc=**Priority:** ${priority}

${desc}")

  CARD_ID=$(echo "$CARD_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

  # Create checklist
  CHECKLIST_RESPONSE=$(curl -s -X POST "https://api.trello.com/1/checklists" \
    -d "key=${TRELLO_API_KEY}" \
    -d "token=${TRELLO_TOKEN}" \
    -d "idCard=${CARD_ID}" \
    -d "name=Tasks")

  CHECKLIST_ID=$(echo "$CHECKLIST_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

  # Add checklist items
  for item in "${checklist_items[@]}"; do
    curl -s -X POST "https://api.trello.com/1/checklists/${CHECKLIST_ID}/checkItems" \
      -d "key=${TRELLO_API_KEY}" \
      -d "token=${TRELLO_TOKEN}" \
      -d "name=${item}" > /dev/null
  done

  echo "✅ Created: $name"
}

# Example usage
create_card_with_checklist \
  "🔴 Critical Bug Fixes" \
  "Fix blocking issues that prevent users from completing core workflows." \
  "Critical - BLOCKING LAUNCH" \
  "Fix mobile scroll issue" \
  "Add error handling" \
  "Test on multiple devices"
```

---

## Review Checklist

Before creating cards, ask yourself:

- [ ] Can I consolidate this into existing cards?
- [ ] Does this card represent a meaningful chunk of work?
- [ ] Is the priority clear and accurate?
- [ ] Are there 4 or fewer cards for this initiative?
- [ ] Is the description brief (2-3 sentences)?
- [ ] Are checklist items actionable and specific?
- [ ] Can someone else understand what needs to be done?

---

## Benefits of This Approach

### For Developers
- ✅ Clear priorities
- ✅ Manageable task lists
- ✅ Less context switching
- ✅ Focus on completion, not creation

### For Project Managers
- ✅ Easy progress tracking
- ✅ Realistic estimates
- ✅ Less micromanagement
- ✅ Clear communication

### For Stakeholders
- ✅ Visibility into what's happening
- ✅ Understanding of priorities
- ✅ Confidence in progress
- ✅ Realistic expectations

---

## Summary

**The Golden Rule:** If you're creating more than 4 cards, you're probably being too granular.

**The Essential 4:**
1. 🔴 Critical (blocking)
2. 🟠 High Priority (important)
3. 🟡 Medium Priority (nice-to-have)
4. 🟢 Launch/Testing (validation)

**Remember:**
- Cards group related work
- Checklists track individual tasks
- Descriptions stay brief
- Priorities stay clear

---

**Questions?** Review this document before creating new cards. When in doubt, consolidate.
