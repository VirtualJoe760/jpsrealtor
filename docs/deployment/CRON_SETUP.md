# VPS Cron Job Setup - Quick Reference

**For**: Daily MLS listing updates (all 8 MLSs)
**When**: Daily at 6:00 AM
**Duration**: ~2-3 hours

---

## 🚀 Quick Setup (Copy & Paste)

```bash
# 1. Find your project path
pwd

# 2. Edit crontab
crontab -e

# 3. Add this line (replace /path/to/jpsrealtor with your actual path)
0 6 * * * cd /path/to/jpsrealtor && /usr/bin/python3 src/scripts/mls/backend/unified/main.py >> /var/log/mls-update.log 2>&1

# 4. Save and exit
# - Vim: Esc, :wq, Enter
# - Nano: Ctrl+X, Y, Enter

# 5. Verify
crontab -l
```

**Done!** ✅

---

## What It Does

1. Fetches listings modified in last 24 hours (from all 8 MLSs)
2. Updates `unified_listings` MongoDB collection
3. Moves sold listings to `closed_listings` collection
4. Updates statuses (Active → Pending → Closed)
5. Saves logs to `/var/log/mls-update.log`

---

## Test Manually First

```bash
# Navigate to project
cd /path/to/jpsrealtor

# Test run (no database writes)
python3 src/scripts/mls/backend/unified/main.py --dry-run

# Test with one MLS
python3 src/scripts/mls/backend/unified/main.py --mls GPS

# Full production test
python3 src/scripts/mls/backend/unified/main.py
```

---

## Monitor Logs

```bash
# Real-time
tail -f /var/log/mls-update.log

# Last 100 lines
tail -n 100 /var/log/mls-update.log

# Check for errors
grep -i error /var/log/mls-update.log
```

---

## Full Documentation

See: `src/scripts/mls/backend/unified/README.md`

---

**Created**: December 7, 2025
**Status**: Ready for VPS deployment
