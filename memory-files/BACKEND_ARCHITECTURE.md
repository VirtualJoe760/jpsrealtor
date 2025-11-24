# Backend Architecture Documentation

**Version:** 2.0
**Last Updated:** 2025-01-23
**Project:** ChatRealty / JPSRealtor CMS
**Framework:** PayloadCMS 3.64.0 + Next.js 15.1.6

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Technology Stack](#technology-stack)
3. [PayloadCMS Architecture](#payloadcms-architecture)
4. [Collections Schema](#collections-schema)
5. [Authentication System](#authentication-system)
6. [API Routes & Endpoints](#api-routes--endpoints)
7. [Database Integration](#database-integration)
8. [Email & Notifications](#email--notifications)
9. [File Storage & Media](#file-storage--media)
10. [Access Control](#access-control)
11. [Integration Points](#integration-points)
12. [Development Patterns](#development-patterns)

---

## Executive Summary

The JPSRealtor backend is powered by **PayloadCMS 3.64.0**, a headless CMS that provides:

- **Unified Authentication**: JWT-based auth with OAuth support (Google, Facebook)
- **Content Management**: Admin-managed content (cities, neighborhoods, blog posts)
- **User Management**: User profiles, roles, subscription tiers
- **Type-Safe APIs**: Auto-generated TypeScript types for all collections
- **Direct MongoDB Access**: Mongoose adapter for shared database

**Core Principle**: PayloadCMS is the **SINGLE SOURCE OF TRUTH** for authentication and user data. All user-facing applications authenticate through PayloadCMS and consume its APIs.

**Repository**: `F:/web-clients/joseph-sardella/jpsrealtor-cms`

**Deployed URL**: `https://cms.jpsrealtor.com`

**Admin Panel**: `https://cms.jpsrealtor.com/admin`

---

## Technology Stack

### Core CMS
```json
{
  "payload": "3.64.0",
  "next": "15.1.6",
  "react": "19.0.0",
  "@payloadcms/db-mongodb": "3.11.3",
  "@payloadcms/richtext-lexical": "3.21.2"
}
```

### Database
- **MongoDB** 6.x via Mongoose 8.9.3
- **Shared Database**: Same MongoDB instance as frontend (listings, chatMessages, etc.)
- **Connection**: Direct connection via `MONGODB_URI` environment variable

### Email
- **Nodemailer** via `@payloadcms/email-nodemailer` 3.3.8
- **SMTP**: Configurable SMTP server (Gmail, SendGrid, etc.)
- **Use Cases**: Password reset, email verification, notifications

### File Storage
- **Default**: Local filesystem (`/media`)
- **Future**: DigitalOcean Spaces (S3-compatible) via cloud storage plugin
- **CDN**: Cloudinary for frontend image optimization

### Authentication
- **JWT Tokens**: HTTP-only cookies
- **OAuth 2.0**: Google + Facebook (via Next.js bridge)
- **Password Hashing**: bcrypt with salt rounds

---

## PayloadCMS Architecture

### Configuration File: `payload.config.ts`

**Location**: `F:/web-clients/joseph-sardella/jpsrealtor-cms/payload.config.ts:1`

```typescript
export default buildConfig({
  // Rich text editor
  editor: lexicalEditor({}),

  // CORS - Allow frontend domains
  cors: [
    'https://jpsrealtor.com',
    'https://www.jpsrealtor.com',
    'https://cms.jpsrealtor.com',
    'http://localhost:3000',
  ],

  // CSRF protection
  csrf: [
    'https://jpsrealtor.com',
    'https://www.jpsrealtor.com',
    'https://cms.jpsrealtor.com',
    'http://localhost:3000',
  ],

  // Collections
  collections: [
    Users,
    Media,
    Cities,
    Neighborhoods,
    Schools,
    BlogPosts,
    Contacts,
  ],

  // Server URL
  serverURL: process.env.NEXT_CMS_URL || 'https://cms.jpsrealtor.com',

  // JWT secret
  secret: process.env.PAYLOAD_SECRET || 'YOUR_SECRET_HERE',

  // Database
  db: mongooseAdapter({
    url: process.env.MONGODB_URI as string,
  }),

  // Email (optional)
  email: nodemailerAdapter({
    defaultFromAddress: process.env.EMAIL_FROM,
    defaultFromName: 'JPS Realtor',
    transport: {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    },
  }),

  // Admin panel
  admin: {
    meta: {
      titleSuffix: '- JPSRealtor CMS',
    },
  },
});
```

---

### Directory Structure

```
jpsrealtor-cms/
├── src/
│   ├── collections/
│   │   ├── Users.ts                  # User management + auth
│   │   ├── Cities.ts                 # City entities
│   │   ├── Neighborhoods.ts          # Subdivision/neighborhood entities
│   │   ├── Schools.ts                # School data
│   │   ├── BlogPosts.ts              # Blog/content management
│   │   ├── Contacts.ts               # Contact form submissions
│   │   └── Media.ts                  # File uploads
│   │
│   ├── app/
│   │   └── (payload)/                # Payload admin UI
│   │
│   └── payload.config.ts             # Main config
│
├── memory-files/
│   ├── BACKEND_ARCHITECTURE.md       # This file
│   ├── PAYLOAD_ARCHITECTURE.md       # Detailed Payload docs
│   └── README.md                     # Quick start guide
│
├── public/
│   └── media/                        # Uploaded files
│
├── .env                              # Environment variables
├── package.json
└── tsconfig.json
```

---

## Collections Schema

### 1. Users Collection

**File**: `src/collections/Users.ts:1`

**Purpose**: User accounts, authentication, subscription management.

**Fields**:
```typescript
{
  // Built-in auth fields (email, password, etc.)
  email: string;                      // Primary identifier
  password: string;                   // bcrypt hashed

  // Role-based access control
  role: 'admin' | 'agent' | 'broker' | 'client' | 'investor' | 'provider' | 'host';

  // Stripe subscription integration
  stripeCustomerId: string;           // Stripe customer ID
  stripeSubscriptionId: string;       // Active subscription ID
  subscriptionTier: 'none' | 'basic' | 'pro' | 'enterprise';
  subscriptionStatus: 'inactive' | 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';
  subscriptionCurrentPeriodEnd: number; // Unix timestamp
  subscriptionCancelAtPeriodEnd: boolean;

  // Profile information
  profile: {
    firstName: string;
    lastName: string;
    company: string;
    phone: string;
    bio: string;
  };

  // Built-in timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

**Access Control**:
- **Read**: Admins can read all, agents can read providers, users can read themselves
- **Create**: Public (signup enabled)
- **Update**: Admins can update all, users can update themselves
- **Delete**: Admin only

**API Endpoints**:
- `POST /api/users/login` - Authenticate user
- `POST /api/users/logout` - Invalidate token
- `POST /api/users/forgot-password` - Password reset
- `GET /api/users/me` - Get current user
- `GET /api/users/:id` - Get user by ID
- `PATCH /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

---

### 2. Cities Collection

**File**: `src/collections/Cities.ts:1`

**Purpose**: City entities for location-based search.

**Fields**:
```typescript
{
  name: string;                       // e.g., "Palm Desert"
  slug: string;                       // e.g., "palm-desert"
  state: string;                      // e.g., "CA"
  county: string;                     // e.g., "Riverside"

  coordinates: {
    latitude: number;
    longitude: number;
  };

  description: string;                // Rich text (Lexical)
  featured: boolean;                  // Homepage display
  population: number;
  medianHomePrice: number;

  metadata: {
    walkScore: number;
    transitScore: number;
    bikeScore: number;
  };

  seoMetadata: {
    title: string;
    description: string;
    keywords: string[];
  };

  createdAt: Date;
  updatedAt: Date;
}
```

**Access Control**:
- **Read**: Public
- **Create/Update/Delete**: Admin only

**API Endpoints**:
- `GET /api/cities` - List all cities
- `GET /api/cities/:id` - Get city by ID
- `GET /api/cities/slug/:slug` - Get city by slug

---

### 3. Neighborhoods Collection

**File**: `src/collections/Neighborhoods.ts:1`

**Purpose**: Subdivision/neighborhood entities for hyper-local search.

**Fields**:
```typescript
{
  name: string;                       // e.g., "Palm Desert Country Club"
  slug: string;                       // e.g., "palm-desert-country-club"
  city: relationship(Cities);         // Parent city

  description: string;                // Rich text (Lexical)
  featured: boolean;

  coordinates: {
    latitude: number;
    longitude: number;
  };

  boundary: GeoJSON;                  // Polygon for map display

  statistics: {
    activeListings: number;
    medianPrice: number;
    averageDaysOnMarket: number;
    pricePerSqft: number;
  };

  amenities: string[];                // e.g., ["Golf Course", "Pool", "Tennis"]

  schools: relationship(Schools, { hasMany: true });

  images: relationship(Media, { hasMany: true });

  seoMetadata: {
    title: string;
    description: string;
    keywords: string[];
  };

  createdAt: Date;
  updatedAt: Date;
}
```

**Access Control**:
- **Read**: Public
- **Create/Update/Delete**: Admin + Agent (for their assigned neighborhoods)

**API Endpoints**:
- `GET /api/neighborhoods` - List all neighborhoods
- `GET /api/neighborhoods/:id` - Get by ID
- `GET /api/neighborhoods/slug/:slug` - Get by slug
- `GET /api/neighborhoods/city/:cityId` - Get by city

---

### 4. Schools Collection

**File**: `src/collections/Schools.ts:1`

**Purpose**: School data for family-focused search.

**Fields**:
```typescript
{
  name: string;                       // e.g., "George Washington Elementary"
  type: 'elementary' | 'middle' | 'high' | 'charter' | 'private';
  district: string;
  address: string;

  coordinates: {
    latitude: number;
    longitude: number;
  };

  ratings: {
    greatSchools: number;             // 1-10 scale
    testScores: number;
  };

  demographics: {
    totalStudents: number;
    studentTeacherRatio: number;
  };

  website: string;
  phone: string;

  createdAt: Date;
  updatedAt: Date;
}
```

**Access Control**:
- **Read**: Public
- **Create/Update/Delete**: Admin only

---

### 5. BlogPosts Collection

**File**: `src/collections/BlogPosts.ts:1`

**Purpose**: Content marketing and SEO.

**Fields**:
```typescript
{
  title: string;
  slug: string;
  author: relationship(Users);

  content: RichText;                  // Lexical editor
  excerpt: string;

  featuredImage: relationship(Media);

  categories: string[];               // e.g., ["Market Updates", "Buyer Tips"]
  tags: string[];

  status: 'draft' | 'published' | 'archived';
  publishedAt: Date;

  seoMetadata: {
    title: string;
    description: string;
    keywords: string[];
    ogImage: relationship(Media);
  };

  createdAt: Date;
  updatedAt: Date;
}
```

**Access Control**:
- **Read**: Public (published only), Admin (all)
- **Create/Update**: Admin + Agent
- **Delete**: Admin only

---

### 6. Contacts Collection

**File**: `src/collections/Contacts.ts:1`

**Purpose**: Contact form submissions and lead tracking.

**Fields**:
```typescript
{
  name: string;
  email: string;
  phone: string;
  message: string;

  source: 'website' | 'chat' | 'listing' | 'neighborhood';
  referenceId: string;                // Listing ID or neighborhood slug

  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'archived';
  assignedTo: relationship(Users);    // Agent assignment

  notes: string;                      // Internal notes

  createdAt: Date;
  updatedAt: Date;
}
```

**Access Control**:
- **Read**: Admin + assigned agent
- **Create**: Public
- **Update/Delete**: Admin + assigned agent

---

### 7. Media Collection

**File**: `src/collections/Media.ts:1`

**Purpose**: File uploads (images, PDFs, etc.).

**Fields**:
```typescript
{
  alt: string;                        // Alt text for accessibility
  filename: string;
  mimeType: string;
  filesize: number;
  width: number;
  height: number;

  url: string;                        // Public URL

  createdAt: Date;
  updatedAt: Date;
}
```

**Access Control**:
- **Read**: Public
- **Create**: Admin + Agent
- **Delete**: Admin only

**Storage**:
- Default: `/public/media/`
- Future: DigitalOcean Spaces

---

## Authentication System

### JWT-Based Authentication

**Token Generation**:
```typescript
// User logs in
POST /api/users/login
{
  "email": "user@example.com",
  "password": "securePassword123"
}

// Response
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "role": "client",
    "subscriptionTier": "basic"
  },
  "exp": 1640000000  // Token expiration (Unix timestamp)
}
```

**Token Storage**:
- **HTTP-only cookie**: `payload-token`
- **SameSite**: `strict` (CSRF protection)
- **Secure**: `true` (HTTPS only in production)
- **Domain**: `.jpsrealtor.com` (shared across subdomains)

**Token Validation**:
```typescript
// Frontend makes authenticated request
GET /api/users/me
Cookie: payload-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// Backend validates token
const user = await payload.auth.verifyToken(req.cookies['payload-token']);
```

---

### OAuth 2.0 Flow (Google + Facebook)

**Architecture**: Next.js API route → PayloadCMS bridge

**Flow**:
```
1. User clicks "Sign in with Google" on jpsrealtor.com
   ↓
2. Next.js redirects to Google OAuth
   GET https://accounts.google.com/o/oauth2/v2/auth?
     client_id=...&
     redirect_uri=https://jpsrealtor.com/api/auth/google/callback&
     scope=email profile
   ↓
3. User authorizes on Google
   ↓
4. Google redirects back with code
   GET https://jpsrealtor.com/api/auth/google/callback?code=ABC123
   ↓
5. Next.js API route exchanges code for Google token
   POST https://oauth2.googleapis.com/token
   ↓
6. Next.js fetches user profile from Google
   GET https://www.googleapis.com/oauth2/v1/userinfo
   ↓
7. Next.js creates/updates user in PayloadCMS
   POST https://cms.jpsrealtor.com/api/users
   {
     "email": "user@gmail.com",
     "profile": {
       "firstName": "John",
       "lastName": "Doe"
     },
     "role": "client"
   }
   ↓
8. PayloadCMS returns JWT token
   ↓
9. Next.js sets HTTP-only cookie with token
   ↓
10. Next.js redirects user to app
```

**Frontend Implementation** (`src/app/api/auth/[...nextauth]/route.ts:1`):
```typescript
import { OAuth2Client } from 'google-auth-library';

export async function GET(req: Request, { params }: { params: { nextauth: string[] } }) {
  const [provider, action] = params.nextauth;

  if (provider === 'google' && action === 'callback') {
    const code = new URL(req.url).searchParams.get('code');

    // Exchange code for token
    const client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // Fetch user profile
    const { data } = await client.request({
      url: 'https://www.googleapis.com/oauth2/v1/userinfo'
    });

    // Create/update user in PayloadCMS
    const payloadResponse = await fetch('https://cms.jpsrealtor.com/api/users/oauth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'google',
        providerId: data.id,
        email: data.email,
        profile: {
          firstName: data.given_name,
          lastName: data.family_name,
        }
      })
    });

    const { token, user } = await payloadResponse.json();

    // Set HTTP-only cookie
    const response = NextResponse.redirect(new URL('/', req.url));
    response.cookies.set('payload-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      domain: '.jpsrealtor.com'
    });

    return response;
  }
}
```

**PayloadCMS OAuth Endpoint** (to be implemented):
```typescript
// POST /api/users/oauth
{
  "provider": "google",
  "providerId": "google_user_123",
  "email": "user@gmail.com",
  "profile": {
    "firstName": "John",
    "lastName": "Doe"
  }
}

// Response
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

---

### Password Reset Flow

**Flow**:
```
1. User requests password reset
   POST /api/users/forgot-password
   { "email": "user@example.com" }
   ↓
2. PayloadCMS generates reset token
   ↓
3. PayloadCMS sends email with reset link
   https://jpsrealtor.com/reset-password?token=ABC123
   ↓
4. User clicks link and submits new password
   POST /api/users/reset-password
   {
     "token": "ABC123",
     "password": "newPassword123"
   }
   ↓
5. PayloadCMS validates token and updates password
   ↓
6. User redirected to login
```

---

## API Routes & Endpoints

### PayloadCMS Auto-Generated REST API

**Base URL**: `https://cms.jpsrealtor.com/api`

**Authentication**: Include `payload-token` cookie or `Authorization: Bearer <token>` header

#### Collection Endpoints

**Pattern**: `/api/{collection-slug}`

**Example** (Users):
```bash
# Create user
POST /api/users
{
  "email": "new@example.com",
  "password": "securePassword123",
  "role": "client"
}

# Get all users (with filters)
GET /api/users?where[role][equals]=client&limit=20&page=1

# Get single user
GET /api/users/user_123

# Update user
PATCH /api/users/user_123
{
  "profile.firstName": "John"
}

# Delete user
DELETE /api/users/user_123
```

**Query Parameters**:
- `where` - Filter conditions (e.g., `where[role][equals]=admin`)
- `limit` - Results per page (default: 10)
- `page` - Page number (default: 1)
- `sort` - Sort field (e.g., `sort=-createdAt` for descending)
- `depth` - Relationship depth (0-3)

---

#### Auth Endpoints

```bash
# Login
POST /api/users/login
{
  "email": "user@example.com",
  "password": "password123"
}

# Logout
POST /api/users/logout

# Get current user
GET /api/users/me

# Refresh token
POST /api/users/refresh-token

# Forgot password
POST /api/users/forgot-password
{
  "email": "user@example.com"
}

# Reset password
POST /api/users/reset-password
{
  "token": "reset_token_here",
  "password": "newPassword123"
}

# Verify email
GET /api/users/verify/:token
```

---

### Custom API Endpoints (Next.js)

**Frontend API routes** that integrate with PayloadCMS:

#### `/api/auth/*` (OAuth bridge)
```bash
# Initiate Google OAuth
GET /api/auth/google

# OAuth callback
GET /api/auth/google/callback?code=ABC123

# Initiate Facebook OAuth
GET /api/auth/facebook

# OAuth callback
GET /api/auth/facebook/callback?code=XYZ789
```

---

#### `/api/users/*` (User operations)
```bash
# Get user profile with subscription details
GET /api/users/profile

# Update user preferences
PATCH /api/users/preferences
{
  "emailNotifications": true,
  "smsNotifications": false
}

# Get user's favorite listings
GET /api/users/favorites
```

---

## Database Integration

### Shared MongoDB Instance

**Architecture**: PayloadCMS and frontend share the same MongoDB database.

**Connection String**:
```
mongodb+srv://username:password@cluster.mongodb.net/jpsrealtor?retryWrites=true&w=majority
```

**Collections Managed by PayloadCMS**:
- `users` (auth + profiles)
- `cities`
- `neighborhoods`
- `schools`
- `blogPosts`
- `contacts`
- `media`
- `payload-preferences` (Payload internal)
- `payload-migrations` (Payload internal)

**Collections Managed by Frontend** (direct MongoDB queries):
- `listings` (GPS MLS data - 11,592 docs)
- `crmlsListings` (CRMLS MLS data - 20,406 docs)
- `chatMessages` (AI chat history)
- `savedChats` (persisted conversations)
- `swipeReviewSessions` (swipe analytics)
- `searchInsights` (search analytics)

**Direct MongoDB Access** (Frontend):
```typescript
// src/lib/mongodb.ts
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
  if (cached.conn) return cached.conn;

  cached.promise = cached.promise || mongoose.connect(MONGODB_URI, {
    dbName: 'jpsrealtor',
  });

  cached.conn = await cached.promise;
  return cached.conn;
}
```

**Listing Query Example** (Frontend):
```typescript
import { connectToDatabase } from '@/lib/mongodb';
import Listing from '@/models/listings';

export async function searchListings(params: {
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  beds?: number;
}) {
  await connectToDatabase();

  const query: any = { ListingStatus: 'Active' };

  if (params.city) query.City = params.city;
  if (params.minPrice) query.ListPrice = { $gte: params.minPrice };
  if (params.maxPrice) query.ListPrice = { ...query.ListPrice, $lte: params.maxPrice };
  if (params.beds) query.BedroomsTotal = { $gte: params.beds };

  const listings = await Listing.find(query)
    .limit(50)
    .sort({ ListPrice: -1 })
    .lean();

  return listings;
}
```

---

## Email & Notifications

### Nodemailer Configuration

**Setup** (`payload.config.ts`):
```typescript
email: nodemailerAdapter({
  defaultFromAddress: 'noreply@jpsrealtor.com',
  defaultFromName: 'JPS Realtor',
  transport: {
    host: process.env.SMTP_HOST,        // e.g., smtp.gmail.com
    port: Number(process.env.SMTP_PORT), // e.g., 587
    secure: false,                       // true for 465, false for 587
    auth: {
      user: process.env.SMTP_USER,       // e.g., api-key
      pass: process.env.SMTP_PASS,       // e.g., SG.abc123...
    },
  },
}),
```

**Email Templates**:
- Password reset
- Email verification
- Welcome email (new user signup)
- Contact form notification (to agent)
- Subscription confirmation

**Sending Emails** (from Payload hooks):
```typescript
import { sendEmail } from 'payload';

await sendEmail({
  to: user.email,
  subject: 'Welcome to JPSRealtor!',
  html: `<p>Hi ${user.profile.firstName},</p><p>Welcome to JPSRealtor...</p>`,
});
```

---

## File Storage & Media

### Current: Local Filesystem

**Upload Directory**: `/public/media/`

**URL Pattern**: `https://cms.jpsrealtor.com/media/{filename}`

**Max File Size**: 10MB (configurable)

**Allowed Types**: Images (jpg, png, webp), PDFs

---

### Future: DigitalOcean Spaces (S3-Compatible)

**Plugin**: `@payloadcms/cloud-storage`

**Configuration**:
```typescript
import { cloudStorage } from '@payloadcms/cloud-storage';
import { s3Adapter } from '@payloadcms/cloud-storage/s3';

plugins: [
  cloudStorage({
    collections: {
      media: {
        adapter: s3Adapter({
          config: {
            endpoint: process.env.DO_SPACES_ENDPOINT, // e.g., nyc3.digitaloceanspaces.com
            credentials: {
              accessKeyId: process.env.DO_SPACES_KEY,
              secretAccessKey: process.env.DO_SPACES_SECRET,
            },
            region: 'us-east-1',
          },
          bucket: process.env.DO_SPACES_BUCKET,
        }),
      },
    },
  }),
],
```

**URL Pattern**: `https://{bucket}.nyc3.digitaloceanspaces.com/{filename}`

---

## Access Control

### Role-Based Access Control (RBAC)

**Roles**:
- `admin` - Full system access
- `agent` - Manage own neighborhoods, contacts, blog posts
- `broker` - Manage team agents, view all team data
- `client` - Standard user, read-only access to public data
- `investor` - Pro tier, access to investment analytics
- `provider` - Service providers (title, lender, etc.)
- `host` - Short-term rental hosts

**Access Control Pattern** (Collections):
```typescript
access: {
  // Who can read documents
  read: ({ req }) => {
    if (req.user?.role === 'admin') return true;
    if (req.user?.role === 'agent') return { /* filter logic */ };
    return { published: { equals: true } }; // Public: published only
  },

  // Who can create documents
  create: ({ req }) => {
    return req.user?.role === 'admin' || req.user?.role === 'agent';
  },

  // Who can update documents
  update: ({ req }) => {
    if (req.user?.role === 'admin') return true;
    // Agents can only update their own documents
    return {
      author: { equals: req.user?.id },
    };
  },

  // Who can delete documents
  delete: ({ req }) => {
    return req.user?.role === 'admin';
  },
},
```

---

### Field-Level Access Control

**Example** (Hide sensitive fields from non-admins):
```typescript
fields: [
  {
    name: 'stripeCustomerId',
    type: 'text',
    access: {
      read: ({ req }) => req.user?.role === 'admin',
      update: ({ req }) => req.user?.role === 'admin',
    },
  },
],
```

---

## Integration Points

### Frontend ↔ CMS Integration

**Pattern 1: Direct API Calls**
```typescript
// Frontend fetches user profile from CMS
const response = await fetch('https://cms.jpsrealtor.com/api/users/me', {
  credentials: 'include', // Include cookies
});
const user = await response.json();
```

**Pattern 2: Server-Side Data Fetching** (Next.js RSC)
```typescript
// app/neighborhoods/[cityId]/[slug]/page.tsx
export default async function SubdivisionPage({ params }) {
  const subdivision = await fetch(
    `https://cms.jpsrealtor.com/api/neighborhoods/slug/${params.slug}`
  ).then(res => res.json());

  return <SubdivisionPageClient subdivision={subdivision} />;
}
```

**Pattern 3: Middleware Auth Check**
```typescript
// middleware.ts
import { NextResponse } from 'next/server';

export async function middleware(req: Request) {
  const token = req.cookies.get('payload-token');

  if (!token) {
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }

  // Validate token with PayloadCMS
  const user = await fetch('https://cms.jpsrealtor.com/api/users/me', {
    headers: { Cookie: `payload-token=${token}` }
  }).then(res => res.json());

  if (!user) {
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/favorites/:path*'],
};
```

---

### CMS ↔ Database Integration

**Shared Collections**: PayloadCMS manages schema, frontend queries directly.

**Example** (Neighborhoods):
```typescript
// CMS: Admin creates neighborhood via Payload UI
// POST /api/neighborhoods
{
  "name": "Palm Desert Country Club",
  "slug": "palm-desert-country-club",
  "city": "city_palm_desert",
  "description": "...",
  "statistics": {
    "activeListings": 12,
    "medianPrice": 450000
  }
}

// Frontend: Queries MongoDB directly for performance
import Neighborhood from '@/models/neighborhoods';

const neighborhood = await Neighborhood.findOne({ slug: 'palm-desert-country-club' })
  .populate('city')
  .populate('schools')
  .lean();
```

---

## Development Patterns

### 1. Collection Definition Pattern

```typescript
import { CollectionConfig } from 'payload';

export const MyCollection: CollectionConfig = {
  slug: 'my-collection',

  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'status', 'createdAt'],
  },

  access: {
    read: () => true,
    create: ({ req }) => req.user?.role === 'admin',
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
  },

  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      defaultValue: 'draft',
    },
  ],

  hooks: {
    beforeChange: [
      ({ data }) => {
        // Auto-generate slug from name
        if (data.name && !data.slug) {
          data.slug = data.name.toLowerCase().replace(/\s+/g, '-');
        }
        return data;
      },
    ],
    afterChange: [
      ({ doc, operation }) => {
        if (operation === 'create') {
          console.log('New document created:', doc.id);
        }
      },
    ],
  },
};
```

---

### 2. Custom Validation

```typescript
fields: [
  {
    name: 'email',
    type: 'email',
    required: true,
    unique: true,
    validate: (val) => {
      // Custom validation logic
      if (!val.includes('@')) {
        return 'Please enter a valid email address';
      }
      return true;
    },
  },
],
```

---

### 3. Relationship Fields

```typescript
{
  name: 'author',
  type: 'relationship',
  relationTo: 'users',
  required: true,
  hasMany: false,
},

{
  name: 'schools',
  type: 'relationship',
  relationTo: 'schools',
  hasMany: true,
  filterOptions: ({ relationTo }) => {
    return {
      type: { equals: 'elementary' }
    };
  },
},
```

---

### 4. Hooks (Lifecycle Events)

**Available Hooks**:
- `beforeValidate` - Before validation runs
- `beforeChange` - Before document save
- `afterChange` - After document save
- `beforeRead` - Before document fetch
- `afterRead` - After document fetch
- `beforeDelete` - Before document deletion
- `afterDelete` - After document deletion

**Example** (Auto-update statistics):
```typescript
hooks: {
  afterChange: [
    async ({ doc, operation, req }) => {
      if (operation === 'create' && doc.city) {
        // Update city's neighborhood count
        await req.payload.update({
          collection: 'cities',
          id: doc.city,
          data: {
            neighborhoodCount: { $inc: 1 }
          }
        });
      }
    },
  ],
},
```

---

## Cross-References

- **Frontend Architecture**: See `FRONTEND_ARCHITECTURE.md`
- **Authentication Flow**: See `AUTH_ARCHITECTURE.md`
- **Database Schema**: See `DATABASE_ARCHITECTURE.md`
- **Collections Reference**: See `COLLECTIONS_REFERENCE.md`
- **Deployment**: See `DEPLOYMENT_PIPELINE.md`

---

## Next Steps for Developers

1. **Set up local CMS**: Clone `jpsrealtor-cms`, run `npm install`, configure `.env`
2. **Start dev server**: `npm run dev` (runs on http://localhost:3002)
3. **Access admin panel**: http://localhost:3002/admin
4. **Create admin user**: First user auto-promoted to admin
5. **Explore collections**: Navigate through admin UI to understand data structure
6. **Test API endpoints**: Use Postman/Insomnia to test REST API
7. **Implement OAuth**: Follow auth architecture guide for Google/Facebook integration

**Questions?** Refer to `DEVELOPER_ONBOARDING.md` for FAQs and troubleshooting.
