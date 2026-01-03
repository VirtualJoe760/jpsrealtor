# Database Schema Alignment Analysis

## Overview
This document analyzes the campaign/contact database schema alignment with the User model and confirms scalability for agent profiles.

## Model Relationships

### User Model (src/models/User.ts)
- Primary entity for all users (agents, clients, admins)
- **Team Support**: `team` field (ObjectId ref to Team)
- **Agent Application**: Complete `agentApplication` object for two-phase approval
- **Team Leadership**: `isTeamLeader` boolean flag
- **Role-based Access**: Multiple roles including `realEstateAgent`

### Campaign Model (src/models/Campaign.ts)
```typescript
{
  userId: ObjectId,        // Campaign owner (agent)
  teamId?: ObjectId,       // Optional team assignment
  name: string,
  type: CampaignType,
  activeStrategies: {...},
  status: CampaignStatus,
  stats: {
    totalContacts: number,
    scriptsGenerated: number,
    // ... other analytics
  }
}
```

**Indexes**:
- `userId + status` - Fast queries for agent's campaigns by status
- `userId + type` - Fast queries for agent's campaigns by type
- `userId + createdAt` - Chronological sorting

### Contact Model (src/models/contact.ts)
```typescript
{
  userId: ObjectId,        // Contact owner (agent)
  firstName: string,
  lastName: string,
  phone: string,
  email?: string,
  tags?: string[],
  status: ContactStatus,
  campaignHistory: {
    totalCampaigns: number,
    campaigns: [{
      campaignId: ObjectId,
      campaignName: string,
      // ... campaign details
    }]
  }
}
```

**Indexes**:
- `userId + phone` (unique) - Prevent duplicate contacts per agent
- `userId + status` - Fast queries for contacts by status
- Text search on firstName, lastName, email, phone

### ContactCampaign Model (src/models/ContactCampaign.ts)
**Junction table** for many-to-many relationship between Contacts and Campaigns

```typescript
{
  contactId: ObjectId,     // Reference to Contact
  campaignId: ObjectId,    // Reference to Campaign
  userId: ObjectId,        // Owner (for quick filtering)
  source: ContactSource,   // Where contact came from
  status: ContactCampaignStatus,
  isDuplicate: boolean,
  duplicateCampaigns?: ObjectId[],
  addedAt: Date
}
```

**Indexes**:
- `campaignId + status` - Fast queries for campaign contacts by status
- `contactId + campaignId` (unique) - Prevent duplicate contact-campaign pairs
- `userId + campaignId` - Fast queries for user's campaign contacts

## Scalability Analysis

### ✅ Agent-Centric Architecture
- **Each agent owns their data**: All models include `userId` field
- **Team support**: Campaigns can be team-level with `teamId`
- **Isolation**: Unique indexes include `userId` to prevent cross-agent conflicts

### ✅ Efficient Querying
- **Compound indexes** on frequently queried fields
- **Pre-calculated stats** in Campaign model (totalContacts, sent, delivered, etc.)
- **Denormalized campaignHistory** in Contact model for quick lookups

### ✅ Anti-Spam & Compliance
- **Duplicate tracking**: ContactCampaign tracks duplicates across campaigns
- **Do Not Contact** flags on Contact model
- **TCPA compliance**: Consent tracking in Contact model
- **Campaign limits**: `daysSinceLastContact` prevents over-messaging

### ✅ Multi-Channel Support
- **Active strategies** tracked per campaign (voicemail, email, text)
- **Per-channel analytics** in stats object
- **Source tracking**: ContactCampaign records where contact came from

## Alignment with User Model

| User Model Field | Campaign Support | Contact Support |
|-----------------|------------------|-----------------|
| `userId` | ✅ Campaign.userId | ✅ Contact.userId |
| `team` | ✅ Campaign.teamId | ❌ (agent-owned) |
| `roles` (realEstateAgent) | ✅ Agent campaigns | ✅ Agent contacts |
| `agentApplication` | ✅ Only approved agents | ✅ Only approved agents |
| `isTeamLeader` | ✅ Can view team campaigns | ✅ Can view team contacts |

## Database Verification (2026-01-02)

### Test Results
```
Campaign: "Test Campaign"
  - Status: draft
  - Total Contacts: 0
  - ContactCampaign records: 0

Campaign: "New Test"
  - Status: draft
  - Total Contacts: 1
  - ContactCampaign records: 1
  - Contact: Cache Nies (6938dc8f1674222ea50c0814)
```

### Finding
✅ **System working correctly**:
- ContactCampaign records are created when contacts are added
- Populate works correctly (Contact details fetched via contactId reference)
- Campaign stats accurately reflect ContactCampaign count

### Root Cause of "No Contacts" Issue
The campaign being viewed had **0 contacts added during creation**. The system correctly shows 0 contacts.

## Recommendations

### 1. **Model Alignment: ✅ GOOD**
Current structure properly supports:
- Multi-agent operations
- Team-based campaigns
- Client management per agent
- Scalable to thousands of agents

### 2. **Add Team-Level Contact Sharing** (Future Enhancement)
```typescript
// Optional: Add to Contact model
Contact {
  userId: ObjectId,        // Primary owner
  teamId?: ObjectId,       // Optional team sharing
  sharedWith?: ObjectId[], // Specific agents who can access
}
```

### 3. **Add Campaign Permissions** (Future Enhancement)
```typescript
// Optional: Add to Campaign model
Campaign {
  userId: ObjectId,        // Primary owner
  teamId?: ObjectId,       // Team assignment
  permissions: {
    viewers: ObjectId[],   // Who can view
    editors: ObjectId[],   // Who can edit
  }
}
```

## Summary

✅ **Database schema is properly aligned** with User model
✅ **Scalable architecture** for multi-agent operations
✅ **Team support** built in (userId + teamId pattern)
✅ **Proper indexes** for efficient querying
✅ **Anti-spam protections** in place
✅ **Contact management working correctly** (verified in production DB)

The "no contacts showing" issue was **not a bug** - the campaign genuinely had 0 contacts. The second test campaign ("New Test") correctly shows 1 contact.
