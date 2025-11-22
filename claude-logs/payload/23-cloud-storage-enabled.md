# Step 23 — Enable Production Media Uploads (DigitalOcean Spaces, Payload v3)

**Date:** November 21, 2025
**Server:** cms.jpsrealtor.com (147.182.236.138)
**Objective:** Configure DigitalOcean Spaces for cloud media storage using Payload v3 cloud storage plugin

---

## Overview

This step configures cloud storage for media uploads including:
- Blog post cover images
- City & neighborhood hero images
- School logos/photos
- Future user-uploaded media
- Stripe product images (future)

---

## A. Install Cloud Storage Plugins

### Packages Installed
```bash
cd /var/www/payload/current
npm install @payloadcms/plugin-cloud-storage @aws-sdk/client-s3
```

**Status:** ✅ Installed successfully

### Packages Added
- `@payloadcms/plugin-cloud-storage` - Payload v3 cloud storage plugin
- `@aws-sdk/client-s3` - AWS SDK S3 client (compatible with DigitalOcean Spaces)

---

## B. Create DigitalOcean Spaces Storage Adapter

### File Created
`/var/www/payload/current/src/storage/doSpace.ts`

### Contents
```typescript
import { S3Client } from '@aws-sdk/client-s3'

export const doSpaceClient = new S3Client({
  region: process.env.DO_SPACES_REGION,
  endpoint: process.env.DO_SPACES_ENDPOINT,
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY as string,
    secretAccessKey: process.env.DO_SPACES_SECRET as string,
  },
})
```

**Purpose:** Creates an S3-compatible client configured for DigitalOcean Spaces

**Status:** ✅ Created

---

## C. Update payload.config.ts with Cloud Storage Plugin

### Imports Added
```typescript
import { s3Storage } from '@payloadcms/plugin-cloud-storage/s3'
import { doSpaceClient } from './src/storage/doSpace'
```

### Plugin Configuration
```typescript
// Plugins - Step 23: DigitalOcean Spaces Cloud Storage
plugins: [
  ...(process.env.DO_SPACES_BUCKET
    ? [
        s3Storage({
          collections: {
            media: {
              adapter: doSpaceClient,
              bucket: process.env.DO_SPACES_BUCKET,
            },
          },
        }),
      ]
    : []),
],
```

**Features:**
- Conditional activation (only enabled when DO_SPACES_BUCKET is set)
- Uses S3-compatible adapter with custom DigitalOcean Spaces client
- Targets the `media` collection for cloud uploads

**Status:** ✅ Configured

---

## D. Environment Variables Configuration

### File Modified
`/var/www/payload/current/.env`

### DO Spaces Variables
```env
# DigitalOcean Spaces - Step 23 (Cloud Media Storage)
# Note: KEY and SECRET need to be obtained from DigitalOcean Spaces API settings
DO_SPACES_KEY=
DO_SPACES_SECRET=
DO_SPACES_BUCKET=jps-media
DO_SPACES_ENDPOINT=https://sfo3.digitaloceanspaces.com
DO_SPACES_REGION=sfo3
```

### Variable Descriptions

| Variable | Value | Status | Purpose |
|----------|-------|--------|---------|
| `DO_SPACES_KEY` | *(empty)* | ⚠️ **Needs configuration** | DigitalOcean Spaces Access Key ID |
| `DO_SPACES_SECRET` | *(empty)* | ⚠️ **Needs configuration** | DigitalOcean Spaces Secret Access Key |
| `DO_SPACES_BUCKET` | jps-media | ✅ Set | Bucket name for media storage |
| `DO_SPACES_ENDPOINT` | https://sfo3.digitaloceanspaces.com | ✅ Set | DigitalOcean Spaces endpoint URL |
| `DO_SPACES_REGION` | sfo3 | ✅ Set | San Francisco region |

### ⚠️ Action Required

To activate cloud storage:
1. Log into DigitalOcean Control Panel
2. Navigate to Spaces (Object Storage)
3. Create or access the "jps-media" Space
4. Go to Settings → API
5. Generate API Keys
6. Copy the Access Key and Secret Key
7. Update `.env` file with actual credentials:
   ```bash
   DO_SPACES_KEY=<your_access_key>
   DO_SPACES_SECRET=<your_secret_key>
   ```
8. Restart PM2: `pm2 restart payload-cms`

**Status:** ⚠️ Configured but credentials pending

---

## E. Media Collection URL Rewriting

### File Modified
`/var/www/payload/current/src/collections/Media.ts`

### Changes Applied

#### 1. Added staticURL Configuration
```typescript
upload: {
  staticDir: 'media',
  staticURL: '/media',
  // ... image sizes config
}
```

#### 2. Added afterRead Hook for Cloud URL Rewriting
```typescript
hooks: {
  afterRead: [
    ({ doc }) => {
      // If URL already starts with http, it's already a cloud URL
      if (doc.url?.startsWith('http')) return doc

      // If DO Spaces is configured, rewrite URLs to point to cloud storage
      if (process.env.DO_SPACES_BUCKET && process.env.DO_SPACES_ENDPOINT) {
        doc.url = `${process.env.DO_SPACES_ENDPOINT}/${process.env.DO_SPACES_BUCKET}/${doc.filename}`

        // Also rewrite image size URLs if they exist
        if (doc.sizes) {
          Object.keys(doc.sizes).forEach((size) => {
            if (doc.sizes[size].filename) {
              doc.sizes[size].url = `${process.env.DO_SPACES_ENDPOINT}/${process.env.DO_SPACES_BUCKET}/${doc.sizes[size].filename}`
            }
          })
        }
      }

      return doc
    },
  ],
},
```

