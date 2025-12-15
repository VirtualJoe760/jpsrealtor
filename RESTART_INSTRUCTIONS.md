# How to Restart and Test the Date Filter Fix

## Step 1: Stop the Dev Server
Press `CTRL+C` in the terminal where `npm run dev` is running

## Step 2: Clear Next.js Cache
```bash
rm -rf .next
```

Optional (recommended for thorough clean):
```bash
rm -rf node_modules/.cache
```

## Step 3: Restart Dev Server
```bash
npm run dev
```

Wait for "Ready in X ms" message

## Step 4: Run the Test

### Option A: Using curl (Quick Test)
```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"city":"Palm Desert","filters":{"listedAfter":"2025-12-07","limit":10}}'
```

**Expected Result:**
```json
{
  "success": true,
  "listings": [...6 listings...],
  "meta": {
    "totalListings": 6
  }
}
```

### Option B: Using the test script
```bash
bash test-after-restart.sh
```

### Option C: Test the AI chat
Open the chat widget and ask:
```
"Show me new listings in Palm Desert"
```

Should return 6 listings from Dec 7-13, 2024

---

## ✅ Success Criteria

After restart, you should see:
- ✅ API returns 6 listings (not 0)
- ✅ AI chat shows new listings correctly
- ✅ No debug logs from removed code in server console
- ✅ Response includes listings from 2025-12-07 onward

---

## ❌ If Still Broken

If you still get 0 results after restart:

1. **Check server console** - Look for any compilation errors
2. **Verify cache was cleared** - The `.next` folder should not exist
3. **Check if Turbopack recompiled** - You should see rebuild messages in console
4. **Follow IMMEDIATE_ACTION_PLAN.md** - Steps 3 & 4 for deeper debugging

---

## 📊 What Was Fixed

### Files Modified:

1. **src/lib/queries/filters/time.ts**
   - Added automatic timestamp appending (`T00:00:00Z`)
   - Keeps `listedAfter` as string (not Date object)

2. **src/app/api/query/route.ts** (line 192)
   - Removed `new Date()` conversion
   - Keeps date as string from query params

3. **src/lib/chat/tool-executor.ts** (line 152)
   - Removed `new Date()` conversion
   - Passes date as string to API

### The Fix:

MongoDB stores dates as:
```
"onMarketDate": "2025-12-13T05:32:23Z"
```

We were comparing to:
```
"2025-12-07"  ❌
```

Now we compare to:
```
"2025-12-07T00:00:00Z"  ✅
```

String comparison works correctly when formats match!

---

## 🎯 Next Steps After Confirming Fix

1. **Test with different dates**
   ```bash
   # Last 30 days
   curl -X POST http://localhost:3000/api/query \
     -H "Content-Type: application/json" \
     -d '{"city":"Palm Desert","filters":{"listedAfter":"2024-11-14","limit":50}}'
   ```

2. **Test with AI chat**
   - "Show me new listings in La Quinta"
   - "What are the latest homes in Palm Desert?"
   - "New listings this week in Indian Wells"

3. **Remove test scripts** (optional cleanup)
   ```bash
   rm test-*.js
   rm test-after-restart.sh
   ```

4. **Consider the long-term fix** (see IMMEDIATE_ACTION_PLAN.md)
   - Migrate to Date type in MongoDB
   - Update schema
   - Normalize at API boundary

---

**Created:** 2024-12-14
**Estimated Fix Time:** 2-5 minutes
**Most Likely Outcome:** ✅ Will work immediately after restart
