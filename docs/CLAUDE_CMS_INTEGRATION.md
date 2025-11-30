# Claude CMS Integration
**AI-Powered Article Drafting System**
**Last Updated:** January 29, 2025

---

## 📋 OVERVIEW

This system allows you to launch Claude AI directly from your admin CMS to draft, edit, and refine blog articles in real-time. No more copy-pasting from ChatGPT or writing from scratch - just describe what you want, and Claude will generate complete, SEO-optimized articles instantly.

---

## 🎯 KEY FEATURES

### Real-Time Article Drafting
- **"Draft with Claude" Button** - Click to launch Claude from the admin interface
- **Streaming Responses** - Watch as Claude writes your article in real-time
- **MDX Format** - Articles are generated with proper frontmatter and formatting
- **Auto-Population** - Form fields automatically fill as Claude generates content

### AI-Powered Content Creation
- **SEO Optimization** - Automatic keyword integration and meta tag generation
- **Category-Aware** - Claude understands your content categories
- **Tone Matching** - Professional yet conversational writing style
- **Market Expertise** - Specialized knowledge of Coachella Valley real estate

### Intelligent Editing
- **Edit Existing Articles** - Have Claude refine or expand current content
- **Guided Revisions** - Tell Claude what to change, and it updates accordingly
- **Consistency** - Maintains your brand voice across all content

---

## 🏗️ ARCHITECTURE

### File Structure

```
src/
├── app/
│   ├── api/
│   │   └── claude/
│   │       └── draft-article/
│   │           └── route.ts           # Claude drafting API (streaming)
│   └── admin/
│       └── articles/
│           ├── page.tsx                # Articles listing
│           └── new/
│               └── page.tsx            # Editor with "Draft with Claude" button
├── models/
│   └── article.ts                      # Article database model
└── lib/
    └── cloudinary.ts                   # Image hosting integration
```

### Technology Stack

```yaml
AI Engine:
  - Anthropic Claude Sonnet 4.5
  - @anthropic-ai/sdk
  - Streaming API for real-time generation

Database:
  - MongoDB (Article model)
  - Year/month organization
  - Category/tag taxonomy

Media:
  - Cloudinary CDN
  - Automatic image optimization
  - Featured + OG images

Frontend:
  - Next.js 16 App Router
  - Server-Sent Events (SSE) for streaming
  - Real-time form population
```

---

## 🔧 SETUP INSTRUCTIONS

### 1. Environment Variables

Add to your `.env` file:

```bash
# Anthropic API Key
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# Cloudinary (already configured)
CLOUDINARY_CLOUD_NAME=YOUR_CLOUD_NAME
CLOUDINARY_API_KEY=YOUR_CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET=YOUR_CLOUDINARY_API_SECRET

# MongoDB (already configured)
MONGODB_URI=your-mongodb-connection-string

# NextAuth (already configured)
NEXTAUTH_SECRET=your-secret-key
```

### 2. Get Your Anthropic API Key

1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Navigate to "API Keys"
4. Create a new key
5. Copy and add to `.env` as `ANTHROPIC_API_KEY`

### 3. Install Dependencies

Already installed:
```bash
npm install @anthropic-ai/sdk
```

---

## 💡 HOW TO USE

### Creating a New Article with Claude

1. **Navigate to Admin**
   - Go to `/admin/articles`
   - Click "New Article" button

2. **Launch Claude**
   - Click "Draft with Claude" (purple button with sparkles icon)
   - A modal will appear

3. **Describe Your Article**
   ```
   Example prompts:

   "Write an article about the benefits of investing in Palm Desert
   golf communities, focusing on ROI and lifestyle amenities"

   "Create a market insights post about current trends in La Quinta
   luxury real estate, include data on average prices and days on market"

   "Write a buyer's guide for first-time homebuyers in the Coachella
   Valley, covering financing, neighborhoods, and timing"
   ```

4. **Watch Claude Work**
   - Content appears in real-time in the editor
   - Title, excerpt, and SEO fields auto-populate
   - Tags and keywords are suggested

5. **Review and Refine**
   - Edit any generated content
   - Adjust SEO settings
   - Upload featured image via Cloudinary
   - Add or remove tags

6. **Publish or Save**
   - Click "Save Draft" to save without publishing
   - Click "Publish Now" to make live immediately

### Editing Existing Articles with Claude

1. Open an existing article for editing
2. Click "Edit with Claude"
3. Describe what you want to change:
   ```
   "Add a section about investment returns"
   "Make the tone more conversational"
   "Update statistics with current market data"
   "Expand the conclusion with a stronger CTA"
   ```
4. Claude will revise the article based on your instructions

---

## 🎨 CLAUDE'S WRITING STYLE

Claude is configured to write with:

### Content Characteristics
- **Professional yet conversational** tone
- **SEO-optimized** with natural keyword integration
- **Data-driven** with market insights
- **Action-oriented** with practical advice
- **Engaging** and easy to read

### Structure
- Clear, compelling headlines
- Strong introductions that hook readers
- Well-organized sections with subheadings
- Bullet points and lists for readability
- Strong conclusions with clear CTAs

### Expertise Areas
- Coachella Valley real estate market
- Palm Desert, La Quinta, Indian Wells, Rancho Mirage
- Investment properties and ROI analysis
- Luxury real estate
- Golf communities and resort living
- Market trends and economics
- Buyer/seller guidance

