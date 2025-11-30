# JPSRealtor Documentation

**Last Updated:** November 29, 2025

## 🚨 SECURITY WARNING
n## 🤖 FOR CLAUDE CODE

**📖 Read [CLAUDE_INSTRUCTIONS.md](./CLAUDE_INSTRUCTIONS.md) for complete guidelines on:**
- How to update documentation when making code changes
- Security requirements (no real secrets!)
- Documentation mapping (which docs to update for each change)
- Quality checklist before completing tasks
- **IMPORTANT:** Never run  - let the user control the dev server

---


**NEVER COMMIT REAL SECRETS TO DOCUMENTATION!**

All documentation files in this directory are committed to GitHub and are PUBLIC. Always use placeholders for sensitive information:

### ✅ Safe Placeholders
```bash
CLOUDINARY_CLOUD_NAME=YOUR_CLOUD_NAME
CLOUDINARY_API_KEY=YOUR_CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET=YOUR_CLOUDINARY_API_SECRET
ANTHROPIC_API_KEY=sk-ant-api03-...
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
VPS_PASSWORD=YOUR_VPS_PASSWORD
```

### ❌ Never Include
- Real API keys
- Real passwords
- Real database connection strings
- Real OAuth secrets
- Real cloud credentials

---

## 📚 Documentation Index

### For Claude Code
- **[CLAUDE_INSTRUCTIONS.md](./CLAUDE_INSTRUCTIONS.md)** - Instructions for AI assistant on maintaining documentation


### Architecture & System Design
- **[MASTER_SYSTEM_ARCHITECTURE.md](./platform/MASTER_SYSTEM_ARCHITECTURE.md)** - Complete system overview
- **[FRONTEND_ARCHITECTURE.md](./FRONTEND_ARCHITECTURE.md)** - Frontend structure and patterns
- **[DATABASE_MODELS.md](./DATABASE_MODELS.md)** - MongoDB schemas and collections

### Features & Functionality
- **[ARTICLES_CMS_COMPLETE.md](./ARTICLES_CMS_COMPLETE.md)** - Complete articles/blog/CMS documentation
- **[AI_INTEGRATION.md](./AI_INTEGRATION.md)** - Groq AI chat integration
- **[AUTHENTICATION.md](./AUTHENTICATION.md)** - NextAuth setup and OAuth
- **[MAP_SYSTEM.md](./MAP_SYSTEM.md)** - MapLibre GL implementation
- **[SWIPE_SYSTEM.md](./SWIPE_SYSTEM.md)** - Tinder-style property discovery
- **[COMMUNITY_FACTS.md](./COMMUNITY_FACTS.md)** - HOA/subdivision data structure
- **[INSIGHTS_PAGE.md](./INSIGHTS_PAGE.md)** - Analytics and insights dashboard

### AI & Content
- **[CLAUDE_CMS_INTEGRATION.md](./CLAUDE_CMS_INTEGRATION.md)** - Claude AI for article drafting
- **[VPS_CLAUDE_CONTENT_WRITER.md](./VPS_CLAUDE_CONTENT_WRITER.md)** - VPS Claude workflows
- **[VPS_CLAUDE_INTEGRATION.md](./VPS_CLAUDE_INTEGRATION.md)** - VPS SSH integration

### Development & Deployment
- **[PERFORMANCE.md](./PERFORMANCE.md)** - Performance optimizations (862ms startup!)
- **[RESPONSIVE_DESIGN.md](./RESPONSIVE_DESIGN.md)** - Mobile-first responsive patterns
- **[THEME_IMPLEMENTATION_GUIDE.md](./THEME_IMPLEMENTATION_GUIDE.md)** - Dual theme system

### Testing
- **[TESTING_ARTICLE_SEARCH.md](./TESTING_ARTICLE_SEARCH.md)** - Article search testing guide

---

## 🏗️ System Overview

**jpsrealtor.com** is a Next.js 16 real estate platform for Joseph Sardella, specializing in the Coachella Valley market. The platform features:

- 🏠 **115,000+ MLS listings** from CRMLS
- 💬 **AI-powered chat** with Groq (GPT OSS 120B)
- 🗺️ **Interactive map** with clustering and filtering
- 📱 **Swipe discovery** like Tinder for properties
- 📝 **AI-driven CMS** with Claude Sonnet 4.5
- 🎨 **Dual themes** (blackspace / lightgradient)
- 📊 **Analytics dashboard** for admin insights

