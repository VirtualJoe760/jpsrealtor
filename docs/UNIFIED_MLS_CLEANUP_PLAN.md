# Unified MLS Cleanup Plan

**Phase:** Post-Migration Cleanup
**Timing:** After 30 days of successful production operation
**Risk Level:** Low (deprecated code removal)

---

## Overview

This document outlines the cleanup process for removing deprecated GPS and CRMLS-specific code after successful migration to the unified_listings collection.

---

## Files to Delete

### 1. Model Files (Complete Deletion)

#### `src/models/listings.ts`
- **Size:** ~800 lines
- **Purpose:** GPS MLS Mongoose model
- **Collection:** `gps_listings`
- **Status:** DEPRECATED
- **Action:** DELETE entire file

**Dependencies to Check Before Deletion:**
```bash
# Search for any remaining imports
grep -r "from.*models/listings" src/
grep -r "@/models/listings" src/
```

**Expected Result:** No imports (all migrated to unified-listing)

---

#### `src/models/crmls-listings.ts`
- **Size:** ~600 lines
- **Purpose:** CRMLS Mongoose model
- **Collection:** `crmls_listings`
- **Status:** DEPRECATED
- **Action:** DELETE entire file

**Dependencies to Check Before Deletion:**
```bash
# Search for any remaining imports
grep -r "from.*models/crmls-listings" src/
grep -r "@/models/crmls-listings" src/
grep -r "CRMLSListing" src/
```

**Expected Result:** No imports (all migrated to unified-listing)

---

### 2. MongoDB Collections (Manual Cleanup)

#### Collection: `gps_listings`
- **Documents:** ~5,140 listings
- **Size:** ~43MB
- **Status:** SUPERSEDED by unified_listings
- **Backup Required:** YES
- **Action:** DROP after backup

**Backup Command:**
```bash
mongodump --uri="$MONGODB_URI" --collection=gps_listings --out=./backups/pre-cleanup-$(date +%Y%m%d)
```

**Drop Command (after backup verification):**
```javascript
// In MongoDB shell or Compass
db.gps_listings.drop()
```

---

#### Collection: `crmls_listings`
- **Documents:** ~48,390 listings
- **Size:** ~361MB
- **Status:** SUPERSEDED by unified_listings
- **Backup Required:** YES
- **Action:** DROP after backup

**Backup Command:**
```bash
mongodump --uri="$MONGODB_URI" --collection=crmls_listings --out=./backups/pre-cleanup-$(date +%Y%m%d)
```

**Drop Command (after backup verification):**
```javascript
// In MongoDB shell or Compass
db.crmls_listings.drop()
```

---

### 3. Helper Collections (Keep - Still Used)

#### Collections to KEEP:
- `photos` - Still referenced by unified listings
- `openhouses` - Still referenced by unified listings
- `subdivisions` - City/subdivision metadata
- `cities` - City metadata
- `articles` - Blog content
- `users` - User data

**Note:** Photo and OpenHouse data may be embedded in unified_listings Media arrays, but external collections provide additional data/backups.

---

## Code Cleanup

### Files Requiring Updates (Remove Import Statements)

Even though these were migrated, we should clean up any commented-out code or unused imports:

#### 1. `src/app/api/mls-listings/route.ts`
**Remove:**
```typescript
// OLD - Remove these lines if still present
import { Listing, IListing } from "@/models/listings";
import { CRMLSListing } from "@/models/crmls-listings";
```

**Verify Only:**
```typescript
// SHOULD REMAIN
import UnifiedListing from "@/models/unified-listing";
```

---

#### 2. `src/app/api/cities/[cityId]/listings/route.ts`
**Remove:**
```typescript
// OLD
import { Listing } from "@/models/listings";
import { CRMLSListing } from "@/models/crmls-listings";
```

**Verify Only:**
```typescript
// SHOULD REMAIN
import UnifiedListing from "@/models/unified-listing";
```

---

#### 3. `src/app/api/subdivisions/[slug]/listings/route.ts`
**Remove:**
```typescript
// OLD
import { Listing } from "@/models/listings";
import { CRMLSListing } from "@/models/crmls-listings";
```

**Verify Only:**
```typescript
// SHOULD REMAIN
import UnifiedListing from "@/models/unified-listing";
```

