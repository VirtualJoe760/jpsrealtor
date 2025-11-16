# Email Verification Setup Guide

## Issue Found
The verification emails were using `NEXTAUTH_URL` which was set to `http://localhost:3000`, causing verification links to point to localhost instead of your production domain.

## Fixes Applied

### 1. Updated `src/lib/email.ts`
- Now uses `NEXT_PUBLIC_BASE_URL` first, then falls back to `NEXTAUTH_URL`
- Added detailed logging for debugging
- Better error messages with stack traces

### 2. Updated `src/app/api/auth/register/route.ts`
- Returns `emailSent` flag in response
- Better error messages for users when email fails
- Enhanced logging to track email sending

### 3. Created Test Endpoint
- New endpoint: `/api/auth/test-email` (Admin only)
- Tests email configuration without creating users
- Shows which environment variables are set

## Required Vercel Environment Variables

You need to set these in Vercel Dashboard → Settings → Environment Variables:

### Production URL (CRITICAL - This was missing!)
```bash
NEXT_PUBLIC_BASE_URL=https://www.jpsrealtor.com
```

### Email Configuration (Gmail)
```bash
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_specific_password  # NOT your regular Gmail password!
EMAIL_FROM=noreply@jpsrealtor.com
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
```

### NextAuth (should already be set)
```bash
NEXTAUTH_URL=https://www.jpsrealtor.com
NEXTAUTH_SECRET=your_secret_here
```

## How to Get Gmail App Password

1. Go to Google Account → Security
2. Enable 2-Step Verification (required)
3. Go to App Passwords: https://myaccount.google.com/apppasswords
4. Generate password for "Mail" / "Other (Custom name)"
5. Copy the 16-character password
6. Use this as `EMAIL_PASS` in Vercel

## Testing Email After Deployment

### Option 1: Test Endpoint (Recommended)
After deploying, visit as admin:
```
https://www.jpsrealtor.com/api/auth/test-email
```

This will:
- Check all environment variables
- Send a test email to your admin account
- Show detailed error messages if it fails

### Option 2: Create Test User
1. Register a new user with a test email
2. Check Vercel logs for email output
3. Look for these log messages:
   - `📧 Sending verification email to: test@example.com`
   - `🔗 Verification URL: https://www.jpsrealtor.com/auth/verify-email?token=...`
   - `✅ Verification email sent successfully`

## Troubleshooting

### Email Not Received
1. Check spam/junk folder
2. Verify Gmail app password is correct
3. Check Vercel logs for errors
4. Use test endpoint to verify config

### Wrong Verification URL
If email shows `http://localhost:3000`:
- `NEXT_PUBLIC_BASE_URL` is not set in Vercel
- Add it and redeploy

### Gmail Blocking
If Gmail says "Less secure app":
- Make sure you're using an App Password, NOT your regular password
- Enable 2-Step Verification first

### Still Not Working
1. Check Vercel logs: `vercel logs production`
2. Look for error messages starting with ❌
3. Verify all environment variables are set in Vercel
4. Restart deployment after adding new env vars

## Log Messages to Look For

**Success:**
```
📧 Sending verification email to: user@example.com
🔗 Verification URL: https://www.jpsrealtor.com/auth/verify-email?token=abc123
✅ Verification email sent successfully: <message-id>
📬 Response: 250 OK
```

**Failure:**
```
❌ Error sending verification email: Error: Invalid login
Error details: Invalid login: 535-5.7.8 Username and Password not accepted
```

## Current State

**Fixed:**
- ✅ Verification URLs now use production domain
- ✅ Added comprehensive error logging
- ✅ User sees warning if email fails to send
- ✅ Admin test endpoint for debugging

**Next Steps:**
1. Set `NEXT_PUBLIC_BASE_URL=https://www.jpsrealtor.com` in Vercel
2. Verify Gmail app password is correct
3. Deploy and test with `/api/auth/test-email`
4. Have friend try registration again
