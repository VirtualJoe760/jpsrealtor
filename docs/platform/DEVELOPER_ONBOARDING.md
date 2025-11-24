# Developer Onboarding Guide

**Welcome to the ChatRealty / JPSRealtor project!**

This guide will get you up and running in < 30 minutes.

---

## Prerequisites

- **Node.js** 20.x or higher
- **npm** or **yarn**
- **Git**
- **MongoDB Compass** (optional, for database inspection)
- **VS Code** (recommended IDE)

---

## Project Structure

```
chatRealty/
├── jpsrealtor/              # Frontend (Next.js 16)
├── chatrealty-cms/          # Backend/CMS (PayloadCMS)
└── memory-files/            # Architecture documentation (this!)
```

---

## Quick Start (Frontend)

### 1. Clone Repository
```bash
git clone <repository-url>
cd jpsrealtor
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env.local
```

**Edit `.env.local`** with your credentials:
```bash
# Database
MONGODB_URI=# Add your MongoDB connection string here

# AI
GROQ_API_KEY=your_groq_api_key

# OAuth (optional for local dev)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# CMS
NEXT_CMS_URL=http://localhost:3002
```

### 4. Start Dev Server
```bash
npm run dev
```

**Frontend**: http://localhost:3000

---

## Quick Start (Backend/CMS)

### 1. Navigate to CMS Directory
```bash
cd chatrealty-cms
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
```

**Edit `.env`** with your credentials:
```bash
MONGODB_URI=# Add your MongoDB connection string here
PAYLOAD_SECRET=your_random_32_char_secret
NEXT_CMS_URL=http://localhost:3002

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=noreply@jpsrealtor.com
```

### 4. Start Dev Server
```bash
npm run dev
```

**CMS Admin**: http://localhost:3002/admin

### 5. Create Admin User
Visit http://localhost:3002/admin and create your first admin account.

---

## Key Concepts

### 1. Authentication
- **PayloadCMS handles ALL authentication** (no NextAuth)
- JWT tokens stored in HTTP-only cookies
- OAuth flows bridge through Next.js → Payload

**Read more**: `AUTH_ARCHITECTURE.md`

---

### 2. Database
- **Single MongoDB database** shared by frontend and CMS
- PayloadCMS manages: users, cities, neighborhoods, schools, blog posts
- Frontend manages: listings, chat messages, swipe sessions

**Read more**: `DATABASE_ARCHITECTURE.md`

---

### 3. Theme System
- **Two themes**: `lightgradient` (default) and `blackspace`
- Managed via React Context + localStorage
- Body class changes on theme switch

**Read more**: `FRONTEND_ARCHITECTURE.md` → Theme System

---

### 4. AI Chat
- **Groq AI** (llama-3.1-70b-versatile)
- Streaming responses via Server-Sent Events (SSE)
- Function calling for location matching and listing search

**Read more**: `FRONTEND_ARCHITECTURE.md` → AI Integration

---

### 5. Swipe Review Mode
- **Tinder-like interface** for reviewing listings
- Tracks analytics (swipe left/right, session duration)
- Integrated with chat widget

**Read more**: `FRONTEND_ARCHITECTURE.md` → Key Features

---

## Common Tasks

### Add a New Collection (PayloadCMS)

1. Create collection file:
```bash
# chatrealty-cms/src/collections/MyCollection.ts
import { CollectionConfig } from 'payload';

export const MyCollection: CollectionConfig = {
  slug: 'my-collection',
  fields: [
    { name: 'name', type: 'text', required: true },
  ],
};
```

2. Register in `payload.config.ts`:
```typescript
import { MyCollection } from './src/collections/MyCollection';

export default buildConfig({
  collections: [
    Users,
    MyCollection, // ← Add here
    // ...
  ],
});
```

3. Restart dev server, visit `/admin` to see new collection.

---

### Query Listings (Frontend)

