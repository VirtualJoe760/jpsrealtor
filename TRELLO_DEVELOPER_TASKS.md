# Developer Tasks - chatRealty Board

**Instructions:** Add these cards to the "Developer Tasks" list in your chatRealty Trello board

---

## 🔴 CRITICAL BUGS (Pre-Launch Blockers)

### Card 1: Chat Error Handling
**Labels:** 🔴 Critical, 🐛 Bug
**Priority:** Highest

**Description:**
Chat doesn't handle errors gracefully when AI receives questions it's not prepared to answer.

**Tasks:**
- [ ] Add try-catch blocks in `src/lib/chat/tool-executor.ts`
- [ ] Wrap streaming in error boundaries in `src/app/api/chat/stream/route.ts`
- [ ] Display user-friendly error messages in `ChatWidget.tsx`
- [ ] Log errors to monitoring system
- [ ] Test with edge case questions

**Files:**
- `src/lib/chat/tool-executor.ts`
- `src/app/api/chat/stream/route.ts`
- `src/app/components/chat/ChatWidget.tsx`

---

### Card 2: Mobile Chat Scroll Direction
**Labels:** 🔴 Critical, 🐛 Bug
**Priority:** Highest

**Description:**
AI responses push messages UP instead of DOWN on mobile, forcing user messages out of viewport.

**Tasks:**
- [ ] Fix message container flexDirection (should be `column`, not `column-reverse`)
- [ ] Implement auto-scroll to latest message
- [ ] Test on iPhone SE, Pro Max, Android devices
- [ ] Verify long responses don't break layout

**Files:**
- `src/app/components/chat/ChatWidget.tsx` (message container CSS)
- `src/app/components/chat/ChatProvider.tsx`

**Fix Pattern:**
```css
.messages-container {
  display: flex;
  flex-direction: column; /* NOT column-reverse */
  overflow-y: auto;
  scroll-behavior: smooth;
}
```

---

### Card 3: Listing Swipe Queue Refactor
**Labels:** 🔴 Critical, 🐛 Bug
**Priority:** Highest

**Description:**
Bottom panel swipe queue not functioning correctly - shows wrong next/previous listings.

**Tasks:**
- [ ] Create `ListingQueueManager` class with prefetch logic
- [ ] Implement sliding window (20 listings in memory)
- [ ] Prefetch next batch when user reaches listing #8
- [ ] Handle edge cases (first/last listing)
- [ ] Test with various query filters

**Files:**
- Create: `src/lib/utils/listing-queue-manager.ts`
- Update: `src/app/components/chat/ChatWidget.tsx`
- Update: `src/lib/chat/tool-executor.ts`

---

## 🟠 HIGH PRIORITY FEATURES

### Card 4: Map & AI Event Sync
**Labels:** 🟠 High, 🚀 Feature
**Priority:** High

**Description:**
Map should auto-update to searched area while AI is generating results, even when map is hidden.

**Tasks:**
- [ ] Create event emitter system in `src/lib/events/map-sync.ts`
- [ ] Emit location events from AI tool executor
- [ ] Listen to events in MapView component
- [ ] Implement geocoding for city → lat/lng
- [ ] Test with city, subdivision, address queries

**Technical:**
- AI emits `centerOnLocation` event when user searches location
- Map listens and centers/zooms immediately (even if hidden)
- Works while AI is still generating response

---

### Card 5: Neighborhoods Directory Expansion
**Labels:** 🟠 High, 🚀 Feature, 🏘️ Neighborhoods
**Priority:** High

**Description:**
Completely update neighborhoods directory with expanded dataset and metadata.

**Tasks:**
- [ ] Audit current neighborhoods in database
- [ ] Source comprehensive neighborhood/subdivision data
- [ ] Create migration script for new neighborhoods
- [ ] Add metadata (schools, amenities, demographics)
- [ ] Generate SEO-friendly neighborhood pages
- [ ] Add neighborhood images and boundary maps

