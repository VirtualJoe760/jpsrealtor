# Testing Article Search Integration

## Overview

The AI-powered article search feature allows the chat to search your blog articles and provide answers with citations, thumbnails, and source links.

---

## Quick Test

### Test from Homepage (No Login Required)

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Open homepage:**
   ```
   http://localhost:3000
   ```

3. **Use the chat widget and ask:**
   - "What are energy costs like in Coachella Valley?"
   - "Tell me about hidden costs of homeownership"
   - "What should first-time buyers know?"

4. **Expected Result:**
   - AI searches articles first
   - Displays article cards with images
   - Shows title, excerpt, date, category
   - Provides answer with citation
   - Includes "Read more" link to full article

---

## How It Works

### 1. User Asks Question

```
User: "What are energy costs like in Coachella Valley?"
```

### 2. AI Searches Articles

The chat automatically:
1. Calls `searchArticles` tool
2. Searches MongoDB for relevant articles
3. Uses text search + keyword matching
4. Returns top 5 most relevant articles

### 3. AI Responds with Citation

```
Based on our article "Hidden Costs of Home Ownership", here's what you
need to know about energy costs in the Coachella Valley...

[Article cards displayed with images]

Electricity costs vary by provider:
- SCE: Higher rates, west of Washington St
- IID: Lower rates, La Quinta/Indio

Summer cooling: $500+ monthly for larger properties.

Source: Hidden Costs of Home Ownership - Read more: /articles/hidden-costs-of-homeownership
```

### 4. User Clicks Article

- Opens in new tab
- Full article with images, content, and SEO
- Professional layout with theme support

---

## API Testing

### Test Search Endpoint Directly

```bash
# Test text search
curl -X POST http://localhost:3000/api/articles/search \
  -H "Content-Type: application/json" \
  -d '{"query": "energy costs coachella valley", "limit": 5}'

# Expected response:
{
  "success": true,
  "results": [
    {
      "_id": "...",
      "title": "Hidden Costs of Home Ownership: What to Budget For",
      "slug": "hidden-costs-of-home-ownership",
      "excerpt": "Discover the unexpected costs...",
      "category": "articles",
      "featuredImage": {
        "url": "https://res.cloudinary.com/...",
        "alt": "A modern desert home..."
      },
      "seo": {
        "description": "...",
        "keywords": ["energy costs", "coachella valley", ...]
      },
      "publishedAt": "2025-03-16T...",
      "relevanceScore": 1.5
    }
  ],
  "query": "energy costs coachella valley",
  "method": "text_search"
}
```

---

## Testing Different Queries

### Market Questions
- "What's the market like in Palm Desert?"
- "Tell me about Coachella Valley real estate trends"

### Cost Questions
- "What are HOA fees in the desert?"
- "Hidden costs of buying a home?"
- "Energy costs comparison SCE vs IID"

### Buying/Selling Tips
- "First-time homebuyer tips"
- "How to sell my home in summer?"
- "Best neighborhoods for families"

### Expected Behavior

**Articles Found:**
- Displays 1-5 article cards in grid
- Shows images, titles, excerpts
- Includes "Highly Relevant" badge if score > 0.7
- Opens in new tab when clicked

**No Articles Found:**
- AI provides general answer
- May suggest topics for future articles
- No article cards displayed

---

## Component Structure

### Article Card Display

```tsx
// Rendered in chat when articles found
<ArticleResults
  results={[
    {
      _id: "...",
      title: "Article Title",
      slug: "article-slug",
      excerpt: "Brief description...",
      category: "real-estate-tips",
      featuredImage: {
        url: "https://...",
        alt: "Image description"
      },
      seo: {
        description: "SEO description",
        keywords: ["keyword1", "keyword2"]
      },
      publishedAt: "2025-03-16",
      relevanceScore: 0.95
    }
  ]}
  query="user's search query"
/>
```

### Features

- **Featured Image**: 16:9 ratio, hover zoom effect
- **Category Badge**: Color-coded by category
- **Relevance Badge**: Shows "Highly Relevant" if score > 0.7
- **Title**: 2-line clamp, hover color change
- **Excerpt**: 3-line clamp
- **Date**: Human-readable format
- **Keywords**: First 3 displayed
- **External Link**: Opens in new tab

---

## Theme Support

### Light Mode
- Blue accents
- White cards with subtle shadows
- Gray text hierarchy
- Blue category badges

### Dark Mode
- Emerald/purple accents
- Dark cards with borders
- White/gray text
- Emerald category badges

