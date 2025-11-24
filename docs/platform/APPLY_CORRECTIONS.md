# Apply Architecture Corrections - Action Plan

**CRITICAL**: These corrections must be applied to all 9 architecture files.

---

## GLOBAL FIND & REPLACE

Apply these replacements across ALL documentation files:

### 1. Repository Name Corrections
- FIND: `chatrealty-cms`
- REPLACE: `chatrealty-cms`

### 2. CMS Domain Corrections
- FIND: `cms.chatrealty.io`
- REPLACE: `cms.chatrealty.com`

### 3. Database Name Corrections
- FIND: `Database: chatrealty`
- REPLACE: `Database: chatrealty`

---

## FILE-SPECIFIC CORRECTIONS

### MASTER_SYSTEM_ARCHITECTURE.md

**Section: Executive Summary**
- CHANGE: "Shared MLS pool: 42,000+ listings"
- TO: "Per-agent MLS pool: Isolated MLS data collections per agent"

**Section: Repository Structure**
- ADD after chatRealty/:
  ```
  ├── chatrealty-cms/                # PayloadCMS backend (NOT nested)
  ```
- ENSURE three separate repos at same level

**Section: Database Schema**
- ADD collections:
  - `agents` (~10 docs) ← Payload managed
  - `mlsConfigurations` (~20 docs) ← Payload managed
- RENAME collections:
  - `listings` → `jpsrealtor_gps_listings`
  - `crmlsListings` → `jpsrealtor_crmls_listings`

**Section: Authentication & Authorization**
- ADD User Model (CORRECTED):
  ```typescript
  interface User {
    accountType: "general_user" | "client" | "agent" | "investor";
    primaryAgentId: "jpsrealtor" | "agent2" | null;
    subscriptions: string[];  // For paid features, NOT branding
  }
  ```
- ADD KEY RULES (1-5 as specified)

**Section: Multi-Tenant Strategy**
- ADD subsection: "Per-Agent MLS Collections"
- ADD subsection: "Frontend Branding Selection Algorithm"

---

### AUTH_ARCHITECTURE.md

**Section: Users Collection**
- UPDATE schema to include:
  ```typescript
  accountType: "general_user" | "client" | "agent" | "investor";
  primaryAgentId: "jpsrealtor" | "agent2" | null;
  subscriptions: string[];
  ```

**ADD NEW SECTION after "Token Management"**:
```markdown
### Account Types and Branding

**Account Types**:
- `general_user` - No agent affiliation
- `client` - MUST have primaryAgentId (determines branding)
- `agent` - Agent account
- `investor` - Pro tier user

**Branding Selection Logic**:
```typescript
if (user.accountType === "client" && user.primaryAgentId) {
  const agent = await Agent.findOne({ agentId: user.primaryAgentId });
  applyBranding(agent.branding);
}
```
```

**REMOVE ALL MENTIONS OF**:
- Multi-agent client relationships
- Subscription-based branding

---

### DATABASE_ARCHITECTURE.md

**Section: Collections Schema**

**ADD NEW COLLECTION #2: Agents**
```markdown
### 2. Agents Collection (PayloadCMS)

**Document Count**: ~10

**Schema**:
```typescript
{
  _id: ObjectId,
  agentId: string (unique, indexed),  // e.g., "jpsrealtor"
  agentName: string,                  // e.g., "Joseph Sardella"
  agentEmail: string,
  domain: string,                     // e.g., "jpsrealtor.com"

  branding: {
    logo: string,
    primaryColor: string,
    secondaryColor: string,
    theme: "lightgradient" | "blackspace"
  },

  createdAt: ISODate,
  updatedAt: ISODate
}
```
```

**ADD NEW COLLECTION #3: MLSConfigurations**
```markdown
### 3. MLSConfigurations Collection (PayloadCMS)

**Document Count**: ~20

**Schema**:
```typescript
{
  _id: ObjectId,
  agentId: string (indexed),          // Owner agent
  provider: "gps" | "crmls" | "flexmls" | "spark",
  collectionName: string,             // e.g., "jpsrealtor_gps_listings"

  apiKey: string (encrypted),
  apiSecret: string (encrypted),
  region: string,
  active: boolean,

  syncSchedule: string,               // Cron expression
  syncEnabled: boolean,
  lastSyncedAt: ISODate,

  maxListings: number,
  currentListings: number,

  createdAt: ISODate,
  updatedAt: ISODate
}
```
```

**UPDATE Users Collection**:
- ADD fields: `accountType`, `primaryAgentId`, `subscriptions`

**RENAME Listings Collections**:
- `listings` → `jpsrealtor_gps_listings`
- `crmlsListings` → `jpsrealtor_crmls_listings`

---

### FRONTEND_ARCHITECTURE.md

**Section: State Management**

**ADD NEW SUBSECTION: Branding State**
```markdown
### 4. Branding State (User-Based)

**Purpose**: Determine which agent's branding to display based on user's primaryAgentId.

**Implementation**:
```typescript
const { user } = useUser();
const branding = useMemo(() => {
  if (user?.accountType === "client" && user?.primaryAgentId) {
    return fetchAgentBranding(user.primaryAgentId);
  }
  return DEFAULT_BRANDING;
}, [user]);
```
```

**REMOVE**: Any mention of subscription-based branding

