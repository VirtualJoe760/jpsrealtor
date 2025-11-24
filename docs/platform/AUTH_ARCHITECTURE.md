# Authentication & Authorization Architecture

**Version:** 2.0
**Last Updated:** 2025-01-23
**Project:** ChatRealty / JPSRealtor
**Auth Provider:** PayloadCMS 3.64.0 (JWT-based)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Principles](#architecture-principles)
3. [Authentication Flow](#authentication-flow)
4. [OAuth 2.0 Integration](#oauth-20-integration)
5. [Token Management](#token-management)
6. [Session Persistence](#session-persistence)
7. [Authorization & RBAC](#authorization--rbac)
8. [Security Measures](#security-measures)
9. [API Authentication](#api-authentication)
10. [Frontend Integration](#frontend-integration)
11. [Multi-Tenant Considerations](#multi-tenant-considerations)
12. [Error Handling](#error-handling)

---

## Executive Summary

The ChatRealty ecosystem uses a **unified authentication system** powered by PayloadCMS. All authentication flows—including email/password, Google OAuth, and Facebook OAuth—are handled through PayloadCMS as the single source of truth.

**Key Principles**:
- **NO NextAuth**: PayloadCMS handles all authentication
- **JWT Tokens**: Stateless authentication with HTTP-only cookies
- **OAuth Bridge**: Next.js API routes bridge to Payload for OAuth flows
- **Shared Sessions**: Single sign-on across all ChatRealty properties
- **Role-Based Access**: Fine-grained permissions via PayloadCMS collections

**Supported Authentication Methods**:
1. Email + Password (PayloadCMS built-in)
2. Google OAuth 2.0 (via Next.js → Payload bridge)
3. Facebook OAuth 2.0 (via Next.js → Payload bridge)
4. Magic Link (future: passwordless email auth)

---

## Architecture Principles

### 1. Single Source of Truth

**PayloadCMS is the authoritative auth provider** for the entire ChatRealty network.

```
┌─────────────────────────────────────────────────────────┐
│                  ChatRealty Network                      │
├─────────────────────────────────────────────────────────┤
│  jpsrealtor.com     agent2.com     agent3.com ...       │
│       ↓                 ↓               ↓               │
│       └─────────────────┴───────────────┘               │
│                         ↓                               │
│              PayloadCMS Auth Service                    │
│          (cms.chatrealty.io/api/users)                 │
│                         ↓                               │
│                   MongoDB Users                         │
└─────────────────────────────────────────────────────────┘
```

**Benefits**:
- Centralized user management
- Consistent auth logic across all properties
- Single sign-on capability
- Unified subscription/billing

---

### 2. Stateless JWT Authentication

**No server-side sessions**. All authentication state is encoded in JWT tokens.

**Token Payload**:
```json
{
  "id": "user_6586f9e8d4b1a2c3d4e5f678",
  "email": "user@example.com",
  "role": "client",
  "collection": "users",
  "iat": 1640000000,
  "exp": 1642592000
}
```

**Advantages**:
- Horizontal scalability (no shared session store)
- Faster auth checks (no database lookup)
- Cross-domain compatibility

---

### 3. HTTP-Only Cookie Storage

**Tokens are stored in HTTP-only cookies** (not localStorage/sessionStorage).

**Security Benefits**:
- XSS-resistant (JavaScript cannot access cookies)
- Automatic CSRF protection via SameSite attribute
- Secure transmission (HTTPS-only in production)

**Cookie Configuration**:
```typescript
{
  name: 'payload-token',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 60 * 60 * 24 * 30, // 30 days
  domain: '.jpsrealtor.com', // Shared across subdomains
  path: '/'
}
```

---

## Authentication Flow

### Email + Password Login

**User Flow**:
```
1. User visits jpsrealtor.com/auth/signin
   ↓
2. User enters email + password
   ↓
3. Frontend submits credentials
   POST https://cms.chatrealty.io/api/users/login
   {
     "email": "user@example.com",
     "password": "securePassword123"
   }
   ↓
4. PayloadCMS validates credentials
   - Looks up user by email
   - Compares bcrypt hash
   ↓
5. PayloadCMS generates JWT token
   {
     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "user": { ... },
     "exp": 1642592000
   }
   ↓
6. Frontend receives response
   ↓
7. Frontend sets HTTP-only cookie (via Next.js API route)
   POST /api/auth/set-token
   {
     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   }
   ↓
8. Next.js API route sets cookie
   Set-Cookie: payload-token=...; HttpOnly; Secure; SameSite=Strict
   ↓
9. User redirected to dashboard
```

**Frontend Implementation** (`src/app/auth/signin/page.tsx`):
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      // 1. Authenticate with PayloadCMS
      const response = await fetch('https://cms.chatrealty.io/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Invalid email or password');
      }

      const { token, user } = await response.json();

      // 2. Set HTTP-only cookie via Next.js API route
      await fetch('/api/auth/set-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      // 3. Redirect to dashboard
      router.push('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      {error && <p>{error}</p>}
      <button type="submit">Sign In</button>
    </form>
  );
}
```

**API Route** (`src/app/api/auth/set-token/route.ts`):
```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { token } = await req.json();

  const response = NextResponse.json({ success: true });

  response.cookies.set('payload-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    domain: '.jpsrealtor.com',
    path: '/',
  });

  return response;
}
```

---

### Sign Up Flow

**User Flow**:
```
1. User visits jpsrealtor.com/auth/signup
   ↓
2. User enters email, password, name
   ↓
3. Frontend submits registration
   POST https://cms.chatrealty.io/api/users
   {
     "email": "newuser@example.com",
     "password": "securePassword123",
     "profile": {
       "firstName": "John",
       "lastName": "Doe"
     },
     "role": "client"
   }
   ↓
4. PayloadCMS creates user
   - Hashes password (bcrypt)
   - Generates email verification token (optional)
   - Sends welcome email (optional)
   ↓
5. PayloadCMS returns JWT token
   {
     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "user": { ... }
   }
   ↓
6. Frontend sets cookie and redirects
```

**Frontend Implementation** (`src/app/auth/signup/page.tsx`):
```typescript
const handleSignUp = async (e: React.FormEvent) => {
  e.preventDefault();

  try {
    const response = await fetch('https://cms.chatrealty.io/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        profile: { firstName, lastName },
        role: 'client',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const { token, user } = await response.json();

    // Set cookie
    await fetch('/api/auth/set-token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });

    // Redirect
    router.push('/');
  } catch (err) {
    setError(err.message);
  }
};
```

---

## OAuth 2.0 Integration

### Architecture: Next.js Bridge → PayloadCMS

**Why not direct OAuth in Payload?**
- PayloadCMS doesn't natively support OAuth providers
- Next.js API routes provide flexible OAuth integration
- Frontend controls UX, CMS stores user data

**Flow**:
```
Frontend ─→ Next.js OAuth Route ─→ Google/Facebook ─→ Next.js Callback ─→ PayloadCMS ─→ Frontend
```

---

### Google OAuth Flow

**Step-by-Step**:

**1. User initiates OAuth**
```typescript
// User clicks "Sign in with Google"
<button onClick={() => router.push('/api/auth/google')}>
  Sign in with Google
</button>
```

**2. Next.js redirects to Google**
```typescript
// app/api/auth/google/route.ts
import { OAuth2Client } from 'google-auth-library';

export async function GET() {
  const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI // https://jpsrealtor.com/api/auth/google/callback
  );

  const authorizeUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
  });

  return NextResponse.redirect(authorizeUrl);
}
```

**3. Google redirects back with code**
```
https://jpsrealtor.com/api/auth/google/callback?code=4/0AY0e-g7...
```

**4. Next.js exchanges code for token and fetches profile**
```typescript
// app/api/auth/google/callback/route.ts
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');

  const client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  // Exchange code for tokens
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  // Fetch user profile
  const userInfoResponse = await client.request({
    url: 'https://www.googleapis.com/oauth2/v1/userinfo',
  });

  const googleUser = userInfoResponse.data;

  // googleUser = {
  //   id: "google_123456789",
  //   email: "user@gmail.com",
  //   given_name: "John",
  //   family_name: "Doe",
  //   picture: "https://..."
  // }

  // Continue to step 5...
}
```

**5. Next.js creates/updates user in PayloadCMS**
```typescript
// Check if user exists
let payloadUser = await fetch(
  `https://cms.chatrealty.io/api/users?where[email][equals]=${googleUser.email}`,
  {
    headers: {
      Authorization: `Bearer ${process.env.PAYLOAD_API_KEY}`,
    },
  }
).then(res => res.json());

if (payloadUser.docs.length === 0) {
  // Create new user
  payloadUser = await fetch('https://cms.chatrealty.io/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.PAYLOAD_API_KEY}`,
    },
    body: JSON.stringify({
      email: googleUser.email,
      password: crypto.randomBytes(32).toString('hex'), // Random password (user won't use it)
      role: 'client',
      profile: {
        firstName: googleUser.given_name,
        lastName: googleUser.family_name,
      },
      oauthProvider: 'google',
      oauthId: googleUser.id,
    }),
  }).then(res => res.json());
} else {
  // User exists, update profile if needed
  payloadUser = payloadUser.docs[0];
}
```

**6. Next.js logs in user via PayloadCMS**
```typescript
// Authenticate as user to get JWT
const loginResponse = await fetch('https://cms.chatrealty.io/api/users/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: googleUser.email,
    // Special OAuth login endpoint (custom implementation)
  }),
});

const { token } = await loginResponse.json();
```

**7. Next.js sets cookie and redirects**
```typescript
const response = NextResponse.redirect(new URL('/', req.url));

response.cookies.set('payload-token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 60 * 60 * 24 * 30,
  domain: '.jpsrealtor.com',
});