**Data Sources:**
- MLS subdivision data
- County GIS boundaries
- Census tract data

---

### Card 6: Neighborhood Chat Integration
**Labels:** 🟠 High, 🚀 Feature, 🏘️ Neighborhoods
**Priority:** High

**Description:**
Add neighborhood query functionality to AI chat.

**Tasks:**
- [ ] Create `queryNeighborhood` AI tool
- [ ] Fetch neighborhood stats and metadata
- [ ] Display neighborhood info card in chat
- [ ] Show active listings in neighborhood
- [ ] Link to full neighborhood page
- [ ] Handle misspellings of neighborhood names

**Files:**
- `src/lib/chat/tools.ts`
- `src/lib/chat/tool-executor.ts`
- `src/lib/chat/system-prompt.ts`

---

### Card 7: Neighborhood Info Panels
**Labels:** 🟠 High, 🚀 Feature, 🏘️ Neighborhoods
**Priority:** High

**Description:**
Show neighborhood context in listing detail panels.

**Tasks:**
- [ ] Add neighborhood section to `ListingBottomPanel`
- [ ] Fetch neighborhood data based on listing subdivision
- [ ] Display key stats (median price, schools, amenities)
- [ ] Add "View Neighborhood" button
- [ ] Handle listings without subdivision data

**Files:**
- `src/app/components/mls/map/ListingBottomPanel.tsx`
- Create: `src/lib/queries/neighborhoods.ts`

---

### Card 8: Neighborhood Favorites
**Labels:** 🟠 High, 🚀 Feature, 🏘️ Neighborhoods
**Priority:** High

**Description:**
Allow users to favorite entire neighborhoods and get alerts for new listings.

**Tasks:**
- [ ] Add `favoriteNeighborhoods` array to User model
- [ ] Create "Favorite Neighborhood" button
- [ ] Display favorite neighborhoods in dashboard
- [ ] Show listing count + recent activity per neighborhood
- [ ] Send notifications for new listings in favorites
- [ ] Allow unfavoriting

**Files:**
- `src/models/User.ts`
- Create: `src/app/components/favorites/NeighborhoodFavorites.tsx`
- Create: `src/app/api/favorites/neighborhoods/route.ts`
- `src/app/dashboard/favorites/page.tsx`

---

### Card 9: AI Stress Testing
**Labels:** 🟠 High, 🧪 Testing
**Priority:** High

**Description:**
Comprehensive stress test to ensure AI functions correctly after series of messages.

**Tasks:**
- [ ] Create automated test suite with 50 consecutive messages
- [ ] Test context retention across 20+ messages
- [ ] Verify response times don't degrade
- [ ] Monitor memory usage over time
- [ ] Test concurrent users (10+ simultaneous chats)
- [ ] Document failure modes and recovery patterns

**Test Scenarios:**
- Context retention (10 follow-up questions)
- Mixed queries (listings, neighborhoods, CMAs)
- Error recovery (invalid → valid queries)
- Large result sets (100+ listings)
- Complex filters (5+ simultaneous filters)

**Files:**
- Create: `tests/stress/ai-chat-stress.test.ts`

---

## 🟡 MEDIUM PRIORITY FEATURES

### Card 10: Drag to Select Properties
**Labels:** 🟡 Medium, 🚀 Feature
**Priority:** Medium

**Description:**
Implement drag-to-select on map for multi-property selection.

**Tasks:**
- [ ] Integrate Mapbox Draw plugin
- [ ] Implement rectangle selection mode
- [ ] Detect listings within selection bounds
- [ ] Highlight selected properties
- [ ] Add "Add Selected to Favorites" button
- [ ] Add "Compare Selected" button
- [ ] Support mobile (long-press + drag)

**Files:**
- `src/app/components/mls/map/MapView.tsx`
- Create: `src/lib/utils/geospatial-selection.ts`

---

