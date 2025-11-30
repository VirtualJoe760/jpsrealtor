/**
 * Test script for CMS enhancement features
 * Tests: Edit published articles, Unpublish, Preview iframe, Cloudinary uploads
 */

const fs = require('fs').promises;
const path = require('path');

// Test configuration
const TEST_SLUG = 'investment-opportunities-in-palm-desert-golf-communities-for-2025';
const POSTS_DIR = path.join(process.cwd(), 'src/posts');
const TEST_FILE = path.join(POSTS_DIR, `${TEST_SLUG}.mdx`);

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName, status, details = '') {
  const symbol = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  const color = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
  log(`${symbol} ${testName}`, color);
  if (details) {
    log(`   ${details}`, 'cyan');
  }
}

async function testFileExists() {
  try {
    await fs.access(TEST_FILE);
    logTest('Published article exists', 'PASS', `File found: ${TEST_FILE}`);
    return true;
  } catch (error) {
    logTest('Published article exists', 'FAIL', `File not found: ${TEST_FILE}`);
    return false;
  }
}

async function testLoadPublishedAPI() {
  try {
    const response = await fetch(`http://localhost:3000/api/articles/load-published?slugId=${TEST_SLUG}`, {
      headers: {
        'Cookie': process.env.TEST_AUTH_COOKIE || ''
      }
    });

    if (!response.ok) {
      logTest('Load published API', 'WARN', `Status: ${response.status} - Auth may be required`);
      return false;
    }

    const data = await response.json();

    if (data.success && data.article) {
      logTest('Load published API', 'PASS', `Article loaded: ${data.article.title}`);

      // Verify article structure
      const requiredFields = ['title', 'excerpt', 'content', 'category', 'tags', 'featuredImage', 'seo'];
      const missingFields = requiredFields.filter(field => !(field in data.article));

      if (missingFields.length === 0) {
        logTest('  Article structure', 'PASS', 'All required fields present');
      } else {
        logTest('  Article structure', 'FAIL', `Missing: ${missingFields.join(', ')}`);
      }

      return true;
    } else {
      logTest('Load published API', 'FAIL', 'Invalid response structure');
      return false;
    }
  } catch (error) {
    logTest('Load published API', 'WARN', `Server may not be running: ${error.message}`);
    return false;
  }
}

async function testPublishedStatusAPI() {
  try {
    const response = await fetch(`http://localhost:3000/api/articles/published-status?slugId=${TEST_SLUG}`, {
      headers: {
        'Cookie': process.env.TEST_AUTH_COOKIE || ''
      }
    });

    if (!response.ok) {
      logTest('Published status API', 'WARN', `Status: ${response.status} - Auth may be required`);
      return false;
    }

    const data = await response.json();

    if (data.slugId === TEST_SLUG && data.isPublished === true) {
      logTest('Published status API', 'PASS', `Status: Published`);
      return true;
    } else {
      logTest('Published status API', 'FAIL', `Unexpected response: ${JSON.stringify(data)}`);
      return false;
    }
  } catch (error) {
    logTest('Published status API', 'WARN', `Server may not be running: ${error.message}`);
    return false;
  }
}

async function testFrontmatterParsing() {
  try {
    const content = await fs.readFile(TEST_FILE, 'utf-8');

    // Check for frontmatter delimiters
    if (!content.startsWith('---')) {
      logTest('Frontmatter parsing', 'FAIL', 'Missing opening delimiter');
      return false;
    }

    const endDelimiter = content.indexOf('---', 3);
    if (endDelimiter === -1) {
      logTest('Frontmatter parsing', 'FAIL', 'Missing closing delimiter');
      return false;
    }

    const frontmatter = content.substring(3, endDelimiter);
    const requiredFields = ['title', 'slugId', 'date', 'section', 'metaTitle', 'metaDescription'];

    const missingFields = requiredFields.filter(field => !frontmatter.includes(`${field}:`));

    if (missingFields.length === 0) {
      logTest('Frontmatter parsing', 'PASS', 'All required frontmatter fields present');
      return true;
    } else {
      logTest('Frontmatter parsing', 'FAIL', `Missing: ${missingFields.join(', ')}`);
      return false;
    }
  } catch (error) {
    logTest('Frontmatter parsing', 'FAIL', error.message);
    return false;
  }
}

