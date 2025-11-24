# PayloadCMS Auth Integration - VPS Deployment Guide

## Overview
This guide covers deploying the PayloadCMS authentication integration on the DigitalOcean VPS.

## Prerequisites
- VPS IP: `147.182.236.138`
- VPS has access to: `dstreet280`
- ChatRealty CMS repository must be deployed and running on VPS
- MongoDB connection available at: `mongodb+srv://doadmin:5gpl0VF9843U61Nv@jpsrealtor-mongodb-911080c1.mongo.ondigitalocean.com/admin`

## Step 1: SSH into VPS

```bash
sshpass -p "dstreet280" ssh -o StrictHostKeyChecking=no root@147.182.236.138
```

## Step 2: Navigate to Frontend Repository

```bash
cd /path/to/jpsrealtor  # Update with actual path
```

## Step 3: Pull PayloadCMS Auth Integration Branch

```bash
git fetch origin
git checkout payload-auth-integration
git pull origin payload-auth-integration
```

## Step 4: Install Dependencies

```bash
npm install --legacy-peer-deps
```

## Step 5: Verify Environment Variables

Ensure `.env.local` contains:

```bash
# PayloadCMS Backend URL - Update with VPS URL if needed
NEXT_PUBLIC_CMS_URL=https://cms.chatrealty.io

# Or if running locally on VPS:
# NEXT_PUBLIC_CMS_URL=http://localhost:3002

# MongoDB (already configured)
MONGODB_URI=mongodb+srv://doadmin:5gpl0VF9843U61Nv@jpsrealtor-mongodb-911080c1.mongo.ondigitalocean.com/admin?retryWrites=true&w=majority
```

## Step 6: Ensure ChatRealty CMS is Running

Before proceeding, verify PayloadCMS is accessible:

```bash
curl https://cms.chatrealty.io/api/users
# OR if running locally:
# curl http://localhost:3002/api/users
```

Expected response: JSON with users or authentication error (not 404 or deployment not found).

## Step 7: Run User Migration Script

This will migrate 19 existing NextAuth users to PayloadCMS:

```bash
cd /path/to/jpsrealtor
node scripts/migrate-users-to-payload.mjs
```

Expected output:
```
🚀 Starting user migration from NextAuth to PayloadCMS...
📡 Connecting to MongoDB...
✅ Connected to MongoDB
📥 Fetching NextAuth users...
✅ Found 19 NextAuth users

👤 Processing: user@example.com
   📤 Creating PayloadCMS user with role: client
   ✅ Successfully migrated! PayloadCMS ID: 12345...

...

📊 Migration Summary:
   ✅ Successfully migrated: 19
   ⏭️  Skipped (already exist): 0
   ❌ Errors: 0
   📋 Total processed: 19
```

## Step 8: Build and Restart Frontend

```bash
npm run build
pm2 restart jpsrealtor  # Or whatever process manager you're using
```

## Step 9: Test Authentication

1. Visit the frontend URL
2. Try logging in with an existing user account
3. Verify JWT cookie is set: `payload-token`
4. Check user data is fetched correctly

## Architecture Overview

```
┌─────────────────┐
│  Next.js App    │
│  (jpsrealtor)   │
│                 │
│  UserContext    │◄──── React Context for auth state
└────────┬────────┘
         │
         │ HTTP requests
         │
    ┌────▼─────────────────────────────┐
    │  Next.js API Routes              │
    │  /api/auth/login                 │◄──── Login bridge
    │  /api/auth/logout                │◄──── Logout
    │  /api/user/me                    │◄──── Get current user
    └────┬─────────────────────────────┘
         │
         │ Fetch with JWT
         │
    ┌────▼─────────────────────────────┐
    │  PayloadCMS API                  │
    │  (cms.chatrealty.io)             │
    │                                  │
    │  POST /api/users/login           │◄──── Auth endpoint
    │  GET  /api/users/me              │◄──── User endpoint
    └────┬─────────────────────────────┘
         │
         │ MongoDB queries
         │
    ┌────▼─────────────────────────────┐
    │  MongoDB                         │
    │  (DigitalOcean Managed)          │
    │                                  │
    │  Collections:                    │
    │  - users (PayloadCMS + NextAuth) │
    │  - accounts (NextAuth OAuth)     │
    │  - sessions (NextAuth)           │
    └──────────────────────────────────┘
```

## User Migration Details

### NextAuth to PayloadCMS Role Mapping

| NextAuth Role | PayloadCMS Role |
|--------------|-----------------|
| admin        | admin           |
| agent        | agent           |
| endUser      | client          |
| broker       | broker          |
| investor     | investor        |
| provider     | provider        |
| host         | host            |

### Preserved Data

- Email (primary identifier)
- Password (bcrypt hash - already compatible)
- Name → firstName/lastName split
- Stripe customer ID
- Stripe subscription ID
- Subscription tier
- Subscription status

## Troubleshooting

### Issue: Migration script fails with "Deployment not found"

**Cause**: PayloadCMS is not accessible at `https://cms.chatrealty.io`

**Solution**:
1. Ensure ChatRealty CMS is running on VPS
2. Update `NEXT_PUBLIC_CMS_URL` in migration script if needed
3. Run migration script again

### Issue: Users can't log in after migration

**Cause**: JWT token not being set or PayloadCMS not recognizing users

**Solution**:
1. Check PayloadCMS is running: `curl https://cms.chatrealty.io/api/users/me`
2. Verify users exist in PayloadCMS: Check MongoDB `users` collection
3. Check browser console for errors
4. Verify `payload-token` cookie is being set

### Issue: "Invalid token" errors

**Cause**: Token expired or JWT secret mismatch

**Solution**:
1. Clear browser cookies
2. Verify `PAYLOAD_SECRET` matches between frontend and backend
3. Log in again to get fresh token

## Next Steps After Deployment

1. **Test Authentication Flow**
   - Login with existing user
   - Logout
   - Refresh page (should stay logged in)
   - Token expiry (after 30 days)

2. **Update Frontend Components**
   - Wrap app with `UserProvider` in `ClientLayoutWrapper.tsx`
   - Update signin page to use `useUser()` hook instead of NextAuth
   - Update navbar/header to show user info from `useUser()`

3. **Remove NextAuth** (after verification)
   - Uninstall next-auth package
   - Remove NextAuth API route
   - Remove NextAuth provider from layout
   - Clean up NextAuth environment variables

4. **Monitor and Verify**
   - Check server logs for auth errors
   - Monitor MongoDB for user session activity
   - Verify JWT tokens are being refreshed properly

## Important Files

- **UserContext**: `src/app/contexts/UserContext.tsx`
- **Login API**: `src/app/api/auth/login/route.ts`
- **Logout API**: `src/app/api/auth/logout/route.ts`
- **User API**: `src/app/api/user/me/route.ts`
- **Migration Script**: `scripts/migrate-users-to-payload.mjs`

## Support

If issues arise:
1. Check VPS logs: `pm2 logs jpsrealtor`
2. Check PayloadCMS logs: `pm2 logs chatrealty-cms`
3. Verify MongoDB connection: `mongosh "mongodb+srv://doadmin:5gpl0VF9843U61Nv@jpsrealtor-mongodb-911080c1.mongo.ondigitalocean.com/admin"`
4. Check environment variables are correct
