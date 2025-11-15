# ✅ Vercel Environment Variables Checklist

## CRITICAL - Verify These Are Set in Vercel

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

### Required for Authentication to Work:

| Variable | Value | Status |
|----------|-------|--------|
| `NEXTAUTH_URL` | `https://jpsrealtor.com` (or your Vercel domain) | ⬜ |
| `NEXTAUTH_SECRET` | Your secret from .env.local | ⬜ |
| `AUTH_TRUST_HOST` | `true` | ⬜ |
| `MONGODB_URI` | Your MongoDB connection string | ⬜ |

### Quick Fix Steps:

1. **Open Vercel Dashboard**
   - Go to your project
   - Click "Settings"
   - Click "Environment Variables"

2. **Verify NEXTAUTH_URL**
   ```
   Key: NEXTAUTH_URL
   Value: https://jpsrealtor.com (NOT http://localhost:3000!)
   Environment: Production, Preview, Development (check all)
   ```

3. **Verify NEXTAUTH_SECRET**
   ```
   Key: NEXTAUTH_SECRET
   Value: 58272826949e72cb3a977383a4890286df651503a7bd530a38cd03f5bbba54bb
   Environment: Production, Preview, Development (check all)
   ```

4. **Add AUTH_TRUST_HOST** (if missing)
   ```
   Key: AUTH_TRUST_HOST
   Value: true
   Environment: Production, Preview, Development (check all)
   ```

5. **Verify MONGODB_URI**
   ```
   Key: MONGODB_URI
   Value: mongodb+srv://your-connection-string
   Environment: Production, Preview, Development (check all)
   ```

6. **After adding/updating, REDEPLOY:**
   - Go to "Deployments"
   - Click the 3 dots on latest deployment
   - Click "Redeploy"
   - Wait for deployment to finish
   - Clear browser cache and test

## Common Issues:

### Issue: Still redirecting to signin after successful login
**Fix:**
- Make sure `NEXTAUTH_URL` matches your production domain EXACTLY
- Make sure `AUTH_TRUST_HOST=true` is set
- Redeploy after changing environment variables

### Issue: Getting 401 or session errors
**Fix:**
- Verify `NEXTAUTH_SECRET` is set and matches between environments
- Check MongoDB URI is correct and allows connections from Vercel IPs

### Issue: Redirect works locally but not on Vercel
**Fix:**
- This is 100% an environment variable issue
- Double check `NEXTAUTH_URL` is your production domain
- Make sure you clicked "Production" when adding environment variables

## Testing After Fix:

1. Clear browser cache (Ctrl+Shift+Delete)
2. Go to https://jpsrealtor.com/auth/signin
3. Open browser console (F12)
4. Sign in with your credentials
5. You should see console logs:
   - "Sign in result: {ok: true, ...}"
   - "Sign in successful, checking session..."
   - "Session data: {user: {...}}"
   - "No 2FA required, redirecting to: /dashboard"
6. Page should redirect to /dashboard

If you still see issues, check the browser console for the exact error messages and send them to me!