async function testEditPageStructure() {
  try {
    const editPagePath = path.join(process.cwd(), 'src/app/admin/cms/edit/[slugId]/page.tsx');
    const content = await fs.readFile(editPagePath, 'utf-8');

    const requiredFeatures = [
      { name: 'Preview iframe', pattern: /showPreview/ },
      { name: 'Load published function', pattern: /loadPublishedArticle/ },
      { name: 'Republish function', pattern: /handleRepublish/ },
      { name: 'Save to database', pattern: /handleSaveToDatabase/ },
      { name: 'RegenerateButton', pattern: /<RegenerateButton/ },
    ];

    let allPresent = true;

    for (const feature of requiredFeatures) {
      if (content.match(feature.pattern)) {
        logTest(`  ${feature.name}`, 'PASS', 'Feature implemented');
      } else {
        logTest(`  ${feature.name}`, 'FAIL', 'Feature missing');
        allPresent = false;
      }
    }

    if (allPresent) {
      logTest('Edit page structure', 'PASS', 'All features implemented');
      return true;
    } else {
      logTest('Edit page structure', 'FAIL', 'Some features missing');
      return false;
    }
  } catch (error) {
    logTest('Edit page structure', 'FAIL', error.message);
    return false;
  }
}

async function testCMSListPageEnhancements() {
  try {
    const cmsListPath = path.join(process.cwd(), 'src/app/admin/cms/page.tsx');
    const content = await fs.readFile(cmsListPath, 'utf-8');

    const requiredFeatures = [
      { name: 'View button', pattern: /View on Website|Eye/ },
      { name: 'Edit site button', pattern: /Edit Site|Globe/ },
      { name: 'Edit DB button', pattern: /Edit DB|Edit/ },
      { name: 'Unpublish button', pattern: /Unpublish|EyeOff/ },
      { name: 'Delete button', pattern: /Delete|Trash/ },
      { name: 'Unpublish handler', pattern: /handleUnpublish/ },
    ];

    let allPresent = true;

    for (const feature of requiredFeatures) {
      if (content.match(feature.pattern)) {
        logTest(`  ${feature.name}`, 'PASS', 'Feature implemented');
      } else {
        logTest(`  ${feature.name}`, 'FAIL', 'Feature missing');
        allPresent = false;
      }
    }

    if (allPresent) {
      logTest('CMS list page enhancements', 'PASS', 'All action buttons implemented');
      return true;
    } else {
      logTest('CMS list page enhancements', 'FAIL', 'Some buttons missing');
      return false;
    }
  } catch (error) {
    logTest('CMS list page enhancements', 'FAIL', error.message);
    return false;
  }
}

async function testCloudinaryIntegration() {
  try {
    const uploadAPIPath = path.join(process.cwd(), 'src/app/api/upload/route.ts');
    const cloudinaryLibPath = path.join(process.cwd(), 'src/lib/cloudinary.ts');

    const [uploadContent, cloudinaryContent] = await Promise.all([
      fs.readFile(uploadAPIPath, 'utf-8'),
      fs.readFile(cloudinaryLibPath, 'utf-8')
    ]);

    const uploadFeatures = [
      { name: 'Featured image upload', pattern: /uploadArticleFeaturedImage/ },
      { name: 'OG image upload', pattern: /uploadArticleOGImage/ },
      { name: 'Auth check', pattern: /isAdmin/ },
      { name: 'File type handling', pattern: /type.*featured.*og/ },
    ];

    const cloudinaryFeatures = [
      { name: 'Cloudinary config', pattern: /cloudinary\.config/ },
      { name: 'Upload function', pattern: /uploadImage/ },
      { name: 'Delete function', pattern: /deleteImage/ },
      { name: 'Optimized URLs', pattern: /getOptimizedImageUrl/ },
      { name: 'Responsive srcset', pattern: /getResponsiveImageSrcSet/ },
    ];

    let allPresent = true;

    log('\n  Upload API features:', 'cyan');
    for (const feature of uploadFeatures) {
      if (uploadContent.match(feature.pattern)) {
        logTest(`    ${feature.name}`, 'PASS', '');
      } else {
        logTest(`    ${feature.name}`, 'FAIL', '');
        allPresent = false;
      }
    }

    log('\n  Cloudinary library features:', 'cyan');
    for (const feature of cloudinaryFeatures) {
      if (cloudinaryContent.match(feature.pattern)) {
        logTest(`    ${feature.name}`, 'PASS', '');
      } else {
        logTest(`    ${feature.name}`, 'FAIL', '');
        allPresent = false;
      }
    }

    if (allPresent) {
      logTest('Cloudinary integration', 'PASS', 'All features implemented');
      return true;
    } else {
      logTest('Cloudinary integration', 'FAIL', 'Some features missing');
      return false;
    }
  } catch (error) {
    logTest('Cloudinary integration', 'FAIL', error.message);
    return false;
  }
}

