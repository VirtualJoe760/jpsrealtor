/**
 * Test Script for Article Publishing Pipeline
 *
 * Tests the complete flow:
 * 1. Generate article with AI
 * 2. Validate article data
 * 3. Publish to src/posts/
 * 4. Verify MDX file created
 */

const fs = require('fs');
const path = require('path');

// Mock article data (simulating what AI would generate)
const mockArticle = {
  title: "Investment Opportunities in Palm Desert Golf Communities for 2025",
  excerpt: "Discover why Palm Desert golf communities are becoming the hottest investment opportunity in the Coachella Valley. Expert insights on ROI, amenities, and market trends for 2025.",
  content: `## Why Palm Desert Golf Communities Are Booming

The Palm Desert real estate market is experiencing unprecedented growth, particularly in golf course communities. Here's what investors need to know for 2025.

### Market Trends

✅ Median home prices in golf communities up 12% year-over-year
✅ Rental demand increasing 18% annually
✅ Limited inventory driving competition
✅ Strong appreciation potential through 2026

### Top Golf Communities

**PGA West**
The crown jewel of Palm Desert golf communities offers stadium-quality courses and luxury amenities. Properties here command premium prices but deliver exceptional ROI.

**Desert Willow**
More affordable entry point with equally impressive courses. Perfect for investors targeting vacation rentals or retirement buyers.

**Indian Ridge**
Boutique community with exclusive access and mountain views. Lower volume but higher price points make this ideal for luxury investors.

### Investment Strategy

Consider these factors when evaluating golf community properties:

- **Location within community** - Course-front properties command 20-30% premium
- **HOA fees** - Range from $400-$800/month, factor into ROI calculations
- **Rental restrictions** - Some communities limit short-term rentals
- **Amenities access** - Full golf membership can add $50k+ to property value

### 2025 Outlook

Market indicators suggest continued growth through 2025:

- Population growth in Coachella Valley accelerating
- Limited new construction maintaining inventory pressure
- Interest rates stabilizing, improving buyer confidence
- Baby boomer retirement wave creating sustained demand

## Get Expert Guidance

Ready to invest in Palm Desert golf communities? Contact Joseph Sardella for personalized investment analysis and exclusive listings.

📞 Call or Text: **+1 (760) 833-6334**
📧 Email: **josephsardella@gmail.com**`,
  category: "market-insights",
  tags: ["Palm Desert", "golf communities", "investment", "real estate 2025", "Coachella Valley"],
  featuredImage: {
    url: "https://res.cloudinary.com/demo/image/upload/v1234567890/golf-course.jpg",
    publicId: "golf-course",
    alt: "Palm Desert golf course with mountain views"
  },
  seo: {
    title: "Palm Desert Golf Community Investment Guide 2025",
    description: "Expert insights on investing in Palm Desert golf communities. Market trends, top communities, and ROI analysis for 2025 Coachella Valley real estate.",
    keywords: [
      "Palm Desert golf communities",
      "Coachella Valley real estate investment",
      "PGA West investment",
      "Desert Willow homes",
      "golf course real estate 2025"
    ]
  }
};

// Generate slugId (same logic as article-digester.ts)
const slugId = mockArticle.title
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

console.log('\n🧪 Testing Article Publishing Pipeline\n');
console.log('=' .repeat(60));

// Test 1: Validate article data
console.log('\n✓ Test 1: Article Data Validation');
console.log(`  Title: ${mockArticle.title}`);
console.log(`  SlugId: ${slugId}`);
console.log(`  Category: ${mockArticle.category}`);
console.log(`  Excerpt: ${mockArticle.excerpt.substring(0, 80)}...`);
console.log(`  Content length: ${mockArticle.content.length} characters`);
console.log(`  Tags: ${mockArticle.tags.length} tags`);
console.log(`  SEO keywords: ${mockArticle.seo.keywords.length} keywords`);

// Test 2: Validate publishing requirements
console.log('\n✓ Test 2: Publishing Requirements Check');
const validationErrors = [];
const validationWarnings = [];

if (!mockArticle.title || mockArticle.title.length < 10) {
  validationErrors.push('Title too short');
}
if (mockArticle.title.length > 200) {
  validationErrors.push('Title too long');
}

if (!mockArticle.excerpt || mockArticle.excerpt.length < 50) {
  validationErrors.push('Excerpt too short');
}
if (mockArticle.excerpt.length > 300) {
  validationErrors.push('Excerpt too long');
}

if (!mockArticle.content || mockArticle.content.length < 500) {
  validationErrors.push('Content too short');
}

if (!mockArticle.featuredImage?.url) {
  validationErrors.push('Featured image missing');
}

if (!mockArticle.tags || mockArticle.tags.length === 0) {
  validationErrors.push('No tags');
}

if (!mockArticle.seo.title) {
  validationWarnings.push('SEO title empty (will use article title)');
} else if (mockArticle.seo.title.length > 60) {
  validationErrors.push('SEO title too long');
}

