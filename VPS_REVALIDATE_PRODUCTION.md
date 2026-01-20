# Revalidate Production After Database Update

## Problem
The production site (jpsrealtor.com) is showing stale listing data even though the database was updated correctly. This is because Vercel has cached the old pages and API responses.

## Solution
You need to trigger revalidation on Vercel to clear the cache and fetch fresh data.

## Method 1: Trigger Vercel Redeployment (Recommended)

This will rebuild and redeploy the entire site, clearing all caches:

```bash
# Option A: Push a dummy commit to trigger deployment
cd /root/website-backup/jpsrealtor
git commit --allow-empty -m "Trigger redeployment after database sync"
git push origin main  # or whatever your main branch is

# This will automatically trigger a new Vercel deployment
# Wait 2-3 minutes for deployment to complete
```

## Method 2: Use Vercel CLI to Redeploy

If you have Vercel CLI installed:

```bash
cd /root/website-backup/jpsrealtor
vercel --prod
```

## Method 3: Manual Revalidation via Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Find your jpsrealtor project
3. Go to Deployments tab
4. Click "Redeploy" on the latest deployment
5. Select "Use existing Build Cache" = NO (important!)
6. Click "Redeploy"

## Method 4: On-Demand Revalidation API (If Configured)

If you have on-demand revalidation set up with a secret token:

```bash
# Revalidate specific listing page
curl -X POST 'https://jpsrealtor.com/api/revalidate?path=/mls-listings/53545-avenida-ramirez-la-quinta-ca-92253&secret=YOUR_REVALIDATE_SECRET'

# Revalidate listing API
curl -X POST 'https://jpsrealtor.com/api/revalidate?path=/api/mls-listings/53545-avenida-ramirez-la-quinta-ca-92253&secret=YOUR_REVALIDATE_SECRET'
```

## Verification After Revalidation

Once redeployment is complete, verify the fix:

```bash
# Check if production shows NEW listing
curl -s "https://jpsrealtor.com/api/mls-listings/53545-avenida-ramirez-la-quinta-ca-92253" | grep -o '"listingId":"[0-9]*"'

# Should show: "listingId":"219140735" (not 219131946)
```

Or visit in browser:
- https://jpsrealtor.com/mls-listings/53545-avenida-ramirez-la-quinta-ca-92253
- Should show MLS # 219140735 and 14 days on market

## Why This Happened

1. ✅ Database was updated correctly with new listing
2. ✅ Old listing was removed from database
3. ❌ Vercel's edge cache still had the old page/API responses cached
4. ❌ Next.js data cache still had old data

When you update the database, you MUST trigger a redeployment to clear Vercel's caches.

## Recommended: Automate This

Add this to your sync script to automatically trigger redeployment after database updates:

```python
# At the end of unified-fetch.py, after successful sync:
import subprocess
import os

def trigger_redeployment():
    """Trigger Vercel redeployment after database sync"""
    try:
        # Method 1: Empty commit + push
        os.chdir('/root/website-backup/jpsrealtor')
        subprocess.run(['git', 'commit', '--allow-empty', '-m', 'Auto: Trigger redeployment after DB sync'], check=True)
        subprocess.run(['git', 'push', 'origin', 'main'], check=True)
        print("✅ Triggered Vercel redeployment")
    except Exception as e:
        print(f"⚠️ Failed to trigger redeployment: {e}")
        print("   Please manually redeploy on Vercel dashboard")

# Call this after successful sync
if sync_successful:
    trigger_redeployment()
```

## Alternative: Set Shorter Cache Times

If redeployments are too slow, consider setting shorter cache times in your API routes:

```typescript
// In route.ts files, change from:
{ cache: 'no-store' }  // This still gets cached by Vercel!

// To:
{ next: { revalidate: 60 } }  // Revalidate every 60 seconds
```

But this won't help with already-cached data. You still need to redeploy now.

## Immediate Action Required

**Run this now:**
```bash
cd /root/website-backup/jpsrealtor
git commit --allow-empty -m "Redeploy: Updated listings after database sync"
git push origin main
```

Then wait 2-3 minutes and check https://jpsrealtor.com/mls-listings/53545-avenida-ramirez-la-quinta-ca-92253