```typescript
import Listing from '@/models/listings';
import { connectToDatabase } from '@/lib/mongodb';

export async function searchListings() {
  await connectToDatabase();

  const listings = await Listing.find({
    City: 'Palm Desert',
    ListingStatus: 'Active',
    ListPrice: { $gte: 300000, $lte: 500000 }
  })
  .limit(20)
  .lean(); // Always use .lean() for performance

  return listings;
}
```

---

### Create New API Route (Frontend)

```typescript
// src/app/api/my-endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const param = req.nextUrl.searchParams.get('param');

  return NextResponse.json({
    message: 'Hello World',
    param
  });
}
```

**Access**: http://localhost:3000/api/my-endpoint?param=value

---

## Troubleshooting

### Issue: "Module not found" errors
**Solution**: Delete `node_modules` and `.next`, reinstall:
```bash
rm -rf node_modules .next
npm install
```

---

### Issue: "Connection refused" to MongoDB
**Solution**: Check `MONGODB_URI` in `.env.local`, ensure IP is whitelisted in MongoDB Atlas.

---

### Issue: Theme flash on page load
**Solution**: Ensure `public/theme-init.js` is loaded with `strategy="beforeInteractive"` in `app/layout.tsx`.

---

### Issue: PayloadCMS admin panel 404
**Solution**: Ensure dev server is running on correct port (3002), check `NEXT_CMS_URL`.

---

## Architecture Documentation

**Start here**:
1. `README.md` - This file (overview)
2. `MASTER_SYSTEM_ARCHITECTURE.md` - Complete system overview
3. `FRONTEND_ARCHITECTURE.md` - Frontend deep dive
4. `BACKEND_ARCHITECTURE.md` - PayloadCMS deep dive
5. `AUTH_ARCHITECTURE.md` - Authentication flows

**Reference**:
- `DATABASE_ARCHITECTURE.md` - Database schema & queries
- `MULTI_TENANT_ARCHITECTURE.md` - Multi-tenant strategy
- `COLLECTIONS_REFERENCE.md` - Quick collection reference
- `DEPLOYMENT_PIPELINE.md` - Deployment procedures
- `INTEGRATION_NOTES.md` - External service integrations

---

## Development Workflow

1. **Pull latest code**: `git pull origin v2`
2. **Create feature branch**: `git checkout -b feature/my-feature`
3. **Make changes**
4. **Test locally**: Verify on http://localhost:3000
5. **Commit**: `git commit -m "feat: add my feature"`
6. **Push**: `git push origin feature/my-feature`
7. **Create PR** (if applicable)
8. **Merge to v2** → Auto-deploy to Vercel

---

## Code Style

- **TypeScript strict mode** enabled
- **ESLint** for linting
- **Prettier** for formatting (recommended)
- **Component naming**: PascalCase for components, camelCase for utilities
- **File naming**: PascalCase for components, kebab-case for utilities

---

## Testing

**Currently**: Manual testing

**Future**: Jest + React Testing Library

---

## Key Files to Know

### Frontend
- `src/app/components/chatwidget/IntegratedChatWidget.tsx` - Main chat orchestrator
- `src/app/components/mls/map/MapView.tsx` - Enterprise map system
- `src/app/api/chat/stream/route.ts` - AI chat endpoint
- `src/lib/groq.ts` - Groq AI client
- `src/lib/mongodb.ts` - MongoDB connection
- `src/app/contexts/ThemeContext.tsx` - Theme provider

### Backend
- `payload.config.ts` - PayloadCMS configuration
- `src/collections/Users.ts` - User collection schema
- `src/collections/Neighborhoods.ts` - Neighborhood collection

---

## Need Help?

1. **Check architecture docs** in `memory-files/`
2. **Search codebase** for similar patterns
3. **Ask team** (Slack/Discord)
4. **GitHub Issues** for bugs

---

## Next Steps

1. **Explore codebase**: Browse `src/app/components/`
2. **Test features**: Try chat, map, swipe mode
3. **Read architecture docs**: Start with `MASTER_SYSTEM_ARCHITECTURE.md`
4. **Make your first change**: Add a console.log, verify it works
5. **Build something new**: Start with a simple API route or component

**Happy coding!** 🚀
