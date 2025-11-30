#!/usr/bin/env node
/**
 * Check the status of an article request
 * Usage: node scripts/check-request-status.js <request-id>
 */

const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function checkStatus(requestId) {
  if (!requestId) {
    console.error('❌ Usage: node scripts/check-request-status.js <request-id>');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);

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

    const request = await ArticleRequest.findById(requestId);

    if (!request) {
      console.error(`❌ Request not found: ${requestId}`);
      process.exit(1);
    }

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║ Article Request Status                                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const statusEmoji = {
      pending: '⏳',
      processing: '⚙️',
      completed: '✅',
      failed: '❌'
    };

    console.log(`${statusEmoji[request.status]} Status: ${request.status.toUpperCase()}`);
    console.log(`📝 Category: ${request.category}`);
    console.log(`🏷️  Keywords: ${request.keywords.join(', ')}`);
    console.log(`📅 Requested: ${request.requestedAt.toISOString()}`);

    if (request.startedAt) {
      console.log(`⏰ Started: ${request.startedAt.toISOString()}`);
    }

    if (request.completedAt) {
      console.log(`✅ Completed: ${request.completedAt.toISOString()}`);
      const duration = Math.round((request.completedAt - request.startedAt) / 1000);
      console.log(`⏱️  Duration: ${duration} seconds`);
    }

    if (request.resultFilePath) {
      console.log(`\n📄 Result:`);
      console.log(`   File: ${request.resultFilePath}`);
      console.log(`   Slug: ${request.resultSlug}`);
      console.log(`   Title: ${request.resultTitle}`);
    }

    if (request.error) {
      console.log(`\n❌ Error: ${request.error}`);
    }

    console.log(`\n📄 Prompt:`);
    console.log(`   ${request.prompt.substring(0, 200)}...`);
    console.log('');

    await mongoose.disconnect();

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

const requestId = process.argv[2];
checkStatus(requestId);