### MDX Components
Claude can use these in articles:
```mdx
<YouTube id="video_id" />
<Callout type="info">Important note</Callout>
<Grid columns={2}>...</Grid>
```

---

## 📊 API ENDPOINT DETAILS

### POST /api/claude/draft-article

**Request Body:**
```json
{
  "topic": "Article topic or prompt",
  "category": "articles" | "market-insights" | "real-estate-tips",
  "keywords": ["keyword1", "keyword2"],
  "tone": "professional yet approachable",
  "length": "short" | "medium" | "long",
  "existingArticleId": "optional-for-editing",
  "userMessage": "Additional instructions"
}
```

**Response:** Server-Sent Events (SSE)

```
data: {"text": "chunk of content"}
data: {"text": "more content"}
data: {"type": "complete", "parsed": {...}}
```

**Parsed Output:**
```json
{
  "frontmatter": {
    "title": "Article Title",
    "excerpt": "Brief description",
    "category": "articles",
    "tags": ["tag1", "tag2"],
    "seo": {
      "title": "SEO Title",
      "description": "SEO Description",
      "keywords": ["keyword1", "keyword2"]
    }
  },
  "content": "# Article Content\n\nFull MDX content here..."
}
```

---

## 🔐 SECURITY

### Authentication
- **Admin-only access** - `isAdmin` check required
- Uses NextAuth session validation
- Requires valid user session

### Rate Limiting
Consider adding rate limiting to prevent abuse:
```typescript
// Future enhancement
const rateLimiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});
```

### API Key Security
- **Never expose** ANTHROPIC_API_KEY to client
- API key only used server-side
- Store in environment variables only

---

## 🚀 DEPLOYMENT TO VPS

### Current Setup
Your VPS: `147.182.236.138` (DigitalOcean)

### Deployment Steps

1. **SSH into VPS**
   ```bash
   ssh root@147.182.236.138
   ```

2. **Pull Latest Code**
   ```bash
   cd /path/to/jpsrealtor
   git pull origin main
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Set Environment Variables**
   ```bash
   nano .env
   # Add ANTHROPIC_API_KEY
   ```

5. **Build & Restart**
   ```bash
   npm run build
   pm2 restart jpsrealtor
   ```

### Environment Variables on VPS
Ensure these are set in production `.env`:
- `ANTHROPIC_API_KEY`
- `MONGODB_URI`
- `NEXTAUTH_SECRET`
- `CLOUDINARY_*` credentials

---

## 💰 COST ESTIMATION

### Anthropic Pricing (Claude Sonnet 4.5)
- **Input:** $3 per million tokens
- **Output:** $15 per million tokens

### Typical Article Cost
- **Average article:** ~4,000 tokens output
- **System prompt:** ~500 tokens input
- **User prompt:** ~100 tokens input

**Cost per article:** ~$0.07 (7 cents)

**Monthly estimates:**
- 10 articles/month: $0.70
- 50 articles/month: $3.50
- 100 articles/month: $7.00

**Very affordable!**

---

## 🐛 TROUBLESHOOTING

### "Failed to draft article"
- Check `ANTHROPIC_API_KEY` is set correctly
- Verify API key is valid at console.anthropic.com
- Check VPS can reach Anthropic API (firewall)

### Streaming stops mid-generation
- Check network connection
- Verify timeout settings (default: 120s)
- Check browser console for errors

### Content not auto-populating
- Verify frontmatter parsing logic
- Check console for parse errors
- Ensure MDX format is valid

### Images not uploading
- Verify Cloudinary credentials
- Check file size limits
- Ensure admin authentication

---

## 🔄 FUTURE ENHANCEMENTS

- [ ] **Version history** - Track article revisions
- [ ] **AI suggestions** - Claude suggests topics based on trends
- [ ] **Multi-language** - Generate content in Spanish
- [ ] **Batch generation** - Create multiple articles at once
- [ ] **Style presets** - Different writing styles (technical, casual, etc.)
- [ ] **Content calendar** - Schedule Claude drafting sessions
- [ ] **A/B testing** - Generate multiple versions for testing
- [ ] **Auto-scheduling** - Publish articles automatically
- [ ] **Social media integration** - Auto-generate social posts
- [ ] **Analytics feedback** - Claude learns from top-performing articles

---

## 📚 RELATED DOCUMENTATION

- [DATABASE_MODELS.md](./DATABASE_MODELS.md) - Article schema
- [AUTHENTICATION.md](./AUTHENTICATION.md) - Admin access control
- [AI_INTEGRATION.md](./AI_INTEGRATION.md) - Main AI chat system
- [Anthropic API Docs](https://docs.anthropic.com/)

---

## 🎉 BENEFITS

### Time Savings
- **Before:** 2-4 hours per article (research, writing, editing, SEO)
- **After:** 10-15 minutes (review, minor edits, image selection)
- **Savings:** 90% reduction in time

### Content Quality
- Consistent voice across all articles
- SEO-optimized automatically
- Data-driven insights
- Professional formatting

### Scalability
- Generate 10+ articles per day if needed
- Maintain content calendar easily
- Quick responses to market changes
- Test multiple content angles

---

**Last Updated:** January 29, 2025
**Cost per Article:** ~$0.07
**Time per Article:** ~15 minutes
**ROI:** Massive! 🚀
