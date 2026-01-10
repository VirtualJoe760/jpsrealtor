# Simplified Voicemail Campaign - User Guide

## Overview

The simplified voicemail campaign workflow allows you to quickly send ringless voicemails to your contacts using pre-recorded audio files. This guide will walk you through the entire process from start to finish.

---

## Prerequisites

Before creating a voicemail campaign, you'll need:

1. **Drop Cowboy Account** - Active account with recordings uploaded
2. **Uploaded Recordings** - At least one audio file uploaded to Drop Cowboy
3. **Contact List** - Contacts imported into your CRM

---

## Step 1: Upload Audio to Drop Cowboy

Before you can create a campaign, you need to upload your voicemail recordings to Drop Cowboy.

### How to Upload

1. Go to [Drop Cowboy Media Portal](https://app.dropcowboy.com/media)
2. Click **"Upload New Recording"**
3. Select your MP3 audio file
4. Give it a descriptive name (e.g., "New Listing Announcement Q1 2026")
5. Wait for Drop Cowboy to approve the recording (usually instant)

### Recording Tips

- **Duration:** 30-60 seconds is ideal
- **Format:** MP3 (recommended)
- **Quality:** Clear audio, no background noise
- **Content:** Professional, concise message
- **Naming:** Use descriptive names so you can easily identify recordings later

**Example Names:**
- "Expired Listing Follow-up"
- "Just Listed - Maple Street"
- "Open House Invitation"
- "Market Update December 2025"

---

## Step 2: Create a Voicemail Campaign

### In Your CRM

1. Navigate to **Campaigns** → **Create New Campaign**
2. Enter campaign details:
   - **Campaign Name:** (e.g., "PDCC Expired Listings - Q1 2026")
   - **Campaign Type:** Select type (e.g., "Custom")
   - **Enable Voicemail Strategy:** Check the voicemail option
3. Click **Create Campaign**

---

## Step 3: Add Contacts

### Option A: Import from CSV/Excel

1. Click **"Import Contacts"**
2. Upload your CSV file with columns:
   - First Name
   - Last Name
   - Phone Number (10 digits, no formatting)
   - Email (optional)
   - Additional custom fields
3. Map columns to CRM fields
4. Review and confirm import

### Option B: Select from Existing Contacts

1. Click **"Add from CRM"**
2. Use filters to select contacts:
   - By tag/list
   - By location
   - By property type
3. Click **"Add Selected Contacts"**

### Contact Validation

The system will automatically:
- ✓ Validate phone number format
- ✓ Remove duplicates
- ✓ Check for DNC (Do Not Call) list
- ✓ Flag invalid numbers

---

## Step 4: Select Your Recording

This is where the simplified workflow shines! Instead of generating scripts and audio, you simply select from your existing Drop Cowboy recordings.

### How to Select

1. After adding contacts, click **"Continue to Audio"**
2. You'll see a list of all your Drop Cowboy recordings
3. Each recording shows:
   - Recording name
   - Duration (in seconds)
   - Upload date
   - File size
4. **Click on a recording to select it** (radio button selects automatically)
5. Click **"Continue to Send"**

### If You Don't See Your Recording

1. Click the **"Refresh"** button in the top-right
2. If still not visible, check:
   - Did you upload it to Drop Cowboy?
   - Is it approved?
   - Are you using the correct Drop Cowboy account?

### Adding a New Recording

1. Click **"Upload to Drop Cowboy"** link
2. Opens Drop Cowboy in new tab
3. Upload your recording
4. Return to campaign page
5. Click **"Refresh"** button
6. Select your new recording

---

## Step 5: Send Campaign

### Review Summary

Before sending, you'll see:
- ✓ Campaign name
- ✓ Total contacts (e.g., 150)
- ✓ Selected recording name
- ✓ Estimated cost (contacts × $0.10)

**Example:**
```
Campaign: PDCC Expired Listings - Q1 2026
Contacts: 150
Recording: "Expired Listing Follow-up" (38 seconds)
Estimated Cost: $15.00
```

### Confirm and Send

1. Click **"Send Campaign Now"**
2. Confirm the details in the popup
3. Click **"Confirm & Send"**
4. Wait for processing (usually 1-2 minutes for 150 contacts)

### What Happens Next

- Voicemails are sent to Drop Cowboy
- Drop Cowboy delivers them to carriers
- Campaign status updates to "Active"
- You can monitor progress in campaign dashboard

---

## Monitoring Campaign Performance

### Real-Time Stats

After sending, you can track:
- **Sent:** Total voicemails submitted
- **Delivered:** Successfully delivered to voicemail
- **Failed:** Failed deliveries (with reasons)
- **Listened:** Contacts who listened to the voicemail
- **Responses:** Callbacks or other responses

### Viewing History

1. Go to **Campaigns** → **Your Campaign Name**
2. Click **"View Execution History"**
3. See detailed logs:
   - Each contact's delivery status
   - Timestamps
   - Error messages (if any)

---

## Troubleshooting

### "No recordings found"

**Problem:** The recordings list is empty.

**Solutions:**
1. Upload recordings to [Drop Cowboy](https://app.dropcowboy.com/media)
2. Click "Refresh" button in campaign
3. Verify you're using correct Drop Cowboy account
4. Contact support if issue persists

---

### "Failed to load recordings"

**Problem:** API error when fetching recordings.

**Solutions:**
1. Check internet connection
2. Click "Try Again" button
3. Verify Drop Cowboy API credentials are configured
4. Contact support if error persists

---

### "Invalid phone number" errors

**Problem:** Some contacts have invalid phone numbers.

**Solutions:**
1. Phone numbers must be 10 digits
2. Remove special characters (dashes, parentheses, spaces)
3. U.S. numbers only (for now)
4. Re-import with corrected phone numbers

---

### Voicemails not delivered

**Problem:** Campaign sent but voicemails not received.

**Solutions:**
1. Check campaign execution history for errors
2. Verify contacts have valid voicemail boxes
3. Some carriers block ringless voicemail (rare)
4. Check Drop Cowboy dashboard for delivery status
5. Contact Drop Cowboy support if widespread issue

---

## Best Practices

### Recording Quality

✓ **DO:**
- Use professional voice talent
- Keep messages 30-60 seconds
- Include clear call-to-action
- State your name and company
- Provide callback number

✗ **DON'T:**
- Use background music (may trigger spam filters)
- Rush through the message
- Forget to identify yourself
- Make message too long (>90 seconds)
- Use robotic/automated voices

### Campaign Timing

✓ **Best Times:**
- Tuesday-Thursday: 10am-12pm, 2pm-4pm (local time)
- Avoid Mondays (busy)
- Avoid Fridays (people leave early)
- Avoid weekends (personal time)

✗ **Avoid:**
- Early morning (before 9am)
- Late evening (after 8pm)
- Holidays
- Major event days (Super Bowl, etc.)

### Contact Management

✓ **DO:**
- Segment contacts by category
- Remove unresponsive contacts after 3 campaigns
- Respect DNC lists
- Track engagement metrics
- Test with small group first

✗ **DON'T:**
- Send to same contact multiple times per week
- Ignore DNC requests
- Use purchased/scraped contact lists
- Send without permission (TCPA compliance)

### Recording Management

✓ **DO:**
- Name recordings descriptively
- Organize by campaign type
- Archive old recordings
- Test recordings before campaign
- Update seasonal recordings regularly

✗ **DON'T:**
- Reuse same recording too frequently
- Use outdated information
- Keep recordings with errors

---

## Cost Breakdown

### Simple Mode (Current)

- **Per voicemail:** $0.10
- **Example campaign (150 contacts):** $15.00
- **No AI costs** (you provide recording)
- **No storage costs** (Drop Cowboy hosts)

### Volume Discounts

Drop Cowboy may offer volume discounts:
- Contact Drop Cowboy sales for pricing
- BYOC (Bring Your Own Carrier) plans available
- Custom pricing for high-volume users

---

## Frequently Asked Questions

### Can I use the same recording for multiple campaigns?

Yes! Once uploaded to Drop Cowboy, you can reuse recordings in unlimited campaigns.

---

### How long do recordings stay in Drop Cowboy?

Recordings persist indefinitely unless you delete them.

---

### Can I edit a recording after uploading?

No, you must upload a new recording. Best practice: Upload new version with updated name (e.g., "v2").

---

### What file formats are supported?

MP3 is recommended. Drop Cowboy also supports WAV (but will convert to MP3).

---

### Is there a file size limit?

Drop Cowboy recommends keeping recordings under 5MB. Most 60-second MP3s are well under this limit.

---

### Can I cancel a campaign after sending?

No, ringless voicemails cannot be recalled once sent. Double-check everything before confirming!

---

### How do I know if someone listened?

Drop Cowboy provides delivery status updates. Check campaign execution history for "listened" status.

---

### What if a contact complains?

Immediately add them to your DNC list and respect their request. Maintain compliance with TCPA regulations.

---

## Getting Help

### Support Resources

- **Documentation:** [Campaign Architecture Docs](./CAMPAIGN_STRATEGY_ARCHITECTURE.md)
- **Drop Cowboy Support:** [https://support.dropcowboy.com](https://support.dropcowboy.com)
- **Technical Support:** Contact your CRM administrator
- **TCPA Compliance:** Consult legal counsel

### Common Error Codes

| Error Code | Meaning | Solution |
|------------|---------|----------|
| `ERR_NO_RECORDING` | No recording selected | Select a recording |
| `ERR_INVALID_PHONE` | Invalid phone format | Fix phone number format |
| `ERR_DNC_LISTED` | Contact on DNC list | Remove contact |
| `ERR_API_FAILURE` | Drop Cowboy API error | Retry or contact support |

---

## Future Features

When BYOC (Bring Your Own Carrier) account is activated, you'll get access to:

- **AI Script Generation** - Personalized scripts per contact
- **11Labs Voice Synthesis** - Professional AI voices
- **Dynamic Audio URLs** - Programmatic audio generation
- **Lower per-message costs** - ~$0.06 vs $0.10
- **Advanced personalization** - Merge fields, conditional content

These features are fully built and ready to activate when BYOC is available!

---

## Conclusion

The simplified voicemail workflow makes it easy to send professional voicemail campaigns in just a few clicks. Upload your recording to Drop Cowboy once, then reuse it across multiple campaigns.

**Typical timeline:**
- Upload recording: 5 minutes (one-time)
- Create campaign: 2 minutes
- Add contacts: 5 minutes
- Select recording & send: 1 minute

**Total time:** ~13 minutes for first campaign, ~8 minutes for subsequent campaigns!

---

**Last Updated:** 2026-01-07
**Version:** 1.0
**For:** Simplified Voicemail Campaign Workflow
