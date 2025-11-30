# VPS Claude Content Writer Guide

## Overview

This guide provides comprehensive instructions for Claude operating on the VPS to act as a content writer for jpsrealtor.com. It includes article writing style guidelines, MongoDB article creation workflow, Git procedures for draft articles, and the review process.

---

## Table of Contents

1. [Article Writing Style Guide](#article-writing-style-guide)
2. [Article Structure Patterns](#article-structure-patterns)
3. [MongoDB Article Model](#mongodb-article-model)
4. [Creating Articles Workflow](#creating-articles-workflow)
5. [Git Workflow for Draft Articles](#git-workflow-for-draft-articles)
6. [CMS Review Process](#cms-review-process)
7. [Cloudinary Image Management](#cloudinary-image-management)
8. [SEO Best Practices](#seo-best-practices)

---

## Article Writing Style Guide

### Tone and Voice

**Core Characteristics:**
- **Action-oriented and opportunity-focused**: Emphasize wins, opportunities, and positive outcomes
- **Conversational and direct**: Write as if speaking to a friend or client
- **Expert but accessible**: Demonstrate knowledge without being condescending
- **Transparent and honest**: Address concerns openly, acknowledge complexities
- **Empowering**: Make readers feel capable and informed

**Examples:**

✅ **Good:** "Now is the time to act. Contact us today to learn how we can help you win in this market."

❌ **Avoid:** "Please consider reaching out if you have any questions about the market."

✅ **Good:** "The Coachella Valley is waiting for you, and I'm here to make the journey seamless."

❌ **Avoid:** "The Coachella Valley is a nice place to consider buying property."

### Writing Patterns

#### 1. Headlines and Titles
- Use action verbs and benefit-driven language
- Create urgency without being pushy
- Be specific rather than generic

**Examples:**
- "5 Essential Tips for Buying Your First Home"
- "The Ultimate Buyer's Guide to the Coachella Valley"
- "Hidden Costs of Home Ownership: What to Budget For"
- "How to Win in Today's Market"

#### 2. Opening Paragraphs
- **Hook**: Start with a relatable problem or exciting opportunity
- **Context**: Briefly explain why this matters now
- **Promise**: Hint at the value the article provides

**Example:**
```markdown
Buying a home in the Coachella Valley isn't just about finding a house—it's about discovering a lifestyle. Whether you're seeking a serene country club, a low-maintenance condo, or a sprawling single-family home, the desert offers a wealth of choices. As your trusted partner, I'm here to ensure you make the right decisions every step of the way.
```

#### 3. Section Headers
- Use **bold subsection titles** for emphasis
- Number main sections when presenting sequential information
- Ask rhetorical questions to engage readers
- Use "How You Can Win" or "Why This Matters" type headers

**Examples:**
```markdown
## 1. **Define Your Must-Haves (and Nice-to-Haves)**

## Why You Need a Buyer's Representative

## How You Can Win in Today's Market

## The Bottom Line: Clear Call-to-Action
```

#### 4. Bullet Points and Lists
- Use checkmarks (✅) for actionable items and benefits
- Use emoji bullets sparingly for visual interest (🏡 💡 📞)
- Keep bullet points concise and scannable

**Examples:**
```markdown
✅ **Know your closing costs** before finalizing your budget.
✅ **Check HOA fees** and country club costs before committing.
✅ **Understand electricity costs**—IID vs. SCE rates can impact your bill.

Common HOA-covered expenses:
✅ Landscaping & common area maintenance
✅ Security & gated access
✅ Clubhouse, pool, and fitness center access
```

#### 5. Calls-to-Action (CTAs)
- Always end with a clear, action-oriented CTA
- Include contact information (phone and email)
- Use bold formatting for contact details
- Create a sense of partnership ("Let's", "Together", "I'm here")

**Examples:**
```markdown
📞 Call or Text: **+1 (760) 833-6334**
📧 Email: **josephsardella@gmail.com**

---

### Ready to Find Your Dream Home?

Whether you're just starting or ready to dive in, I'm here to help. Let's make your first homebuying experience smooth and rewarding.
```

#### 6. Visual Elements
- Use horizontal rules (`---`) to separate major sections
- Include image references with descriptive alt text
- Use tables for data comparison when appropriate
- Create "scroll to top" links for long articles

**Example:**
```markdown
---

![Palm Springs Home](/misc/real-estate/bedroom/master_00015_.png)

---

[Scroll to Top⬆️](#table-of-contents)
```

---

## Article Structure Patterns

### Pattern 1: Listicle Format

**Best for:** Tips, strategies, essential information

```markdown
# [Number] Essential Tips for [Topic]

[Opening paragraph: Hook + Context + Promise]

---

## 1. **[First Tip Title]**

[Explanation paragraph]

- Bullet point detail
- Bullet point detail
- Bullet point detail

[Optional: Example or additional context]

---

## 2. **[Second Tip Title]**

[Explanation paragraph]

...

---

### [Final CTA Section]

[Encouraging closing paragraph]

📞 Call or Text: **+1 (760) 833-6334**
📧 Email: **josephsardella@gmail.com**
```

**Examples:**
- "5 Essential Tips for Buying Your First Home" (`5-tips-for-buying-first-home.mdx`)

### Pattern 2: Comprehensive Guide Format

**Best for:** In-depth topics, buyer's/seller's guides, market analysis

```markdown
# The Ultimate [Audience]'s Guide to [Topic]

[Opening paragraph: Set the scene, establish expertise]

---

## Table of Contents

1. [Section 1](#section-1)
2. [Section 2](#section-2)
3. [Section 3](#section-3)

<div id="section-1" className="internal-hotlink" />
## [Section 1 Title]

[Detailed content with subsections]

### **[Subsection Title]**

[Content]

[Scroll to Top⬆️](#table-of-contents)

---

![Relevant Image](/path/to/image.png)

---

<div id="section-2" className="internal-hotlink" />
## [Section 2 Title]

...
```

**Examples:**
- "The Ultimate Buyer's Guide to the Coachella Valley" (`ultimate-buyers-guide-coachella-valley.mdx`)

### Pattern 3: Educational/Informational Format

**Best for:** Market updates, cost breakdowns, explaining concepts

```markdown
# [Topic]: [Subtitle or Benefit Statement]

## **Introduction: [Hook Statement]**

[Opening paragraph addressing a common question or concern]

---

## **1. [First Main Point]**

[Explanation]

- **[Bold Key Term]** – Definition or explanation
- **[Bold Key Term]** – Definition or explanation

🏡 **Tip:** [Actionable advice]

---

## **2. [Second Main Point]**

[Explanation with specific details, data, or examples]

💡 **Tip:** [Actionable advice]

---

## **Final Thoughts: [Summary Title]**

[Wrap-up with key takeaways]

✅ Checklist item
✅ Checklist item
✅ Checklist item

---

### 💡 **[CTA Question]**

[Brief CTA paragraph]

📩 **Contact me** for [specific value proposition]
```

**Examples:**
- "Hidden Costs of Home Ownership: What to Budget For" (`hidden-costs-of-home-ownership.mdx`)

### Common Elements Across All Patterns

1. **Frontmatter** (YAML metadata at top)
2. **Engaging opening** that hooks the reader
3. **Clear section structure** with visual hierarchy
4. **Practical, actionable advice** throughout
5. **Local market expertise** (Coachella Valley specific)
6. **Trust-building elements** (transparency, honesty)
7. **Strong CTA** with contact information
8. **SEO optimization** (keywords, meta descriptions)

---

## MongoDB Article Model

### Article Schema

Articles are stored in MongoDB using the following schema:

```typescript
interface IArticle {
  // Basic Info
  title: string;              // Max 200 chars
  slug: string;               // Auto-generated from title if not provided
  excerpt: string;            // Max 300 chars
  content: string;            // Full MDX content

  // Organization
  category: "articles" | "market-insights" | "real-estate-tips";
  tags: string[];             // Array of keyword tags

  // Date Organization
  publishedAt: Date;          // Publication date
  year: number;               // Auto-set from publishedAt
  month: number;              // Auto-set from publishedAt (1-12)

  // Status
  status: "draft" | "published" | "archived";
  featured: boolean;          // Show in featured section

  // Media (Cloudinary)
  featuredImage: {
    url: string;              // Cloudinary URL
    publicId: string;         // Cloudinary public ID
    alt: string;              // Alt text for SEO
    caption?: string;
    width?: number;
    height?: number;
  };

  ogImage?: {
    url: string;              // Open Graph image URL
    publicId: string;
  };

  // SEO
  seo: {
    title: string;            // Max 60 chars
    description: string;      // Max 160 chars
    keywords: string[];       // SEO keywords
  };

  // Author
  author: {
    id: ObjectId;
    name: string;
    email: string;
  };

  // Analytics
  metadata: {
    views: number;            // Default 0
    readTime: number;         // Minutes, default 5
    lastViewed?: Date;
  };

  // Timestamps (auto-managed)
  createdAt: Date;
  updatedAt: Date;
  scheduledFor?: Date;
}
```

### Category Definitions

- **`articles`**: General real estate articles, guides, tips
- **`market-insights`**: Market analysis, trends, data-driven content
- **`real-estate-tips`**: How-to guides, buying/selling tips, educational content

### Required Fields Checklist

Before creating an article, ensure you have:

- [x] **Title** (clear, benefit-driven, < 200 chars)
- [x] **Excerpt** (compelling summary, < 300 chars)
- [x] **Content** (full MDX-formatted article)
- [x] **Category** (one of three options)
- [x] **Featured Image URL** (Cloudinary URL)
- [x] **Featured Image Public ID** (Cloudinary identifier)
- [x] **Alt Text** (descriptive, SEO-friendly)
- [x] **SEO Title** (< 60 chars)
- [x] **SEO Description** (< 160 chars)
- [x] **Keywords** (5-10 relevant keywords)
- [x] **Author Info** (name: "Joseph Sardella", email: "josephsardella@gmail.com")

---

## Creating Articles Workflow

### Step 1: Research and Planning

1. **Identify Topic**: Based on market trends, client questions, or SEO opportunities
2. **Research Content**: Gather data, examples, and local market insights
3. **Choose Article Pattern**: Listicle, Guide, or Educational format
4. **Outline Structure**: Main sections, subsections, key points

### Step 2: Write Article Content

1. **Create MDX Content**: Follow writing style guide and chosen pattern
2. **Include Visual Elements**: Plan image placements, tables, lists
3. **Add Internal Links**: Link to related articles or pages where relevant
4. **Optimize for SEO**: Natural keyword integration, proper heading hierarchy

**Example Article Content Structure:**

```markdown
---
(Frontmatter will be added to MongoDB, not needed in content field)
---

# Main Title

[Opening paragraph]

---

## 1. **Section Title**

[Content with bullets, tips, examples]

🏡 **Tip:** [Actionable advice]

---

## 2. **Section Title**

...

---

### 💡 **CTA Title**

[Closing CTA]

📞 Call or Text: **+1 (760) 833-6334**
📧 Email: **josephsardella@gmail.com**
```

### Step 3: Prepare Image Assets

1. **Select Featured Image**: High-quality, relevant image (ideally 1200x630px for OG)
2. **Upload to Cloudinary**: Use appropriate folder structure
3. **Note Cloudinary Details**: URL and Public ID
4. **Write Alt Text**: Descriptive and SEO-friendly

### Step 4: Create MongoDB Document

**Example Node.js Script:**

```javascript
// scripts/create-article.js
const mongoose = require('mongoose');
const Article = require('../src/models/article');

async function createArticle() {
  // Connect to MongoDB
  await mongoose.connect(process.env.MONGODB_URI);

  const articleData = {
    title: "5 Essential Tips for Buying Your First Home",
    excerpt: "Discover five key tips for first-time homebuyers to help make the process smooth and successful.",
    content: `# 5 Essential Tips for Buying Your First Home

Buying your first home is an exciting milestone...

[Full MDX content here]
`,
    category: "real-estate-tips",
    tags: ["homebuying tips", "first-time buyers", "real estate advice", "coachella valley"],

    status: "draft", // IMPORTANT: Always start with draft
    featured: false,

    publishedAt: new Date("2024-12-20"),

    featuredImage: {
      url: "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1234567890/first-home.jpg",
      publicId: "first-home",
      alt: "A couple discussing homebuying plans with their real estate agent",
      width: 1200,
      height: 630
    },

    seo: {
      title: "5 Essential Tips for Buying Your First Home",
      description: "Discover five key tips for first-time homebuyers to help make the process smooth and successful.",
      keywords: [
        "homebuying tips",
        "first-time buyers",
        "real estate advice",
        "coachella valley real estate",
        "palm springs homes"
      ]
    },

    author: {
      id: new mongoose.Types.ObjectId("USER_ID_HERE"), // Get from User collection
      name: "Joseph Sardella",
      email: "josephsardella@gmail.com"
    },

    metadata: {
      views: 0,
      readTime: 5 // Calculate based on word count: ~200 words/min
    }
  };

  const article = new Article(articleData);
  await article.save();

  console.log(`✅ Article created: ${article._id}`);
  console.log(`   Title: ${article.title}`);
  console.log(`   Slug: ${article.slug}`);
  console.log(`   Status: ${article.status}`);

  await mongoose.disconnect();
}

createArticle().catch(console.error);
```

**Run the script:**
```bash
node scripts/create-article.js
```

---

## Git Workflow for Draft Articles

### Workflow Overview

1. Create article in MongoDB with `status: "draft"`
2. Commit changes to Git
3. Push to GitHub
4. Article appears in CMS for review
5. Review and select images in CMS
6. Publish or schedule article

### Step-by-Step Git Process

#### 1. Ensure You're on Main Branch
```bash
git checkout main
git pull origin main
```

#### 2. Create Article Script (if not exists)
```bash
# Create script file
touch scripts/create-article-[slug].js

# Make it executable
chmod +x scripts/create-article-[slug].js
```

#### 3. Add Article Creation Code
(Use template from previous section)

#### 4. Run Article Creation Script
```bash
node scripts/create-article-[slug].js
```

**Expected Output:**
```
✅ Article created: 67abc123def456789
   Title: 5 Essential Tips for Buying Your First Home
   Slug: 5-essential-tips-for-buying-your-first-home
   Status: draft
```

#### 5. Stage and Commit Changes
```bash
# Stage the script file
git add scripts/create-article-[slug].js

# Commit with descriptive message
git commit -m "Add draft article: [Article Title]

- Category: [category]
- Status: draft
- Ready for CMS review and image selection
"
```

**Example Commit Message:**
```
Add draft article: 5 Essential Tips for Buying Your First Home

- Category: real-estate-tips
- Status: draft
- Ready for CMS review and image selection
```

#### 6. Push to GitHub
```bash
git push origin main
```

#### 7. Verify in GitHub
```bash
# Optional: Open GitHub PR if using branch workflow
gh pr create --title "Draft Article: [Title]" --body "New draft article ready for review in CMS"
```

### Git Best Practices for Articles

**DO:**
- ✅ Always create articles with `status: "draft"`
- ✅ Use descriptive commit messages
- ✅ Include article metadata in commit message
- ✅ Push to main branch (or create PR if using branch workflow)
- ✅ Keep article creation scripts in `/scripts` folder

**DON'T:**
- ❌ Never commit articles with `status: "published"` directly
- ❌ Don't skip the CMS review process
- ❌ Don't commit without testing the article creation script
- ❌ Don't push without pulling latest changes first

---

## CMS Review Process

### Accessing the CMS

1. **Navigate to Admin Panel**: `https://jpsrealtor.com/admin/articles`
2. **Sign In**: Use admin credentials
3. **View Draft Articles**: Filter by "Status: Draft"

### Review Checklist

When reviewing an article in the CMS:

#### Content Review
- [ ] **Title**: Clear, compelling, SEO-optimized
- [ ] **Excerpt**: Accurate summary, under 300 characters
- [ ] **Content**: Well-structured, follows style guide
- [ ] **Formatting**: Proper MDX syntax, visual hierarchy
- [ ] **Links**: All internal/external links work
- [ ] **CTAs**: Contact info present and correct

#### SEO Review
- [ ] **Meta Title**: Under 60 characters, includes target keyword
- [ ] **Meta Description**: Under 160 characters, compelling
- [ ] **Keywords**: 5-10 relevant keywords
- [ ] **Alt Text**: Descriptive, SEO-friendly
- [ ] **URL Slug**: Clean, keyword-rich

#### Visual Review
- [ ] **Featured Image**: High quality, relevant, properly sized
- [ ] **Additional Images**: Load correctly, appropriate alt text
- [ ] **Preview on Mobile**: Use preview panel to check mobile view
- [ ] **Preview on Desktop**: Check desktop layout

#### Technical Review
- [ ] **Category**: Correct category selected
- [ ] **Tags**: Relevant tags applied
- [ ] **Date**: Publish date set correctly
- [ ] **Read Time**: Accurate estimate
- [ ] **Author Info**: Correct author attribution

### Publishing Workflow

#### Option 1: Publish Immediately
1. Complete review checklist
2. Click "Edit" on draft article
3. Change status from "draft" to "published"
4. Click "Save"
5. Verify article appears on live site

#### Option 2: Schedule for Later
1. Complete review checklist
2. Click "Edit" on draft article
3. Set `scheduledFor` date/time
4. Status remains "draft" until scheduled time
5. Automated job publishes at scheduled time

### Image Selection in CMS

#### Selecting Featured Image
1. Click "Edit" article
2. In Featured Image section, click "Browse Cloudinary"
3. Select image from library or upload new
4. Update alt text if needed
5. Save changes

#### Uploading New Images
1. Navigate to Cloudinary dashboard
2. Upload image to appropriate folder:
   - `/articles/` - General article images
   - `/market-insights/` - Market analysis images
   - `/real-estate/` - Property photos
3. Note the Public ID
4. Return to CMS and select the image

---

## Cloudinary Image Management

### Folder Structure

```
/
├── articles/
│   ├── general/
│   ├── tips/
│   └── guides/
├── market-insights/
├── real-estate/
│   ├── bedroom/
│   ├── kitchen/
│   ├── living-room/
│   ├── back-yard/
│   └── front-yard/
└── misc/
```

### Image Specifications

#### Featured Images (OG Images)
- **Dimensions**: 1200px × 630px (ideal for social sharing)
- **Format**: JPG or PNG
- **File Size**: < 500KB
- **Aspect Ratio**: 1.91:1

#### In-Article Images
- **Width**: 1200px - 1600px
- **Format**: JPG for photos, PNG for graphics
- **File Size**: < 300KB per image
- **Aspect Ratio**: Flexible, but 16:9 or 4:3 preferred

#### Mobile Optimization
- Cloudinary auto-optimizes based on device
- Use responsive image URLs
- Enable lazy loading

### Cloudinary URL Patterns

**Basic URL:**
```
https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/v1234567890/folder/image-name.jpg
```

**Optimized URL (auto-quality, auto-format):**
```
https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/q_auto,f_auto/v1234567890/folder/image-name.jpg
```

**Responsive URL (width-based):**
```
https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/w_auto,c_scale/v1234567890/folder/image-name.jpg
```

### Uploading Images to Cloudinary

#### Via Dashboard
1. Log in to Cloudinary
2. Navigate to desired folder
3. Click "Upload"
4. Select images
5. Note Public IDs for article creation

#### Via API (Node.js)
```javascript
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function uploadImage(filePath, folder) {
  const result = await cloudinary.uploader.upload(filePath, {
    folder: folder,
    transformation: [
      { width: 1200, crop: "limit" },
      { quality: "auto" }
    ]
  });

  console.log(`✅ Uploaded: ${result.secure_url}`);
  console.log(`   Public ID: ${result.public_id}`);

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height
  };
}
```

---

## SEO Best Practices

### Keyword Research

1. **Primary Keyword**: Main topic of article
   - Example: "buying first home coachella valley"

2. **Secondary Keywords**: Related terms
   - Example: "first-time homebuyer tips", "palm springs real estate"

3. **Long-tail Keywords**: Specific phrases
   - Example: "how to buy a home in palm springs with no money down"

### On-Page SEO Checklist

- [ ] **Title Tag**: Includes primary keyword, under 60 chars
- [ ] **Meta Description**: Compelling, includes primary keyword, under 160 chars
- [ ] **URL Slug**: Clean, includes primary keyword
- [ ] **H1 Tag**: Single H1 with primary keyword
- [ ] **H2/H3 Tags**: Include secondary keywords naturally
- [ ] **Image Alt Text**: Descriptive, includes relevant keywords
- [ ] **Internal Links**: Link to 2-3 related articles
- [ ] **External Links**: Link to authoritative sources when relevant
- [ ] **Keyword Density**: 1-2% for primary keyword (natural usage)
- [ ] **Content Length**: 1000+ words for comprehensive articles

### Local SEO Focus

Always include local terms:
- Coachella Valley
- Palm Springs, Palm Desert, La Quinta, Indio, etc.
- Specific neighborhoods or landmarks
- Local events (Coachella, Stagecoach, BNP Paribas)

### SEO Keywords by Category

#### Real Estate Tips
- homebuying tips
- first-time buyers
- real estate advice
- buying process
- home inspection
- mortgage pre-approval

#### Market Insights
- real estate market
- market trends
- property values
- market analysis
- housing market
- real estate forecast

#### Coachella Valley Specific
- coachella valley homes
- palm springs real estate
- desert property
- la quinta homes
- palm desert condos
- indian wells golf course homes

---

## Quick Reference Checklists

### Article Creation Checklist

- [ ] Research topic and gather information
- [ ] Choose appropriate article pattern
- [ ] Write content following style guide
- [ ] Select and upload featured image to Cloudinary
- [ ] Create MongoDB document with status: "draft"
- [ ] Run article creation script
- [ ] Test article creation (verify in database)
- [ ] Commit script to Git
- [ ] Push to GitHub
- [ ] Verify article appears in CMS as draft

### CMS Review Checklist

- [ ] Content review (accuracy, grammar, style)
- [ ] SEO optimization (title, description, keywords)
- [ ] Visual review (images, formatting, mobile preview)
- [ ] Technical review (category, tags, dates)
- [ ] Select/upload images in CMS
- [ ] Preview article on live site (if available)
- [ ] Publish or schedule article

### Git Commit Checklist

- [ ] Pull latest changes (`git pull origin main`)
- [ ] Test article creation script
- [ ] Stage changes (`git add scripts/...`)
- [ ] Write descriptive commit message
- [ ] Include article metadata in commit message
- [ ] Push to GitHub (`git push origin main`)
- [ ] Verify on GitHub

---

## Example End-to-End Workflow

### Scenario: Creating "Top 5 Neighborhoods for Families in Coachella Valley"

**1. Planning:**
- Topic: Family-friendly neighborhoods
- Pattern: Listicle format
- Target keywords: "family neighborhoods coachella valley", "best areas for families palm springs"

**2. Content Creation:**
```markdown
# Top 5 Neighborhoods for Young Families in Coachella Valley

Moving to the Coachella Valley with your family? Choosing the right neighborhood matters...

## 1. **La Quinta - Silverhawk**

Known for excellent schools and family-friendly amenities...

[etc.]
```

**3. Image Preparation:**
- Upload family neighborhood photos to Cloudinary: `/articles/neighborhoods/`
- Featured image: Family at home in desert setting (1200x630px)
- Public ID: `neighborhoods-family-friendly`

**4. Create Article Script:**
```javascript
// scripts/create-family-neighborhoods-article.js
const articleData = {
  title: "Top 5 Neighborhoods for Young Families in Coachella Valley",
  excerpt: "Discover the best family-friendly neighborhoods in the Coachella Valley with excellent schools, parks, and community amenities.",
  content: `[Full MDX content]`,
  category: "real-estate-tips",
  tags: ["family neighborhoods", "coachella valley", "best areas", "young families"],
  status: "draft",
  // ... rest of article data
};
```

**5. Git Workflow:**
```bash
git checkout main
git pull origin main
node scripts/create-family-neighborhoods-article.js
git add scripts/create-family-neighborhoods-article.js
git commit -m "Add draft article: Top 5 Family Neighborhoods

- Category: real-estate-tips
- Status: draft
- Ready for CMS review and image selection
"
git push origin main
```

**6. CMS Review:**
- Navigate to /admin/articles
- Filter by "draft" status
- Click "Edit" on new article
- Review content and SEO
- Select images from Cloudinary
- Click "Save"

**7. Publishing:**
- Change status from "draft" to "published"
- Set publish date
- Click "Save"
- Verify on live site: jpsrealtor.com/articles/top-5-neighborhoods-for-young-families-in-coachella-valley

---

## Contact and Support

For questions about the content writing process:

**Joseph Sardella**
📞 **+1 (760) 833-6334**
📧 **josephsardella@gmail.com**

---

## Related Documentation

- [Theme Implementation Guide](./THEME_IMPLEMENTATION_GUIDE.md) - For CMS theme usage
- [Responsive Design Guide](./RESPONSIVE_DESIGN.md) - For understanding mobile/desktop layouts
- [Frontend Architecture](./FRONTEND_ARCHITECTURE.md) - For overall system structure

---

*Last Updated: 2024-12-20*
*Version: 1.0*
