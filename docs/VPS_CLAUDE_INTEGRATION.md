# VPS Claude Code Integration
**Remote Claude Sessions for Article Drafting**
**Last Updated:** January 29, 2025

---

## 📋 OVERVIEW

This system allows you to launch Claude Code directly on your VPS from the admin interface. Instead of using the Anthropic API, this leverages the Claude Code CLI that's already installed on your VPS, giving Claude full access to your codebase, database, and filesystem.

### Why This Is Better

**Remote Claude Code** (what we built):
- ✅ Claude Code CLI already installed on VPS
- ✅ Full access to codebase and database
- ✅ Can read existing articles to learn your style
- ✅ Can directly create/edit articles in MongoDB
- ✅ No API costs (uses your existing Anthropic account)
- ✅ More powerful - full file system access

**API Approach** (what we initially built):
- ❌ Requires ANTHROPIC_API_KEY
- ❌ Limited to API calls ($0.07 per article)
- ❌ Can't directly access database or filesystem
- ❌ Copy-paste workflow

---

## 🏗️ ARCHITECTURE

### Components

```
Admin Interface
    ↓ (Click "Launch Claude on VPS")
    ↓
API Endpoint (/api/vps/launch-claude)
    ↓ (SSH connection)
    ↓
VPS (147.182.236.138)
    ↓ (Execute command)
    ↓
Claude Code CLI
    ↓ (Full access)
    ↓
├── Codebase (/root/jpsrealtor)
├── MongoDB (Article model)
├── Existing Articles (/root/jpsrealtor/src/posts)
└── Cloudinary (.env credentials)
```

### File Structure

```
src/
├── lib/
│   └── vps-ssh.ts                     # SSH utilities for VPS connection
├── app/
│   ├── api/
│   │   └── vps/
│   │       └── launch-claude/
│   │           └── route.ts           # API endpoint
│   └── admin/
│       └── articles/
│           └── page.tsx               # "Launch Claude on VPS" button
└── models/
    └── article.ts                     # Article database model
```

---

## 🔧 SETUP

### 1. VPS Requirements

Your VPS must have:
- ✅ Claude Code CLI installed (`claude` command available)
- ✅ SSH access enabled (port 22)
- ✅ Node.js environment
- ✅ MongoDB connection configured
- ✅ Project cloned at `/root/jpsrealtor`

### 2. Environment Variables

Add to your `.env` file:

```bash
# VPS SSH Credentials
VPS_HOST=147.182.236.138
VPS_PORT=22
VPS_USERNAME=root
VPS_PASSWORD=YOUR_VPS_PASSWORD  # (already in code as default)

# MongoDB (already configured)
MONGODB_URI=your-connection-string

# Cloudinary (already configured)
CLOUDINARY_CLOUD_NAME=YOUR_CLOUD_NAME
CLOUDINARY_API_KEY=YOUR_CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET=YOUR_CLOUDINARY_API_SECRET
```

### 3. Install SSH2 Library

Already installed:
```bash
npm install ssh2
```

### 4. Verify Claude Code on VPS

SSH into your VPS and check:
```bash
ssh root@147.182.236.138

# Check if Claude Code is installed
which claude
# Output: /usr/local/bin/claude (or similar)

claude --version
# Output: Claude Code version x.x.x
```

---

## 💡 HOW TO USE

### Step 1: Navigate to Admin

Go to `/admin/articles` in your admin panel.

### Step 2: Click "Launch Claude on VPS"

You'll see a purple button with server and sparkles icons:
```
[Server Icon] [Sparkles Icon] Launch Claude on VPS
```

### Step 3: Enter Instructions

A modal will appear. Enter detailed instructions for Claude:

**Example Instructions:**

```
Review existing articles in /root/jpsrealtor/src/posts/ to understand
our writing style, tone, and structure. Then draft a new article about
Palm Desert golf communities as investment properties. Focus on ROI,
lifestyle amenities, and market trends. Save it to MongoDB using the
Article model with category "market-insights".
```

