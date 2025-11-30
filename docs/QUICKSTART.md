# Quick Start Guide - VPS Claude Blog Writer

## 🚀 5-Minute Setup

### On VPS (One-Time Setup)

```bash
# 1. SSH into VPS
ssh root@147.182.236.138

# 2. Go to project
cd /root/jpsrealtor

# 3. Pull latest code
git pull origin main

# 4. Install dependencies
npm install

# 5. Setup cron job
chmod +x scripts/setup-vps-cron.sh
./scripts/setup-vps-cron.sh

# 6. Test it works
node scripts/check-article-requests.js
```

**Expected output:**
```
[2025-01-29T...] Checking for pending article requests...
✅ Connected to MongoDB
ℹ️  No pending article requests
✅ Script completed
```

✅ **Setup complete!**

---

## 📝 How to Use

### 1. Request an Article

1. Go to https://jpsrealtor.com/admin/articles
2. Click **"Claude VPS"** button (purple, top right)
3. Select category:
   - Articles
   - Market Insights
   - Real Estate Tips
4. Enter your prompt:
   ```
   Write a comprehensive guide to Palm Desert golf communities
   as investment properties. Focus on ROI, lifestyle amenities,
   and current market trends. Target keywords: palm desert golf,
   golf community investment, ROI.
   ```
5. Click **"Submit Request"**

### 2. Wait for Notification

- Usually 2-5 minutes
- Alert appears: **"✨ New Draft Article Ready!"**
- Shows title and category

### 3. Review and Publish

1. Click "View Article" in notification
2. Review the MDX content
3. Add featured image (upload to Cloudinary)
4. Verify SEO metadata
5. Change status from "draft" to "published"
6. Click "Save"

**Done!** Article is live on your site.

---

## 🔍 Monitoring

### Watch logs in real-time
```bash
tail -f /var/log/claude-article-writer.log
```

### Check pending requests
```bash
node -e "
const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const ArticleRequestSchema = new mongoose.Schema({}, {strict: false});
  const AR = mongoose.model('ArticleRequest', ArticleRequestSchema);
  const pending = await AR.find({status: 'pending'}).sort({requestedAt: -1});
  console.log('Pending requests:', pending.length);
  pending.forEach(r => console.log('  -', r.category, ':', r.prompt.substring(0, 50)));
  process.exit(0);
});
"
```

### Check for Claude processes
```bash
ps aux | grep claude
```

---

## ❓ Troubleshooting

### No articles being created?

```bash
# 1. Check cron is running
sudo service cron status

# 2. Check logs
tail -50 /var/log/claude-article-writer.log

# 3. Run manually
node scripts/check-article-requests.js
```

### MongoDB connection issues?

```bash
# Test connection
node -e "
const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected'))
  .catch(err => console.error('❌', err.message));
"
```

### Git push fails?

```bash
# Check config
git config --list
git remote -v

# Test push
echo "test" > test.txt
git add test.txt
git commit -m "Test"
git push origin main
rm test.txt
git reset HEAD~1
```

---

## 📊 Stats

- **Time per article:** 5-10 minutes (just review)
- **Cost per article:** $0 (uses Claude Code CLI)
- **Articles per month:** Unlimited
- **Quality:** Matches your existing writing style

---

## 📚 More Documentation

- **Complete workflow:** `docs/VPS_CLAUDE_BLOG_WORKFLOW.md`
- **VPS setup:** `VPS_SETUP_INSTRUCTIONS.md`
- **Implementation:** `IMPLEMENTATION_SUMMARY.md`
- **Writing style:** `docs/VPS_CLAUDE_CONTENT_WRITER.md`

---

**Questions?**
- Email: josephsardella@gmail.com
- Phone: (760) 833-6334

**Last Updated:** January 29, 2025