Both themes auto-adjust based on user preference.

---

## Search Algorithm

### Priority Order

1. **MongoDB Text Search**
   - Full-text search on title, excerpt, content
   - Returns relevance scores
   - Fast and accurate

2. **Keyword Fallback**
   - Regex search on title, excerpt, keywords
   - Used if text search returns no results
   - Broader matching

3. **No Results**
   - Returns empty array
   - AI provides general answer

### Keyword Extraction

Automatically filters stop words:
- Removes: "the", "is", "are", "what", "how", etc.
- Keeps: meaningful terms 3+ chars
- De-duplicates results

---

## Troubleshooting

### Articles Not Appearing

**Check MongoDB Connection:**
```bash
# Verify MongoDB is running
mongosh "mongodb://localhost:27017/payload" --eval "db.articles.countDocuments({status: 'published'})"
```

**Check Article Status:**
- Only `status: "published"` articles are searchable
- Draft articles are excluded

**Check Search Index:**
```javascript
// In MongoDB, verify text index exists
db.articles.getIndexes()
// Should include text index on title, excerpt, content
```

### API Errors

**500 Error:**
- Check MongoDB connection
- Verify Article model exists
- Check server logs

**Empty Results:**
- Try broader search terms
- Check if articles exist with `status: "published"`
- Verify keywords in article metadata

---

## Admin Access (Requires Login)

To create/manage articles:

1. **Sign in:**
   ```
   http://localhost:3000/auth/signin
   ```

2. **Access admin:**
   ```
   http://localhost:3000/admin/articles
   ```

3. **Create article:**
   ```
   http://localhost:3000/admin/articles/new
   ```

### Security Note

Admin routes are protected:
- Require authentication via NextAuth
- Redirect to `/auth/signin` if not logged in
- Session-based authorization

---

## Performance

### Search Speed
- Text search: ~10-50ms
- Keyword fallback: ~50-100ms
- Total API response: ~100-200ms

### Caching
- MongoDB indexes for fast search
- No client-side caching (fresh results)
- Future: Redis cache for popular queries

---

## Integration Points

### 1. Chat Stream (`/api/chat/stream`)
- Includes `searchArticles` tool
- Priority: Search articles before general responses
- Auto-formats results with `[ARTICLE_RESULTS]` markers

### 2. Article Search API (`/api/articles/search`)
- POST endpoint
- Accepts `query` and optional `limit`
- Returns structured results with relevance scores

### 3. Chat Components
- `ArticleCard.tsx` - Individual article display
- `ArticleResults.tsx` - Grid of articles
- `ChatWidget.tsx` - Renders articles in chat

### 4. Data Flow

```
User Question
    ↓
Chat API (/api/chat/stream)
    ↓
searchArticles Tool Call
    ↓
Article Search API (/api/articles/search)
    ↓
MongoDB Text Search
    ↓
Return Results
    ↓
AI Formats Response with [ARTICLE_RESULTS]
    ↓
Chat Widget Parses & Displays ArticleCards
```

---

## Example Test Script

Create a test file to verify integration:

```javascript
// test-article-search.js
async function testArticleSearch() {
  const query = "energy costs coachella valley";

  console.log("Testing article search API...");
  console.log("Query:", query);

  const response = await fetch("http://localhost:3000/api/articles/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, limit: 5 })
  });

  const data = await response.json();

  console.log("\nResults:");
  console.log("- Success:", data.success);
  console.log("- Method:", data.method);
  console.log("- Found:", data.results.length, "articles");

  if (data.results.length > 0) {
    console.log("\nTop Result:");
    console.log("- Title:", data.results[0].title);
    console.log("- Category:", data.results[0].category);
    console.log("- Relevance:", data.results[0].relevanceScore);
  }
}

testArticleSearch();
```

Run with:
```bash
node test-article-search.js
```

---

## Next Steps

1. **Test the feature** - Use the chat on homepage
2. **Create more articles** - Sign in and add content
3. **Monitor usage** - Check which topics get searched
4. **Optimize** - Add Redis caching if needed
5. **Expand** - Add more articles for comprehensive coverage

---

## Documentation References

- [VPS Claude Content Writer Guide](./VPS_CLAUDE_CONTENT_WRITER.md) - For creating articles
- [Responsive Design Guide](./RESPONSIVE_DESIGN.md) - For UI patterns
- [Frontend Architecture](./FRONTEND_ARCHITECTURE.md) - For system overview

---

*Last Updated: 2024-12-20*
*Version: 1.0*