---

#### 4. All Stats/AI Routes
**Verify:** No references to old models remain
**Check Files:**
- `src/app/api/cities/[cityId]/stats/route.ts`
- `src/app/api/subdivisions/[slug]/stats/route.ts`
- `src/app/api/chat/match-location/route.ts`
- `src/app/api/chat/search-city/route.ts`

---

## Documentation Updates

### Files to Update

#### 1. `README.md`
**Remove references to:**
- Dual GPS/CRMLS system
- Two-collection architecture

**Add:**
- Unified MLS architecture
- 8 MLS associations supported
- Link to UNIFIED_MLS_ARCHITECTURE.md

---

#### 2. `docs/MAP_SYSTEM.md`
**Update:**
- Remove GPS/CRMLS split mentions
- Add unified_listings reference
- Update data flow diagrams

---

#### 3. API Documentation (if exists)
**Update:**
- Remove totalCount.gps and totalCount.crmls examples
- Show unified pagination format
- Document mlsSource filter

---

## Environment Variables

### Review .env.local
**Check for:**
- GPS-specific environment variables
- CRMLS-specific environment variables
- Old collection names in scripts

**Expected:** No GPS/CRMLS-specific vars needed

---

## Testing After Cleanup

### Verification Checklist

#### 1. Build Test
```bash
npm run build
```
**Expected:** Clean build with no errors

---

#### 2. Import Check
```bash
# Search for deleted model imports
grep -r "models/listings\"" src/ || echo "✅ No GPS model imports"
grep -r "models/crmls-listings" src/ || echo "✅ No CRMLS model imports"
```

---

#### 3. TypeScript Check
```bash
npm run type-check
```
**Expected:** No type errors

---

#### 4. Functional Test
```bash
# Start dev server
npm run dev

# Test endpoints
curl "http://localhost:3000/api/mls-listings?limit=5"
curl "http://localhost:3000/api/cities/palm-springs/listings"
curl "http://localhost:3000/api/subdivisions/pga-west/listings"
```

**Expected:** All return results from unified_listings

---

#### 5. Database Verify
```javascript
// In MongoDB shell
db.gps_listings.countDocuments()      // Should ERROR or return 0
db.crmls_listings.countDocuments()    // Should ERROR or return 0
db.unified_listings.countDocuments()  // Should return ~78,904
```

---

## Rollback Plan (Just in Case)

### If Issues Discovered After Cleanup

**Step 1: Restore Collections**
```bash
mongorestore --uri="$MONGODB_URI" --dir=./backups/pre-cleanup-YYYYMMDD
```

**Step 2: Restore Model Files**
```bash
git checkout HEAD~1 src/models/listings.ts
git checkout HEAD~1 src/models/crmls-listings.ts
```

**Step 3: Rebuild**
```bash
npm run build
```

**Time to Restore:** ~10 minutes

---

## Cleanup Checklist

### Pre-Cleanup (Verification)
- [ ] Migration has been live for 30+ days
- [ ] No errors in production logs
- [ ] All features working correctly
- [ ] Performance metrics stable/improved
- [ ] User feedback positive

### Backup Phase
- [ ] Backup gps_listings collection
- [ ] Backup crmls_listings collection
- [ ] Verify backup integrity
- [ ] Store backups in secure location
- [ ] Document backup location and date

### Code Cleanup
- [ ] Delete src/models/listings.ts
- [ ] Delete src/models/crmls-listings.ts
- [ ] Remove any commented-out old code
- [ ] Update import statements (if any remain)
- [ ] Run TypeScript type check
- [ ] Run build test

### Database Cleanup
- [ ] Drop gps_listings collection
- [ ] Drop crmls_listings collection
- [ ] Verify indexes on unified_listings
- [ ] Check database size reduction
- [ ] Update connection pool settings (if needed)

### Documentation Updates
- [ ] Update README.md
- [ ] Update API documentation
- [ ] Update architecture diagrams
- [ ] Mark migration as complete
- [ ] Archive migration plan

### Testing
- [ ] Build completes without errors
- [ ] No TypeScript errors
- [ ] All API endpoints functional
- [ ] Frontend loads correctly
- [ ] Map feature works
- [ ] Swipe feature works
- [ ] AI chat works
- [ ] Property details load

