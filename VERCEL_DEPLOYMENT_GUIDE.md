# Vercel Deployment Guide for JPSRealtor

## Critical Environment Variables for Vercel

You need to add the following environment variables in your Vercel project settings:

### 1. NextAuth Configuration (CRITICAL - Authentication won't work without these)

```bash
# Your production URL (e.g., https://jpsrealtor.com or https://your-app.vercel.app)
NEXTAUTH_URL=https://your-production-domain.com

# Generate a secure secret with: openssl rand -base64 32
NEXTAUTH_SECRET=your_generated_secret_here

# Required for Vercel deployment (set to 1 or true)
AUTH_TRUST_HOST=true
```

### 2. Database Configuration

```bash
# Your MongoDB connection string
MONGODB_URI=mongodb+srv://username:password@host/database
```

### 3. Email Configuration (Required for user verification)

```bash
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_specific_password
```

### 4. Third-Party API Keys

```bash
# Google Services
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
NEXT_PUBLIC_GOOGLE_CUSTOM_SEARCH_ENGINE_ID=your_search_engine_id
NEXT_PUBLIC_GOOGLE_API_KEY=your_google_api_key

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_SECRET=your_secret
CLOUDINARY_API_KEY=your_api_key

# Yelp API
YELP_FUSION_API_KEY=your_yelp_api_key
YELP_FUSION_CLIENT_ID=your_yelp_client_id

# MapTiler
MAPTILER_KEY=your_maptiler_key

# Twilio (for SMS)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_phone

# SendFox (for email marketing)
JPSREALTOR_SENDFOX_API_TOKEN=your_sendfox_token

# People Data API
PEOPLE_DATA_API_KEY=your_people_data_key

# Spark API (MLS/Real Estate Data)
SPARK_OAUTH_KEY=your_spark_key
SPARK_OAUTH_SECRET=your_spark_secret
SPARK_ACCESS_TOKEN=your_spark_access_token
SPARK_REFRESH_TOKEN=your_spark_refresh_token
```

### 5. Base URL Configuration

```bash
NEXT_PUBLIC_BASE_URL=https://your-production-domain.com
```

## How to Add Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Click on "Settings" tab
3. Click on "Environment Variables" in the left sidebar
4. For each variable:
   - Enter the **Key** (e.g., `NEXTAUTH_URL`)
   - Enter the **Value** (e.g., `https://jpsrealtor.com`)
   - Select which environments to apply it to (Production, Preview, Development)
   - Click "Add"

## IMPORTANT: NEXTAUTH_URL Configuration

The `NEXTAUTH_URL` must be set to your actual production domain:

- ✅ Correct: `https://jpsrealtor.com` or `https://your-app.vercel.app`
- ❌ Wrong: `http://localhost:3000` (this is for local development only)

## After Adding Environment Variables

1. **Redeploy your application**: After adding/changing environment variables, you need to trigger a new deployment for the changes to take effect
2. **Test authentication**: Try logging in and accessing the dashboard
3. **Check browser console**: If you still see errors, check the browser console for specific error messages

## Troubleshooting Authentication Issues

If authentication still doesn't work after deployment:

1. **Verify NEXTAUTH_URL**: Make sure it matches your production domain exactly (including https://)
2. **Check NEXTAUTH_SECRET**: Ensure it's a strong, random string
3. **Database connectivity**: Verify your MongoDB connection string is correct and allows connections from Vercel's IP addresses
4. **Browser console errors**: Check for hydration errors or 401/403 responses
5. **Vercel logs**: Check the function logs in Vercel dashboard for server-side errors

## Required Environment Variables for NextAuth on Vercel

NextAuth v4 requires these specific environment variables to work on Vercel:

1. `NEXTAUTH_URL` - Must be your production domain
2. `NEXTAUTH_SECRET` - A random secret string
3. `AUTH_TRUST_HOST` - Set to `true` for Vercel deployment

These allow NextAuth to properly handle authentication across different hosts and domains.

## Next Steps After This Deployment

1. Generate a new `NEXTAUTH_SECRET`:
   ```bash
   openssl rand -base64 32
   ```

2. Add this to Vercel environment variables

3. Set `NEXTAUTH_URL` to your production domain

4. Redeploy the application

5. Test the authentication flow:
   - Sign in
   - Verify redirect to dashboard works
   - Check that protected routes are accessible
   - Test sign out

## Common Issues

### Issue: "Redirect loop" or "Session not persisting"
- **Solution**: Verify `NEXTAUTH_URL` is set correctly and matches your production domain

### Issue: "Invalid credentials" even with correct password
- **Solution**: Check that MongoDB URI is correct and accessible from Vercel

### Issue: "Email verification not working"
- **Solution**: Verify EMAIL_USER and EMAIL_PASS are set correctly in Vercel

### Issue: Hydration errors in production
- **Solution**: These React errors (#418, #423, #425) are usually caused by SSR/client mismatches. The `trustHost: true` fix should resolve these.
