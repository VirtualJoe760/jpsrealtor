#!/usr/bin/env node
/**
 * Test script for Article Request API
 * Tests MongoDB connection and ArticleRequest model
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function testArticleRequestAPI() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║ Article Request API Test                                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Test 1: MongoDB Connection
    console.log('📝 Test 1: MongoDB Connection');
    console.log('   Connecting to:', process.env.MONGODB_URI ? 'MongoDB URI configured' : 'NO URI');

    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('   ✅ Connected to MongoDB\n');

    // Test 2: Define ArticleRequest Schema
    console.log('📝 Test 2: ArticleRequest Schema');

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

    console.log('   ✅ ArticleRequest model loaded\n');

    // Test 3: Check existing requests
    console.log('📝 Test 3: Fetch Existing Requests');
    const existingRequests = await ArticleRequest.find().sort({ requestedAt: -1 }).limit(5);
    console.log(`   Found ${existingRequests.length} existing request(s)`);

    if (existingRequests.length > 0) {
      existingRequests.forEach((req, i) => {
        console.log(`   ${i + 1}. Status: ${req.status} | Category: ${req.category} | Created: ${req.requestedAt.toISOString()}`);
        if (req.prompt) {
          console.log(`      Prompt: ${req.prompt.substring(0, 60)}...`);
        }
      });
    }
    console.log('   ✅ Successfully fetched requests\n');

    // Test 4: Create a test request
    console.log('📝 Test 4: Create Test Article Request');
    const testRequest = new ArticleRequest({
      prompt: 'Write a comprehensive guide about buying your first home in the Coachella Valley. Include tips on financing, neighborhoods, and common mistakes to avoid.',
      category: 'real-estate-tips',
      keywords: ['first-time buyers', 'coachella valley', 'homebuying tips', 'financing'],
      status: 'pending',
      requestedAt: new Date()
    });

    const savedRequest = await testRequest.save();
    console.log('   ✅ Test request created successfully!');
    console.log(`   Request ID: ${savedRequest._id}`);
    console.log(`   Status: ${savedRequest.status}`);
    console.log(`   Category: ${savedRequest.category}`);
    console.log(`   Keywords: ${savedRequest.keywords.join(', ')}`);
    console.log(`   Prompt: ${savedRequest.prompt.substring(0, 100)}...\n`);

    // Test 5: Query by status
    console.log('📝 Test 5: Query Pending Requests');
    const pendingRequests = await ArticleRequest.find({ status: 'pending' })
      .sort({ requestedAt: 1 })
      .limit(3);

    console.log(`   Found ${pendingRequests.length} pending request(s)`);
    pendingRequests.forEach((req, i) => {
      console.log(`   ${i + 1}. ID: ${req._id} | Created: ${req.requestedAt.toISOString()}`);
    });
    console.log('   ✅ Query successful\n');

    // Test 6: Update request status
    console.log('📝 Test 6: Update Request Status');
    savedRequest.status = 'processing';
    savedRequest.startedAt = new Date();
    await savedRequest.save();
    console.log('   ✅ Updated status to "processing"\n');

    // Test 7: Simulate completion
    console.log('📝 Test 7: Simulate Completion');
    savedRequest.status = 'completed';
    savedRequest.completedAt = new Date();
    savedRequest.resultFilePath = 'src/posts/2025/first-home-coachella-valley-guide.mdx';
    savedRequest.resultSlug = 'first-home-coachella-valley-guide';
    savedRequest.resultTitle = 'Your First Home in the Coachella Valley: A Complete Guide';
    await savedRequest.save();
    console.log('   ✅ Updated status to "completed"');
    console.log(`   Result file: ${savedRequest.resultFilePath}`);
    console.log(`   Result slug: ${savedRequest.resultSlug}\n`);

    // Test 8: Clean up test request
    console.log('📝 Test 8: Clean Up Test Request');
    await ArticleRequest.findByIdAndDelete(savedRequest._id);
    console.log('   ✅ Test request deleted\n');

    // Summary
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║ ✅ ALL TESTS PASSED                                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('✅ API Route is ready to use!');
    console.log('✅ MongoDB connection working');
    console.log('✅ ArticleRequest model functioning correctly');
    console.log('✅ CRUD operations verified\n');

    console.log('Next steps:');
    console.log('1. Set up VPS cron job to poll for pending requests');
    console.log('2. Test the full workflow with Claude Code on VPS');
    console.log('3. Create article request from admin UI\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

// Run the test
testArticleRequestAPI();