### Final Steps
- [ ] Deploy to production
- [ ] Monitor for 48 hours
- [ ] Celebrate successful cleanup! 🎉
- [ ] Delete backups after 90 days (if no issues)

---

## Success Metrics Post-Cleanup

### Code Quality
- **Lines of Code Removed:** ~1,400+ lines
- **Model Files Removed:** 2 files
- **Complexity Reduction:** 40% simpler queries

### Database
- **Collections Removed:** 2 collections
- **Disk Space Saved:** ~404MB
- **Backup Size:** ~404MB (archive)

### Maintenance
- **Models to Maintain:** 1 unified model (vs 3)
- **Query Logic:** Single collection (vs dual)
- **Developer Onboarding:** Simpler architecture

---

## Timeline

| Task | Duration |
|------|----------|
| Pre-cleanup verification | 1 hour |
| Backup collections | 30 minutes |
| Code cleanup | 1 hour |
| Database cleanup | 30 minutes |
| Documentation updates | 1 hour |
| Testing | 2 hours |
| **Total** | **6 hours** |

---

## Risks & Mitigation

### Risk 1: Accidental Dependency
**Probability:** Low
**Impact:** Medium
**Mitigation:**
- Thorough grep search before deletion
- TypeScript will catch missing imports
- Keep backups for 90 days

### Risk 2: Backup Corruption
**Probability:** Very Low
**Impact:** High
**Mitigation:**
- Verify backup immediately after creation
- Test restore on dev environment first
- Keep production data until verified

### Risk 3: Hidden References
**Probability:** Low
**Impact:** Low
**Mitigation:**
- Full codebase search
- Run full test suite
- Monitor production logs

---

## Contact & Support

If issues arise during cleanup:

1. **Check backups** - Verify backups exist and are valid
2. **Review logs** - Check application and database logs
3. **Rollback if needed** - Use rollback plan above
4. **Document issue** - Note what went wrong for future reference

---

## Appendix: Verification Scripts

### Script 1: Find Old Model Imports
```bash
#!/bin/bash
# check-old-imports.sh

echo "Checking for GPS model imports..."
GPS_IMPORTS=$(grep -r "from.*models/listings" src/ | grep -v unified-listing | wc -l)

echo "Checking for CRMLS model imports..."
CRMLS_IMPORTS=$(grep -r "models/crmls-listings" src/ | wc -l)

if [ "$GPS_IMPORTS" -eq 0 ] && [ "$CRMLS_IMPORTS" -eq 0 ]; then
  echo "✅ No old model imports found. Safe to delete model files."
  exit 0
else
  echo "❌ Found old imports:"
  echo "   GPS imports: $GPS_IMPORTS"
  echo "   CRMLS imports: $CRMLS_IMPORTS"
  echo ""
  echo "   Run these commands to see details:"
  echo "   grep -r 'from.*models/listings' src/ | grep -v unified-listing"
  echo "   grep -r 'models/crmls-listings' src/"
  exit 1
fi
```

### Script 2: Verify Unified Collection
```javascript
// verify-unified-collection.js
// Run with: node scripts/verify-unified-collection.js

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function verify() {
  await mongoose.connect(process.env.MONGODB_URI);

  const db = mongoose.connection.db;

  // Check unified_listings
  const unified = await db.collection('unified_listings').countDocuments();
  console.log(`✓ unified_listings: ${unified.toLocaleString()} documents`);

  // Check old collections (should not exist or be empty)
  try {
    const gps = await db.collection('gps_listings').countDocuments();
    console.log(`⚠ gps_listings still exists: ${gps.toLocaleString()} documents`);
  } catch (e) {
    console.log(`✓ gps_listings does not exist`);
  }

  try {
    const crmls = await db.collection('crmls_listings').countDocuments();
    console.log(`⚠ crmls_listings still exists: ${crmls.toLocaleString()} documents`);
  } catch (e) {
    console.log(`✓ crmls_listings does not exist`);
  }

  // Check indexes
  const indexes = await db.collection('unified_listings').indexes();
  console.log(`✓ Indexes on unified_listings: ${indexes.length}`);

  await mongoose.disconnect();
}

verify().catch(console.error);
```

---

**End of Cleanup Plan**