**More Examples:**

```
Analyze our top 5 most popular articles and create a similar piece
about La Quinta luxury real estate market. Include recent sales data
and neighborhood highlights.
```

```
Edit article ID 507f1f77bcf86cd799439011 to add a section about
2025 market predictions. Keep the existing tone and style.
```

```
Create a comprehensive buyer's guide for first-time homebuyers in
the Coachella Valley. Make it actionable and include a checklist.
Category should be "real-estate-tips".
```

### Step 4: Launch

Click "Launch on VPS" button.

The system will:
1. SSH into your VPS
2. Create a temporary prompt file
3. Launch Claude Code with your instructions
4. Run in background (`nohup`)

### Step 5: Claude Gets to Work

Claude will:
1. Read your existing articles to learn style
2. Access the Article database model
3. Draft new content or edit existing
4. Save directly to MongoDB
5. Upload images to Cloudinary if needed

---

## 🎯 MODES

The system supports three modes:

### 1. Review Mode (Default)
```javascript
mode: "review"
```

Claude analyzes existing articles to learn your writing style.

**Example:**
```
Review all articles and summarize our writing style guide
```

### 2. Create Mode
```javascript
mode: "create"
```

Claude drafts a new article from scratch.

**Example:**
```
Create a new article about Indian Wells tennis tournament
and its impact on real estate
```

### 3. Edit Mode
```javascript
mode: "edit",
articleId: "507f1f77bcf86cd799439011"
```

Claude edits an existing article.

**Example:**
```
Add a section about ROI calculations to article ID 507f...
```

---

## 🔐 SECURITY

### Authentication
- **Admin-only** - `isAdmin` check required
- Uses NextAuth session validation
- SSH credentials in environment variables only

### SSH Security
- Password-based authentication (consider SSH keys for production)
- Timeout after 30 seconds
- Commands run in specific working directory (`/root/jpsrealtor`)