### Card 11: Update Selected Properties (Favorites)
**Labels:** 🟡 Medium, 🚀 Feature
**Priority:** Medium

**Description:**
Improve multi-select UI in favorites panel with bulk actions.

**Tasks:**
- [ ] Add checkbox selection mode
- [ ] Implement select all / deselect all
- [ ] Bulk delete selected
- [ ] Move selected to folders
- [ ] Export selected to PDF/CSV
- [ ] Compare properties side-by-side
- [ ] Show selection count badge

**Files:**
- `src/app/components/favorites/FavoritesList.tsx`
- `src/app/dashboard/favorites/page.tsx`
- Create: `src/app/components/favorites/BulkActions.tsx`

---

### Card 12: AI Auto-CMA
**Labels:** 🟡 Medium, 💰 CMA, 🚀 Feature
**Priority:** Medium

**Description:**
AI automatically generates Comparative Market Analysis when viewing listings.

**Tasks:**
- [ ] Create `generateCMA` AI tool
- [ ] Query `unified_closed_listings` for sold comps
- [ ] Match by location (1 mile), sqft (±20%), beds/baths
- [ ] Filter last 6 months of sales
- [ ] Calculate price per sqft analysis
- [ ] Display CMA card in chat
- [ ] Link to full CMA report page
- [ ] Save CMA to dashboard

**Comp Criteria:**
- Within 1 mile radius
- Living area ±20%
- Same beds/baths
- Same property type
- Sold in last 6 months
- Sort by recency

**Files:**
- Create: `src/lib/analytics/cma-generator.ts`
- Update: `src/lib/chat/tools.ts`
- Create: `src/app/components/chat/CMACard.tsx`
- Create: `src/app/cma/[id]/page.tsx`

---

### Card 13: User-Selected CMA
**Labels:** 🟡 Medium, 💰 CMA, 🚀 Feature
**Priority:** Medium

**Description:**
Allow users to manually select comps and customize CMA reports.

**Tasks:**
- [ ] Add "Add to CMA" button on closed listings
- [ ] Create CMA builder interface
- [ ] Drag and drop comps to reorder
- [ ] Remove/replace comps
- [ ] Adjust weights for each comp
- [ ] Generate PDF report
- [ ] Save custom CMA to dashboard
- [ ] Share CMA via shareable link

**User Flow:**
1. Click "Create CMA" from listing
2. AI suggests comps (FEATURE-008)
3. User adds/removes/reorders comps
4. User adjusts parameters
5. Generate final report

**Files:**
- Create: `src/app/cma/builder/page.tsx`
- Create: `src/app/components/cma/CMABuilder.tsx`
- Create: `src/app/api/cma/generate-pdf/route.ts`

---

## 🟢 POST-LAUNCH (CRM Phase 2)

### Card 14: Voicemail Drops Integration
**Labels:** 🟢 Post-Launch, 📞 CRM
**Priority:** Low

**Description:**
Implement automated voicemail drop system for lead follow-up.

**Tasks:**
- [ ] Research Slybroadcast or similar service
- [ ] Set up API integration
- [ ] Create voicemail templates
- [ ] Trigger from CRM workflows
- [ ] Track delivery and responses
- [ ] Activity logging

---

### Card 15: Twilio SMS Integration
**Labels:** 🟢 Post-Launch, 📞 CRM
**Priority:** Low

**Description:**
Two-way SMS messaging with leads via Twilio.

**Tasks:**
- [ ] Set up Twilio account and phone number
- [ ] Create send/receive API endpoints
- [ ] Build SMS conversation UI in dashboard
- [ ] Create SMS templates
- [ ] Implement conversation threading
- [ ] Add auto-response rules

**Files:**
- Create: `src/app/api/sms/send/route.ts`
- Create: `src/app/api/sms/webhook/route.ts`
- Create: `src/app/dashboard/messages/page.tsx`

---

### Card 16: AI Twilio Webhook
**Labels:** 🟢 Post-Launch, 📞 CRM, 🤖 AI
**Priority:** Low

