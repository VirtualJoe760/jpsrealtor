#!/usr/bin/env node
/**
 * Create a test article request for VPS Claude
 * This will create a real request that the polling service can pick up
 */

const mongoose = require('mongoose');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function createTestRequest() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║ Creating Test Article Request                             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const ArticleRequestSchema = new mongoose.Schema({
      prompt: { type: String, required: true },
      category: {
        type: String,
        enum: ['articles', 'market-insights', 'real-estate-tips'],
        required: true
      },
      keywords: { type: [String], default: [] },
      status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
      },
      requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      requestedAt: { type: Date, default: Date.now },
      startedAt: Date,
      completedAt: Date,
      resultFilePath: String,
      resultSlug: String,
      resultTitle: String,
      error: String
    }, { timestamps: true });

    const ArticleRequest = mongoose.models.ArticleRequest ||
      mongoose.model('ArticleRequest', ArticleRequestSchema);

    // Create a test article request
    const testRequest = new ArticleRequest({
      prompt: `Write a comprehensive guide for first-time homebuyers in the Coachella Valley.

Include the following sections:
1. Why the Coachella Valley is perfect for first-time buyers
2. Understanding your budget (down payment, closing costs, monthly expenses)
3. Best neighborhoods for first-time buyers (Palm Desert, La Quinta, Indio)
4. The homebuying process step-by-step
5. Common mistakes to avoid
6. Resources and next steps

Make it actionable with tips, checklists, and local market insights. Target keywords: first-time homebuyers, Coachella Valley, Palm Desert homes, homebuying tips.`,
      category: 'real-estate-tips',
      keywords: [
        'first-time homebuyers',
        'coachella valley',
        'palm desert',
        'homebuying tips',
        'real estate guide'
      ],
      status: 'pending',
      requestedAt: new Date()
    });

    const savedRequest = await testRequest.save();

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║ ✅ Test Article Request Created!                           ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('📝 Request Details:');
    console.log(`   ID:       ${savedRequest._id}`);
    console.log(`   Status:   ${savedRequest.status}`);
    console.log(`   Category: ${savedRequest.category}`);
    console.log(`   Created:  ${savedRequest.requestedAt.toISOString()}`);
    console.log(`   Keywords: ${savedRequest.keywords.join(', ')}\n`);

    console.log('📄 Prompt Preview:');
    console.log(`   ${savedRequest.prompt.substring(0, 150)}...\n`);

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║ Next Steps                                                 ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('The polling service will pick up this request within 5 minutes.');
    console.log('You can monitor progress with:\n');
    console.log('  1. Check logs:');
    console.log('     tail -f /var/log/claude-article-writer.log\n');
    console.log('  2. Check request status:');
    console.log(`     node scripts/check-request-status.js ${savedRequest._id}\n`);
    console.log('  3. Monitor MongoDB:');
    console.log('     Watch the ArticleRequest document for status updates\n');

    console.log('Expected timeline:');
    console.log('  • 0-5 min:  Polling service detects request');
    console.log('  • 5-10 min: Claude Code writes article');
    console.log('  • 10-15 min: Article committed and pushed to GitHub\n');

    console.log('When complete, the article will be at:');
    console.log('  src/posts/2025/[slug].mdx\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

createTestRequest();
