# Resend Email Setup Guide

## What We Did

Switched from Gmail SMTP to Resend for sending verification emails. Resend is:
- ✅ **Free** - 3,000 emails/month (100 emails/day)
- ✅ **Reliable** - Built specifically for transactional emails
- ✅ **Professional** - Emails from `noreply@jpsrealtor.com`
- ✅ **No credit card required**

## Setup Steps

### Step 1: Create Resend Account

1. Go to: https://resend.com/signup
2. Sign up with your email (josephsardella@gmail.com)
3. Verify your email
4. You'll land on the dashboard

### Step 2: Get API Key

1. In Resend dashboard, click **"API Keys"** in the sidebar
2. Click **"Create API Key"**
3. Name it: `jpsrealtor-production`
4. Permission: **"Sending access"**
5. Copy the API key (starts with `re_...`)

### Step 3: Add API Key to Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add new variable:
   - **Name:** `RESEND_API_KEY`
   - **Value:** `re_...` (the key you copied)
   - **Environment:** Production, Preview, Development
3. Save

### Step 4: Add Domain to Resend

1. In Resend dashboard, click **"Domains"** in the sidebar
2. Click **"Add Domain"**
3. Enter: `jpsrealtor.com`
4. Resend will show you DNS records to add

### Step 5: Add DNS Records in Vercel

Since your DNS is managed by Vercel:

1. Go to Vercel Dashboard → Your Domain (`jpsrealtor.com`) → DNS
2. Add the DNS records that Resend shows you. They will look like:

**SPF Record (TXT):**
- Type: `TXT`
- Name: `@` (or `jpsrealtor.com`)
- Value: `v=spf1 include:_spf.resend.com ~all`

**DKIM Record (TXT):**
- Type: `TXT`
- Name: `resend._domainkey`
- Value: `[long key that Resend provides]`

**DKIM Record (CNAME):**
- Type: `CNAME`
- Name: `resend._domainkey`
- Value: `[value that Resend provides]`

**MX Record (for bounces):**
- Type: `MX`
- Name: `@`
- Value: `feedback-smtp.us-east-1.amazonses.com`
- Priority: `10`

### Step 6: Verify Domain in Resend

1. After adding all DNS records in Vercel
2. Wait 5-10 minutes for DNS to propagate
3. Go back to Resend → Domains
4. Click **"Verify"** next to your domain
5. Should show ✅ **Verified**

### Step 7: Deploy

1. Commit and push your code changes
2. Vercel will auto-deploy
3. Test by registering a new user

## Alternative: Use Resend's Shared Domain (Quick Start)

If you don't want to set up DNS records right now:

1. Skip Steps 4-6
2. In `src/lib/email-resend.ts`, change the `from` address to:
   ```typescript
   from: 'onboarding@resend.dev'
   ```
3. Emails will work immediately but will say "from onboarding@resend.dev"
4. You can add your domain later

## Testing

After deployment, test as admin:
```
https://www.jpsrealtor.com/api/auth/test-email
```

Or have someone register with a real email address.

## Troubleshooting

### "Domain not verified"
- Wait 10-15 minutes after adding DNS records
- Check that DNS records are correct in Vercel
- Click "Verify" button in Resend

### "API key invalid"
- Make sure you copied the full key (starts with `re_`)
- Check it's set in Vercel environment variables
- Redeploy after adding the env var

### Still getting Gmail errors
- Make sure `RESEND_API_KEY` is set in Vercel
- Check Vercel logs - should see "Sending verification email via Resend"
- If still seeing nodemailer errors, clear build cache and redeploy

## What Changed in Code

- Created `src/lib/email-resend.ts` (new Resend implementation)
- Updated imports in:
  - `src/app/api/auth/register/route.ts`
  - `src/app/api/auth/resend-verification/route.ts`
  - `src/app/api/auth/test-email/route.ts`
  - `src/app/api/auth/2fa/send-code/route.ts`

The old Gmail code in `src/lib/email.ts` is still there but not used anymore.

## Cost

**Free tier:** 3,000 emails/month (100/day)
**Paid tier:** $20/month for 50,000 emails (only if you exceed free tier)

For your real estate site, the free tier should be plenty!
