# Agent Settings Guide

**UI/UX Documentation for Agent Profile Management**

> **Related Documentation:**
> - [Agent Profile System Overview](./index.md) - Data model and architecture
> - [Multi-Tenant Platform](../../multi-tenant/index.md) - Platform overview

## Overview

The Agent Settings interface allows real estate agents to manage their profile information and landing page content. All settings are accessible from the Agent Dashboard with a single-click edit mode.

---

## Accessing Settings

### Location
- **URL:** `/agent/dashboard`
- **Nav:** Click "Agent" in main navigation → "Dashboard"
- **Auth:** Requires `realEstateAgent` role

### Edit Mode
1. Navigate to `/agent/dashboard`
2. Locate the profile card (top of page, below stats)
3. Click the **Settings icon** (⚙️) in the top-right corner of the profile card
4. Edit mode activates - all fields become editable

### Save Changes
1. Make your edits across all sections
2. Click **"Save Changes"** button (top-right, replaces Settings icon)
3. Success toast appears: "Profile updated successfully!"
4. Edit mode exits automatically
5. Changes are live immediately

### Cancel Editing
1. Click **"Cancel"** button (next to Save Changes)
2. All unsaved changes are discarded
3. Profile refreshed from database
4. Edit mode exits

---

## Field Sections

### 1. Basic Information

**Display Mode:**
- Shows your name with email below
- Profile photo (circular) with upload icon overlay

**Edit Mode:**

#### Profile Photo
- **Current Value:** Google/Facebook photo OR custom upload
- **Upload:** Click camera icon on photo
- **Requirements:**
  - Image file only (JPG, PNG, WebP)
  - Max size: 5MB
  - Auto-uploaded to Cloudinary
  - Progress spinner during upload
- **Usage:** Profile card, landing page hero, chat interface

#### Full Name *
- **Type:** Text input
- **Current Value:** "Joseph Sardella"
- **Required:** Yes (red asterisk)
- **Usage:** Profile card, landing page headline, email signatures
- **Placeholder:** None (shows current value)

#### Phone Number *
- **Type:** Tel input
- **Current Value:** "760-333-3676"
- **Required:** Yes (red asterisk)
- **Format:** Free-form (no auto-formatting yet)
- **Usage:** Contact forms, client communication
- **Placeholder:** None (shows current value)

#### Brokerage Name *
- **Type:** Text input
- **Current Value:** "eXp Realty"
- **Required:** Yes (red asterisk)
- **Usage:** Footer, disclosures, legal documents
- **Placeholder:** None (shows current value)

#### License Number
- **Type:** Text input
- **Current Value:** "02106916"
- **Required:** No
- **Usage:** Footer disclosures, about page
- **Placeholder:** None (shows current value)

#### Bio / About
- **Type:** Textarea (3 rows, auto-resize)
- **Current Value:** "Your trusted Coachella Valley Realtor."
- **Required:** No
- **Max Length:** Unlimited (recommend ~300 characters)
- **Usage:** About section, meta descriptions
- **Placeholder:** "Tell us about yourself..."

**Display Mode:**
- All fields shown in grid layout with icons
- Phone icon + value
- Building icon + brokerage
- Credit card icon + license
- Users icon + team affiliation

---

### 2. Landing Page Content

**Section Header:**
- 🌐 Icon + "Landing Page Content"
- Visual separator (border-top)

**Purpose:**
These fields appear on your public-facing agent landing page (e.g., joseph.chatrealty.io)

#### Headline
- **Type:** Text input
- **Current Value:** None (empty to start)
- **Required:** No
- **Max Length:** Recommend ~60 characters
- **Usage:** Main H1 on landing page
- **Placeholder:** "Your Trusted Real Estate Partner"
- **Example:** "Your Trusted Coachella Valley Realtor"

#### Tagline
- **Type:** Text input
- **Current Value:** None (empty to start)
- **Required:** No
- **Max Length:** Recommend ~100 characters
- **Usage:** Subheadline below H1
- **Placeholder:** "Serving Orange County Since 2010"
- **Example:** "Helping You Find Your Dream Home Since 2010"

**Grid Layout:**
- Desktop: 2 columns (headline | tagline)
- Mobile: 1 column (stacked)

---

### 3. Social Media Links

**Section Header:**
- 🌐 Icon + "Social Media Links"
- Visual separator (border-top)

