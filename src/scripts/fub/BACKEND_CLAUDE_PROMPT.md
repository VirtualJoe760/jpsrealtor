# Backend Claude — FUB Lead Sync Setup

## Task

Set up the Follow Up Boss (FUB) lead sync cron job on the VPS. This syncs Joseph's FUB leads (mostly Zillow leads) into the jpsrealtor MongoDB `contacts` collection every 15 minutes.

## Steps

### 1. Add environment variables to `.env.local`

Add these lines to `/root/jpsrealtor/.env.local`:

```
FUB_API_KEY=fka_04tcIL6fTZxM3SEhjKqOUGcyO6GLYVTXBu
FUB_BASE_URL=https://api.followupboss.com/v1
FUB_AGENT_ID=31
```

You also need `JOSEPH_MONGO_USER_ID` — this is Joseph Sardella's `_id` from the `users` collection in MongoDB. Find it by running:

```bash
cd /root/jpsrealtor
python3 -c "
from pymongo import MongoClient
from dotenv import load_dotenv
import os
load_dotenv('.env.local')
client = MongoClient(os.getenv('MONGODB_URI'))
db_name = os.getenv('MONGODB_URI').rsplit('/', 1)[-1].split('?')[0]
db = client[db_name]
user = db.users.find_one({'email': 'josephsardella@gmail.com'}, {'_id': 1})
print(f'JOSEPH_MONGO_USER_ID={user[\"_id\"]}')
"
```

Add the output to `.env.local`:
```
JOSEPH_MONGO_USER_ID=<the ObjectId string from above>
```

### 2. Install Python dependencies

```bash
.venv/bin/pip install requests python-dotenv pymongo
```

These should already be installed from the MLS pipeline, but verify.

### 3. Test the sync script

```bash
cd /root/jpsrealtor

# Dry run first — shows what would sync without writing to DB
python3 src/scripts/fub/sync-fub-leads.py --dry-run --verbose

# If that looks good, run for real
python3 src/scripts/fub/sync-fub-leads.py --verbose
```

Expected output:
```
============================================================
FUB Lead Sync — 2026-04-24 10:00:00 UTC
============================================================
No previous sync found — doing full sync
Fetching leads from Follow Up Boss...
  Fetching page 1: https://api.followupboss.com/v1/people
  Got 86 leads (total: 86)
Fetched 86 leads from FUB

Sync complete:
  New contacts:     86
  Updated contacts: 0
  Matched (no change): 0

Done. Total: 86 processed, 86 new, 0 updated
```

### 4. Install the crontab

```bash
crontab /root/jpsrealtor/crontab.vps
crontab -l  # Verify the new entry appears
```

The new entry runs every 15 minutes:
```
*/15 * * * * cd /root/jpsrealtor && .venv/bin/python3 src/scripts/fub/sync-fub-leads.py >> /var/log/fub-sync.log 2>&1
```

### 5. Verify it's working

After 15 minutes, check the log:
```bash
tail -30 /var/log/fub-sync.log
```

And verify contacts in MongoDB:
```bash
python3 -c "
from pymongo import MongoClient
from dotenv import load_dotenv
import os
load_dotenv('/root/jpsrealtor/.env.local')
client = MongoClient(os.getenv('MONGODB_URI'))
db_name = os.getenv('MONGODB_URI').rsplit('/', 1)[-1].split('?')[0]
db = client[db_name]
count = db.contacts.count_documents({'source': 'followupboss'})
print(f'FUB contacts in database: {count}')
"
```

## How It Works

- The script fetches leads assigned to Joseph (userId 31) from FUB's `GET /people` API
- On first run, it syncs ALL leads. After that, it only fetches leads modified since the last sync (incremental)
- Each FUB person is upserted into the `contacts` collection by `{userId, fubId}` — no duplicates
- Sync state (last sync timestamp) is stored in the `fub_sync_state` collection
- FUB stages are mapped to contact statuses: Lead→uncontacted, Appointment Set→contacted, Showing Homes→qualified, Under Contract→nurturing, Closed→client
- Phones are normalized to E.164 format (+1XXXXXXXXXX)
- The original FUB data is preserved in the `fubData` field for debugging

## Troubleshooting

- **Rate limited (429):** The script auto-retries. FUB allows 125 requests per 10 seconds.
- **No leads found:** Check `FUB_AGENT_ID` matches Joseph's user ID in FUB (should be 31).
- **Auth error (401):** Check `FUB_API_KEY` is correct and not expired.
- **MongoDB error:** Check `MONGODB_URI` in `.env.local` is accessible from the VPS.
- **Force full resync:** `python3 src/scripts/fub/sync-fub-leads.py --full`
