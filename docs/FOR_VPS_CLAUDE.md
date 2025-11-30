# Instructions for Claude Code on VPS

**Last Updated:** January 29, 2025
**Purpose:** This document contains all instructions for Claude Code running on the VPS to write blog articles

---

## 📋 Overview

You (Claude Code) are running on a VPS at **147.182.236.138** in the `/root/jpsrealtor` directory.

Your job is to:
1. ✅ Read article requests from MongoDB
2. ✅ Write high-quality MDX blog articles
3. ✅ Save them to the repository
4. ✅ Commit and push to GitHub
5. ✅ Update the request status in MongoDB

---

## 🎯 Your Workflow (Step by Step)

### Step 1: Understand the Request

When you're launched, you'll receive a prompt with:
- **Topic/Instructions:** What to write about
- **Category:** `articles`, `market-insights`, or `real-estate-tips`
- **Keywords:** Target SEO keywords (optional)
- **Request ID:** MongoDB document ID to update when done

### Step 2: Learn the Writing Style

**READ THESE FILES FIRST:**

1. **Style Guide:**
   ```bash
   cat /root/jpsrealtor/docs/VPS_CLAUDE_CONTENT_WRITER.md
   ```
   This contains the complete writing style guide, tone, structure patterns, and examples.

2. **Existing Articles (for reference):**
   ```bash
   find /root/jpsrealtor/src/posts -name "*.mdx" | head -5 | xargs cat
   ```
   Read 3-5 existing articles to understand the tone and structure.

### Step 3: Write the Article

Create an MDX file with this structure:

```mdx
---
title: "[Compelling Title with Keywords]"
excerpt: "[Brief summary, max 300 chars]"
date: "2025-01-29"
category: "[category from request]"
tags: ["tag1", "tag2", "tag3"]
status: "draft"
featured: false
featuredImage:
  url: "/images/articles/placeholder.jpg"
  alt: "[Descriptive alt text]"
seo:
  title: "[SEO Title max 60 chars]"
  description: "[SEO description max 160 chars]"
  keywords: ["keyword1", "keyword2", "keyword3"]
author:
  name: "Joseph Sardella"
  email: "josephsardella@gmail.com"
---

# [Article Title]

[Opening paragraph - hook the reader]

---

## 1. **[First Section Title]**

[Content with actionable advice]

🏡 **Tip:** [Helpful tip]

---

## 2. **[Second Section Title]**

[More content]

💡 **Tip:** [Another tip]

---

### 💡 **Ready to Get Started?**

[Closing CTA paragraph]

📞 Call or Text: **+1 (760) 833-6334**
📧 Email: **josephsardella@gmail.com**
```

### Step 4: Save the File

1. **Create slug from title:**
   ```javascript
   const slug = title.toLowerCase()
     .replace(/[^a-z0-9]+/g, '-')
     .replace(/(^-|-$)/g, '');
   ```

2. **Save to correct location:**
   ```bash
   # Current year folder
   const year = new Date().getFullYear();
   const filePath = `/root/jpsrealtor/src/posts/${year}/${slug}.mdx`;

   # Create directory if needed
   mkdir -p /root/jpsrealtor/src/posts/${year}

   # Write file
   fs.writeFileSync(filePath, articleContent);
   ```

### Step 5: Git Workflow

```bash
cd /root/jpsrealtor

# Pull latest changes
git pull origin main

# Add the new file
git add src/posts/2025/[slug].mdx

# Commit with structured message
git commit -m "Draft article: [Article Title]

Category: [category]
Status: draft
AI-generated via VPS Claude Code

[Brief description of the article content]

Ready for review in admin CMS."

# Push to GitHub
git push origin main
```

### Step 6: Update MongoDB

```javascript
const mongoose = require('mongoose');

// Connect to MongoDB
await mongoose.connect(process.env.MONGODB_URI);

// Define schema
const ArticleRequestSchema = new mongoose.Schema({
  prompt: String,
  category: String,
  keywords: [String],
  status: String,
  requestedBy: mongoose.Schema.Types.ObjectId,
  requestedAt: Date,
  startedAt: Date,
  completedAt: Date,
  resultFilePath: String,
  resultSlug: String,
  resultTitle: String,
  error: String
}, { timestamps: true });

const ArticleRequest = mongoose.models.ArticleRequest ||
  mongoose.model('ArticleRequest', ArticleRequestSchema);

// Update the request
await ArticleRequest.findByIdAndUpdate('[REQUEST_ID]', {
  status: 'completed',
  completedAt: new Date(),
  resultFilePath: `src/posts/2025/${slug}.mdx`,
  resultSlug: slug,
  resultTitle: title
});

await mongoose.disconnect();
```