**Purpose:**
Social icons appear on landing page footer and contact sections. Links open in new tab.

#### Facebook
- **Type:** URL input
- **Current Value:** None (empty to start)
- **Required:** No
- **Validation:** Must start with http:// or https://
- **Icon:** 📘 Facebook logo
- **Placeholder:** "https://facebook.com/yourpage"
- **Example:** "https://facebook.com/josephsardella"

#### Instagram
- **Type:** URL input
- **Current Value:** None (empty to start)
- **Required:** No
- **Validation:** Must start with http:// or https://
- **Icon:** 📷 Instagram logo
- **Placeholder:** "https://instagram.com/yourprofile"
- **Example:** "https://instagram.com/josephsardella"

#### LinkedIn
- **Type:** URL input
- **Current Value:** None (empty to start)
- **Required:** No
- **Validation:** Must start with http:// or https://
- **Icon:** 💼 LinkedIn logo
- **Placeholder:** "https://linkedin.com/in/yourprofile"
- **Example:** "https://linkedin.com/in/josephsardella"

#### YouTube
- **Type:** URL input
- **Current Value:** None (empty to start)
- **Required:** No
- **Validation:** Must start with http:// or https://
- **Icon:** 📺 YouTube logo
- **Placeholder:** "https://youtube.com/@yourchannel"
- **Example:** "https://youtube.com/@josephsardella"

**Grid Layout:**
- Desktop: 2 columns (2 rows = 4 fields)
- Mobile: 1 column (stacked)

**Icon Display:**
- Each field has platform icon in label
- Helps identify field at a glance
- Icons use Lucide React library

---

## Visual Design

### Theme Support

