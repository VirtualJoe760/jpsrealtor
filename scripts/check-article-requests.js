#!/usr/bin/env node

/**
 * Article Request Polling Service
 *
 * This script runs on the VPS to check for pending article requests
 * and launch Claude Code sessions to write the requested articles.
 *
 * Setup: Run this via cron job every 5 minutes
 * */5 * * * * /usr/bin/node /root/jpsrealtor/scripts/check-article-requests.js >> /var/log/claude-article-writer.log 2>&1
 */

const mongoose = require('mongoose');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Import models (using dynamic require to avoid TypeScript compilation)
async function main() {
  try {
    console.log(`\n[${new Date().toISOString()}] Checking for pending article requests...`);

    // Connect to MongoDB
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Define ArticleRequest schema (same as model)
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

    // Find oldest pending request
    const pendingRequests = await ArticleRequest.find({ status: 'pending' })
      .sort({ requestedAt: 1 }) // Oldest first
      .limit(1);

    if (pendingRequests.length === 0) {
      console.log('ℹ️  No pending article requests');
      await mongoose.disconnect();
      return;
    }

    const request = pendingRequests[0];
    console.log(`\n📝 Processing request: ${request._id}`);
    console.log(`   Category: ${request.category}`);
    console.log(`   Requested: ${request.requestedAt}`);

    // Update status to "processing"
    request.status = 'processing';
    request.startedAt = new Date();
    await request.save();
    console.log('✅ Status updated to "processing"');

    // Create detailed prompt for Claude
    const year = new Date().getFullYear();
    const claudePrompt = `You are Claude Code running on the VPS for jpsrealtor.com.

╔════════════════════════════════════════════════════════════╗
║ CRITICAL: READ YOUR INSTRUCTIONS FIRST                     ║
╚════════════════════════════════════════════════════════════╝

Before doing ANYTHING else, read this file COMPLETELY:

📖 cat /root/jpsrealtor/docs/FOR_VPS_CLAUDE.md

This document contains ALL your instructions including:
✅ Complete workflow (step-by-step)
✅ Writing style guide and examples
✅ File structure and locations
✅ Git commit procedures
✅ MongoDB update code
✅ Quality checklist
✅ Common mistakes to avoid

READ IT NOW. Don't skip this step.

╔════════════════════════════════════════════════════════════╗
║ YOUR ASSIGNMENT                                            ║
╚════════════════════════════════════════════════════════════╝

${request.prompt}

📋 Details:
- Category: ${request.category}
- Keywords: ${JSON.stringify(request.keywords || [])}
- Request ID: ${request._id}
- Year: ${year}

╔════════════════════════════════════════════════════════════╗
║ QUICK WORKFLOW REMINDER                                    ║
╚════════════════════════════════════════════════════════════╝

1. Read: /root/jpsrealtor/docs/FOR_VPS_CLAUDE.md (ALL INSTRUCTIONS)
2. Read: /root/jpsrealtor/docs/VPS_CLAUDE_CONTENT_WRITER.md (STYLE GUIDE)
3. Review 3-5 existing articles to learn tone

---
title: "[Compelling Title with Keywords]"
excerpt: "[Brief summary, max 300 chars]"
date: "${new Date().toISOString().split('T')[0]}"
category: "${request.category}"
tags: ["tag1", "tag2", "tag3"]
status: "draft"
featured: false
featuredImage:
  url: "/images/articles/placeholder.jpg"
  alt: "[Descriptive alt text]"
seo:
  title: "[SEO Title max 60 chars]"
  description: "[SEO description max 160 chars]"
  keywords: ${JSON.stringify(request.keywords || [])}
author:
  name: "Joseph Sardella"
  email: "josephsardella@gmail.com"
---

# [Article Title]

[Full article content in MDX format]

4. Create a URL-safe slug from the title (lowercase, hyphens, no special chars)

5. Save the article to: src/posts/${year}/[slug].mdx

6. Git workflow:
   cd /root/jpsrealtor
   git pull origin main
   git add src/posts/${year}/[slug].mdx
   git commit -m "Draft article: [Title]

Category: ${request.category}
Status: draft
AI-generated via VPS Claude Code

Ready for review in admin CMS."
   git push origin main

7. Update the article request in MongoDB:
   - status: "completed"
   - completedAt: current timestamp
   - resultFilePath: "src/posts/${year}/[slug].mdx"
   - resultSlug: "[slug]"
   - resultTitle: "[title]"

Use this Node.js code to update MongoDB:

const mongoose = require('mongoose');
await mongoose.connect(process.env.MONGODB_URI);
const ArticleRequestSchema = new mongoose.Schema({
  prompt: String, category: String, keywords: [String], status: String,
  requestedBy: mongoose.Schema.Types.ObjectId, requestedAt: Date,
  startedAt: Date, completedAt: Date, resultFilePath: String,
  resultSlug: String, resultTitle: String, error: String
}, { timestamps: true });
const ArticleRequest = mongoose.models.ArticleRequest || mongoose.model('ArticleRequest', ArticleRequestSchema);
await ArticleRequest.findByIdAndUpdate('${request._id}', {
  status: 'completed',
  completedAt: new Date(),
  resultFilePath: 'src/posts/${year}/[actual-slug].mdx',
  resultSlug: '[actual-slug]',
  resultTitle: '[actual-title]'
});
await mongoose.disconnect();

IMPORTANT:
- Follow the writing style from existing articles EXACTLY
- Use professional yet approachable tone
- Include actionable advice and local Coachella Valley expertise
- Always end with contact information (phone and email)
- Ensure SEO optimization with natural keyword integration
- Save as DRAFT status only
- Commit and push to GitHub
- Update MongoDB with completion status

START NOW. Write the article, save it, commit to Git, and update the database.`;

    // Save prompt to temporary file
    const promptFile = `/tmp/claude-prompt-${request._id}.txt`;
    fs.writeFileSync(promptFile, claudePrompt);
    console.log(`✅ Prompt saved to ${promptFile}`);

    // Launch Claude Code
    const logFile = `/tmp/claude-${request._id}.log`;
    const claudeCommand = `cd /root/jpsrealtor && nohup claude --prompt "$(cat ${promptFile})" > ${logFile} 2>&1 &`;

    console.log('\n🚀 Launching Claude Code...');
    console.log(`   Command: ${claudeCommand.substring(0, 100)}...`);
    console.log(`   Log file: ${logFile}`);

    exec(claudeCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error launching Claude: ${error.message}`);
        // Update request status to failed
        ArticleRequest.findByIdAndUpdate(request._id, {
          status: 'failed',
          error: error.message
        }).then(() => {
          mongoose.disconnect();
        });
      } else {
        console.log('✅ Claude Code session launched successfully!');
        console.log(`   Session running in background`);
        console.log(`   Monitor progress: tail -f ${logFile}`);
      }
    });

    // Disconnect after a short delay (let the exec start)
    setTimeout(async () => {
      await mongoose.disconnect();
      console.log('\n✅ Script completed');
    }, 2000);

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