return response;
```

**Environment Variables**:
```bash
# .env.local
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://jpsrealtor.com/api/auth/google/callback

# For server-side Payload operations
PAYLOAD_API_KEY=your_payload_api_key
```

---

### Facebook OAuth Flow

**Nearly identical to Google OAuth**, with different provider details:

**Differences**:
1. OAuth client: `facebook-auth-library` or `passport-facebook`
2. Authorization URL: `https://www.facebook.com/v12.0/dialog/oauth`
3. Token exchange: `https://graph.facebook.com/v12.0/oauth/access_token`
4. User info: `https://graph.facebook.com/me?fields=id,name,email,picture`

**Environment Variables**:
```bash
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
FACEBOOK_REDIRECT_URI=https://jpsrealtor.com/api/auth/facebook/callback
```

---

## Token Management

### JWT Structure

**Header**:
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload**:
```json
{
  "id": "user_6586f9e8d4b1a2c3d4e5f678",
  "email": "user@example.com",
  "role": "client",
  "collection": "users",
  "iat": 1640000000,  // Issued at
  "exp": 1642592000   // Expires at (30 days from iat)
}
```

**Signature**:
```
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  PAYLOAD_SECRET
)
```

---

### Token Expiration

**Default Expiration**: 30 days

**Refresh Strategy**: Sliding window (refresh on activity)