**Description:**
AI-powered SMS auto-responses via Twilio webhook.

**Tasks:**
- [ ] Create Twilio webhook endpoint
- [ ] Integrate AI with conversation context
- [ ] Generate contextual responses
- [ ] Add optional human review queue
- [ ] Implement auto-respond for common questions
- [ ] Track AI response accuracy

**Flow:**
1. SMS arrives → Twilio webhook
2. Webhook triggers AI with context
3. AI generates response
4. (Optional) Human approval
5. Send via Twilio

---

### Card 17: AI-Generated Results Pages
**Labels:** 🟢 Post-Launch, 📞 CRM, 🤖 AI
**Priority:** Low

**Description:**
Dynamically generate custom listing results pages for leads.

**Tasks:**
- [ ] Create dynamic results page generator
- [ ] AI creates personalized collections
- [ ] Generate shareable URLs
- [ ] Track page views and engagement
- [ ] Add lead capture forms
- [ ] Email notification when lead views page

**Use Case:**
Agent: "Send me a results page for 3-bed homes under $600k in Palm Desert"
System: Creates `/results/palm-desert-3bed-600k`

---

### Card 18: ✅ Prospect Discovery System (COMPLETED)
**Labels:** 🟢 Post-Launch, 📞 CRM, ✅ Complete
**Priority:** Low
**Status:** ✅ **COMPLETED** (January 8, 2026)

**Description:**
Complete intelligent contact management system with CSV analysis, Tinder-style swipe interface, label organization, and campaign integration.

**Tasks:**
- [x] Build swipe card interface (ContactBottomPanel.tsx)
- [x] Swipe right: Add to label
- [x] Swipe left: Skip contact
- [x] Undo functionality
- [x] CSV analysis and quality scoring (0-100)
- [x] Data cleaning utilities (name, phone, email)
- [x] Label management system (18-color palette)
- [x] Campaign creation from labels
- [x] Analytics dashboard

**Completed Features:**
- **Phase 1: Foundation** - Enhanced Contact/Label/ImportBatch models, cleaning utilities, analysis service, APIs
- **Phase 2: Swipe Interface** - ContactBottomPanel with touch/mouse gestures, ImportAnalysisDashboard, ContactCard
- **Phase 3: Intelligence** - Issue detection, quality scoring, batch processing, label system
- **Phase 4: Campaign Integration** - Create campaigns from labels, LabelSelector, analytics dashboard

**Files Created (24 files, ~4,100 lines):**
- ✅ `src/models/contact.ts` (ENHANCED)
- ✅ `src/models/Label.ts` (NEW)
- ✅ `src/models/ImportBatch.ts` (ENHANCED)
- ✅ `src/lib/utils/contact-cleaning.utils.ts` (NEW - 500+ lines)
- ✅ `src/lib/services/contact-analysis.service.ts` (NEW - 300+ lines)
- ✅ `src/app/api/crm/contacts/analyze/route.ts` (NEW)
- ✅ `src/app/api/crm/labels/route.ts` (NEW)
- ✅ `src/app/api/crm/labels/[id]/route.ts` (NEW)
- ✅ `src/app/api/crm/labels/[id]/create-campaign/route.ts` (NEW)
- ✅ `src/app/components/crm/ImportAnalysisDashboard.tsx` (NEW - 300+ lines)
- ✅ `src/app/components/crm/ImportConfigPanel.tsx` (NEW - 400+ lines)
- ✅ `src/app/components/crm/ContactCard.tsx` (NEW - 200+ lines)
- ✅ `src/app/components/crm/ContactBottomPanel.tsx` (NEW - 350+ lines)
- ✅ `src/app/components/crm/LabelManagement.tsx` (NEW - 300+ lines)
- ✅ `src/app/components/crm/LabelCampaignCard.tsx` (NEW - 200+ lines)
- ✅ `src/app/components/crm/LabelCampaignGrid.tsx` (NEW - 250+ lines)
- ✅ `src/app/components/crm/LabelSelector.tsx` (NEW - 200+ lines)
- ✅ `src/app/components/crm/LabelAnalyticsDashboard.tsx` (NEW - 250+ lines)
- ✅ `scripts/analyze-messy-contacts.ts` (ENHANCED)
- ✅ `scripts/seed-default-labels.ts` (NEW)

