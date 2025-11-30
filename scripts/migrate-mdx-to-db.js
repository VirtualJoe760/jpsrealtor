// scripts/migrate-mdx-to-db.js
// Migrate existing MDX posts to MongoDB Article collection

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const mongoose = require('mongoose');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;

// Article schema (must match src/models/article.ts)
const ArticleSchema = new mongoose.Schema({
  title: String,
  slug: String,
  excerpt: String,
  content: String,
  category: String,
  tags: [String],
  publishedAt: Date,
  year: Number,
  month: Number,
  status: String,
  featured: Boolean,
  featuredImage: {
    url: String,
    publicId: String,
    alt: String,
  },
  ogImage: {
    url: String,
    publicId: String,
  },
  seo: {
    title: String,
    description: String,
    keywords: [String],
  },
  author: {
    id: mongoose.Schema.Types.ObjectId,
    name: String,
    email: String,
  },
  metadata: {
    views: Number,
    readTime: Number,
  },
}, {
  timestamps: true,
  collection: 'articles',
});

const Article = mongoose.models.Article || mongoose.model('Article', ArticleSchema);

// Posts directory
const POSTS_DIR = path.join(__dirname, '../src/posts');

// Helper: Calculate read time
function calculateReadTime(content) {
  const wordsPerMinute = 200;
  const wordCount = content.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}

// Helper: Parse date from MM/DD/YYYY format
function parseDate(dateString) {
  if (!dateString) return new Date();

  const [month, day, year] = dateString.split('/');
  return new Date(year, parseInt(month) - 1, day);
}

// Helper: Generate slug from title or use slugId
function generateSlug(title, slugId) {
  if (slugId) return slugId;

  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Helper: Map section to category
function mapSectionToCategory(section) {
  const mapping = {
    'articles': 'articles',
    'market-insights': 'market-insights',
    'real-estate-tips': 'real-estate-tips',
  };

  return mapping[section] || 'articles';
}

// Main migration function
async function migrate() {
  try {
    console.log('🚀 Starting MDX to MongoDB migration...\n');

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Read all MDX files
    const files = fs.readdirSync(POSTS_DIR).filter(file => file.endsWith('.mdx'));
    console.log(`📄 Found ${files.length} MDX files\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const file of files) {
      try {
        const filePath = path.join(POSTS_DIR, file);
        const fileContent = fs.readFileSync(filePath, 'utf8');

        // Parse frontmatter
        const { data: frontmatter, content } = matter(fileContent);

        console.log(`📝 Processing: ${frontmatter.title || file}`);

        // Check if already exists
        const slug = generateSlug(frontmatter.title, frontmatter.slugId);
        const existing = await Article.findOne({ slug });

        if (existing) {
          console.log(`   ⏭️  Skipped (already exists): ${slug}\n`);
          skipCount++;
          continue;
        }

        // Parse date
        const publishedAt = parseDate(frontmatter.date);

        // Create article document
        const article = new Article({
          title: frontmatter.title || 'Untitled',
          slug,
          excerpt: frontmatter.metaDescription || frontmatter.description || content.substring(0, 300),
          content,
          category: mapSectionToCategory(frontmatter.section),
          tags: frontmatter.keywords || [],
          publishedAt,
          year: publishedAt.getFullYear(),
          month: publishedAt.getMonth() + 1,
          status: 'published',
          featured: false,
          featuredImage: {
            url: frontmatter.image || frontmatter.ogImage || '',
            publicId: '', // Will need to upload to Cloudinary separately
            alt: frontmatter.altText || frontmatter.title || '',
          },
          ogImage: frontmatter.ogImage ? {
            url: frontmatter.ogImage,
            publicId: '',
          } : undefined,
          seo: {
            title: frontmatter.metaTitle || frontmatter.title || '',
            description: frontmatter.metaDescription || '',
            keywords: frontmatter.keywords || [],
          },
          author: {
            id: new mongoose.Types.ObjectId(), // Default author ID
            name: 'Joseph Sardella',
            email: 'josephsardella@gmail.com',
          },
          metadata: {
            views: 0,
            readTime: calculateReadTime(content),
          },
        });

        // Save to database
        await article.save();

        console.log(`   ✅ Migrated: ${slug}`);
        console.log(`      Category: ${article.category}`);
        console.log(`      Published: ${publishedAt.toLocaleDateString()}`);
        console.log(`      Read time: ${article.metadata.readTime} min\n`);

        successCount++;
      } catch (error) {
        console.error(`   ❌ Error processing ${file}:`, error.message, '\n');
        errorCount++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(50));
    console.log(`✅ Successfully migrated: ${successCount}`);
    console.log(`⏭️  Skipped (already exist): ${skipCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📄 Total files: ${files.length}`);
    console.log('='.repeat(50) + '\n');

    // Verify count
    const totalArticles = await Article.countDocuments();
    console.log(`📚 Total articles in database: ${totalArticles}\n`);

    // Close connection
    await mongoose.connection.close();
    console.log('👋 Migration complete!\n');

    process.exit(0);
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrate();
