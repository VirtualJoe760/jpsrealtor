# Authentication (NextAuth.js)
**OAuth & Session Management**
**Last Updated:** January 29, 2025

---

## 📋 OVERVIEW

JPSRealtor.com uses **NextAuth.js v4.24.13** for authentication with:
- **OAuth Providers:** Google, Facebook
- **Session Strategy:** JWT + Database sessions
- **MongoDB Adapter:** Persistent session storage
- **Role-Based Access:** user, investor, agent, admin

---

## 🛠️ TECHNOLOGY STACK

```yaml
NextAuth.js: 4.24.13
  - OAuth 2.0 support
  - JWT token generation
  - Session management
  - MongoDB adapter

MongoDB Adapter: @next-auth/mongodb-adapter
  - Stores users, sessions, accounts
  - Automatic collection management

Providers:
  - Google OAuth 2.0
  - Facebook OAuth
  - (Future: Email/Password, Apple)
```

---

## 🏗️ ARCHITECTURE

### File Structure

```
src/app/api/auth/[...nextauth]/
└── route.ts                  # NextAuth configuration

src/lib/
└── auth.ts                   # Auth utilities (optional)

MongoDB Collections:
├── users
├── sessions
├── accounts
└── verification_tokens (future)
```

### Configuration

**File:** `src/app/api/auth/[...nextauth]/route.ts`

```typescript
import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_APP_ID!,
      clientSecret: process.env.FACEBOOK_APP_SECRET!,
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },

  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role || "user";
      }
      return token;
    },
  },

  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

---

## 🔐 OAUTH FLOW

### Google OAuth Flow

```
1. User clicks "Sign in with Google"
    ↓
2. Redirect to /api/auth/signin/google
    ↓
3. NextAuth redirects to Google OAuth consent page
    ↓
4. User approves permissions
    ↓
5. Google redirects to /api/auth/callback/google?code=...
    ↓
6. NextAuth validates OAuth code with Google
    ↓
7. Google returns user profile + access token
    ↓
8. NextAuth checks if user exists in MongoDB:
    - If yes: Load existing user
    - If no: Create new user document
    ↓
9. Create session document in MongoDB
    ↓
10. Generate JWT token with user ID + role
    ↓
11. Set HTTP-only cookie with JWT
    ↓
12. Redirect to / (or callbackUrl)
    ↓
13. User authenticated ✅
```

### Facebook OAuth Flow

Same as Google, with Facebook as provider.

---

## 👤 USER ROLES

```typescript
type UserRole =
  | "user"      // Default end user
  | "investor"  // Premium tier (future subscriptions)
  | "agent"     // Real estate agent (future multi-tenant)
  | "admin"     // System administrator
```

### Role Assignment

**Default:** All new users get `"user"` role

**Upgrading Roles:**
```typescript
// Manual upgrade in MongoDB
db.users.updateOne(
  { email: "agent@example.com" },
  { $set: { role: "agent" } }
);

// Or via admin API (future)
POST /api/admin/users/123/role
{ role: "agent" }
```

---

## 🔒 PROTECTED ROUTES

### API Route Protection

```typescript
// src/app/api/protected-route/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // User is authenticated
  return Response.json({ data: "Protected data" });
}
```

### Role-Based Access Control

```typescript
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Admin-only logic
  return Response.json({ data: "Admin data" });
}
```

### Client Component Protection

```typescript
"use client";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

export default function ProtectedPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (!session) {
    redirect("/auth/signin");
  }

  return (
    <div>
      <h1>Welcome, {session.user.name}!</h1>
    </div>
  );
}
```

### Server Component Protection

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  return (
    <div>
      <h1>Welcome, {session.user.name}!</h1>
    </div>
  );
}
```

---

## 🍪 SESSION MANAGEMENT

### JWT Strategy

**Token Structure:**
```typescript
{
  sub: "user-id-123",        // User ID
  role: "user",              // User role
  name: "John Doe",
  email: "john@example.com",
  picture: "https://...",
  iat: 1706544000,           // Issued at
  exp: 1707148800           // Expires (7 days)
}
```

