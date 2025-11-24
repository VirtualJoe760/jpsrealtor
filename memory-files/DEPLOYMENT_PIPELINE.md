# Deployment Pipeline Documentation

**Version:** 2.0
**Last Updated:** 2025-01-23
**Project:** ChatRealty / JPSRealtor

---

## Current Deployment

### Frontend (jpsrealtor.com)
**Platform**: Vercel
**Framework**: Next.js 16.0.3
**URL**: https://jpsrealtor.com
**Branch**: `v2` (auto-deploy on push)
**Build Command**: `npm run build`
**Environment**: Node.js 20.x

**Environment Variables** (Vercel):
```bash
MONGODB_URI=mongodb+srv://...
GROQ_API_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
CLOUDINARY_CLOUD_NAME=...
NEXT_CMS_URL=https://cms.jpsrealtor.com
```

---

### Backend/CMS (cms.jpsrealtor.com)
**Platform**: DigitalOcean VPS (Droplet)
**OS**: Ubuntu 22.04
**IP**: 147.182.236.138
**Framework**: PayloadCMS 3.64.0 + Next.js 15.1.6
**URL**: https://cms.jpsrealtor.com
**Process Manager**: PM2
**Reverse Proxy**: Nginx
**SSL**: Let's Encrypt (Certbot)

**Deployment Steps**:
```bash
# SSH into server
ssh root@147.182.236.138

# Pull latest code
cd /var/www/jpsrealtor-cms
git pull origin main

# Install dependencies
npm install

# Build
npm run build

# Restart PM2
pm2 restart payload-cms
```

**PM2 Configuration**:
```json
{
  "apps": [{
    "name": "payload-cms",
    "script": "npm",
    "args": "start",
    "cwd": "/var/www/jpsrealtor-cms",
    "env": {
      "NODE_ENV": "production",
      "PORT": "3002"
    }
  }]
}
```

**Nginx Configuration**:
```nginx
server {
  listen 80;
  server_name cms.jpsrealtor.com;
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl;
  server_name cms.jpsrealtor.com;

  ssl_certificate /etc/letsencrypt/live/cms.jpsrealtor.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/cms.jpsrealtor.com/privkey.pem;

  location / {
    proxy_pass http://localhost:3002;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

---

### Database (MongoDB Atlas)
**Provider**: MongoDB Atlas (DigitalOcean)
**Tier**: M10 (Dedicated)
**Region**: NYC3
**Backup**: Daily snapshots
**Connection**: Via `MONGODB_URI` env variable

---

## CI/CD Pipeline

### Frontend (Vercel)
**Trigger**: Git push to `v2` branch
**Steps**:
1. Install dependencies
2. Run `next build`
3. Deploy to Vercel CDN
4. Invalidate cache

**Build Time**: ~2 minutes

---

### Backend (Manual)
**Trigger**: Manual SSH deployment
**Future**: GitHub Actions automation

**Proposed GitHub Actions** (`.github/workflows/deploy-cms.yml`):
```yaml
name: Deploy CMS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to DigitalOcean
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.DO_HOST }}
          username: root
          password: ${{ secrets.DO_PASSWORD }}
          script: |
            cd /var/www/jpsrealtor-cms
            git pull origin main
            npm install
            npm run build
            pm2 restart payload-cms
```

---

## Environment Management

### Development
**Frontend**: `npm run dev` (localhost:3000)
**Backend**: `npm run dev` (localhost:3002)

### Production
**Frontend**: Vercel auto-deploy
**Backend**: PM2 on DigitalOcean

---

## Monitoring

**Vercel Analytics**: Page views, performance metrics
**MongoDB Atlas Monitoring**: Query performance, connection pool
**PM2 Monitoring**: CPU, memory, uptime

---

## Rollback Strategy

**Frontend**: Vercel deployments → revert via dashboard
**Backend**: Git → `git revert` + redeploy
**Database**: MongoDB Atlas snapshots → restore point-in-time

---

## Cross-References

- **Master Architecture**: See `MASTER_SYSTEM_ARCHITECTURE.md`
- **Backend Architecture**: See `BACKEND_ARCHITECTURE.md`