**Purpose:**
- Automatically rewrites local media URLs to cloud storage URLs
- Only applies when DO Spaces is configured
- Handles both main image and all responsive image sizes
- Prevents double-processing of URLs already pointing to cloud

**Status:** ✅ Configured

---

## F. PM2 Restart

```bash
pm2 restart payload-cms
```

**Output:**
```
[PM2] Applying action restartProcessId on app [payload-cms](ids: [ 1 ])
[PM2] [payload-cms](1) ✓

Status: online
PID: 17229
Uptime: 5s
Memory: 59.1mb
```

**Status:** ✅ Restarted successfully

---

## G. Testing Status

### API Endpoint Test
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://cms.jpsrealtor.com/api/media
```

**Result:** 404 (Next.js routing issue - requires rebuild)

### Upload Test
⚠️ **Cannot be completed until:**
1. DO Spaces API credentials are configured
2. Next.js application is rebuilt to include new TypeScript files

### Expected Workflow (Once Configured)
```bash
# Upload test image
curl -X POST \
  -H "Authorization: Bearer $PRIVATE_CMS_TOKEN" \
  -F "file=@/root/test.jpg" \
  https://cms.jpsrealtor.com/api/media
```

**Expected Response:**
```json
{
  "id": "...",
  "filename": "test-abc123.jpg",
  "url": "https://sfo3.digitaloceanspaces.com/jps-media/test-abc123.jpg",
  "sizes": {
    "thumbnail": {
      "url": "https://sfo3.digitaloceanspaces.com/jps-media/test-abc123-thumbnail.jpg",
      ...
    },
    ...
  }
}
```

**Status:** ⚠️ Pending credentials and rebuild

---

## Configuration Summary

### ✅ Completed

1. ✅ Cloud storage plugins installed
2. ✅ DigitalOcean Spaces adapter created
3. ✅ payload.config.ts updated with s3Storage plugin
4. ✅ Environment variables configured (bucket, endpoint, region)
5. ✅ Media collection URL rewriting implemented
6. ✅ PM2 restarted with new configuration

### ⚠️ Pending

1. ⚠️ **DO Spaces API credentials** (KEY and SECRET) need to be added to `.env`
2. ⚠️ **Next.js rebuild** required to activate new TypeScript files:
   ```bash
   cd /var/www/payload/current
   npm run build
   pm2 restart payload-cms
   ```
3. ⚠️ **End-to-end upload testing** (pending above)

---

## Files Created/Modified

### Created
1. `/var/www/payload/current/src/storage/doSpace.ts` - S3 client adapter

### Modified
1. `/var/www/payload/current/payload.config.ts` - Added cloud storage plugin
2. `/var/www/payload/current/.env` - Configured DO Spaces variables
3. `/var/www/payload/current/src/collections/Media.ts` - Added URL rewriting hooks
4. `/root/payload-steps/23-cloud-storage-enabled.md` - This documentation

---

## How Cloud Storage Works

### Upload Flow
1. User uploads image through Payload admin panel or API
2. s3Storage plugin intercepts the upload
3. Image is uploaded to DigitalOcean Spaces bucket
4. Original and resized versions are stored in cloud
5. Database stores only metadata and cloud URLs

### URL Rewriting Flow
1. API returns media document from database
2. `afterRead` hook executes
3. Local file paths are rewritten to cloud URLs
4. Frontend receives full CDN URLs

### Benefits
- ✅ Offloads storage from VPS disk
- ✅ CDN delivery for faster global access
- ✅ Automatic image resizing with cloud storage
- ✅ Scalable storage solution
- ✅ Backup and redundancy built-in

---

## Next Steps to Activate

### 1. Obtain DO Spaces Credentials
```bash
# Access DigitalOcean Control Panel
# Create API keys for jps-media Space
# Update .env with credentials
nano /var/www/payload/current/.env
```

### 2. Rebuild Application
```bash
cd /var/www/payload/current
npm run build
pm2 restart payload-cms
```

### 3. Test Upload
```bash
# Create test image
echo "Test" > /root/test.txt

# Upload via API
curl -X POST \
  -H "Authorization: Bearer $PRIVATE_CMS_TOKEN" \
  -F "file=@/root/test.txt" \
  https://cms.jpsrealtor.com/api/media
```

### 4. Verify in Browser
- Visit returned URL in browser
- Confirm image loads from `sfo3.digitaloceanspaces.com`
- Check admin panel shows cloud URL

---

## Troubleshooting

### If Uploads Fail
1. Check DO Spaces credentials in `.env`
2. Verify bucket exists and is named `jps-media`
3. Check bucket permissions (public read recommended)
4. Review PM2 logs: `pm2 logs payload-cms`

### If URLs Don't Rewrite
1. Verify `DO_SPACES_BUCKET` and `DO_SPACES_ENDPOINT` are set
2. Check Media collection afterRead hook is in place
3. Restart PM2 after any `.env` changes

### If Build Fails
1. Check TypeScript syntax in new files
2. Verify all imports are correct
3. Run `npm install` to ensure dependencies
4. Check build logs for specific errors

---

**Step 23 Configuration Complete**
**Status:** ✅ Configured and ready for credentials
**Action Required:** Add DO Spaces API credentials to activate cloud storage

---

**Next Step:** Step 24 (awaiting instructions)