**Implementation**:
```typescript
// Middleware checks token expiration
export async function middleware(req: NextRequest) {
  const token = req.cookies.get('payload-token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }

  try {
    // Decode token (without verification, just to check expiration)
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString()
    );

    const expiresAt = payload.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;

    // If token expires in < 7 days, refresh it
    if (timeUntilExpiry < 7 * 24 * 60 * 60 * 1000) {
      const refreshResponse = await fetch('https://cms.chatrealty.io/api/users/refresh-token', {
        method: 'POST',
        headers: { Cookie: `payload-token=${token}` },
      });

      const { token: newToken } = await refreshResponse.json();

      const response = NextResponse.next();
      response.cookies.set('payload-token', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 30,
        domain: '.jpsrealtor.com',
      });

      return response;
    }

    return NextResponse.next();
  } catch (err) {
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }
}
```

---

### Token Revocation

**Logout Flow**:
```typescript
// User clicks logout
const handleLogout = async () => {
  // 1. Call PayloadCMS logout endpoint (optional, for server-side cleanup)
  await fetch('https://cms.chatrealty.io/api/users/logout', {
    method: 'POST',
    credentials: 'include',
  });

  // 2. Clear cookie via Next.js API route
  await fetch('/api/auth/logout', {
    method: 'POST',
  });

  // 3. Redirect to homepage
  router.push('/');
};
```

**API Route** (`app/api/auth/logout/route.ts`):
```typescript
export async function POST() {
  const response = NextResponse.json({ success: true });

  response.cookies.set('payload-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0, // Expire immediately
    domain: '.jpsrealtor.com',
  });

  return response;
}
```

---

## Session Persistence

### Cookie-Based Sessions

**No server-side session store**. All session data is in the JWT token.

**Benefits**:
- Stateless (no Redis/Memcached needed)
- Survives server restarts
- Horizontally scalable

**Drawbacks**:
- Cannot invalidate tokens before expiration (mitigated by short expiration + refresh)
- Token size limits session data

---

### Cross-Domain Sessions

**Shared cookie domain**: `.jpsrealtor.com`

**Result**: User authenticated on `jpsrealtor.com` is also authenticated on `cms.chatrealty.io` and future `agent2.jpsrealtor.com`.

