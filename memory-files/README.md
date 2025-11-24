# ChatRealty / JPSRealtor - Memory Files

**Architecture Documentation Repository**

This directory contains the complete architecture documentation for the ChatRealty ecosystem, including the JPSRealtor flagship property.

---

## Quick Navigation

### 🚀 Getting Started
- **[DEVELOPER_ONBOARDING.md](DEVELOPER_ONBOARDING.md)** - Start here! Complete onboarding guide for new developers

### 📋 Core Architecture
- **[MASTER_SYSTEM_ARCHITECTURE.md](MASTER_SYSTEM_ARCHITECTURE.md)** - Authoritative system overview, tech stack, and architecture principles
- **[FRONTEND_ARCHITECTURE.md](FRONTEND_ARCHITECTURE.md)** - Next.js 16 frontend: components, routing, state management, performance
- **[BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md)** - PayloadCMS backend: collections, API endpoints, access control
- **[AUTH_ARCHITECTURE.md](AUTH_ARCHITECTURE.md)** - Authentication flows: JWT, OAuth 2.0 (Google/Facebook), session management

### 🗄️ Data & Infrastructure
- **[DATABASE_ARCHITECTURE.md](DATABASE_ARCHITECTURE.md)** - MongoDB schema, indexing strategy, query patterns, performance
- **[MULTI_TENANT_ARCHITECTURE.md](MULTI_TENANT_ARCHITECTURE.md)** - Multi-tenant strategy for ChatRealty network
- **[COLLECTIONS_REFERENCE.md](COLLECTIONS_REFERENCE.md)** - Quick reference for all MongoDB collections
- **[DEPLOYMENT_PIPELINE.md](DEPLOYMENT_PIPELINE.md)** - Deployment procedures (Vercel, DigitalOcean, CI/CD)
- **[INTEGRATION_NOTES.md](INTEGRATION_NOTES.md)** - External service integrations (Groq AI, Spark API, Cloudinary, etc.)

---

## Project Overview

**ChatRealty** is a multi-tenant SaaS platform for real estate agents, featuring:
- AI-powered conversational search (Groq AI + llama-3.1-70b-versatile)
- Enterprise map system (MapLibre + Supercluster, 11,000+ listings)
- Swipe review mode (Tinder-like listing interface)
- PayloadCMS headless backend
- Single MongoDB database (shared across frontend/backend)

**Current Deployment**: JPSRealtor.com (Phase 1 - Single Tenant)

**Future**: ChatRealty.io network (Phase 2 - Multi-Tenant)

---

## Tech Stack

### Frontend
- **Next.js** 16.0.3 (App Router, Turbopack, React 19)
- **TypeScript** 5.7.2
- **Tailwind CSS** 3.4.17
- **MapLibre GL** 4.7.1 + Supercluster
- **Framer Motion** 11.15.0

### Backend
- **PayloadCMS** 3.64.0
- **MongoDB** 6.x (Atlas)
- **Mongoose** 8.9.3

### External Services
- **Groq AI** (llama-3.1-70b-versatile)
- **Spark API** (MLS data)
- **Cloudinary** (image CDN)

---

## Architecture Principles

1. **Single Source of Truth**: PayloadCMS for auth, MongoDB for data
2. **NO NextAuth**: PayloadCMS handles ALL authentication (JWT-based)
3. **Performance First**: Direct MongoDB queries for listings (bypass CMS overhead)
4. **Multi-Tenant Ready**: Shared backend, isolated data per agent
5. **Type Safe**: Full TypeScript coverage with strict mode

---

## Repository Structure

```
chatRealty/
├── jpsrealtor/              # Frontend (Next.js 16)
│   ├── src/app/             # App router pages
│   ├── src/components/      # React components
│   ├── src/lib/             # Utilities (MongoDB, Groq, etc.)
│   └── memory-files/        # Symlink to master docs
│
├── jpsrealtor-cms/          # Backend/CMS (PayloadCMS)
│   ├── src/collections/     # PayloadCMS collections
│   ├── payload.config.ts    # CMS configuration
│   └── memory-files/        # Symlink to master docs
│
└── memory-files/            # THIS DIRECTORY (master docs)
    ├── README.md            # This file
    ├── MASTER_SYSTEM_ARCHITECTURE.md
    ├── FRONTEND_ARCHITECTURE.md
    ├── BACKEND_ARCHITECTURE.md
    ├── AUTH_ARCHITECTURE.md
    ├── DATABASE_ARCHITECTURE.md
    ├── MULTI_TENANT_ARCHITECTURE.md
    ├── COLLECTIONS_REFERENCE.md
    ├── DEPLOYMENT_PIPELINE.md
    ├── INTEGRATION_NOTES.md
    └── DEVELOPER_ONBOARDING.md
```

