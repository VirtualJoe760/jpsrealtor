# Real Estate Analytics Implementation - Task List

**Project**: Complete Analytics System with Unified Closed Listings
**Timeline**: 6-8 Weeks
**Status**: Planning Phase

---

## Overview

This task list covers two major initiatives:
1. **Closed Listings System**: Unified structure with sales history tracking
2. **Analytics System**: Appreciation, cash flow, ROI calculations

---

## Phase 1: Data Foundation (Week 1-2)

### Closed Listings Data Models

- [ ] **Task 1.1**: Audit existing closed listings collections
  - [ ] Count records in `gps-closed-listings`
  - [ ] Count records in `crmls-closed-listings`
  - [ ] Analyze schema differences
  - [ ] Identify missing fields
  - [ ] Check data quality (null values, outliers)
  - **Deliverable**: Audit report with findings
  - **Estimate**: 4 hours

- [ ] **Task 1.2**: Create `UnifiedClosedListing` model
  - [ ] Define TypeScript interface
  - [ ] Create Mongoose schema
  - [ ] Add indexes (address, closeDate, city, subdivision)
  - [ ] Add geospatial index for location
  - [ ] Test model creation
  - **Files**: `src/models/unified-closed-listing.ts`
  - **Estimate**: 6 hours

- [ ] **Task 1.3**: Create `PropertySalesHistory` model
  - [ ] Define TypeScript interface for sales array
  - [ ] Create Mongoose schema with subdocuments
  - [ ] Add indexes (address, city, postalCode)
  - [ ] Add methods for calculating metrics
  - [ ] Test model creation
  - **Files**: `src/models/property-sales-history.ts`
  - **Estimate**: 6 hours

- [ ] **Task 1.4**: Create `AddressCanonical` model
  - [ ] Define address normalization schema
  - [ ] Create mapping structure
  - [ ] Add indexes
  - [ ] Test address matching logic
  - **Files**: `src/models/address-canonical.ts`
  - **Estimate**: 4 hours

- [ ] **Task 1.5**: Build address normalization utility
  - [ ] Write normalization function (remove punctuation, standardize)
  - [ ] Handle street abbreviations (St, Street, Ave, Avenue)
  - [ ] Parse components (number, street, city, zip)
  - [ ] Create address matching logic
  - [ ] Write unit tests
  - **Files**: `src/lib/utils/address-normalization.ts`
  - **Estimate**: 8 hours

**Phase 1 Total**: ~28 hours

---

## Phase 2: Data Migration (Week 2-3)

### Migrate Existing Closed Listings

- [ ] **Task 2.1**: Write migration script for GPS closed listings
  - [ ] Read all records from `gps-closed-listings`
  - [ ] Transform to `UnifiedClosedListing` schema
  - [ ] Add mlsSource = 'GPS'
  - [ ] Normalize addresses
  - [ ] Save to new collection
  - [ ] Log progress and errors
  - **Files**: `src/scripts/migration/migrate-gps-closed.ts`
  - **Estimate**: 6 hours

- [ ] **Task 2.2**: Write migration script for CRMLS closed listings
  - [ ] Read all records from `crmls-closed-listings`
  - [ ] Transform to `UnifiedClosedListing` schema
  - [ ] Add mlsSource = 'CRMLS'
  - [ ] Normalize addresses
  - [ ] Save to new collection
  - [ ] Log progress and errors
  - **Files**: `src/scripts/migration/migrate-crmls-closed.ts`
  - **Estimate**: 6 hours

- [ ] **Task 2.3**: Detect and handle duplicates
  - [ ] Query for potential duplicates (same address + price + date)
  - [ ] Compare records to find true duplicates
  - [ ] Mark duplicates with isDuplicate flag
  - [ ] Keep best quality record as primary
  - [ ] Log duplicate statistics
  - **Files**: `src/scripts/migration/detect-duplicates.ts`
  - **Estimate**: 8 hours

- [ ] **Task 2.4**: Group sales by property
  - [ ] Group `UnifiedClosedListing` by normalized address
  - [ ] Sort sales chronologically
  - [ ] Handle address variations
  - [ ] Validate groupings
  - **Files**: `src/scripts/migration/group-by-property.ts`
  - **Estimate**: 6 hours

