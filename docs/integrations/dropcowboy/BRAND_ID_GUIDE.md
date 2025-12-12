# How to Find Your Drop Cowboy Brand ID

## Quick Answer
**Brand ID is OPTIONAL** - You can run campaigns without it! However, it's recommended for TCPA compliance.

## What is a Brand ID?
A Brand ID is a registered identifier for your business in Drop Cowboy's system. It helps with:
- TCPA compliance tracking
- Brand reputation management
- Campaign organization
- Regulatory requirements

## Do I Need One Right Now?
**No!** Based on our testing:
- Campaigns successfully send without a Brand ID
- The system works with just Team ID and Secret
- You can leave the Brand ID field blank in the UI

## How to Find or Create a Brand ID

### Option 1: Check If You Already Have One
1. Log into your Drop Cowboy account at https://dropcowboy.com
2. Navigate to **Settings** or **Account**
3. Look for **Brand Management** or **Brands** section
4. If you see any brands listed, copy the Brand ID

### Option 2: Create a New Brand (If Needed Later)
1. Log into Drop Cowboy dashboard
2. Go to **Brand Management**
3. Click **Create New Brand** or **Register Brand**
4. Fill in your business information:
   - Business Name
   - Business Address
   - Contact Information
   - Tax ID (if required)
5. Submit and wait for approval
6. Once approved, copy your Brand ID

### Option 3: Contact Drop Cowboy Support
If you can't find the Brand Management section:
- Email: support@dropcowboy.com
- Check their dashboard for a "Support" or "Help" link
- Ask: "How do I find or create my Brand ID?"

## Using the Brand ID in Campaigns

### In the UI (`/admin/crm`)
- The "Brand ID" field is **optional**
- Leave it blank if you don't have one yet
- Fill it in later when you register your brand

### In Environment Variables
- You do **NOT** need `DROP_COWBOY_BRAND_ID` in `.env.local`
- Only required env vars:
  - `DROP_COWBOY_TEAM_ID`
  - `DROP_COWBOY_SECRET`

## TCPA Compliance Note

While Brand ID is optional in Drop Cowboy's API, **TCPA compliance is not optional**:

### What You MUST Do:
1. ✅ Obtain prior express consent from all contacts
2. ✅ Maintain Do Not Call list
3. ✅ Include opt-out instructions in voicemails
4. ✅ Honor opt-out requests immediately
5. ✅ Keep records of consent

### What Brand ID Does:
- Helps Drop Cowboy track your compliance
- May be required by carriers in the future
- Demonstrates good faith compliance effort
- Protects your business reputation

## Recommendation

**Start without Brand ID:**
1. Use the system now with just Team ID and Secret
2. Send test campaigns to verify everything works
3. Register for a Brand ID when you have time
4. Add it to your campaigns later

**Register for Brand ID soon:**
- Better for long-term compliance
- May become required by carriers
- Takes time to get approved (plan ahead)
- Shows you're taking compliance seriously

## Summary

| Item | Required? | Where to Get It |
|------|-----------|-----------------|
| Team ID | ✅ Yes | Drop Cowboy API Settings |
| Secret | ✅ Yes | Drop Cowboy API Settings |
| Brand ID | ⚠️ Optional (but recommended) | Drop Cowboy Brand Management |
| Forwarding Number | ✅ Yes | Your business phone |

You're ready to send campaigns with just the first three items!