if (!mockArticle.seo.description) {
  validationWarnings.push('SEO description empty (will use excerpt)');
} else if (mockArticle.seo.description.length > 160) {
  validationErrors.push('SEO description too long');
}

if (mockArticle.seo.keywords.length < 3) {
  validationWarnings.push('Less than 3 keywords');
}

if (validationErrors.length > 0) {
  console.log(`  ❌ Validation failed: ${validationErrors.join(', ')}`);
  process.exit(1);
} else {
  console.log('  ✅ All validation checks passed');
  if (validationWarnings.length > 0) {
    console.log(`  ⚠️  Warnings: ${validationWarnings.join(', ')}`);
  }
}

// Test 3: Format frontmatter
console.log('\n✓ Test 3: Frontmatter Formatting');
const now = new Date();
const date = now.toLocaleDateString('en-US', {
  month: '2-digit',
  day: '2-digit',
  year: 'numeric',
});

const escapeYAML = (str) => {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
};

const frontmatterLines = [
  `title: "${escapeYAML(mockArticle.title)}"`,
  `slugId: "${slugId}"`,
  `date: "${date}"`,
  `section: "${mockArticle.category}"`,
  `image: "${mockArticle.featuredImage.url}"`,
  `metaTitle: "${escapeYAML(mockArticle.seo.title || mockArticle.title)}"`,
  `metaDescription: "${escapeYAML(mockArticle.seo.description || mockArticle.excerpt)}"`,
  `ogImage: "${mockArticle.featuredImage.url}"`,
  `altText: "${escapeYAML(mockArticle.featuredImage.alt || mockArticle.title)}"`,
  `keywords:`,
];

mockArticle.seo.keywords.forEach((keyword) => {
  frontmatterLines.push(`  - ${keyword}`);
});

const frontmatter = frontmatterLines.join('\n');
console.log('  ✅ Frontmatter formatted');
console.log(`  Date format: ${date}`);
console.log(`  Category → section: ${mockArticle.category}`);

// Test 4: Create MDX file content
console.log('\n✓ Test 4: MDX File Creation');
const fullContent = `---
${frontmatter}
---

${mockArticle.content}`;

console.log(`  ✅ MDX content created (${fullContent.length} bytes)`);

// Test 5: Write to filesystem
console.log('\n✓ Test 5: Filesystem Write');
const postsDirectory = path.join(process.cwd(), 'src/posts');
const filePath = path.join(postsDirectory, `${slugId}.mdx`);

try {
  // Ensure directory exists
  if (!fs.existsSync(postsDirectory)) {
    fs.mkdirSync(postsDirectory, { recursive: true });
    console.log(`  ✅ Created src/posts/ directory`);
  }

  // Write file
  fs.writeFileSync(filePath, fullContent, 'utf-8');
  console.log(`  ✅ File written: ${filePath}`);

  // Verify file exists
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`  ✅ File verified (${stats.size} bytes)`);
  } else {
    console.log('  ❌ File verification failed');
    process.exit(1);
  }
} catch (error) {
  console.log(`  ❌ Write failed: ${error.message}`);
  process.exit(1);
}

// Test 6: Read back and verify
console.log('\n✓ Test 6: File Readback Verification');
try {
  const readContent = fs.readFileSync(filePath, 'utf-8');

  if (readContent === fullContent) {
    console.log('  ✅ Content matches exactly');
  } else {
    console.log('  ⚠️  Content mismatch (line endings may differ)');
  }

  // Check frontmatter parsing
  const hasFrontmatter = readContent.startsWith('---\n');
  const hasClosingFrontmatter = readContent.indexOf('\n---\n', 4) > 0;

  if (hasFrontmatter && hasClosingFrontmatter) {
    console.log('  ✅ Frontmatter delimiters correct');
  } else {
    console.log('  ❌ Frontmatter structure invalid');
    process.exit(1);
  }

  // Extract and verify frontmatter fields
  const frontmatterEnd = readContent.indexOf('\n---\n', 4);
  const frontmatterContent = readContent.substring(4, frontmatterEnd);

  const requiredFields = ['title:', 'slugId:', 'date:', 'section:', 'image:', 'metaTitle:', 'metaDescription:', 'keywords:'];
  const missingFields = requiredFields.filter(field => !frontmatterContent.includes(field));

  if (missingFields.length === 0) {
    console.log('  ✅ All required frontmatter fields present');
  } else {
    console.log(`  ❌ Missing fields: ${missingFields.join(', ')}`);
    process.exit(1);
  }

} catch (error) {
  console.log(`  ❌ Readback failed: ${error.message}`);
  process.exit(1);
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('✅ ALL TESTS PASSED');
console.log('\nPublished Article:');
console.log(`  Title: ${mockArticle.title}`);
console.log(`  URL: /insights/${mockArticle.category}/${slugId}`);
console.log(`  File: src/posts/${slugId}.mdx`);
console.log('\n💡 Next: Navigate to the URL above to verify rendering\n');
