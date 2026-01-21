// scripts/update-energy-articles.js
// Script to update energy cost articles with accurate 2025 data

const mongoose = require('mongoose');

// MongoDB connection
const MONGODB_URI = 'mongodb+srv://doadmin:34NTsG9dz72Y850F@jpsrealtor-mongodb-911080c1.mongo.ondigitalocean.com/admin?retryWrites=true&w=majority';

// Define Article schema
const articleSchema = new mongoose.Schema({
  title: String,
  slug: String,
  excerpt: String,
  content: String,
  category: String,
  status: String,
  seo: {
    description: String,
    keywords: [String]
  }
}, { strict: false });

async function updateEnergyArticles() {
  try {
    console.log('📚 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get or create Article model
    const Article = mongoose.models.Article || mongoose.model('Article', articleSchema, 'articles');

    // Find the 3 energy cost articles
    const articles = await Article.find({
      $or: [
        { slug: 'understanding-energy-costs-in-coachella-valley' },
        { slug: 'coachella-valley-energy-costs' },
        { slug: 'hidden-costs-of-home-ownership' }
      ]
    });

    console.log(`\n📄 Found ${articles.length} articles to review:\n`);

    articles.forEach((article, idx) => {
      console.log(`${idx + 1}. ${article.title}`);
      console.log(`   Slug: ${article.slug}`);
      console.log(`   Category: ${article.category}`);
      console.log(`   Status: ${article.status}`);
      console.log('');
    });

    // Print current content excerpt to see what needs updating
    console.log('\n📋 Current Content Excerpts:\n');
    articles.forEach((article, idx) => {
      console.log(`\n━━━ Article ${idx + 1}: ${article.title} ━━━`);
      console.log(`Excerpt: ${article.excerpt || 'No excerpt'}`);
      if (article.content) {
        const contentPreview = article.content.substring(0, 500);
        console.log(`\nContent preview:\n${contentPreview}...`);
      }
    });

    console.log('\n\n✅ Article review complete. Ready to update with accurate data.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

// Run the script
updateEnergyArticles();
