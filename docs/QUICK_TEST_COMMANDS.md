# Quick Test Commands - VPS Claude Article Writer

**For Frontend Claude Testing**

---

## 🚀 Quick Start (No UI Testing)

```bash
# 1. Create a test article request
node scripts/create-test-article-request.js

# 2. Copy the Request ID from output, then monitor it
node scripts/check-request-status.js <REQUEST_ID>

# 3. Watch logs in real-time
tail -f /var/log/claude-article-writer.log

# 4. After 5-10 minutes, check if article was created
ls -la src/posts/2025/

# 5. Read the generated article
cat src/posts/2025/*.mdx
```

---

## 📊 Monitoring Commands

```bash
# Check all pending requests
node scripts/check-article-requests-simple.js

# Check specific request status
node scripts/check-request-status.js <REQUEST_ID>

# View cron jobs
crontab -l

# View logs
tail -f /var/log/claude-article-writer.log

# Clear logs
sudo truncate -s 0 /var/log/claude-article-writer.log
```

---

## 🧪 Testing Commands

```bash
# Test API and MongoDB connection
node scripts/test-article-request-api.js

# Manually trigger polling (bypasses cron)
node scripts/check-article-requests-simple.js

# Create custom test request
node scripts/create-test-article-request.js
```

---

## 🔍 Debugging Commands

```bash
# Check if cron is running
sudo service cron status

# Check for Claude processes
ps aux | grep claude

# View Claude logs (if running)
ls -la /tmp/claude-*.log
tail -f /tmp/claude-*.log

# Test MongoDB connection
node -e "const mongoose = require('mongoose'); require('dotenv').config(); mongoose.connect(process.env.MONGODB_URI).then(() => console.log('✅ Connected')).catch(err => console.error('❌', err.message))"

# Check Git status
git status
git log --oneline -5
```

---

## 🛠️ Management Commands

```bash
# Setup/reinstall cron job
./scripts/setup-vps-cron-enhanced.sh

# Edit cron jobs
crontab -e

# Remove all cron jobs (CAREFUL!)
crontab -r

# View environment variables
cat .env | grep MONGODB_URI
```

---

## 📝 Example Test Session

```bash
# Terminal 1: Create request and monitor
node scripts/create-test-article-request.js
# Note the Request ID: 692bfce96da8677301eb3e09

node scripts/check-request-status.js 692bfce96da8677301eb3e09
# Status: pending

# Terminal 2: Watch logs
tail -f /var/log/claude-article-writer.log

# Wait 5 minutes...

# Terminal 1: Check status again
node scripts/check-request-status.js 692bfce96da8677301eb3e09
# Status: processing

# Wait 5-10 more minutes...

node scripts/check-request-status.js 692bfce96da8677301eb3e09
# Status: completed
# Result: src/posts/2025/first-time-homebuyers-coachella-valley.mdx

# View the article
cat src/posts/2025/first-time-homebuyers-coachella-valley.mdx

# Check Git
git log --oneline -3
# Should show: "Draft article: ..."

git status
# Should be clean (already pushed)
```

---

## 🎯 Current Test Request

**Request ID:** `692bfce96da8677301eb3e09`
**Status:** Processing (as of 2025-11-30 08:15:02)
**Category:** real-estate-tips
**Topic:** First-time homebuyers guide for Coachella Valley

**Check this request:**
```bash
node scripts/check-request-status.js 692bfce96da8677301eb3e09
```

---

## 📞 API Testing (Optional)

```bash
# Test the API endpoint directly
curl -X POST http://localhost:3000/api/vps/request-article \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write about Palm Desert luxury homes market trends",
    "category": "market-insights",
    "keywords": ["palm desert", "luxury homes", "market trends"]
  }'

# Check all requests
curl http://localhost:3000/api/vps/request-article?status=pending
```

---

## ⏱️ Timeline Reference

| Time (min) | Status | What's Happening |
|------------|--------|------------------|
| 0 | pending | Request created, waiting for cron |
| 0-5 | pending | Waiting for next cron cycle |
| 5 | processing | Cron picked it up, Claude launched |
| 5-10 | processing | Claude writing article |
| 10-15 | processing | Claude committing & pushing |
| 15 | completed | Article ready! |

---

**Last Updated:** 2025-11-30
**Quick Reference Version:** 1.0