**Light Theme (Default):**
- Background: Blue/indigo gradient (`from-blue-50/50 to-indigo-50/50`)
- Card: White with shadow
- Text: Dark gray (#1f2937)
- Borders: Light gray (#e5e7eb)
- Focus ring: Blue (#3b82f6)

**Dark Theme:**
- Background: Slate gradient (`from-slate-900/50 to-slate-800/50`)
- Card: Dark slate with shadow
- Text: White (#ffffff)
- Borders: Slate gray (#475569)
- Focus ring: Blue (#3b82f6)

### Spacing & Layout

**Profile Card:**
- Padding: 24px (desktop), 16px (mobile)
- Border radius: 12px
- Shadow: 2xl elevation

**Form Fields:**
- Grid gap: 16px
- Input height: 40px (py-2)
- Label margin-bottom: 8px
- Section padding-top: 16px
- Section margin-top: 16px

**Section Separators:**
- Border-top: 1px solid
- Padding-top: 16px
- Margin-top: 16px

### Typography

**Section Headers:**
- Font size: Medium (text-md)
- Font weight: Semibold (600)
- Display: Flex with icon gap

**Labels:**
- Font size: Small (text-sm)
- Font weight: Medium (500)
- Color: Gray-700 (light) / Gray-300 (dark)

**Inputs:**
- Font size: Base (text-base)
- Font weight: Normal (400)
- Padding: 16px horizontal, 8px vertical

**Placeholders:**
- Color: Gray-400 (light) / Gray-500 (dark)
- Italic: No

### Interactive States

**Input Fields:**
- Default: Border + subtle background
- Focus: Blue ring (2px, ring-blue-500)
- Hover: N/A (no hover state on inputs)
- Disabled: Opacity 50%, cursor not-allowed
- Error: Red border + red text (future validation)

**Buttons:**
- Settings Icon: Hover background, transition
- Save Button: Blue gradient, hover darker
- Cancel Button: Gray, hover darker

**Photo Upload:**
- Hover: Slight overlay on camera icon
- Loading: Spinner replaces camera icon
- Success: Toast notification

---

## Data Flow

### Loading Profile

**On Page Load:**
1. Component mounts
2. Fetch `/api/user/profile` (GET)
3. Parse response JSON
4. Set state:
   ```javascript
   setAgentProfile({
     name: data.profile.name,
     email: data.profile.email,
     phone: data.profile.phone,
     brokerageName: data.profile.brokerageName,
     licenseNumber: data.profile.licenseNumber,
     profileDescription: data.profile.profileDescription,
     image: data.profile.image,
     team: data.profile.team,
     isTeamLeader: data.profile.isTeamLeader,
     agentProfile: data.profile.agentProfile || null
   });
   ```
5. Set `isLoadingProfile` to false
6. Render profile card

### Editing Fields

**State Management:**
```javascript
// Basic field update
setAgentProfile({ ...agentProfile, name: e.target.value });

// Nested agentProfile field update
setAgentProfile({
  ...agentProfile,
  agentProfile: {
    ...agentProfile.agentProfile,
    headline: e.target.value
  }
});

// Deep nested (social media)
setAgentProfile({
  ...agentProfile,
  agentProfile: {
    ...agentProfile.agentProfile,
    socialMedia: {
      ...agentProfile.agentProfile?.socialMedia,
      facebook: e.target.value
    }
  }
});
```

**Key Principles:**
- Spread operator preserves existing data
- Deep merge for nested objects
- Null-safe (`?.` optional chaining)
- Immutable state updates

### Saving Changes

**Save Flow:**
1. User clicks "Save Changes"
2. Set `isSaving` to true (disables button)
3. POST to `/api/user/profile` with entire `agentProfile` state:
   ```javascript
   fetch('/api/user/profile', {
     method: 'PUT',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify(agentProfile)
   });
   ```
4. API performs deep merge on backend
5. Returns updated profile
6. Update local state with response
7. Show toast: "Profile updated successfully!"
8. Set `isEditMode` to false
9. Set `isSaving` to false

**Error Handling:**
- Network error → Toast: "Error updating profile"
- 401 Unauthorized → Redirect to sign-in
- 500 Server error → Toast: "Failed to update profile"
- Validation error → Toast with specific message (future)

### Photo Upload

**Upload Flow:**
1. User selects file from file picker
2. Validate file type (image/*)
3. Validate file size (max 5MB)
4. Set `isUploadingImage` to true
5. Call `uploadToCloudinary([file], 'profile-photos')`
6. Cloudinary returns URL
7. Update state: `setAgentProfile({ ...agentProfile, image: imageUrl })`
8. Auto-save immediately:
   ```javascript
   fetch('/api/user/profile', {
     method: 'PUT',
     body: JSON.stringify({ image: imageUrl })
   });
   ```
9. Show toast: "Profile photo updated successfully!"
10. Set `isUploadingImage` to false

**Error Cases:**
- Invalid file type → Toast: "Please select a valid image file"
- File too large → Toast: "Image size must be less than 5MB"
- Upload failed → Toast: "Failed to upload image"

---

## User Experience Considerations

### Progressive Enhancement

**Minimum Viable Profile:**
1. Name ✅ (required, already populated)
2. Phone ✅ (required, already populated)
3. Brokerage ✅ (required, already populated)
4. Photo ✅ (Google photo works)

**Enhanced Profile:**
5. Bio (recommended)
6. Headline + tagline (landing page)
7. Social media links (credibility)
8. License number (legal compliance)

**Future Enhancements:**
9. Hero photo (visual appeal)
10. Gallery photos (showcase work)
11. Testimonials (social proof)
12. Stats (achievements)
13. Custom backgrounds (branding)

### Accessibility

**Keyboard Navigation:**
- Tab order: Top to bottom, left to right
- Enter/Space: Activate buttons
- Escape: Cancel edit mode (future)

**Screen Readers:**
- All inputs have associated labels
- Buttons have aria-labels
- Icons are decorative (aria-hidden)
- Error messages announced (future)

**Color Contrast:**
- WCAG AA compliant (4.5:1 minimum)
- Focus rings visible
- Placeholder text readable

### Mobile Responsiveness

**Breakpoints:**
- Mobile: < 768px (1 column)
- Desktop: ≥ 768px (2 columns)

**Mobile Optimizations:**
- Larger touch targets (44x44px minimum)
- No hover states (tap only)
- Full-width inputs
- Sticky save button (future)

**Grid Behavior:**
```css
/* Desktop */
grid-cols-1 md:grid-cols-2

/* Mobile */
grid-cols-1
```

---

## Validation Rules

### Current Validation

**Client-Side:**
- Name: Required (UI shows asterisk)
- Phone: Required (UI shows asterisk)
- Brokerage: Required (UI shows asterisk)
- Photo: File type, file size

**Server-Side:**
- Deep merge validation (preserves existing data)
- Type safety (TypeScript)
- Mongoose schema validation

### Future Validation

**URLs:**
- Must start with `http://` or `https://`
- Must be valid URL format
- Optional length limits

**Phone:**
- E.164 format validation
- Auto-formatting (e.g., (760) 333-3676)

**Email:**
- Valid email format (already validated at signup)

**Text Fields:**
- Max character limits
- No XSS (HTML stripping)
- Trim whitespace

---

## API Reference

### GET /api/user/profile

**Authentication:** Required (session)

**Response:**
```json
{
  "profile": {
    "name": "Joseph Sardella",
    "email": "josephsardella@gmail.com",
    "phone": "760-333-3676",
    "image": "https://lh3.googleusercontent.com/...",
    "brokerageName": "eXp Realty",
    "licenseNumber": "02106916",
    "profileDescription": "Your trusted Coachella Valley Realtor.",
    "team": {
      "name": "Default Team",
      "description": null
    },
    "isTeamLeader": false,
    "agentProfile": {
      "headline": "Your Trusted Coachella Valley Realtor",
      "tagline": "Helping You Find Your Dream Home",
      "socialMedia": {
        "facebook": "https://facebook.com/josephsardella",
        "instagram": "https://instagram.com/josephsardella",
        "linkedin": "https://linkedin.com/in/josephsardella",
        "youtube": "https://youtube.com/@josephsardella"
      }
    }
  }
}
```

### PUT /api/user/profile

**Authentication:** Required (session)

**Request Body:**
```json
{
  "name": "Joseph Sardella",
  "phone": "760-333-3676",
  "brokerageName": "eXp Realty",
  "licenseNumber": "02106916",
  "profileDescription": "Your trusted Coachella Valley Realtor.",
  "agentProfile": {
    "headline": "Your Trusted Coachella Valley Realtor",
    "tagline": "Helping You Find Your Dream Home Since 2010",
    "socialMedia": {
      "facebook": "https://facebook.com/josephsardella",
      "instagram": "https://instagram.com/josephsardella"
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "profile": {
    "name": "Joseph Sardella",
    "email": "josephsardella@gmail.com",
    "phone": "760-333-3676",
    "image": "https://lh3.googleusercontent.com/...",
    "brokerageName": "eXp Realty",
    "licenseNumber": "02106916",
    "profileDescription": "Your trusted Coachella Valley Realtor.",
    "team": {
      "name": "Default Team",
      "description": null
    },
    "isTeamLeader": false,
    "agentProfile": {
      "headline": "Your Trusted Coachella Valley Realtor",
      "tagline": "Helping You Find Your Dream Home Since 2010",
      "socialMedia": {
        "facebook": "https://facebook.com/josephsardella",
        "instagram": "https://instagram.com/josephsardella",
        "linkedin": "https://linkedin.com/in/josephsardella",
        "youtube": "https://youtube.com/@josephsardella"
      }
    }
  }
}
```

**Error Responses:**

```json
// 401 Unauthorized
{
  "error": "Unauthorized"
}

// 404 Not Found
{
  "error": "User not found"
}

// 500 Server Error
{
  "error": "Failed to update profile"
}
```

---

## Common Use Cases

### Use Case 1: First-Time Setup

**Scenario:** New agent needs to fill out their profile

**Steps:**
1. Navigate to `/agent/dashboard`
2. Click Settings icon
3. Verify name, phone, brokerage (already filled from signup)
4. Upload professional headshot
5. Add bio (2-3 sentences about yourself)
6. Add headline (your value proposition)
7. Add tagline (your unique selling point)
8. Add social media links (at least 2 platforms)
9. Click Save Changes
10. Preview landing page (future feature)

**Time Estimate:** 5-10 minutes

### Use Case 2: Update Social Links

**Scenario:** Agent wants to add Instagram link

**Steps:**
1. Navigate to `/agent/dashboard`
2. Click Settings icon
3. Scroll to "Social Media Links" section
4. Find Instagram field
5. Paste URL: `https://instagram.com/yourhandle`
6. Click Save Changes
7. Done!

**Time Estimate:** 30 seconds

### Use Case 3: Change Profile Photo

**Scenario:** Agent got new professional headshot

**Steps:**
1. Navigate to `/agent/dashboard`
2. Click camera icon on profile photo
3. Select new photo from computer
4. Wait for upload (spinner appears)
5. See new photo immediately
6. Toast confirms: "Profile photo updated successfully!"

**Time Estimate:** 20 seconds

**Note:** Photo saves immediately, no need to click Save Changes

### Use Case 4: Update Landing Page Copy

**Scenario:** Agent wants to refresh headline/tagline

**Steps:**
1. Navigate to `/agent/dashboard`
2. Click Settings icon
3. Scroll to "Landing Page Content" section
4. Update headline and/or tagline
5. Click Save Changes
6. Changes live immediately on joseph.chatrealty.io (future)

**Time Estimate:** 1 minute

---

## Troubleshooting

### Photo Won't Upload

**Problem:** File picker opens but nothing happens after selecting photo

**Solutions:**
1. Check file type (must be image: JPG, PNG, WebP)
2. Check file size (must be under 5MB)
3. Check internet connection (Cloudinary upload)
4. Try different photo
5. Refresh page and try again

**Error Messages:**
- "Please select a valid image file" → Wrong file type
- "Image size must be less than 5MB" → File too large
- "Failed to upload image" → Network/Cloudinary error

### Save Button Disabled

**Problem:** Can't click Save Changes button

**Solutions:**
1. Wait for current save to complete (button shows "Saving...")
2. Fill required fields (name, phone, brokerage)
3. Wait for page to finish loading
4. Check if you're still logged in

### Changes Not Persisting

**Problem:** Edits disappear after saving

**Solutions:**
1. Check for error toast messages
2. Verify you clicked "Save Changes" (not just edited)
3. Check network tab for failed requests (401, 500)
4. Try refreshing page to see latest data
5. Contact support if issue persists

### Profile Card Looks Broken

**Problem:** Layout is messed up or missing data

**Solutions:**
1. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. Clear browser cache
3. Try different browser
4. Check console for JavaScript errors
5. Report bug to development team

---

## Future Enhancements

### Phase 2: Extended Media
- [ ] Hero photo upload (landing page background)
- [ ] Team photo upload
- [ ] Office photo upload
- [ ] Gallery photos (multi-select upload)
- [ ] Video introduction upload
- [ ] Photo drag-and-drop reordering

### Phase 3: Custom Backgrounds
- [ ] Light desktop background upload
- [ ] Light mobile background upload
- [ ] Dark desktop background upload
- [ ] Dark mobile background upload
- [ ] Background position controls
- [ ] Background opacity slider

### Phase 4: Advanced Content
- [ ] Value propositions builder (add/edit/delete)
- [ ] Testimonials manager (client reviews)
- [ ] Stats builder (custom metrics)
- [ ] Business hours editor (weekly schedule)
- [ ] Certifications list manager
- [ ] Specializations multi-select
- [ ] Service areas map picker

### Phase 5: Branding & SEO
- [ ] Subdomain setup (e.g., joseph.chatrealty.io)
- [ ] Custom domain setup (e.g., josephsardella.com)
- [ ] Brand color picker (primary, secondary, accent)
- [ ] Font family selector
- [ ] SEO meta title input
- [ ] SEO meta description textarea
- [ ] SEO keywords tags input
- [ ] Open Graph image upload
- [ ] Twitter Card settings

### Phase 6: UX Improvements
- [ ] Live preview mode (see changes before saving)
- [ ] Undo/redo functionality
- [ ] Auto-save draft (every 30 seconds)
- [ ] Validation error messages inline
- [ ] Character counters on text fields
- [ ] URL previews (link preview cards)
- [ ] Bulk social media import
- [ ] Profile completion percentage
- [ ] Guided onboarding wizard

---

## Related Links

- [Agent Profile System Overview](./index.md) - Data model, API, architecture
- [Multi-Tenant Platform](../../multi-tenant/index.md) - Platform vision
- [Theme Transitions](../../theme-context/THEME_TRANSITIONS.md) - Custom backgrounds usage
- [CHAP Experience](../../features/CHAP_UNIFIED_EXPERIENCE.md) - Chat + Map interface

---

## Support

**Questions or Issues?**
- **Documentation:** Start with [Agent Profile System Overview](./index.md)
- **Bug Reports:** Create GitHub issue with screenshots
- **Feature Requests:** Discuss with product team
- **Technical Help:** Contact development team

**Changelog:**
- **2026-03-16:** Initial implementation (Phase 1)
  - Basic info fields
  - Landing page content (headline, tagline)
  - Social media links (4 platforms)
  - Photo upload (headshot)
  - API deep merge support