---

## 🚀 Quick Start

### Prerequisites
```bash
Node.js 20+
MongoDB 7.0+
npm or yarn
```

### Installation
```bash
# Clone repository
git clone https://github.com/yourusername/jpsrealtor.git
cd jpsrealtor

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run development server
npm run dev
```

### Environment Variables Required
See `.env.example` for complete list. Key variables:
- `MONGODB_URI` - MongoDB Atlas connection string
- `ANTHROPIC_API_KEY` - For Claude AI (article generation)
- `GROQ_API_KEY` - For Groq chat
- `CLOUDINARY_*` - For image hosting
- `NEXTAUTH_*` - For authentication

---

## 📖 How to Use This Documentation

### For New Developers
1. Start with **MASTER_SYSTEM_ARCHITECTURE.md** for overall understanding
2. Read **FRONTEND_ARCHITECTURE.md** to understand the codebase structure
3. Review **DATABASE_MODELS.md** to understand the data layer
4. Dive into feature-specific docs as needed

### For Content Editors
1. Read **ARTICLES_CMS_COMPLETE.md** for the CMS system
2. Review **CLAUDE_CMS_INTEGRATION.md** to learn AI drafting
3. Check **VPS_CLAUDE_CONTENT_WRITER.md** for advanced workflows

### For Admins
1. **AUTHENTICATION.md** - User management and OAuth
2. **INSIGHTS_PAGE.md** - Analytics dashboard usage
3. **PERFORMANCE.md** - Monitoring and optimization

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 16** (App Router)
- **React 19**
- **TypeScript**
- **Tailwind CSS**
- **Framer Motion**
- **MapLibre GL JS**

### Backend
- **MongoDB** (8GB database, 115k+ listings)
- **NextAuth.js** (OAuth + sessions)
- **Mongoose** (ODM)

### AI
- **Groq** (GPT OSS 120B for chat)
- **Claude Sonnet 4.5** (article generation)
- **Function calling** (search, calculations, etc.)

### Infrastructure
- **Cloudinary** (CDN for images)
- **DigitalOcean VPS** (deployment)
- **PM2** (process management)

---

## 📊 Performance

- **Startup:** 862ms (95% improvement from 18s)
- **Map Rendering:** 90% CPU usage reduction
- **Bundle Size:** Optimized with dynamic imports
- **Lighthouse Score:** 90+ across all metrics

See **PERFORMANCE.md** for detailed optimizations.

---

## 🔒 Security Best Practices

1. **Never commit secrets** - Use environment variables
2. **Review .env before commits** - Use `.gitignore`
3. **Rotate credentials regularly** - Update quarterly
4. **Use admin-only routes** - Protect sensitive endpoints
5. **Sanitize documentation** - Replace real values with placeholders

---

## 🤝 Contributing

When adding new documentation:

1. **Follow naming conventions** - Use SCREAMING_SNAKE_CASE.md
2. **Add to this README** - Update the index
3. **Include examples** - Code snippets with placeholders
4. **Security check** - No real secrets!
5. **Update date** - Add "Last Updated" timestamp

---

## 📝 Documentation Standards

### File Naming
- Use descriptive names: `FEATURE_NAME.md`
- All caps for major docs
- Lowercase for minor guides

### Content Structure
```markdown
# Feature Name

**Last Updated:** YYYY-MM-DD

## Overview
Brief description

## Technical Details
Implementation specifics

## Usage
How to use it

## Examples
Code examples with placeholders

## Troubleshooting
Common issues
```

### Code Examples
Always use placeholders for sensitive data:

```typescript
// ✅ Good
const apiKey = process.env.ANTHROPIC_API_KEY;

// ❌ Bad
const apiKey = 'sk-ant-api03-real-key-here';
```

---

## 🐛 Issue Reporting

Found an issue? Please include:
1. Documentation file name
2. Section/line number
3. What's wrong or unclear
4. Suggested improvement

---

## 📞 Contact

**Joseph Sardella**
- 📧 Email: josephsardella@gmail.com
- 📱 Phone: (760) 833-6334
- 🌐 Website: https://jpsrealtor.com

---

**Last Security Audit:** November 29, 2025
**All secrets sanitized and verified safe for public GitHub repository.**
