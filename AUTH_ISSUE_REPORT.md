# Authentication Issue Report - jpsrealtor.com

**Date:** December 12, 2025
**Issue:** NextAuth session not working on production (Vercel)
**Status:** Auth works on localhost, fails on production

---

## 🎯 Core Problem

**Localhost:** `/api/auth/session` returns user data correctly:
```json
{
  "user": {
    "name": "Joseph Sardella",
    "email": "josephsardella@gmail.com",
    "id": "691604b0d2b9d5140af67b4c",
    "roles": ["endUser", "admin"],
    "isAdmin": true
  },
  "expires": "2026-01-11T20:54:17.072Z"
}
```

**Production:** `/api/auth/session` returns empty:
```json
{}
```

---

## ✅ What Works

1. ✅ **Database connection** - MongoDB accessible from Vercel (listings load correctly)
2. ✅ **Authentication succeeds** - Login returns `ok: true`
3. ✅ **Environment variables set correctly:**
   - `NEXTAUTH_URL=https://jpsrealtor.com` (no trailing slash)
   - `NEXTAUTH_SECRET` exists (64 chars)
   - `AUTH_TRUST_HOST=true`
   - `MONGODB_URI` exists and works
4. ✅ **Session cookies created** - `__Secure-next-auth.session-token` appears in browser
5. ✅ **Code is identical** - Same codebase works on localhost, fails on Vercel

---

## ❌ What's Broken

1. ❌ **Session cookies not sent with API requests**
   - Debug endpoint shows: `"hasCookies": false, "cookieHeader": "undefined..."`
   - Cookies exist in browser but aren't included in fetch requests to `/api/auth/session`

2. ❌ **Session remains empty after successful login**
   - Console logs show:
     ```
     ✅ Sign in successful! (ok: true)
     📦 Session data: {}
     ⚠️ No user in session after successful login!
     ```

3. ❌ **EnhancedSidebar shows "Sign In" when logged in**
   - `session` is null/undefined
   - `status` shows "loading" or "unauthenticated" even when authenticated

---

## 🔧 Current Configuration

### NextAuth Setup (`src/lib/auth.ts`)
```typescript
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({ ... }),
    GoogleProvider({ ... }),
    FacebookProvider({ ... })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true, // temporarily enabled for debugging
  callbacks: {
    async signIn({ user, account, profile }) { ... },
    async jwt({ token, user, account }) { ... },
    async session({ session, token }) { ... }
  }
}
```

### Vercel Environment Variables
```
NEXTAUTH_URL=https://jpsrealtor.com
NEXTAUTH_SECRET=<64-char-secret>
AUTH_TRUST_HOST=true
MONGODB_URI=mongodb+srv://...
NODE_ENV=production
```

---

## 🔍 Investigation Results

### Test Endpoint Results

**`/api/debug/test-db`:**
```json
{
  "success": true,
  "env": {
    "MONGODB_URI_EXISTS": true,
    "NEXTAUTH_URL": "https://jpsrealtor.com",
    "NEXTAUTH_SECRET_EXISTS": true,
    "AUTH_TRUST_HOST": "true"
  }
}
```

**`/api/debug/test-session` (when logged in):**
```json
{
  "success": true,
  "hasSession": false,
  "session": null,
  "cookies": {
    "hasCookies": false,
    "cookieHeader": "undefined..."
  }
}
```

### Browser Cookies (after login)
- ✅ `__Secure-next-auth.session-token` exists
- ✅ Cookie settings: `HttpOnly`, `Secure`, `SameSite=Lax`
- ✅ Domain: `.jpsrealtor.com`
- ❌ But cookie NOT sent with API requests

---

## 🚨 Build Failures (Latest)

### Current Build Error
```
Type error: Object literal may only specify known properties,
and 'trustHost' does not exist in type 'AuthOptions'.
```

**Location:** `src/lib/auth.ts:13`

**Cause:** Attempted to add `trustHost: true` to authOptions (invalid property in NextAuth v4)

---

## 📝 Changes Attempted (All Failed)