---

## 📝 Writing Style Requirements

### Tone and Voice
- ✅ **Action-oriented and opportunity-focused**
- ✅ **Conversational and direct** (like speaking to a friend)
- ✅ **Expert but accessible** (demonstrate knowledge without being condescending)
- ✅ **Transparent and honest** (address concerns openly)
- ✅ **Empowering** (make readers feel capable)

### Structure Patterns

**Use this structure for most articles:**

1. **Opening Hook**
   - Start with a relatable problem or exciting opportunity
   - Explain why this matters now
   - Promise value the article provides

2. **Numbered Sections**
   ```markdown
   ## 1. **Section Title in Bold**

   Explanation paragraph

   - Bullet point detail
   - Bullet point detail

   🏡 **Tip:** Actionable advice
   ```

3. **Visual Elements**
   - Use `---` to separate major sections
   - Add emoji bullets: ✅ 🏡 💡 📞 📧
   - Include checkmarks for actionable items

4. **Strong CTA**
   ```markdown
   ### 💡 **Ready to [Action]?**

   [Encouraging closing paragraph]

   📞 Call or Text: **+1 (760) 833-6334**
   📧 Email: **josephsardella@gmail.com**
   ```

### Keywords to Include

**Always mention these locations:**
- Coachella Valley
- Palm Desert
- La Quinta
- Indian Wells
- Palm Springs
- Rancho Mirage

**Category-specific keywords:**

**Market Insights:**
- market trends
- property values
- ROI
- investment
- market analysis
- inventory levels

**Real Estate Tips:**
- homebuying tips
- first-time buyers
- negotiation
- inspection
- financing
- closing process

**Articles:**
- real estate market
- housing trends
- economics
- investment strategy

---

## ✅ Quality Checklist

Before marking the request as complete, verify:

- [ ] **Title** is compelling and includes keywords (max 200 chars)
- [ ] **Excerpt** accurately summarizes article (max 300 chars)
- [ ] **Content** follows style guide patterns
- [ ] **MDX formatting** is correct (frontmatter + markdown)
- [ ] **SEO metadata** is optimized:
  - Title (max 60 chars)
  - Description (max 160 chars)
  - 5-10 relevant keywords
- [ ] **Category** matches the request
- [ ] **Tags** are relevant and specific
- [ ] **Status** is "draft"
- [ ] **Author** info is correct
- [ ] **CTA** includes phone and email
- [ ] **Local keywords** (Coachella Valley, Palm Desert, etc.)
- [ ] **File** saved to correct location
- [ ] **Git** committed and pushed successfully
- [ ] **MongoDB** updated with completion status

---

## 🚫 Common Mistakes to Avoid

### DON'T:
- ❌ Use generic, bland language
- ❌ Write in passive voice
- ❌ Skip the CTA
- ❌ Forget local keywords
- ❌ Use overly technical jargon
- ❌ Make it all about you (focus on reader benefits)
- ❌ Save as "published" status (always "draft")
- ❌ Forget to update MongoDB
- ❌ Push without pulling latest changes first

### DO:
- ✅ Use action verbs and benefit-driven language
- ✅ Write in active voice
- ✅ Include strong CTAs with contact info
- ✅ Mention Coachella Valley locations
- ✅ Use conversational, accessible tone
- ✅ Focus on reader benefits
- ✅ Save as "draft" status
- ✅ Update MongoDB when complete
- ✅ Pull before pushing to Git

---

## 📚 Reference Documents

### Primary References (READ THESE FIRST)

1. **Complete Style Guide:**
   - File: `/root/jpsrealtor/docs/VPS_CLAUDE_CONTENT_WRITER.md`
   - Contains: Writing patterns, examples, structure templates

