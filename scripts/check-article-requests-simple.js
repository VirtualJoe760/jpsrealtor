#!/usr/bin/env node
/**
 * Article Request Polling Service (Simplified)
 * Runs every 5 minutes via cron to check for pending article requests
 */

const mongoose = require('mongoose');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function main() {
  try {
    console.log(`\n[${new Date().toISOString()}] Checking for pending article requests...`);

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

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

    const pendingRequests = await ArticleRequest.find({ status: 'pending' })
      .sort({ requestedAt: 1 })
      .limit(1);

    if (pendingRequests.length === 0) {
      console.log('ℹ️  No pending article requests');
      await mongoose.disconnect();
      return;
    }

    const request = pendingRequests[0];
    console.log(`\n📝 Processing request: ${request._id}`);
    console.log(`   Category: ${request.category}`);

    request.status = 'processing';
    request.startedAt = new Date();
    await request.save();
    console.log('✅ Status updated to "processing"');

    const year = new Date().getFullYear();
    const claudePrompt = `You are Claude Code on VPS for jpsrealtor.com.

╔════════════════════════════════════════════════════════════╗
║ READ YOUR INSTRUCTIONS FIRST                               ║
╚════════════════════════════════════════════════════════════╝

📖 cat /root/jpsrealtor/docs/FOR_VPS_CLAUDE.md

This file has EVERYTHING you need. Read it completely before starting.

╔════════════════════════════════════════════════════════════╗
║ YOUR TASK                                                  ║
╚════════════════════════════════════════════════════════════╝

${request.prompt}

Category: ${request.category}
Keywords: ${JSON.stringify(request.keywords || [])}
Request ID: ${request._id}
Year: ${year}

╔════════════════════════════════════════════════════════════╗
║ WORKFLOW                                                   ║
╚════════════════════════════════════════════════════════════╝

1. cat /root/jpsrealtor/docs/FOR_VPS_CLAUDE.md (READ COMPLETELY)
2. cat /root/jpsrealtor/docs/VPS_CLAUDE_CONTENT_WRITER.md (STYLE GUIDE)
3. find src/posts -name "*.mdx" | head -5 | xargs cat (LEARN TONE)
4. Write MDX article with complete frontmatter
5. Save to src/posts/${year}/[slug].mdx
6. git pull, add, commit, push to main
7. Update MongoDB request ${request._id} to "completed"

The FOR_VPS_CLAUDE.md document contains complete step-by-step
instructions, code examples, and quality checklist.

START NOW. Follow FOR_VPS_CLAUDE.md exactly.`;

    const promptFile = `/tmp/claude-prompt-${request._id}.txt`;
    fs.writeFileSync(promptFile, claudePrompt);
    console.log(`✅ Prompt saved to ${promptFile}`);

    const logFile = `/tmp/claude-${request._id}.log`;
    const claudeCommand = `cd /root/jpsrealtor && nohup claude --prompt "$(cat ${promptFile})" > ${logFile} 2>&1 &`;

    console.log('\n🚀 Launching Claude Code...');
    console.log(`   Log: ${logFile}`);

    exec(claudeCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ Error: ${error.message}`);
        ArticleRequest.findByIdAndUpdate(request._id, {
          status: 'failed',
          error: error.message
        }).then(() => mongoose.disconnect());
      } else {
        console.log('✅ Claude session launched!');
        console.log(`   Monitor: tail -f ${logFile}`);
      }
    });

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