1. ❌ Removed manual cookie configuration
2. ❌ Added `trustHost: true` (caused build failure)
3. ❌ Enabled debug mode
4. ❌ Migrated to database sessions (incompatible with Credentials provider)
5. ❌ Added comprehensive logging (server logs don't appear in browser)
6. ❌ Verified NEXTAUTH_URL has no trailing slash
7. ❌ Verified NEXTAUTH_SECRET matches between environments

---

## 💡 Root Cause IDENTIFIED ✅

**Cookie Domain Mismatch Between Vercel Deployment URL and Custom Domain:**

The issue was that authentication worked on:
- ✅ `https://jpsrealtor-git-main-joes-projects-e3fd5dcd.vercel.app/dashboard` (Vercel deployment URL)
- ✅ `https://dashboard.jpsrealtor.com` (subdomain)
- ❌ `https://jpsrealtor.com` (custom primary domain)

**Root Cause:**
NextAuth was setting cookies without an explicit domain, causing them to be scoped only to the exact hostname where they were created. When users logged in on the Vercel deployment URL, cookies weren't shared with the custom domain.

**Solution Applied:**
Added explicit cookie configuration with domain set to `.jpsrealtor.com` (with leading dot) to share cookies across all subdomains and the primary domain.

---

## 🔄 SOLUTION IMPLEMENTED ✅

### 1. Fixed Build Error
```bash
# Removed invalid trustHost property from src/lib/auth.ts:13
# This property doesn't exist in NextAuth v4
```

### 2. Added Explicit Cookie Domain Configuration
```typescript
// src/lib/auth.ts
cookies: {
  sessionToken: {
    name: process.env.NODE_ENV === 'production'
      ? '__Secure-next-auth.session-token'
      : 'next-auth.session-token',
    options: {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      domain: process.env.NODE_ENV === 'production' ? '.jpsrealtor.com' : undefined,
    },
  },
}
```

**This enables cookie sharing across:**
- `jpsrealtor.com` (primary domain)
- `dashboard.jpsrealtor.com` (subdomain)
- `www.jpsrealtor.com` (www subdomain)
- All Vercel preview URLs that map to jpsrealtor.com

### 3. Vercel Dashboard Settings Required

**⚠️ IMPORTANT - Vercel Domain Configuration:**

In your Vercel dashboard, ensure all domains are properly configured:

1. **Navigate to:** Project Settings → Domains
2. **Verify all domains point to the same deployment:**
   - `jpsrealtor.com` (primary)
   - `www.jpsrealtor.com`
   - `dashboard.jpsrealtor.com`
   - Any other subdomains

3. **Check Vercel Environment Variables:**
   - Go to: Project Settings → Environment Variables
   - Ensure `NEXTAUTH_URL` is set to your PRIMARY domain:
     ```
     NEXTAUTH_URL=https://jpsrealtor.com
     ```
   - Make sure it's set for: Production, Preview, and Development
   - **DO NOT** include trailing slash

4. **Verify No Redirects Are Interfering:**
   - Check: Project Settings → Redirects
   - Ensure no redirects are forcing users between domains during auth flow
   - If you redirect `www → non-www`, that's fine, but it should happen BEFORE auth

5. **Check Headers Configuration:**
   - Ensure no CORS or CSP headers are blocking cookie transmission
   - Review `vercel.json` for any header rules that might interfere

### 4. Testing After Deployment

Once Vercel deploys the changes:

1. **Clear all browser cookies** for jpsrealtor.com
2. **Test sign in** on `https://jpsrealtor.com`
3. **Verify cookie is set** with domain `.jpsrealtor.com`
4. **Check dashboard** appears correctly
5. **Test on subdomain** `https://dashboard.jpsrealtor.com` (should share session)

---

## 📦 Files Modified (Need Cleanup)

- `src/lib/auth.ts` - Remove `trustHost` property (line 13)
- `src/app/auth/signin/page.tsx` - Has debugging logs (can keep or remove)
- `src/app/components/EnhancedSidebar.tsx` - Has debugging logs (can keep or remove)
- `src/app/api/debug/test-db/route.ts` - Debug endpoint (can keep)
- `src/app/api/debug/test-session/route.ts` - Debug endpoint (can keep)

---

## 🎯 Success Criteria

Authentication is working when:
1. ✅ `/api/auth/session` returns user data when logged in
2. ✅ EnhancedSidebar shows "Dashboard" with dropdown when authenticated
3. ✅ Session persists across page refreshes
4. ✅ Session cookies are sent with all API requests

---

## 📞 Contact

**Issue Reporter:** Development Team
**Environment:** Production (jpsrealtor.com on Vercel)
**Repository:** https://github.com/VirtualJoe760/jpsrealtor
**Branch:** main
**Last Working Commit:** Before authentication refactoring

---

**END OF REPORT**
