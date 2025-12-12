# Analytics Test Scripts

**Purpose**: Test the appreciation analytics system with real data from MongoDB

**Last Updated**: December 9, 2025

---

## 🎯 Overview

These test scripts let you validate the analytics system by querying closed sales data directly from MongoDB and calculating appreciation metrics.

**No API server needed!** Tests run directly against the database.

---

## 📁 Available Test Scripts

### 1. **test-analytics.py** (Recommended ⭐)

**Python version** - Easiest to use, no compilation needed

```bash
python src/scripts/test/test-analytics.py --city "Palm Desert"
```

**Pros**:
- ✅ No compilation
- ✅ Fast execution
- ✅ Same language as fetch/seed scripts
- ✅ Clean output

**Requirements**:
- Python 3.8+
- `pymongo` installed
- MongoDB running

---

## 🚀 Quick Start

### Test by City

```bash
python src/scripts/test/test-analytics.py --city "Palm Desert"
```

**Output**:
```
================================================================================
ANALYTICS TEST - Appreciation Analysis
================================================================================

📍 Location: Palm Desert (City)
📅 Period: Past 5 years (since 2020-12-09)

⏳ Querying MongoDB...
✅ Found 1,247 closed sales

📊 MLS Sources: GPS, CRMLS

🧮 Calculating appreciation...

================================================================================
APPRECIATION RESULTS
================================================================================

📈 Appreciation:
   Annual Rate:     5.8%
   Cumulative:      32.4%
   Trend:           INCREASING

💰 Market Data:
   Start Price:     $485,000
   End Price:       $642,000
   Price Change:    $157,000
   Total Sales:     1,247
   Confidence:      HIGH

================================================================================

✅ Test completed successfully!
```

### Test by Subdivision

```bash
python src/scripts/test/test-analytics.py --subdivision "Indian Wells Country Club"
```

### Test by County

```bash
python src/scripts/test/test-analytics.py --county "Riverside"
```

### Different Time Periods

```bash
# 1-year appreciation
python src/scripts/test/test-analytics.py --city "Palm Desert" --period 1y

# 3-year appreciation
python src/scripts/test/test-analytics.py --city "Palm Desert" --period 3y

# 10-year appreciation
python src/scripts/test/test-analytics.py --city "Palm Desert" --period 10y
```

### Verbose Mode (Show Sample Data)

```bash
python src/scripts/test/test-analytics.py --city "Palm Desert" --verbose
```

**Additional output**:
```
📋 Sample Sale:
   Address:      123 Main St, Palm Desert, CA 92260
   Close Price:  $525,000
   Close Date:   2024-03-15T00:00:00Z
   Beds/Baths:   3/2.5
   Sqft:         2,100
   MLS Source:   GPS
```

---

## 📊 Command Reference

```bash
python src/scripts/test/test-analytics.py [options]

Options:
  --city <name>           Test by city
  --subdivision <name>    Test by subdivision
  --county <name>         Test by county
  --period <period>       Time period: 1y, 3y, 5y, 10y (default: 5y)
  --verbose, -v           Show detailed output including sample data
  --help, -h              Show help message
```

---

## 🧪 Test Scenarios

### Scenario 1: Validate Data Quality

```bash
# Test multiple cities to verify data coverage
python src/scripts/test/test-analytics.py --city "Palm Desert" --verbose
python src/scripts/test/test-analytics.py --city "Indian Wells" --verbose
python src/scripts/test/test-analytics.py --city "La Quinta" --verbose
python src/scripts/test/test-analytics.py --city "Rancho Mirage" --verbose
```

**What to check**:
- ✅ Sales count > 0
- ✅ MLS sources present
- ✅ Prices look reasonable
- ✅ Confidence score appropriate

### Scenario 2: Compare Time Periods

```bash
# Compare appreciation over different periods
python src/scripts/test/test-analytics.py --city "Palm Desert" --period 1y
python src/scripts/test/test-analytics.py --city "Palm Desert" --period 3y
python src/scripts/test/test-analytics.py --city "Palm Desert" --period 5y
python src/scripts/test/test-analytics.py --city "Palm Desert" --period 10y
```

**Expected**: Longer periods should have more sales

### Scenario 3: Test Subdivisions

```bash
# Test popular subdivisions
python src/scripts/test/test-analytics.py --subdivision "Indian Wells Country Club"
python src/scripts/test/test-analytics.py --subdivision "PGA West"
python src/scripts/test/test-analytics.py --subdivision "Bighorn Golf Club"
python src/scripts/test/test-analytics.py --subdivision "The Vintage Club"
```

### Scenario 4: County-Level Analysis

```bash
# Test county-wide data
python src/scripts/test/test-analytics.py --county "Riverside"
```

**Expected**: Large number of sales (thousands)

---

## ❌ Troubleshooting

### Error: "No closed sales found"

**Possible causes**:
1. Data not seeded yet
2. Incorrect spelling
3. No sales in that time period