- [ ] **Task 2.5**: Generate `PropertySalesHistory` documents
  - [ ] For each property group, create history document
  - [ ] Calculate appreciation between consecutive sales
  - [ ] Calculate CAGR for overall period
  - [ ] Detect flips (sales < 2 years apart)
  - [ ] Save to property-sales-history collection
  - **Files**: `src/scripts/migration/generate-sales-history.ts`
  - **Estimate**: 8 hours

- [ ] **Task 2.6**: Validate migrated data
  - [ ] Count total migrated records
  - [ ] Verify no data loss
  - [ ] Check calculation accuracy
  - [ ] Validate address normalization
  - [ ] Generate validation report
  - **Files**: `src/scripts/migration/validate-migration.ts`
  - **Estimate**: 4 hours

- [ ] **Task 2.7**: Run migration on test database
  - [ ] Set up test MongoDB instance
  - [ ] Copy sample data
  - [ ] Run all migration scripts
  - [ ] Review results
  - [ ] Fix any issues
  - **Estimate**: 4 hours

**Phase 2 Total**: ~42 hours

---

## Phase 3: Sync Script Updates (Week 3-4)

### Real-time Status Tracking

- [ ] **Task 3.1**: Add status change detection
  - [ ] Fetch previous listing state before update
  - [ ] Compare standardStatus (Active → Closed)
  - [ ] Detect transition timestamps
  - [ ] Log all status changes
  - **Files**: Update MLS sync scripts
  - **Estimate**: 6 hours

- [ ] **Task 3.2**: Implement closed listing creation on status change
  - [ ] Trigger on Active → Closed/Sold
  - [ ] Create `UnifiedClosedListing` document
  - [ ] Copy all relevant fields
  - [ ] Add closePrice, closeDate, daysOnMarket
  - [ ] Add statusChangeTimestamp
  - **Files**: Add to sync scripts
  - **Estimate**: 6 hours

- [ ] **Task 3.3**: Update `PropertySalesHistory` on new sale
  - [ ] Find existing history by normalized address
  - [ ] Create new history if first sale
  - [ ] Append new sale to sales array
  - [ ] Calculate appreciation from previous sale
  - [ ] Recalculate aggregate metrics (CAGR, total appreciation)
  - [ ] Save updated history
  - **Files**: Add to sync scripts
  - **Estimate**: 8 hours

- [ ] **Task 3.4**: Handle active listing cleanup
  - [ ] Decide: Remove from UnifiedListing or update status?
  - [ ] If removing: Archive old record
  - [ ] If updating: Set status to "Closed"
  - [ ] Test both approaches
  - **Estimate**: 4 hours

- [ ] **Task 3.5**: Add duplicate detection to sync
  - [ ] Check if sale already exists (by listingKey + closeDate)
  - [ ] Prevent duplicate closed listing creation
  - [ ] Update existing record if found
  - [ ] Log duplicate attempts
  - **Estimate**: 4 hours

- [ ] **Task 3.6**: Test with recent sales
  - [ ] Monitor sync script for newly closed listings
  - [ ] Verify closed listing created
  - [ ] Verify sales history updated
  - [ ] Check calculation accuracy
  - [ ] Monitor for errors
  - **Estimate**: 4 hours

**Phase 3 Total**: ~32 hours

---

## Phase 4: Analytics Calculations (Week 4-5)

### Build Calculation Modules

- [ ] **Task 4.1**: Complete appreciation module (DONE ✅)
  - [x] Basic appreciation rate calculation
  - [x] CAGR calculation
  - [x] Trend analysis
  - [x] Multi-location comparison
  - **Files**: `src/lib/analytics/calculations/appreciation.ts`
  - **Status**: Complete

- [ ] **Task 4.2**: Build cash flow calculation module
  - [ ] Mortgage payment calculator (PITI)
  - [ ] Operating expenses calculator
  - [ ] Net cash flow calculation
  - [ ] Cash-on-cash return
  - [ ] Write unit tests
  - **Files**: `src/lib/analytics/calculations/cashflow.ts`
  - **Estimate**: 10 hours

