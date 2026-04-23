# Service Partners System

## Overview

The Service Partner system enables real estate agents to partner with mortgage brokers, title officers, home inspectors, and other real estate service professionals for co-marketing campaigns with RESPA-compliant cost splitting.

## Data Model

### User.servicePartnerProfile

Added to the existing User model (`src/models/User.ts`) alongside the existing `agentProfile`. Users with the `serviceProvider` role can populate this structured profile.

**Partner types:**
- `mortgage_broker` (requires NMLS ID)
- `title_officer`
- `escrow_officer`
- `real_estate_attorney`
- `property_manager`
- `general_contractor`
- `home_inspector`
- `insurance_agent`

**Key fields:**
- `companyName`, `companyLogo` (Cloudinary URL), `website`, `phone`, `bio`
- `licenseNumber`, `licenseState`, `licenseExpiry`
- `nmlsId` - NMLS ID for mortgage brokers
- `certifications[]` - name, issuedBy, year, logoUrl
- `serviceAreas[]` - name + type (city/county/zip/custom)
- `legalDisclaimer` - required marketing disclaimer text
- `insuranceInfo` - for contractors
- `specializations[]` - free-text tags

### Partnership Model

New model at `src/models/Partnership.ts`.

**Schema:**
- `agentId` / `servicePartnerId` - ObjectId refs to User
- `status` - pending | active | suspended | terminated
- `terms` - cost split configuration (equal, percentage, or fixed amounts)
- `respaCompliance` - JMA tracking (document URL, signed date, agreement status)
- `campaigns[]` - linked Campaign ObjectIds
- `billingHistory[]` - per-campaign cost split records with Stripe invoice references
- `initiatedBy` - who sent the request
- `message` - optional request message

**Indexes:**
- `{ agentId: 1, servicePartnerId: 1 }` (unique compound)
- `{ agentId: 1, status: 1 }`
- `{ servicePartnerId: 1, status: 1 }`

## API Routes

### Service Partner Profile

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/service-partner/apply` | User | Apply to become a service partner. Adds `serviceProvider` role and creates `servicePartnerProfile`. Requires `type` and `companyName`. Mortgage brokers must provide `nmlsId`. |
| GET | `/api/service-partner/profile` | Service Partner | Get current user's service partner profile. |
| PUT | `/api/service-partner/profile` | Service Partner | Update profile fields (type, companyName, bio, certifications, serviceAreas, etc.). |

### Service Partner Directory

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/service-partner/directory` | Public | Browse service partners. Supports `?type=`, `?city=`, `?search=`, `?page=`, `?limit=` filters. Returns paginated results with public profile fields only. |

### Partnerships

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/partnerships` | Agent or Service Partner | List all partnerships for current user. Supports `?status=` filter. |
| POST | `/api/partnerships` | Agent or Service Partner | Create partnership request. Body: `{ partnerId, terms?, message? }`. Auto-determines agent vs partner roles. |
| GET | `/api/partnerships/[id]` | Participant | Get partnership details with populated user data. |
| PUT | `/api/partnerships/[id]` | Participant | Update partnership. Supports `action` (accept/reject/suspend/reactivate), `terms` updates, and `respaCompliance` updates. Only the recipient can accept/reject. |
| DELETE | `/api/partnerships/[id]` | Participant | Soft-terminate a partnership (sets status to "terminated"). |

## Auth Pattern

All authenticated routes use:
```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongoose";
import User from "@/models/User";

const session = await getServerSession(authOptions);
const user = await User.findOne({ email: session.user.email });
```

## RESPA Compliance

The Real Estate Settlement Procedures Act (RESPA) requires that co-marketing between agents and settlement service providers be documented with a Joint Marketing Agreement (JMA). The `respaCompliance` field on Partnership tracks:

1. **JMA document** - Cloudinary URL of the signed agreement
2. **JMA signed date** - when the agreement was executed
3. **Terms agreement** - explicit opt-in with timestamp

Cost splitting must reflect actual marketing costs and not be a referral fee disguised as co-marketing.

## Partnership Lifecycle

```
1. Agent or Service Partner creates request  -> status: "pending"
2. Recipient accepts                         -> status: "active"
   OR Recipient rejects                      -> status: "terminated"
3. Either party suspends                     -> status: "suspended"
4. Either party reactivates                  -> status: "active"
5. Either party terminates (DELETE)          -> status: "terminated"
```

## Cost Split Types

- **equal** - 50/50 split (default)
- **percentage** - custom percentage (agentPercentage + partnerPercentage should = 100)
- **fixed** - fixed dollar amounts per party with optional maxMonthlyContribution cap

## Integration Points

- **Campaign model** (`src/models/Campaign.ts`) - Partnerships link to campaigns via `campaigns[]` array
- **Stripe** - Billing history entries can reference `stripeInvoiceId` for payment tracking
- **User roles** - `serviceProvider` role gate; `realEstateAgent` for agent side
