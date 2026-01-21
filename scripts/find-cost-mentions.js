// scripts/find-cost-mentions.js
const mongoose = require('mongoose');
const MONGODB_URI = 'mongodb+srv://doadmin:34NTsG9dz72Y850F@jpsrealtor-mongodb-911080c1.mongo.ondigitalocean.com/admin?retryWrites=true&w=majority';

const articleSchema = new mongoose.Schema({}, { strict: false });

async function findCosts() {
  await mongoose.connect(MONGODB_URI);
  const Article = mongoose.models.Article || mongoose.model('Article', articleSchema, 'articles');

  const articles = await Article.find({
    slug: { $in: ['understanding-energy-costs-in-coachella-valley', 'coachella-valley-energy-costs', 'hidden-costs-of-home-ownership'] }
  }).select('title slug content');

  articles.forEach(article => {
    console.log(`\n━━━ ${article.title} ━━━`);
    console.log(`Slug: ${article.slug}\n`);

    // Search for dollar amounts in ranges
    const dollarMatches = article.content.match(/\$[0-9]{2,4}[^a-zA-Z0-9]*(?:to|–|-|and)[^a-zA-Z0-9]*\$[0-9]{2,4}/g);
    if (dollarMatches) {
      console.log('Found cost ranges:');
      dollarMatches.forEach(match => console.log('  -', match));
    }

    // Search for monthly bill mentions
    const billMatches = article.content.match(/.{0,150}(?:monthly|month|summer).*?\$[0-9]{2,4}.{0,150}/gi);
    if (billMatches) {
      console.log('\nFound monthly/summer bill mentions:');
      billMatches.slice(0, 10).forEach(match => console.log('  -', match.trim().substring(0, 200)));
    }
  });

  await mongoose.connection.close();
}

findCosts().catch(console.error);