- [ ] **Task 4.3**: Build ROI calculation module
  - [ ] Cap rate calculator
  - [ ] Total ROI (cash flow + appreciation + principal)
  - [ ] Break-even analysis
  - [ ] Write unit tests
  - **Files**: `src/lib/analytics/calculations/roi.ts`
  - **Estimate**: 8 hours

- [ ] **Task 4.4**: Build rental yield module
  - [ ] Gross rental yield
  - [ ] Net rental yield
  - [ ] Comparison to market averages
  - [ ] Write unit tests
  - **Files**: `src/lib/analytics/calculations/rental-yield.ts`
  - **Estimate**: 6 hours

- [ ] **Task 4.5**: Build CMA calculation module
  - [ ] Comparable property finder
  - [ ] Adjustment calculator (sqft, beds, baths, features)
  - [ ] Weighted average valuation
  - [ ] Confidence scoring
  - [ ] Write unit tests
  - **Files**: `src/lib/analytics/calculations/cma.ts`
  - **Estimate**: 12 hours

- [ ] **Task 4.6**: Build aggregation utilities
  - [ ] Location-based aggregation (city, subdivision, zip)
  - [ ] Time-series aggregation
  - [ ] Statistical functions (median, std dev, quartiles)
  - **Files**: `src/lib/analytics/aggregators/`
  - **Estimate**: 8 hours

- [ ] **Task 4.7**: Build comparison utilities
  - [ ] Multi-location comparator
  - [ ] Ranking algorithm
  - [ ] Score calculation
  - **Files**: `src/lib/analytics/comparators/`
  - **Estimate**: 6 hours

**Phase 4 Total**: ~50 hours

---

## Phase 5: API Endpoints (Week 5-6)

### Build Analytics APIs

- [ ] **Task 5.1**: Create analytics API index
  - [ ] List all endpoints
  - [ ] Provide documentation
  - [ ] Include examples
  - **Files**: `src/app/api/analytics/route.ts`
  - **Estimate**: 2 hours

- [ ] **Task 5.2**: Build appreciation API endpoint
  - [ ] Accept location and period parameters
  - [ ] Query `PropertySalesHistory` collection
  - [ ] Calculate appreciation using module
  - [ ] Return formatted results
  - [ ] Add caching (10 minutes)
  - **Files**: `src/app/api/analytics/appreciation/route.ts`
  - **Estimate**: 6 hours

- [ ] **Task 5.3**: Build cash flow API endpoint
  - [ ] Accept property parameters
  - [ ] Find rental comps
  - [ ] Calculate cash flow using module
  - [ ] Return breakdown
  - [ ] Add caching
  - **Files**: `src/app/api/analytics/cashflow/route.ts`
  - **Estimate**: 8 hours

- [ ] **Task 5.4**: Build comparison API endpoint
  - [ ] Accept multiple locations
  - [ ] Accept metric selection
  - [ ] Run all requested calculations
  - [ ] Generate comparison and rankings
  - [ ] Return winner and summary
  - **Files**: `src/app/api/analytics/compare/route.ts`
  - **Estimate**: 8 hours

- [ ] **Task 5.5**: Build CMA API endpoint
  - [ ] Accept subject property details
  - [ ] Find comparable sales
  - [ ] Calculate adjustments
  - [ ] Generate valuation range
  - [ ] Return formatted CMA
  - **Files**: `src/app/api/analytics/cma/route.ts`
  - **Estimate**: 10 hours

- [ ] **Task 5.6**: Build rental yield API endpoint
  - [ ] Accept property parameters
  - [ ] Calculate yields
  - [ ] Compare to market
  - [ ] Return analysis
  - **Files**: `src/app/api/analytics/rental-yield/route.ts`
  - **Estimate**: 4 hours

- [ ] **Task 5.7**: Add error handling and validation
  - [ ] Validate all input parameters
  - [ ] Handle missing data gracefully
  - [ ] Return meaningful error messages
  - [ ] Log errors for debugging
  - **Estimate**: 4 hours

**Phase 5 Total**: ~42 hours

---

## Phase 6: Testing & Integration (Week 6-7)

### Test with Real Data

- [ ] **Task 6.1**: Test appreciation API with known subdivisions
  - [ ] Test "Indian Wells Country Club"
  - [ ] Test "Palm Desert Country Club"
  - [ ] Verify calculations match expectations
  - [ ] Check confidence scores
  - **Estimate**: 4 hours