### Sandboxing
- Claude runs in your VPS environment
- Full access to codebase (intentional - it's your server)
- MongoDB credentials already configured in VPS `.env`

---

## 📊 API ENDPOINTS

### POST /api/vps/launch-claude

Launch a Claude Code session on VPS.

**Request:**
```json
{
  "prompt": "Your instructions for Claude",
  "articleId": "optional-article-id-for-editing",
  "category": "articles | market-insights | real-estate-tips",
  "mode": "create | edit | review"
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "claude-1738195200000",
  "command": "nohup claude --prompt ...",
  "message": "Claude Code session launched on VPS",
  "installation": {
    "installed": true,
    "path": "/usr/local/bin/claude",
    "version": "1.0.0"
  }
}
```

### GET /api/vps/launch-claude

Get active Claude sessions on VPS.

**Response:**
```json
{
  "sessions": [
    {
      "pid": "12345",
      "command": "claude --prompt ...",
      "startTime": "Jan 29 14:30"
    }
  ],
  "installation": {
    "installed": true,
    "path": "/usr/local/bin/claude",
    "version": "1.0.0"
  }
}
```

### DELETE /api/vps/launch-claude?pid=12345

Kill a running Claude session.

**Response:**
```json
{
  "success": true,
  "message": "Claude session 12345 terminated"
}
```

---

## 🛠️ TECHNICAL DETAILS

### SSH Connection

```typescript
// lib/vps-ssh.ts
const VPS_CONFIG = {
  host: "147.182.236.138",
  port: 22,
  username: "root",
  password: "YOUR_VPS_PASSWORD"
};
```

### Command Execution

```typescript
// Creates prompt file
echo "Your instructions" > /tmp/claude-prompt-123.txt

// Launches Claude in background
nohup claude --prompt "$(cat /tmp/claude-prompt-123.txt)" \
  > /tmp/claude-session-123.log 2>&1 &
```

### Process Management

```typescript
// Check running processes
ps aux | grep '[c]laude' | grep -v grep

// Kill specific process
kill 12345
```

---

## 🐛 TROUBLESHOOTING

### "Claude Code is not installed on VPS"

SSH into VPS and install:
```bash
npm install -g @anthropic-ai/claude-code
```

### "SSH connection failed"

Check:
- VPS is running and accessible
- SSH credentials are correct
- Port 22 is open
- VPS_PASSWORD in .env matches

### "Command timeout"

Increase timeout in request:
```typescript
await executeVPSCommand(command, {
  timeout: 60000  // 60 seconds
});
```

### Claude session not found

Sessions run in background. Check logs:
```bash
ssh root@147.182.236.138
cat /tmp/claude-session-*.log
```

---

## 🚀 DEPLOYMENT

### Local Development

1. Ensure VPS credentials in `.env`
2. Start dev server: `npm run dev`
3. Navigate to `/admin/articles`
4. Click "Launch Claude on VPS"

### Production Deployment

1. SSH into VPS
2. Pull latest code: `git pull origin main`
3. Install dependencies: `npm install`
4. Set environment variables
5. Build: `npm run build`
6. Restart: `pm2 restart jpsrealtor`

---

## 💰 COST

**$0** - Uses Claude Code CLI already installed on VPS

No API costs, no per-article charges. Just your existing Anthropic account that comes with Claude Code.

---

## 🔄 WORKFLOW COMPARISON

### Old Way (Manual)
1. Open ChatGPT or Claude
2. Copy prompt
3. Wait for response
4. Copy content
5. Paste into CMS
6. Format MDX
7. Add frontmatter
8. Upload images
9. Save to database

**Time:** 30-60 minutes

### New Way (VPS Claude)
1. Click "Launch Claude on VPS"
2. Enter instructions
3. Click "Launch"

Claude handles everything:
- ✅ Reads your existing articles
- ✅ Learns your style
- ✅ Drafts new content
- ✅ Formats in MDX
- ✅ Adds frontmatter
- ✅ Uploads to Cloudinary
- ✅ Saves to MongoDB

**Time:** 5 minutes (mostly just reviewing)

---

## 📈 FUTURE ENHANCEMENTS

- [ ] **Real-time logs** - Stream Claude's output to admin interface
- [ ] **Session management UI** - View/kill active sessions
- [ ] **Scheduled drafting** - Run Claude on cron jobs
- [ ] **Batch creation** - Generate multiple articles at once
- [ ] **Version history** - Track Claude's edits over time
- [ ] **Approval workflow** - Review before auto-publishing
- [ ] **SSH key authentication** - More secure than password
- [ ] **Multi-VPS support** - Different servers for staging/prod
- [ ] **Webhook notifications** - Get notified when Claude finishes
- [ ] **Analytics integration** - Claude learns from top articles

---

## 📚 RELATED DOCUMENTATION

- [DATABASE_MODELS.md](./DATABASE_MODELS.md) - Article schema
- [AUTHENTICATION.md](./AUTHENTICATION.md) - Admin access
- [CLAUDE_CMS_INTEGRATION.md](./CLAUDE_CMS_INTEGRATION.md) - API approach (alternative)

---

## 🎉 KEY BENEFITS

### 1. Zero API Costs
Uses Claude Code CLI, no per-article charges

### 2. Full Control
Claude has direct access to your entire stack

### 3. Learning Your Style
Reads existing articles to match your tone

### 4. Direct Database Access
No copy-paste, saves directly to MongoDB

### 5. Cloudinary Integration
Handles image uploads automatically

### 6. Background Execution
Doesn't block - runs asynchronously

### 7. Scalable
Launch multiple sessions if needed

---

**Last Updated:** January 29, 2025
**VPS:** 147.182.236.138
**Cost:** $0
**Setup Time:** 5 minutes
**Article Creation Time:** 5 minutes