**Solutions**:
```bash
# 1. Check if data is seeded
python -c "
from pymongo import MongoClient
import os
from dotenv import load_dotenv
load_dotenv('.env.local')
client = MongoClient(os.getenv('MONGODB_URI'))
db = client.get_database()
count = db.unified_closed_listings.count_documents({})
print(f'Total documents: {count:,}')
"

# 2. Try longer time period
python src/scripts/test/test-analytics.py --city "Palm Desert" --period 10y

# 3. Try different location
python src/scripts/test/test-analytics.py --city "Palm Springs"
```

### Error: "MONGODB_URI not found"

**Solution**: Ensure `.env.local` exists with `MONGODB_URI`

```bash
# Check if .env.local exists
ls -la .env.local

# Verify MONGODB_URI is set
grep MONGODB_URI .env.local
```

### Error: "No module named 'pymongo'"

**Solution**: Install pymongo

```bash
pip install pymongo python-dotenv
```

---

## 📈 Expected Results

### High Confidence

**Criteria**: 50+ sales
```
Confidence: HIGH
```

**Indicates**: Statistically significant sample

### Medium Confidence

**Criteria**: 20-50 sales
```
Confidence: MEDIUM
```

**Indicates**: Decent sample size

### Low Confidence

**Criteria**: < 20 sales
```
Confidence: LOW
```

**Indicates**: Small sample, results may vary

---

## 🎯 Testing Checklist

Before deploying to VPS:

- [ ] Test 3+ cities (Palm Desert, Indian Wells, La Quinta)
- [ ] Test 2+ subdivisions (Indian Wells CC, PGA West)
- [ ] Test 1+ county (Riverside)
- [ ] Test all time periods (1y, 3y, 5y, 10y)
- [ ] Verify all results have:
  - [ ] Sales count > 0
  - [ ] Reasonable prices ($300k-$3M range for desert cities)
  - [ ] MLS sources listed
  - [ ] Appreciation rate makes sense (2-10% typical)
  - [ ] Trend detected (increasing/stable/decreasing)

---

## 🔄 Integration with Fetch/Seed Pipeline

```
1. Fetch data
   python src/scripts/mls/backend/unified/closed/fetch.py --mls GPS

2. Seed data
   python src/scripts/mls/backend/unified/closed/seed.py

3. Test analytics ✅ (YOU ARE HERE)
   python src/scripts/test/test-analytics.py --city "Palm Desert"

4. Deploy to VPS
   (See docs/VPS_CLOSED_LISTINGS_DEPLOYMENT.md)
```

---

## 📝 Common Test Cities

### Coachella Valley (Desert Cities)

```bash
python src/scripts/test/test-analytics.py --city "Palm Desert"
python src/scripts/test/test-analytics.py --city "Palm Springs"
python src/scripts/test/test-analytics.py --city "Indian Wells"
python src/scripts/test/test-analytics.py --city "La Quinta"
python src/scripts/test/test-analytics.py --city "Rancho Mirage"
python src/scripts/test/test-analytics.py --city "Cathedral City"
python src/scripts/test/test-analytics.py --city "Indio"
python src/scripts/test/test-analytics.py --city "Coachella"
```

### Los Angeles Area

```bash
python src/scripts/test/test-analytics.py --city "Los Angeles"
python src/scripts/test/test-analytics.py --city "Beverly Hills"
python src/scripts/test/test-analytics.py --city "Santa Monica"
python src/scripts/test/test-analytics.py --city "Malibu"
```

### Orange County

```bash
python src/scripts/test/test-analytics.py --city "Newport Beach"
python src/scripts/test/test-analytics.py --city "Irvine"
python src/scripts/test/test-analytics.py --city "Laguna Beach"
```

---

## 💡 Tips

1. **Start with cities**: Easier to test, more sales
2. **Use verbose mode**: See actual data structure
3. **Test multiple periods**: Validate time filtering works
4. **Check MLS sources**: Should see GPS, CRMLS, etc.
5. **Verify prices**: Should be realistic for area

---

## 🚀 Next Steps

Once tests pass:

1. **Deploy to VPS** (see `docs/VPS_CLOSED_LISTINGS_DEPLOYMENT.md`)
2. **Test API endpoints** (after deployment)
3. **Integrate with AI** (use appreciation data in chat responses)
4. **Build frontend** (display appreciation on property pages)

---

## 📚 Related Documentation

- `docs/ANALYTICS_PLUGIN_GUIDE.md` - How to add new metrics
- `docs/CLOSED_LISTINGS_COMPLETE.md` - Complete closed listings guide
- `docs/VPS_CLOSED_LISTINGS_DEPLOYMENT.md` - VPS deployment
- `src/lib/analytics/README.md` - Analytics library docs

---

**Ready to test?** Start here:

```bash
python src/scripts/test/test-analytics.py --city "Palm Desert" --verbose
```
