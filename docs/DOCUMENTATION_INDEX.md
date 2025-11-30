# Documentation Index - VPS Claude Blog Writer

**Last Updated:** January 29, 2025

---

## 📚 Quick Links

### For You (Human Admin)
- **Quick Start:** [QUICKSTART.md](./QUICKSTART.md) - 5-minute setup guide
- **VPS Setup:** [VPS_SETUP_INSTRUCTIONS.md](./VPS_SETUP_INSTRUCTIONS.md) - Detailed VPS setup
- **Implementation:** [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - What we built
- **System Workflow:** [docs/VPS_CLAUDE_BLOG_WORKFLOW.md](./docs/VPS_CLAUDE_BLOG_WORKFLOW.md) - How it works

### For Claude (On VPS)
- **Master Instructions:** [docs/FOR_VPS_CLAUDE.md](./docs/FOR_VPS_CLAUDE.md) - ⭐ **MAIN DOCUMENT FOR CLAUDE**
- **Style Guide:** [docs/VPS_CLAUDE_CONTENT_WRITER.md](./docs/VPS_CLAUDE_CONTENT_WRITER.md) - Detailed writing patterns

---

## 📖 Document Purposes

### QUICKSTART.md
**Purpose:** Get up and running in 5 minutes
**For:** Human admin
**Contains:**
- VPS setup commands (copy-paste ready)
- How to request articles
- Monitoring commands
- Troubleshooting quick fixes

---

### VPS_SETUP_INSTRUCTIONS.md
**Purpose:** Complete VPS setup guide
**For:** Human admin (one-time setup)
**Contains:**
- Step-by-step VPS configuration
- Environment variable setup
- Cron job installation
- Testing procedures
- Maintenance commands
- Security notes

---

### IMPLEMENTATION_SUMMARY.md
**Purpose:** Technical implementation details
**For:** Human admin / developers
**Contains:**
- System architecture diagram
- Files created/modified
- Features implemented
- Testing procedures
- Performance metrics
- Future enhancements

---

### docs/VPS_CLAUDE_BLOG_WORKFLOW.md
**Purpose:** Complete system workflow documentation
**For:** Human admin / developers
**Contains:**
- How the system works end-to-end
- API endpoints
- Database models
- Notification system
- Deployment instructions
- Cost analysis

---

### docs/FOR_VPS_CLAUDE.md ⭐
**Purpose:** Master instructions for Claude Code on VPS
**For:** Claude (AI assistant on VPS)
**Contains:**
- Complete workflow (step-by-step)
- Writing style requirements
- File structure and locations
- Git procedures
- MongoDB update code
- Quality checklist
- Success criteria

**THIS IS THE MAIN DOCUMENT CLAUDE READS**

---

### docs/VPS_CLAUDE_CONTENT_WRITER.md
**Purpose:** Detailed writing style guide
**For:** Claude (AI assistant on VPS)
**Contains:**
- Tone and voice guidelines
- Article structure patterns
- Example articles
- SEO best practices
- Common mistakes to avoid
- Category-specific keywords

---

## 🎯 Usage Scenarios

### Scenario 1: First Time Setup
**Read these in order:**
1. QUICKSTART.md (5 min)
2. VPS_SETUP_INSTRUCTIONS.md (detailed setup)
3. Test the system
4. Read IMPLEMENTATION_SUMMARY.md (understand what was built)

### Scenario 2: Request a Blog Post
**Steps:**
1. Go to admin panel
2. Click "Claude VPS" button
3. Enter prompt
4. Wait for notification
5. Review and publish

**Reference:** QUICKSTART.md section "How to Use"

### Scenario 3: Troubleshooting
**Quick fixes:**
- Check QUICKSTART.md "Troubleshooting" section
- Check logs: `tail -f /var/log/claude-article-writer.log`
- Test manually: `node scripts/check-article-requests-simple.js`

**Detailed troubleshooting:**
- See VPS_SETUP_INSTRUCTIONS.md "Troubleshooting" section

### Scenario 4: Understanding the System
**Read:**
1. IMPLEMENTATION_SUMMARY.md (overview)
2. docs/VPS_CLAUDE_BLOG_WORKFLOW.md (technical details)
3. docs/FOR_VPS_CLAUDE.md (see what Claude does)

### Scenario 5: Modifying Claude's Behavior
**Edit these files:**
1. docs/FOR_VPS_CLAUDE.md (workflow instructions)
2. docs/VPS_CLAUDE_CONTENT_WRITER.md (writing style)
3. Push changes to GitHub
4. Claude will read updated files on next run

---

## 📂 File Structure

```
jpsrealtor/
├── QUICKSTART.md                    # 5-minute setup
├── VPS_SETUP_INSTRUCTIONS.md        # Detailed VPS setup
├── IMPLEMENTATION_SUMMARY.md        # What we built
├── DOCUMENTATION_INDEX.md           # This file
│
├── docs/
│   ├── FOR_VPS_CLAUDE.md           # ⭐ Master instructions for Claude
│   ├── VPS_CLAUDE_CONTENT_WRITER.md # Detailed style guide
│   ├── VPS_CLAUDE_BLOG_WORKFLOW.md  # System workflow
│   ├── CLAUDE_INSTRUCTIONS.md       # General Claude guidelines
│   └── README.md                    # Docs overview
│
├── scripts/
│   ├── check-article-requests-simple.js  # Polling service (recommended)
│   ├── check-article-requests.js         # Polling service (verbose)
│   └── setup-vps-cron.sh                 # One-time cron setup
│
└── src/
    ├── models/
    │   └── articleRequest.ts        # Database model
    │
    ├── app/api/
    │   ├── vps/request-article/route.ts  # Submit requests
    │   └── articles/check-new-drafts/route.ts  # Poll for drafts
    │
    └── posts/                       # Where articles are saved
        └── 2025/
            └── *.mdx               # Draft articles from Claude
```

---

## 🔄 Workflow Summary

```
1. You request article
   ↓
2. Saved to MongoDB (status: pending)
   ↓
3. VPS cron runs every 5 min
   ↓
4. Finds pending request
   ↓
5. Launches Claude Code
   ↓
6. Claude reads FOR_VPS_CLAUDE.md
   ↓
7. Claude writes article
   ↓
8. Claude commits & pushes to GitHub
   ↓
9. Claude updates MongoDB (status: completed)
   ↓
10. Admin panel polls and shows notification
    ↓
11. You review and publish
```

---

## 🆘 Quick Reference

### Check logs
```bash
tail -f /var/log/claude-article-writer.log
```

### Test manually
```bash
node scripts/check-article-requests-simple.js
```

### Check pending requests
```bash
node -e "
const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const AR = mongoose.model('ArticleRequest', new mongoose.Schema({}, {strict:false}));
  const pending = await AR.find({status:'pending'}).sort({requestedAt:-1});
  console.log('Pending:', pending.length);
  process.exit(0);
});
"
```

### View Claude processes
```bash
ps aux | grep claude
```

### Monitor Claude output
```bash
ls /tmp/claude-*.log
tail -f /tmp/claude-[TAB-complete].log
```

---

## 📞 Support

**Joseph Sardella**
- Email: josephsardella@gmail.com
- Phone: (760) 833-6334

---

## 🎯 Key Points

1. **FOR_VPS_CLAUDE.md** is the master document for Claude
2. **QUICKSTART.md** is for you to get started quickly
3. Claude reads docs from `/root/jpsrealtor/docs/` on VPS
4. All articles are saved as drafts in `src/posts/[year]/`
5. System polls every 5 minutes (VPS) and 30 seconds (frontend)
6. Zero API costs - uses Claude Code CLI

---

**Last Updated:** January 29, 2025
**Version:** 1.0.0
**Status:** Production Ready