---

## Key Concepts

### Authentication
- **PayloadCMS** is the single auth provider
- **JWT tokens** in HTTP-only cookies
- **OAuth 2.0** (Google + Facebook) via Next.js bridge → PayloadCMS

**See**: `AUTH_ARCHITECTURE.md`

---

### Database
- **Single MongoDB database** shared by frontend and CMS
- **PayloadCMS manages**: users, cities, neighborhoods, schools, blog posts
- **Frontend manages**: listings (11,592 GPS + 20,406 CRMLS), chat messages, swipe sessions

**See**: `DATABASE_ARCHITECTURE.md`

---

### AI Chat
- **Groq AI** (llama-3.1-70b-versatile)
- **Function calling** for location matching and listing search
- **Streaming responses** via Server-Sent Events (SSE)

**See**: `FRONTEND_ARCHITECTURE.md` → AI Integration

---

### Map System
- **MapLibre GL** (WebGL rendering)
- **Supercluster** (point clustering)
- **Pre-generated GeoJSON tiles** for performance (60 FPS)

**See**: `FRONTEND_ARCHITECTURE.md` → Map Components

---

### Swipe Review Mode
- **Tinder-like interface** for reviewing listings
- **Analytics tracking**: swipe left/right, session duration, conversion rate
- **Integrated with chat** and map views

**See**: `FRONTEND_ARCHITECTURE.md` → Key Features

---

## Development Workflow

### Frontend Development
```bash
cd jpsrealtor
npm install
npm run dev  # http://localhost:3000
```

### Backend Development
```bash
cd jpsrealtor-cms
npm install
npm run dev  # http://localhost:3002/admin
```

### Documentation Updates
**Edit files in `chatRealty/memory-files/`** - these are the master copies.

**Sync to other repos**:
```bash
# Copy to frontend
cp -r chatRealty/memory-files/* jpsrealtor/memory-files/

# Copy to backend
cp -r chatRealty/memory-files/* jpsrealtor-cms/memory-files/
```

---

## Deployment

### Frontend (Vercel)
- **Auto-deploy** on push to `v2` branch
- **URL**: https://jpsrealtor.com

### Backend (DigitalOcean)
- **Manual deploy** via SSH + PM2 restart
- **URL**: https://cms.jpsrealtor.com

**See**: `DEPLOYMENT_PIPELINE.md`

---

## For New Developers

**Start here**:
1. Read `DEVELOPER_ONBOARDING.md` (< 10 min read)
2. Clone repos and run dev servers
3. Explore `FRONTEND_ARCHITECTURE.md` and `BACKEND_ARCHITECTURE.md`
4. Make your first change (add a console.log, verify it works)

**Questions?** Check the architecture docs or ask the team!

---

## Document Versioning

**Version**: 2.0
**Last Updated**: 2025-01-23
**Author**: ChatRealty Development Team

**Changelog**:
- **v2.0** (2025-01-23): Complete architecture rewrite, multi-tenant ready, PayloadCMS auth unification
- **v1.0** (2024): Initial documentation

---

## Contributing to Docs

**When to update docs**:
- Adding new major features
- Changing authentication flows
- Modifying database schema
- Adding new external integrations
- Deployment changes

**How to update**:
1. Edit files in `chatRealty/memory-files/`
2. Update version number and "Last Updated" date
3. Sync to jpsrealtor and jpsrealtor-cms
4. Commit changes

---

## License

Proprietary - ChatRealty LLC

---

**Questions? Issues? Suggestions?**
Open a GitHub issue or contact the development team.

**Happy building!** 🚀