**Storage:**
- **Cookie name:** `next-auth.session-token`
- **HTTP-only:** ✅ Yes (prevents XSS)
- **Secure:** ✅ Yes (HTTPS only in production)
- **SameSite:** `lax` (CSRF protection)
- **Max-Age:** 7 days

### Database Sessions

**MongoDB Collections:**

**users:**
```typescript
{
  _id: ObjectId("..."),
  name: "John Doe",
  email: "john@example.com",
  emailVerified: null,
  image: "https://lh3.googleusercontent.com/...",
  role: "user"
}
```

**sessions:**
```typescript
{
  _id: ObjectId("..."),
  sessionToken: "abc123xyz...",
  userId: ObjectId("..."),
  expires: ISODate("2025-02-05T10:30:00Z")
}
```

**accounts:**
```typescript
{
  _id: ObjectId("..."),
  userId: ObjectId("..."),
  type: "oauth",
  provider: "google",
  providerAccountId: "1234567890",
  access_token: "ya29...",
  refresh_token: "1//...",
  expires_at: 1706547600,
  token_type: "Bearer",
  scope: "openid profile email",
  id_token: "eyJhbGci..."
}
```

---

## 💡 USAGE EXAMPLES

### Sign In Button

```typescript
"use client";
import { signIn } from "next-auth/react";

export function SignInButton() {
  return (
    <div>
      <button onClick={() => signIn("google")}>
        Sign in with Google
      </button>
      <button onClick={() => signIn("facebook")}>
        Sign in with Facebook
      </button>
    </div>
  );
}
```

### Sign Out Button

```typescript
"use client";
import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button onClick={() => signOut()}>
      Sign Out
    </button>
  );
}
```

### Get Current User

```typescript
"use client";
import { useSession } from "next-auth/react";

export function UserProfile() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (!session) {
    return <div>Not signed in</div>;
  }

  return (
    <div>
      <img src={session.user.image} alt={session.user.name} />
      <p>{session.user.name}</p>
      <p>{session.user.email}</p>
      <p>Role: {session.user.role}</p>
    </div>
  );
}
```

### Server-Side User Check

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export default async function Page() {
  const session = await getServerSession(authOptions);

  return (
    <div>
      {session ? (
        <p>Signed in as {session.user.email}</p>
      ) : (
        <p>Not signed in</p>
      )}
    </div>
  );
}
```

---

## 🔧 ENVIRONMENT VARIABLES

```bash
# NextAuth
NEXTAUTH_URL=https://jpsrealtor.com
NEXTAUTH_SECRET=your-secret-key-here  # Generate with: openssl rand -base64 32

# Google OAuth
GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123xyz

# Facebook OAuth
FACEBOOK_APP_ID=123456789012345
FACEBOOK_APP_SECRET=abc123xyz456def789

# MongoDB
MONGODB_URI=mongodb+srv://...
```

---

## 🚀 FUTURE ENHANCEMENTS

- [ ] Email/Password authentication
- [ ] Apple Sign In
- [ ] Two-factor authentication (2FA)
- [ ] Magic link sign in
- [ ] Account linking (multiple providers)
- [ ] Email verification
- [ ] Password reset flow
- [ ] Session activity log
- [ ] Device management

---

## 🐛 TROUBLESHOOTING

### Session not persisting
- Check `NEXTAUTH_SECRET` is set
- Verify cookies are enabled
- Check HTTPS in production

### OAuth redirect loop
- Verify `NEXTAUTH_URL` matches deployment URL
- Check callback URLs in provider console

### "Adapter error"
- Verify MongoDB connection string
- Check database permissions
- Ensure collections exist

### User role not available
- Check `callbacks.jwt` includes role
- Verify `callbacks.session` passes role to session

---

## 📚 RELATED DOCUMENTATION

- [DATABASE_MODELS.md](./DATABASE_MODELS.md) - User/session collections
- [MASTER_SYSTEM_ARCHITECTURE.md](./platform/MASTER_SYSTEM_ARCHITECTURE.md)
- [NextAuth.js Docs](https://next-auth.js.org/)

---

**Last Updated:** January 29, 2025
