# VPS Setup Instructions for Claude Article Writer

## Overview

This guide will help you set up the automated blog writing system on your VPS (147.182.236.138).

## Prerequisites

- SSH access to VPS
- Claude Code CLI installed on VPS
- Node.js installed
- Git configured with push access
- MongoDB connection string in `.env`

## Step-by-Step Setup

### 1. SSH into VPS

```bash
ssh root@147.182.236.138
# Password: dstreet280
```

### 2. Navigate to Project

```bash
cd /root/jpsrealtor
```

### 3. Pull Latest Code

```bash
git pull origin main
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Verify Environment Variables

Make sure `.env` has these variables:

```bash
cat .env | grep -E 'MONGODB_URI|ANTHROPIC_API_KEY'
```

If missing, add them:

```bash
nano .env
# Add:
# MONGODB_URI=your-mongodb-connection-string
# ANTHROPIC_API_KEY=your-anthropic-key (if using Claude Code CLI)
```

### 6. Test Claude Code CLI

```bash
which claude
# Should output: /usr/local/bin/claude (or similar)

claude --version
# Should show version number
```

If Claude Code is not installed:

```bash
npm install -g @anthropic-ai/claude-code
```

### 7. Setup Cron Job

Run the setup script:

```bash
chmod +x scripts/setup-vps-cron.sh
./scripts/setup-vps-cron.sh
```

This will:
- Make the check script executable
- Add a cron job to run every 5 minutes
- Create log file at `/var/log/claude-article-writer.log`

### 8. Verify Cron Job

```bash
crontab -l
# Should see:
# */5 * * * * /usr/bin/node /root/jpsrealtor/scripts/check-article-requests.js >> /var/log/claude-article-writer.log 2>&1
```

### 9. Test Manually

```bash
node scripts/check-article-requests.js
```

Expected output:
```
[2025-01-29T...] Checking for pending article requests...
✅ Connected to MongoDB
ℹ️  No pending article requests
✅ Script completed
```

## Usage

### From Admin Panel

1. Go to https://jpsrealtor.com/admin/articles
2. Click "Claude VPS" button
3. Select category
4. Enter prompt:
   ```
   Write a comprehensive guide to Palm Desert golf communities
   as investment properties. Focus on ROI, luxury amenities, and
   current market trends.
   ```
5. Click "Submit Request"
6. Wait 2-5 minutes for notification

### Monitoring

**Watch logs in real-time:**
```bash
tail -f /var/log/claude-article-writer.log
```

**View recent activity:**
```bash
tail -100 /var/log/claude-article-writer.log
```

**Check Claude sessions:**
```bash
ps aux | grep claude
```

**View Claude session logs:**
```bash
ls /tmp/claude-*.log
tail -f /tmp/claude-[REQUEST_ID].log
```

## Troubleshooting

### No articles being created

**Check cron is running:**
```bash
sudo service cron status
# or
systemctl status cron
```

**Check for errors in log:**
```bash
tail -50 /var/log/claude-article-writer.log
```

**Test script manually:**
```bash
node /root/jpsrealtor/scripts/check-article-requests.js
```

### MongoDB connection issues

**Test connection:**
```bash
node -e "
const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI).then(() => {
  console.log('✅ Connected to MongoDB');
  process.exit(0);
}).catch(err => {
  console.error('❌ Connection failed:', err.message);
  process.exit(1);
});
"
```

### Git push fails

**Check Git config:**
```bash
git config --list | grep user
git remote -v
```

**Test push manually:**
```bash
echo "test" > test.txt
git add test.txt
git commit -m "Test commit"
git push origin main
git reset HEAD~1
rm test.txt
```

### Claude Code not found

**Install Claude Code:**
```bash
npm install -g @anthropic-ai/claude-code
```

**Verify installation:**
```bash
which claude
claude --version
```

## Maintenance

### View article requests

**Check pending requests:**
```bash
node -e "
const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const ArticleRequestSchema = new mongoose.Schema({}, {strict: false});
  const ArticleRequest = mongoose.model('ArticleRequest', ArticleRequestSchema);
  const requests = await ArticleRequest.find().sort({requestedAt: -1}).limit(10);
  console.log(JSON.stringify(requests, null, 2));
  process.exit(0);
});
"
```

### Clear old logs

```bash
# Rotate logs (keep last 1000 lines)
tail -1000 /var/log/claude-article-writer.log > /var/log/claude-article-writer.log.tmp
mv /var/log/claude-article-writer.log.tmp /var/log/claude-article-writer.log

# Clean up old Claude logs
rm /tmp/claude-*.log
rm /tmp/claude-prompt-*.txt
```

### Update polling interval

To change how often the script checks for requests:

```bash
crontab -e
```

Change `*/5` to desired interval:
- `*/1` = every minute
- `*/5` = every 5 minutes
- `*/10` = every 10 minutes

## Security Notes

- Never commit real `.env` files to Git
- VPS password is in code (consider SSH keys for production)
- Article requests are tied to admin users only
- Claude has full VPS access (by design for this use case)

## Cost

- **VPS:** ~$5-10/month (DigitalOcean droplet)
- **Claude Code:** $0 (uses your Anthropic account)
- **MongoDB:** $0 (if using Atlas free tier) or ~$9/month (M10)

**Total:** ~$5-20/month depending on configuration

## Support

If you encounter issues:

1. Check logs: `tail -f /var/log/claude-article-writer.log`
2. Test manually: `node scripts/check-article-requests.js`
3. Verify environment: `cat .env`
4. Check cron: `crontab -l`

**Contact:**
- Email: josephsardella@gmail.com
- Phone: (760) 833-6334

---

**Last Updated:** January 29, 2025
**VPS:** 147.182.236.138
**Status:** Ready for production use