**Implementation**:
```typescript
response.cookies.set('payload-token', token, {
  domain: '.jpsrealtor.com', // Note the leading dot
  // ...
});
```

---

## Authorization & RBAC

### Role-Based Access Control

**Roles** (defined in Users collection):
- `admin` - Full system access
- `agent` - Manage neighborhoods, contacts, blog posts
- `broker` - Manage team agents
- `client` - Standard user
- `investor` - Pro tier with analytics access
- `provider` - Service providers (title, lender, etc.)
- `host` - Short-term rental hosts

---

### Permission Checks

**Server-Side** (API routes):
```typescript
// app/api/admin/users/route.ts
export async function GET(req: NextRequest) {
  const token = req.cookies.get('payload-token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify token and get user
  const userResponse = await fetch('https://cms.chatrealty.io/api/users/me', {
    headers: { Cookie: `payload-token=${token}` },
  });

  const user = await userResponse.json();

  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Admin-only logic...
}
```

**Client-Side** (UI):
```typescript
'use client';

import { useEffect, useState } from 'react';

export default function AdminPanel() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch('https://cms.chatrealty.io/api/users/me', {
      credentials: 'include',
    })
      .then(res => res.json())
      .then(setUser);
  }, []);

  if (!user) return <p>Loading...</p>;

  if (user.role !== 'admin') {
    return <p>Access denied. Admins only.</p>;
  }

  return <div>Admin Panel Content</div>;
}
```

---

### Collection-Level Access Control

**PayloadCMS Access Control** (defined in collection schemas):

```typescript
// src/collections/Neighborhoods.ts
export const Neighborhoods: CollectionConfig = {
  slug: 'neighborhoods',

  access: {
    read: () => true, // Public

    create: ({ req }) => {
      // Admins and agents can create
      return req.user?.role === 'admin' || req.user?.role === 'agent';
    },

    update: ({ req, data }) => {
      if (req.user?.role === 'admin') return true;

      // Agents can only update neighborhoods they created
      if (req.user?.role === 'agent') {
        return {
          createdBy: { equals: req.user.id },
        };
      }

      return false;
    },

    delete: ({ req }) => {
      return req.user?.role === 'admin';
    },
  },

  // ...
};
```

---

## Security Measures

### 1. Password Security

**Hashing**: bcrypt with 10 salt rounds (PayloadCMS default)

**Minimum Requirements** (enforced client-side):
- 8+ characters
- Mix of uppercase, lowercase, numbers
- No common passwords (optional: check against breach database)

---

### 2. CSRF Protection

**SameSite Cookie Attribute**:
```typescript
sameSite: 'strict'
```

**Result**: Browser only sends cookie on same-site requests, blocking CSRF attacks.

---

### 3. XSS Protection

**HTTP-Only Cookies**: JavaScript cannot access tokens.

**Content Security Policy** (`next.config.js`):
```typescript
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; ..."
        },
      ],
    },
  ];
},
```

---

### 4. Rate Limiting

**Login Endpoint**: Max 5 attempts per minute per IP

**Implementation** (PayloadCMS hook):
```typescript
// Future implementation
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: 'Too many login attempts. Please try again later.',
});

// Apply to login endpoint
```

---

### 5. HTTPS-Only Cookies

**Production**:
```typescript
secure: process.env.NODE_ENV === 'production'
```

**Result**: Cookies only transmitted over HTTPS, preventing man-in-the-middle attacks.

---

## API Authentication

### Authenticated API Requests

**Pattern**: Include `payload-token` cookie automatically via `credentials: 'include'`.

**Example**:
```typescript
const response = await fetch('https://cms.chatrealty.io/api/users/me', {
  credentials: 'include', // Automatically includes cookies
});

const user = await response.json();
```

---

### Server-Side API Requests

**Pattern**: Forward cookie from incoming request.

**Example** (Next.js API route):
```typescript
export async function GET(req: NextRequest) {
  const token = req.cookies.get('payload-token')?.value;

  const response = await fetch('https://cms.chatrealty.io/api/users/me', {
    headers: {
      Cookie: `payload-token=${token}`,
    },
  });

  const user = await response.json();
  return NextResponse.json(user);
}
```

---

### API Key Authentication (Server-to-Server)

**For backend services** that need to access PayloadCMS without a user session.

**Setup**:
1. Create admin user in PayloadCMS
2. Generate API key (custom field in Users collection)
3. Store in environment variable

**Usage**:
```typescript
const response = await fetch('https://cms.chatrealty.io/api/users', {
  headers: {
    Authorization: `Bearer ${process.env.PAYLOAD_API_KEY}`,
  },
});
```