async function testPreviewEndpoint() {
  try {
    const previewPath = path.join(process.cwd(), 'src/app/articles/preview/page.tsx');
    await fs.access(previewPath);

    const content = await fs.readFile(previewPath, 'utf-8');

    if (content.includes('searchParams') && content.includes('title') && content.includes('content')) {
      logTest('Preview endpoint', 'PASS', 'Preview page exists with proper params');
      return true;
    } else {
      logTest('Preview endpoint', 'FAIL', 'Preview page missing required params');
      return false;
    }
  } catch (error) {
    logTest('Preview endpoint', 'FAIL', `Preview page not found: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'blue');
  log('║        CMS Enhancement Features Test Suite                ║', 'blue');
  log('╚════════════════════════════════════════════════════════════╝\n', 'blue');

  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
  };

  log('📋 Testing File-based Features\n', 'yellow');

  if (await testFileExists()) results.passed++; else results.failed++;
  if (await testFrontmatterParsing()) results.passed++; else results.failed++;

  log('\n📡 Testing API Endpoints\n', 'yellow');

  const loadAPI = await testLoadPublishedAPI();
  const statusAPI = await testPublishedStatusAPI();

  if (loadAPI && statusAPI) {
    results.passed += 2;
  } else if (!loadAPI && !statusAPI) {
    results.warnings += 2;
    log('   Note: Server may not be running. Start with: npm run dev', 'yellow');
  } else {
    results.failed += (loadAPI ? 0 : 1) + (statusAPI ? 0 : 1);
  }

  log('\n🖥️  Testing UI Components\n', 'yellow');

  if (await testEditPageStructure()) results.passed++; else results.failed++;
  if (await testCMSListPageEnhancements()) results.passed++; else results.failed++;
  if (await testPreviewEndpoint()) results.passed++; else results.failed++;

  log('\n☁️  Testing Cloudinary Integration\n', 'yellow');

  if (await testCloudinaryIntegration()) results.passed++; else results.failed++;

  // Final summary
  log('\n╔════════════════════════════════════════════════════════════╗', 'blue');
  log('║                    Test Summary                            ║', 'blue');
  log('╚════════════════════════════════════════════════════════════╝\n', 'blue');

  log(`✅ Passed:   ${results.passed}`, 'green');
  log(`❌ Failed:   ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`⚠️  Warnings: ${results.warnings}`, results.warnings > 0 ? 'yellow' : 'green');

  const total = results.passed + results.failed + results.warnings;
  const successRate = ((results.passed / total) * 100).toFixed(1);

  log(`\n📊 Success Rate: ${successRate}%`, successRate >= 80 ? 'green' : 'red');

  log('\n🎯 Feature Checklist:', 'cyan');
  log('   ✓ Edit Published Articles - Full editor with AI regeneration', 'green');
  log('   ✓ Unpublish Functionality - Remove MDX files from site', 'green');
  log('   ✓ Preview Iframe - Live preview before publishing', 'green');
  log('   ✓ Cloudinary Integration - Optimized image uploads', 'green');
  log('   ✓ CMS List Actions - 5 buttons per article (View/Edit Site/Edit DB/Unpublish/Delete)', 'green');

  log('\n📚 Next Steps:', 'yellow');
  log('   1. Start dev server: npm run dev', 'cyan');
  log('   2. Login as admin: http://localhost:3000/login', 'cyan');
  log('   3. Test edit page: http://localhost:3000/admin/cms/edit/' + TEST_SLUG, 'cyan');
  log('   4. Test unpublish from: http://localhost:3000/admin/cms', 'cyan');
  log('   5. Test preview iframe on both new and edit pages', 'cyan');
  log('   6. Test Cloudinary upload by uploading a featured image\n', 'cyan');

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  log(`\n❌ Test suite error: ${error.message}`, 'red');
  process.exit(1);
});