- [ ] **Task 6.2**: Test comparison API
  - [ ] Compare Indian Wells CC vs Palm Desert CC
  - [ ] Test with 1y, 3y, 5y periods
  - [ ] Verify rankings
  - [ ] Check summary generation
  - **Estimate**: 4 hours

- [ ] **Task 6.3**: Test cash flow API
  - [ ] Test with $500k property
  - [ ] Test with different down payments
  - [ ] Verify rental comp finding
  - [ ] Check calculation accuracy
  - **Estimate**: 4 hours

- [ ] **Task 6.4**: Test CMA API
  - [ ] Test with known property
  - [ ] Verify comparable selection
  - [ ] Check adjustments
  - [ ] Validate price range
  - **Estimate**: 4 hours

- [ ] **Task 6.5**: Performance testing
  - [ ] Test API response times
  - [ ] Optimize slow queries
  - [ ] Add database indexes if needed
  - [ ] Test with large datasets
  - **Estimate**: 6 hours

- [ ] **Task 6.6**: Integration testing
  - [ ] Test all endpoints together
  - [ ] Verify data consistency
  - [ ] Check caching behavior
  - [ ] Test error scenarios
  - **Estimate**: 4 hours

**Phase 6 Total**: ~26 hours

---

## Phase 7: AI Integration (Week 7-8)

### Connect to AI Assistant

- [ ] **Task 7.1**: Define AI tool schemas
  - [ ] Create tool definition for appreciation analysis
  - [ ] Create tool for cash flow analysis
  - [ ] Create tool for neighborhood comparison
  - [ ] Create tool for CMA generation
  - **Files**: Add to AI tool definitions
  - **Estimate**: 4 hours

- [ ] **Task 7.2**: Create AI-optimized endpoints
  - [ ] Simplified response format for AI
  - [ ] Natural language result summaries
  - [ ] Context-aware responses
  - **Files**: `src/app/api/analytics/ai/`
  - **Estimate**: 6 hours

- [ ] **Task 7.3**: Test AI queries
  - [ ] Test: "Which has better appreciation?"
  - [ ] Test: "Analyze cash flow for $500k property"
  - [ ] Test: "Compare Indian Wells vs Palm Desert"
  - [ ] Test: "What's the ROI on this property?"
  - **Estimate**: 4 hours

- [ ] **Task 7.4**: Refine AI responses
  - [ ] Improve natural language generation
  - [ ] Add context and explanations
  - [ ] Format numbers appropriately
  - [ ] Add disclaimers where needed
  - **Estimate**: 4 hours

**Phase 7 Total**: ~18 hours

---

## Phase 8: Map Integration (Week 8)

### Dynamic Map Stats

- [ ] **Task 8.1**: Update map-clusters API for filtered boundaries
  - [ ] Calculate county stats from filtered listings
  - [ ] Calculate region stats from filtered listings
  - [ ] Skip pre-calculated stats when filters active
  - [ ] Add property type filter to boundary aggregation
  - **Files**: `src/app/api/map-clusters/route.ts`
  - **Estimate**: 12 hours

- [ ] **Task 8.2**: Add appreciation to map hover
  - [ ] Fetch appreciation data on hover
  - [ ] Display trend indicators
  - [ ] Show year-over-year rates
  - **Files**: Update MapView and HoverStatsOverlay
  - **Estimate**: 6 hours

- [ ] **Task 8.3**: Add comparison mode to map
  - [ ] Allow selecting multiple boundaries
  - [ ] Compare selected areas
  - [ ] Show side-by-side stats
  - **Estimate**: 8 hours

- [ ] **Task 8.4**: Performance optimization
  - [ ] Cache frequent calculations
  - [ ] Optimize database queries
  - [ ] Add loading states
  - [ ] Test responsiveness
  - **Estimate**: 6 hours

**Phase 8 Total**: ~32 hours

---

## Phase 9: Documentation & Deployment (Week 8)

### Finalize & Deploy

- [ ] **Task 9.1**: Write comprehensive API documentation
  - [ ] Document all endpoints
  - [ ] Add request/response examples
  - [ ] Include error codes
  - [ ] Add usage examples
  - **Files**: Update README files
  - **Estimate**: 6 hours