**Documentation:**
- ✅ `docs/campaigns/PROSPECT_DISCOVERY.md` (Original spec)
- ✅ `docs/campaigns/PROSPECT_DISCOVERY_README.md` (Quick start)
- ✅ `docs/campaigns/PROSPECT_DISCOVERY_IMPLEMENTATION_GUIDE.md` (Technical guide)
- ✅ `docs/campaigns/PROSPECT_DISCOVERY_COMPLETE.md` (Completion summary)

**Testing:**
```bash
# Analyze CSV
npx tsx scripts/analyze-messy-contacts.ts path/to/contacts.csv

# Seed default labels
npx tsx scripts/seed-default-labels.ts <userId>
```

**TypeScript Status:** ✅ Zero errors in all Prospect Discovery files

---

## 📊 PRIORITY ORDER FOR DEVELOPMENT

### Week 1 (Critical Bugs):
1. Chat Error Handling (Card 1)
2. Mobile Scroll Direction (Card 2)
3. Swipe Queue Refactor (Card 3)

### Week 2-3 (Core Features):
4. Map & AI Sync (Card 4)
5. Neighborhoods Expansion (Card 5)
6. Neighborhood Chat (Card 6)
7. Neighborhood Panels (Card 7)
8. Neighborhood Favorites (Card 8)

### Week 4 (Testing):
9. AI Stress Testing (Card 9)
10. Bug fixes from testing

### Week 5 (Nice-to-Haves):
11. Drag to Select (Card 10)
12. Selected Properties (Card 11)
13. AI Auto-CMA (Card 12)
14. User-Selected CMA (Card 13)

### Post-Launch:
15. Voicemail Drops (Card 14)
16. Twilio SMS (Card 15)
17. AI Twilio Webhook (Card 16)
18. AI Results Pages (Card 17)
19. Contact Cleanup (Card 18)

---

## 🏷️ SUGGESTED TRELLO LABELS

Create these labels in your chatRealty board:

- 🔴 **Critical** (Red)
- 🟠 **High Priority** (Orange)
- 🟡 **Medium Priority** (Yellow)
- 🟢 **Post-Launch** (Green)
- 🐛 **Bug** (Pink)
- 🚀 **Feature** (Blue)
- 🧪 **Testing** (Purple)
- 📞 **CRM** (Sky Blue)
- 💰 **CMA** (Lime)
- 🏘️ **Neighborhoods** (Light Green)
- 🤖 **AI** (Black)

---

## 📝 HOW TO ADD TO TRELLO

1. Open your **chatRealty** board
2. Navigate to **Developer Tasks** list
3. Copy each card section above
4. Click "Add a card" in Trello
5. Paste title as card name
6. Click the card to open details
7. Paste the full description and tasks
8. Add appropriate labels
9. Assign team members
10. Set due dates based on priority order

---

**Total Cards:** 18
**Completed:** 1 ✅
**Critical Bugs:** 3
**High Priority Features:** 6
**Medium Priority Features:** 4
**Post-Launch Features:** 5 (1 completed)

**Estimated Timeline:** 5-6 weeks to launch (excluding post-launch features)

---

## ✅ COMPLETED FEATURES

### Prospect Discovery System (Card 18)
**Completion Date:** January 8, 2026
**Total Implementation:** 24 files, ~4,100 lines of code
**Status:** Production-ready

Full intelligent contact management system including CSV analysis, data quality scoring, Tinder-style swipe interface, label organization, campaign integration, and analytics dashboard. All TypeScript compilation clean with zero errors.