---

## Frontend Integration

### User Context Provider

**Purpose**: Manage user state globally across frontend.

**Implementation** (`src/app/contexts/UserContext.tsx`):
```typescript
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  role: string;
  subscriptionTier: string;
  profile: {
    firstName: string;
    lastName: string;
  };
}

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const response = await fetch('https://cms.chatrealty.io/api/users/me', {
        credentials: 'include',
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch('https://cms.chatrealty.io/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const { token, user: userData } = await response.json();

    await fetch('/api/auth/set-token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });

    setUser(userData);
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, isLoading, login, logout, refreshUser: fetchUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within UserProvider');
  return context;
}
```

**Usage**:
```typescript
import { useUser } from '@/app/contexts/UserContext';

export default function Header() {
  const { user, logout } = useUser();

  return (
    <header>
      {user ? (
        <>
          <p>Welcome, {user.profile.firstName}!</p>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <a href="/auth/signin">Sign In</a>
      )}
    </header>
  );
}
```

---

### Protected Routes

**Middleware** (`middleware.ts`):
```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('payload-token')?.value;

  // Public routes
  if (
    req.nextUrl.pathname.startsWith('/auth') ||
    req.nextUrl.pathname === '/'
  ) {
    return NextResponse.next();
  }

  // Protected routes
  if (!token) {
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }

  // Verify token with PayloadCMS
  const userResponse = await fetch('https://cms.chatrealty.io/api/users/me', {
    headers: { Cookie: `payload-token=${token}` },
  });

  if (!userResponse.ok) {
    return NextResponse.redirect(new URL('/auth/signin', req.url));
  }

  const user = await userResponse.json();

  // Role-based routing
  if (req.nextUrl.pathname.startsWith('/admin') && user.role !== 'admin') {
    return NextResponse.redirect(new URL('/unauthorized', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/favorites/:path*', '/admin/:path*'],
};
```

---

## Multi-Tenant Considerations

### Shared Authentication

**All ChatRealty properties** authenticate through the same PayloadCMS instance.

**Benefits**:
- Single sign-on across all properties
- Unified user database
- Centralized subscription management

---

### Tenant Identification

**Future**: Add `tenantId` field to Users collection.

```typescript
{
  tenantId: 'jpsrealtor', // or 'agent2', 'agent3', etc.
  // ...
}
```

**Use Case**: Agent-specific branding and data isolation.

---

## Error Handling

### Authentication Errors

**401 Unauthorized**: No token or invalid token
```typescript
{
  "statusCode": 401,
  "message": "Unauthorized",
  "errors": [
    {
      "message": "You are not allowed to perform this action."
    }
  ]
}
```

**403 Forbidden**: Valid token but insufficient permissions
```typescript
{
  "statusCode": 403,
  "message": "Forbidden",
  "errors": [
    {
      "message": "You do not have permission to access this resource."
    }
  ]
}
```

---

### Frontend Error Handling

```typescript
try {
  const response = await fetch('https://cms.chatrealty.io/api/users/me', {
    credentials: 'include',
  });

  if (response.status === 401) {
    // Redirect to login
    router.push('/auth/signin');
    return;
  }

  if (response.status === 403) {
    // Show access denied message
    setError('You do not have permission to view this page.');
    return;
  }

  const user = await response.json();
  setUser(user);
} catch (err) {
  console.error('Auth error:', err);
  setError('An unexpected error occurred. Please try again.');
}
```

---

## Cross-References

- **Backend Architecture**: See `BACKEND_ARCHITECTURE.md`
- **Frontend Integration**: See `FRONTEND_ARCHITECTURE.md`
- **Multi-Tenant Strategy**: See `MULTI_TENANT_ARCHITECTURE.md`
- **Collections Reference**: See `COLLECTIONS_REFERENCE.md`

---

## Next Steps for Developers

1. **Set up OAuth apps**: Create Google + Facebook OAuth apps, configure redirect URIs
2. **Implement OAuth bridge**: Build Next.js API routes for OAuth flows
3. **Add OAuth fields to Users collection**: `oauthProvider`, `oauthId`
4. **Test auth flows**: Email/password, Google OAuth, Facebook OAuth
5. **Implement protected routes**: Use middleware to enforce authentication
6. **Add role-based UI**: Show/hide UI elements based on user role

**Questions?** Refer to `DEVELOPER_ONBOARDING.md` for FAQs and troubleshooting.
