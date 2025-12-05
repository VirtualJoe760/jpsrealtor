# Expired Listings System - Testing Guide

## Overview

This system extracts expired listings from existing Active/Closed database collections for lead generation. Since the Spark Replication API doesn't filter by status (it's for full data sync), we mine the ExpirationDate field from our current database.

## Testing Process

### Step 1: Analyze Current Data

Run the analysis script to see what expiration data exists in your database:

```bash
python src/scripts/mls/backend/expired/analyze_expirations.py
```

**What it does:**
- Connects to MongoDB
- Checks GPS Active, CRMLS Active, GPS Closed, CRMLS Closed collections
- Looks for ExpirationDate fields (both `ExpirationDate` and `expirationDate`)
- Shows status distribution
- Displays sample listings with expiration dates

**Expected Output:**
- Total listing counts per collection
- Fields found related to expiration dates
- Sample data showing what ExpirationDate values look like
- Status breakdown (Active, Closed, etc.)

### Step 2: Extract Expired Listings

After reviewing the analysis results, run the extraction script:

```bash
python src/scripts/mls/backend/expired/extract_expired_from_db.py
```

**What it does:**
- Queries for listings with ExpirationDate field
- Filters for dates in the past (but within last 90 days)
- Adds lead tracking fields:
  - `leadStatus`: "new"
  - `skipTraced`: false
  - `voicemailSent`: false
  - `emailSent`: false
  - `ownerName`, `ownerPhone`, `ownerEmail`: null
  - `notes`, `lastContactDate`: null
  - `expiresAt`: 90 days from expiration date (for MongoDB TTL)
  - `originalExpirationDate`: the original expiration date
- Inserts into separate collections:
  - `gpsExpiredListings`
  - `crmlsExpiredListings`

**Expected Output:**
- Count of listings with ExpirationDate
- Breakdown: Expired (last 90 days) vs Not expired vs Invalid dates
- Sample expired listing with details
- Confirmation of insertion into target collections

## Collections Structure

### Source Collections (Read Only)
- `listings` (GPS Active)
- `crmlsListings` (CRMLS Active)
- `gpsClosedListings` (GPS Closed)
- `crmlsClosedListings` (CRMLS Closed)

### Target Collections (Created)
- `gpsExpiredListings` - GPS expired listings with lead tracking
- `crmlsExpiredListings` - CRMLS expired listings with lead tracking

## Key Fields

### From Spark API (ExpirationDate)
- Field name: `ExpirationDate` or `expirationDate` (after flattening)
- Type: Date/String
- Access: Private role only
- Availability: Single record expansion only (can't bulk query from API)

### Added for Lead Tracking
- `leadStatus`: Current status (new, contacted, interested, not_interested)
- `skipTraced`: Has skip tracing been run?
- `voicemailSent`: Has voicemail been sent via Drop Cowboy?
- `emailSent`: Has email been sent via Resend?
- `ownerName`: Owner name from skip tracing
- `ownerPhone`: Owner phone from skip tracing
- `ownerEmail`: Owner email from skip tracing
- `notes`: CRM notes
- `lastContactDate`: Last time this lead was contacted
- `expiresAt`: TTL date (90 days from expiration) for auto-deletion
- `originalExpirationDate`: Original listing expiration date

## Business Logic

### What Qualifies as "Expired Lead"?
1. Has ExpirationDate field populated
2. ExpirationDate is in the past
3. ExpirationDate is within last 90 days (recent enough for lead gen)

### Why 90 Days?
- Fresh enough for owner to still be motivated
- Not too old where circumstances have changed
- Data automatically deleted after 90 days via MongoDB TTL index

## Next Steps After Testing

1. **Cache Photos**: Run cache_photos scripts to download photos for expired listings (for CRM reference)
2. **TTL Index**: Set up MongoDB TTL index on `expiresAt` field for auto-cleanup
3. **API Routes**: Create Next.js API routes for CRM access to expired listings
4. **CRM UI**: Build admin interface for managing expired leads
5. **Integrations**:
   - Tracerfy: Skip tracing for owner contact info
   - Drop Cowboy: Ringless voicemail campaigns
   - Resend: Email campaigns

## Troubleshooting

### No ExpirationDate Found
- This is normal if MLS doesn't populate this field
- Check other date fields shown in analysis (listingContractDate, etc.)
- May need to adjust extraction logic based on available fields

### All Dates Invalid
- Check date format in database
- Update `parse_date()` function in extract script to handle format

### No Expired Listings (Last 90 Days)
- Normal if market is hot and listings don't expire
- Try expanding window beyond 90 days for testing
- Check that ExpirationDate values are actually in the past

## Important Notes

⚠️ **Replication API Limitation**: The Spark Replication API doesn't filter by status. It returns ALL listings for full data sync. That's why we extract from existing database instead of fetching from API.

⚠️ **Private Field**: ExpirationDate is marked as "Private" and "Single Record Only" in Spark API docs. We can only access it from listings already in our database, not via bulk queries.

⚠️ **Not on Website**: These expired listings are for lead generation only. They will NOT appear on the public map or listing pages.