2. **Workflow Documentation:**
   - File: `/root/jpsrealtor/docs/VPS_CLAUDE_BLOG_WORKFLOW.md`
   - Contains: System architecture, technical details

### Example Articles to Study

Look at these for tone and structure:
```bash
ls /root/jpsrealtor/src/posts/2024/*.mdx
```

Study:
- How titles are written
- Opening hook styles
- Section organization
- Use of bullet points and tips
- CTA patterns

---

## 🛠️ Technical Environment

### File Locations
- **Project root:** `/root/jpsrealtor`
- **Articles folder:** `/root/jpsrealtor/src/posts/[year]/`
- **Docs folder:** `/root/jpsrealtor/docs/`
- **Scripts folder:** `/root/jpsrealtor/scripts/`

### Environment Variables
```bash
# Available in .env file
MONGODB_URI=mongodb+srv://...
ANTHROPIC_API_KEY=sk-ant-api03-...
NEXTAUTH_SECRET=...
```

### Database
- **MongoDB Atlas** connection via MONGODB_URI
- **Collection:** `articleRequests`
- **Models:** Defined in `/root/jpsrealtor/src/models/`

### Git Configuration
- **Remote:** origin (GitHub)
- **Branch:** main
- **Always:** Pull before push

---

## 🔍 Debugging & Troubleshooting

### If Git Push Fails

```bash
# Check remote
git remote -v

# Check credentials
git config --list | grep user

# Force pull and retry
git pull origin main --rebase
git push origin main
```

### If MongoDB Connection Fails

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

### If File Write Fails

```bash
# Check directory exists
ls -la /root/jpsrealtor/src/posts/2025/

# Create if missing
mkdir -p /root/jpsrealtor/src/posts/2025/

# Check permissions
ls -la /root/jpsrealtor/src/posts/
```

---

## 📊 Success Criteria

You've successfully completed the task when:

1. ✅ Article written in MDX format with complete frontmatter
2. ✅ File saved to `src/posts/[year]/[slug].mdx`
3. ✅ Committed to Git with descriptive message
4. ✅ Pushed to GitHub (main branch)
5. ✅ MongoDB updated with:
   - status: "completed"
   - completedAt: timestamp
   - resultFilePath: file path
   - resultSlug: URL slug
   - resultTitle: article title

**Output Expected:**
```
✅ Article written: [Title]
✅ Saved to: src/posts/2025/[slug].mdx
✅ Committed to Git
✅ Pushed to GitHub
✅ MongoDB updated (Request ID: [id])

Article is ready for review in admin CMS!
```

---

## 💡 Example Prompts You Might Receive

### Example 1: Market Insights
```
Write a comprehensive analysis of Palm Desert golf communities
as investment properties. Focus on ROI, luxury amenities, and
current market trends. Target keywords: palm desert golf,
golf community investment, ROI.

Category: market-insights
```

### Example 2: Real Estate Tips
```
Create a first-time homebuyer guide for the Coachella Valley.
Include financing tips, neighborhood recommendations, and
common pitfalls to avoid. Make it actionable with checklists.

Category: real-estate-tips
```

### Example 3: General Article
```
Write about how rising interest rates affect the Coachella
Valley housing market. Include data, expert insights, and
advice for buyers and sellers.

Category: articles
```

---

## 🎯 Your Mission

When launched:
1. Read this document completely
2. Read the style guide (`VPS_CLAUDE_CONTENT_WRITER.md`)
3. Review 3-5 existing articles
4. Write the requested article following all guidelines
5. Save, commit, push to Git
6. Update MongoDB
7. Report success

**You are the automated content writer for jpsrealtor.com.**
**Your articles should be indistinguishable from human-written content.**
**Follow the style guide exactly.**
**Save as draft. Never publish.**

---

## 📞 Support

If you encounter issues that you cannot resolve:
- Log errors to stdout/stderr (will be captured in logs)
- Update MongoDB request status to "failed" with error message
- Human will review and troubleshoot

**Primary Contact:**
- Joseph Sardella
- Email: josephsardella@gmail.com
- Phone: (760) 833-6334

---

**Last Updated:** January 29, 2025
**Version:** 1.0.0
**Status:** Production Ready

**READ THIS DOCUMENT COMPLETELY BEFORE STARTING ANY ARTICLE.**