---

### BACKEND_ARCHITECTURE.md

**Section: Collections Schema**

**ADD**: Agents collection definition (copy from DATABASE_ARCHITECTURE.md)
**ADD**: MLSConfigurations collection definition (copy from DATABASE_ARCHITECTURE.md)

**UPDATE**: Users collection to include accountType and primaryAgentId

---

### MULTI_TENANT_ARCHITECTURE.md

**Section: Tenant Model**

**REPLACE ENTIRE SECTION**:
```markdown
### Tenant Model

**Tenant = Agent**

Each agent is a tenant with:
- Unique agentId (e.g., "jpsrealtor", "agent2")
- Separate branded frontend domain
- Isolated MLS data collections
- Shared PayloadCMS backend

**Client-Agent Relationship**:
- Clients have ONE primaryAgentId
- primaryAgentId determines frontend branding
- Subscriptions are for paid features, NOT branding
- NO multi-agent client relationships
```

**ADD NEW SECTION**:
```markdown
### Branding Determination

**Algorithm**:
```typescript
function determineBranding(user: User): BrandingConfig {
  // 1. Check if user is a client with primaryAgentId
  if (user.accountType === "client" && user.primaryAgentId) {
    const agent = await Agent.findOne({ agentId: user.primaryAgentId });
    return agent.branding;
  }

  // 2. Use default ChatRealty branding
  return DEFAULT_CHATREALTY_BRANDING;
}
```
```

**REMOVE ALL MENTIONS OF**:
- Users belonging to multiple agents
- Multi-agent client relationships
- Subscription-based tenant identification

---

### MLS_DATA_ARCHITECTURE.md

**Section: Collection Naming Convention**

**CONFIRM**: Per-agent naming convention is correct
- `{agentId}_{mlsProvider}_listings`

**Section: Agent MLS Configuration**

**CONFIRM**: Collection structure matches corrected architecture

**NO MAJOR CHANGES NEEDED** - This file is already mostly correct

---

### DEVELOPER_ONBOARDING.md

**Section: Project Structure**

**UPDATE**:
```markdown
```
chatRealty/
├── jpsrealtor/              # Frontend (Next.js 16)
├── chatrealty-cms/          # Backend/CMS (PayloadCMS) - SEPARATE REPO
└── memory-files/            # Architecture documentation
```
```

**Section: Quick Start (Backend/CMS)**

**UPDATE all references**:
- Change directory path to reference `chatrealty-cms`
- Change CMS URL to `cms.chatrealty.com`

---

### COLLECTIONS_REFERENCE.md

**Section: PayloadCMS Collections**

**ADD**:
```markdown
### Agents
**API**: `GET /api/agents`
**Fields**: agentId, agentName, domain, branding
**Access**: Read (public), Write (admin)

### MLSConfigurations
**API**: `GET /api/mlsConfigurations`
**Fields**: agentId, provider, collectionName, apiKey (encrypted), syncSchedule
**Access**: Read/Write (admin only)
```

**UPDATE Users**:
```markdown
### Users
**API**: `GET /api/users`
**Fields**: email, password, accountType, primaryAgentId, subscriptions, profile
**Access**: Create (public), Read/Update (self/admin), Delete (admin)
```

**UPDATE Frontend Collections**:
```markdown
### Per-Agent MLS Collections
**Pattern**: `{agentId}_{mlsProvider}_listings`
**Examples**:
- `jpsrealtor_gps_listings` (11,592 docs)
- `jpsrealtor_crmls_listings` (20,406 docs)
- `agent2_flexmls_listings` (future)
```

---

## VERIFICATION STEPS

After applying all corrections:

1. **Search all files for**:
   - "chatrealty-cms" (should be 0 results)
   - "cms.chatrealty.io" (should be 0 results)
   - "multiple agents" or "multi-agent client" (should be 0 results)
   - "subscription.*branding" (should be 0 results describing subscription-based branding)

2. **Verify new sections exist**:
   - Agents collection in DATABASE_ARCHITECTURE.md
   - MLSConfigurations collection in DATABASE_ARCHITECTURE.md
   - Branding selection algorithm in FRONTEND_ARCHITECTURE.md
   - Account types explanation in AUTH_ARCHITECTURE.md

3. **Verify consistency**:
   - User model is identical across all files
   - Repo structure is identical across all files
   - MLS collection naming is consistent across all files

---

## COMPLETION CHECKLIST

- [ ] MASTER_SYSTEM_ARCHITECTURE.md updated
- [ ] AUTH_ARCHITECTURE.md updated
- [ ] DATABASE_ARCHITECTURE.md updated
- [ ] FRONTEND_ARCHITECTURE.md updated
- [ ] BACKEND_ARCHITECTURE.md updated
- [ ] MULTI_TENANT_ARCHITECTURE.md updated
- [ ] MLS_DATA_ARCHITECTURE.md updated (minor changes)
- [ ] DEVELOPER_ONBOARDING.md updated
- [ ] COLLECTIONS_REFERENCE.md updated
- [ ] All global find & replace completed
- [ ] Verification steps completed
- [ ] Zero references to old incorrect architecture

---

**APPLY THESE CORRECTIONS TO ENSURE ARCHITECTURE DOCUMENTATION IS ACCURATE**