- [ ] **Task 9.2**: Create user guide
  - [ ] How to use analytics features
  - [ ] How to interpret results
  - [ ] FAQ section
  - **Estimate**: 4 hours

- [ ] **Task 9.3**: Code review and cleanup
  - [ ] Remove console.logs
  - [ ] Clean up commented code
  - [ ] Improve error messages
  - [ ] Add TypeScript documentation
  - **Estimate**: 4 hours

- [ ] **Task 9.4**: Deploy to production
  - [ ] Run migrations on production database
  - [ ] Deploy updated code
  - [ ] Monitor for errors
  - [ ] Test all endpoints in production
  - **Estimate**: 4 hours

- [ ] **Task 9.5**: Monitor and iterate
  - [ ] Track API usage
  - [ ] Monitor performance
  - [ ] Collect user feedback
  - [ ] Fix bugs
  - **Ongoing**

**Phase 9 Total**: ~18 hours

---

## Summary

### Time Estimates
| Phase | Tasks | Hours | Weeks |
|-------|-------|-------|-------|
| Phase 1: Data Foundation | 5 | 28 | 1 |
| Phase 2: Migration | 7 | 42 | 1-2 |
| Phase 3: Sync Scripts | 6 | 32 | 1 |
| Phase 4: Calculations | 7 | 50 | 1-2 |
| Phase 5: API Endpoints | 7 | 42 | 1 |
| Phase 6: Testing | 6 | 26 | 1 |
| Phase 7: AI Integration | 4 | 18 | 1 |
| Phase 8: Map Integration | 4 | 32 | 1 |
| Phase 9: Documentation | 5 | 18 | 1 |
| **Total** | **51** | **288** | **~8 weeks** |

### Priority Order

**Critical Path**:
1. Phase 1 (Data Foundation) - Required for everything
2. Phase 2 (Migration) - Need historical data
3. Phase 4 (Calculations) - Core functionality
4. Phase 5 (API Endpoints) - Make it accessible

**Can Be Parallelized**:
- Phase 3 (Sync Scripts) can run parallel to Phase 4
- Phase 7 (AI) can run parallel to Phase 8 (Map)

**Can Be Deferred**:
- Phase 8 (Map Integration) - Nice to have
- Phase 7 (AI Integration) - Can come after APIs work

---

## Decision Points

### Question 1: Migration Strategy
**Options**:
A. Migrate all historical data first, then update sync
B. Update sync first, migrate historical data later
C. Do both in parallel

**Recommendation**: A - Migrate first, ensures data quality

### Question 2: Old Collections
**Options**:
A. Keep GPS/CRMLS closed collections as archive
B. Delete after successful migration
C. Keep temporarily, delete after validation period

**Recommendation**: C - Keep for 3-6 months, then archive

### Question 3: Active Listings
**Options**:
A. Remove closed listings from UnifiedListing
B. Keep but update status to "Closed"
C. Hybrid: Update status, archive old ones

**Recommendation**: B - Update status, easier to track history

### Question 4: Duplicate Handling
**Options**:
A. Automatically merge duplicates
B. Flag for manual review
C. Keep all, mark duplicates

**Recommendation**: C - Keep all marked, safer approach

---

## Risk Mitigation

### Risk 1: Data Loss During Migration
**Mitigation**:
- Test on copy of database first
- Keep original collections
- Validate counts match
- Backup before migration

### Risk 2: Address Normalization Failures
**Mitigation**:
- Manual review of edge cases
- Fuzzy matching for variations
- Geocoding validation
- Confidence scoring

### Risk 3: Performance Issues
**Mitigation**:
- Add database indexes early
- Cache frequent queries
- Optimize aggregations
- Load test before production

### Risk 4: Calculation Errors
**Mitigation**:
- Unit test all formulas
- Validate with known data
- Compare to manual calculations
- Add confidence scores

---

## Success Metrics

- [ ] 100% of closed listings migrated
- [ ] <5% duplicate rate
- [ ] 95%+ address normalization success
- [ ] API response time <500ms
- [ ] AI can answer 90%+ of test questions
- [ ] Map stats update within 2 seconds

---

**Ready to start?** Begin with Phase 1, Task 1.1 - Audit existing closed listings.

