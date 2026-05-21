# Agent Application System
**Two-Phase Agent Onboarding with Identity Verification**
**Created:** December 23, 2025

---

## 📋 OVERVIEW

JPSRealtor.com implements a two-phase agent application system to efficiently onboard real estate agents while maintaining security and compliance.

### User Hierarchy

```
admin (josephsardella@gmail.com)
  └── teamLeader (can have sub-teams)
      └── realEstateAgent (licensed agent on a team)
          └── client (signed buyer/seller agreement)
              └── endUser (registered but no agreements)
                  └── anonymous (no account)
```

### Application Phases

**Phase 1: Agent Inquiry (FREE)**
- Applicant submits basic information
- Text-only fields (license numbers, experience, etc.)
- Admin reviews and approves/rejects
- **Cost:** $0

**Phase 2: Identity Verification (After Phase 1 Approval)**
- Stripe Identity verification
- Government ID + liveness check
- MLS credential verification
- **Cost:** ~$1.50-3 per verification

---

## 🏗️ ARCHITECTURE

### Application Workflow

```
1. User clicks "Become an Agent" in dashboard
   ↓
2. PHASE 1: Agent Inquiry Form
   - License number & state
   - MLS ID & association
   - Brokerage information
   - Years of experience
   - Team preference (join existing or default)
   - Why they want to join
   ↓
3. Submit Phase 1
   - Email sent to applicant: "Application received"
   - Email sent to applications@jpsrealtor.com: "New application"
   - Saved to User model with status: "inquiry_pending"
   ↓
4. Admin Reviews Phase 1 (in admin dashboard)
   - Option A: Reject → Email sent, application closed
   - Option B: Approve → Triggers Phase 2
   ↓
5. PHASE 2: Identity Verification (if approved)
   - Email sent to applicant: "Please complete identity verification"
   - Link to Stripe Identity verification
   - User completes ID upload + selfie
   ↓
6. Stripe Identity Returns Result
   - Success: Application status → "verification_complete"
   - Failure: Applicant notified, can retry
   ↓
7. Final Admin Approval
   - Review identity verification results
   - Option A: Approve → Add "realEstateAgent" role, assign to team
   - Option B: Reject → Email sent, application closed
   ↓
8. Agent Onboarded ✅
   - Email: "Welcome to the team!"
   - Agent dashboard unlocked
   - Assigned to team (visible in team hierarchy)
```

---

## 💾 DATA MODELS

### User Model Updates

```typescript
// Add to existing User model (src/models/User.ts)

export interface IUser extends Document {
  // ... existing fields ...

  // CLIENT TYPE (for users who signed agreements)
  clientType?: "buyer" | "seller" | "both";
  buyerAgreement?: {
    signed: boolean;
    signedAt: Date;
    documentUrl: string; // S3 URL
    expiresAt: Date;
  };
  sellerAgreement?: {
    signed: boolean;
    signedAt: Date;
    documentUrl: string; // S3 URL
    expiresAt: Date;
  };

  // AGENT APPLICATION
  agentApplication?: {
    // Phase 1: Inquiry
    phase: "inquiry_pending" | "inquiry_approved" | "inquiry_rejected"
         | "verification_pending" | "verification_complete" | "verification_failed"
         | "final_approved" | "final_rejected";

    submittedAt: Date;

    // Basic Info
    licenseNumber: string;
    licenseState: string;
    mlsId: string;
    mlsAssociation: string;
    brokerageName: string;
    brokerageAddress: string;
    yearsExperience: number;

    // Team Preference
    preferredTeam?: mongoose.Types.ObjectId; // Reference to Team
    // If null, defaults to admin's team

    // Motivation
    whyJoin: string;
    references?: string; // Optional references

    // Phase 1 Review
    phase1ReviewedBy?: mongoose.Types.ObjectId;
    phase1ReviewedAt?: Date;
    phase1ReviewNotes?: string;

    // Phase 2: Identity Verification (Stripe)
    stripeIdentitySessionId?: string;
    stripeIdentityVerificationId?: string;
    identityVerified: boolean;
    identityVerifiedAt?: Date;
    identityStatus?: "pending" | "verified" | "failed" | "requires_input";

    // Final Review
    finalReviewedBy?: mongoose.Types.ObjectId;
    finalReviewedAt?: Date;
    finalReviewNotes?: string;
    finalApprovedAt?: Date;

    // Assignment
    assignedTeam?: mongoose.Types.ObjectId;
  };

  // TEAM ASSIGNMENT (for approved agents)
  team?: mongoose.Types.ObjectId; // Reference to Team
  isTeamLeader: boolean;
}
```

### Team Model (NEW)

```typescript
// src/models/Team.ts

import mongoose, { Schema, Document } from "mongoose";

export interface ITeam extends Document {
  _id: mongoose.Types.ObjectId;

  // Team Info
  name: string;
  description?: string;
  logo?: string;

  // Hierarchy
  teamLeader: mongoose.Types.ObjectId; // Reference to User
  parentTeam?: mongoose.Types.ObjectId; // For multi-level hierarchy

  // Members
  agents: mongoose.Types.ObjectId[]; // References to Users

  // Pending Applications
  pendingApplications: mongoose.Types.ObjectId[]; // References to Users

  // Settings
  isActive: boolean;
  autoApprove: boolean; // Auto-approve agents to this team

  // Metrics
  totalAgents: number;
  totalClients: number;

  // Metadata
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TeamSchema = new Schema<ITeam>(
  {
    name: { type: String, required: true },
    description: String,
    logo: String,

    teamLeader: { type: Schema.Types.ObjectId, ref: "User", required: true },
    parentTeam: { type: Schema.Types.ObjectId, ref: "Team" },

    agents: [{ type: Schema.Types.ObjectId, ref: "User" }],
    pendingApplications: [{ type: Schema.Types.ObjectId, ref: "User" }],

    isActive: { type: Boolean, default: true },
    autoApprove: { type: Boolean, default: false },

    totalAgents: { type: Number, default: 0 },
    totalClients: { type: Number, default: 0 },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true,
    collection: "teams",
  }
);

// Indexes
TeamSchema.index({ teamLeader: 1 });
TeamSchema.index({ parentTeam: 1 });
TeamSchema.index({ isActive: 1 });

const Team = mongoose.models.Team || mongoose.model<ITeam>("Team", TeamSchema);

export default Team;
```

---

## 📧 EMAIL FLOWS

### Phase 1 Emails

**1. To Applicant (Confirmation)**
```
Subject: Agent Application Received - JPSRealtor.com

Hi [Name],

Thank you for your interest in joining our team at JPSRealtor.com!

We've received your agent application and our team is reviewing it now.
Here's what you submitted:

License: [State] - [Number]
MLS: [Association] - [ID]
Brokerage: [Name]

We'll review your application within 2-3 business days and reach out with next steps.

Best regards,
The JPSRealtor Team

---
Questions? Reply to this email or contact us at support@jpsrealtor.com
```

**2. To Admin (New Application)**
```
To: applications@jpsrealtor.com
Subject: New Agent Application - [Name]

New agent application received:

Name: [Name]
Email: [Email]
Phone: [Phone]

License: [State] - [Number]
MLS: [Association] - [ID]
Brokerage: [Name]
Experience: [Years] years

Why they want to join:
[WhyJoin text]

👉 Review application: https://jpsrealtor.com/admin/applications/[id]
```

**3. To Applicant (Phase 1 Rejected)**
```
Subject: Agent Application Update - JPSRealtor.com

Hi [Name],

Thank you for your interest in joining JPSRealtor.com.

After reviewing your application, we've decided not to move forward at this time.

[Admin notes, if any]

We appreciate your interest and wish you the best in your real estate career.

Best regards,
The JPSRealtor Team
```

**4. To Applicant (Phase 1 Approved - Trigger Phase 2)**
```
Subject: Next Step: Verify Your Identity - JPSRealtor.com

Hi [Name],

Great news! Your agent application has been approved for the next step.

To complete your application, we need to verify your identity using Stripe Identity.
This is a secure, quick process that involves:

1. Uploading a photo of your government-issued ID
2. Taking a selfie for verification

This helps us ensure the security of our platform and comply with real estate regulations.

👉 Complete verification now: [Stripe Identity Link]

This link expires in 7 days. If you have any questions, reply to this email.

Best regards,
The JPSRealtor Team
```

### Phase 2 Emails

**5. To Applicant (Identity Verified)**
```
Subject: Identity Verified - Final Review - JPSRealtor.com

Hi [Name],

Your identity has been successfully verified!

Your application is now in final review. We'll notify you of the decision within 1-2 business days.

Best regards,
The JPSRealtor Team
```

**6. To Applicant (Identity Verification Failed)**
```
Subject: Identity Verification Issue - JPSRealtor.com

Hi [Name],

We encountered an issue verifying your identity. This can happen for several reasons:
- Photo quality was too low
- ID information didn't match
- Technical issue

You can retry the verification process here: [New Stripe Link]

If you continue to have issues, please contact us at support@jpsrealtor.com.

Best regards,
The JPSRealtor Team
```

**7. To Applicant (Final Approval - Welcome!)**
```
Subject: Welcome to JPSRealtor.com! 🎉

Hi [Name],

Congratulations! Your agent application has been approved.

You're now officially part of the JPSRealtor.com team!

Team: [Team Name]
Team Leader: [Team Leader Name]

What's next:
1. Log in to your dashboard: https://jpsrealtor.com/dashboard
2. Complete your agent profile
3. Review your team resources
4. Start connecting with clients!

Need help getting started? Check out our agent onboarding guide:
https://jpsrealtor.com/resources/agent-onboarding

Welcome aboard!

Best regards,
[Team Leader Name]
The JPSRealtor Team
```

---

## 🎨 USER INTERFACE

### Dashboard Link

**For endUser:**
```tsx
<Card>
  <h3>Become a Real Estate Agent</h3>
  <p>Join our team and grow your real estate career</p>
  <Button href="/dashboard/apply-agent">Apply Now</Button>
</Card>
```

### Phase 1: Application Form

**Route:** `/dashboard/apply-agent`

**Form Fields:**
```tsx
<form>
  {/* Personal Info (pre-filled from user profile) */}
  <Input label="Full Name" value={user.name} disabled />
  <Input label="Email" value={user.email} disabled />
  <Input label="Phone" value={user.phone} required />

  {/* License Info */}
  <Select label="License State" required>
    <option>California</option>
    <option>Nevada</option>
    {/* All 50 states */}
  </Select>
  <Input label="License Number" required />

  {/* MLS Info */}
  <Input label="MLS Association" placeholder="e.g., CRMLS, GPS" required />
  <Input label="MLS ID" required />

  {/* Brokerage */}
  <Input label="Brokerage Name" required />
  <Input label="Brokerage Address" required />

  {/* Experience */}
  <Select label="Years of Experience" required>
    <option value="0">Less than 1 year</option>
    <option value="1">1-2 years</option>
    <option value="3">3-5 years</option>
    <option value="6">6-10 years</option>
    <option value="11">10+ years</option>
  </Select>

  {/* Team Preference */}
  <Select label="Team Preference">
    <option value="">Join default team (Joseph Sardella)</option>
    {/* List existing teams if applicable */}
  </Select>

  {/* Motivation */}
  <Textarea
    label="Why do you want to join JPSRealtor.com?"
    placeholder="Tell us about your goals and why you'd be a great fit..."
    minLength={100}
    required
  />

  <Input
    label="References (optional)"
    placeholder="Names and contact info for professional references"
  />

  {/* Consent */}
  <Checkbox required>
    I confirm that all information provided is accurate and that I hold
    a valid real estate license in good standing.
  </Checkbox>

  <Button type="submit">Submit Application</Button>
</form>
```

### Admin Dashboard - Application Review

**Route:** `/admin/applications`

**List View:**
```tsx
<Table>
  <thead>
    <tr>
      <th>Name</th>
      <th>License</th>
      <th>MLS</th>
      <th>Experience</th>
      <th>Status</th>
      <th>Submitted</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    {applications.map(app => (
      <tr>
        <td>{app.user.name}</td>
        <td>{app.licenseState} - {app.licenseNumber}</td>
        <td>{app.mlsAssociation}</td>
        <td>{app.yearsExperience} years</td>
        <td><Badge>{app.phase}</Badge></td>
        <td>{formatDate(app.submittedAt)}</td>
        <td>
          <Button href={`/admin/applications/${app._id}`}>Review</Button>
        </td>
      </tr>
    ))}
  </tbody>
</Table>
```

**Detail View:**
```tsx
<div>
  <h2>Agent Application - {applicant.name}</h2>

  <Section title="Applicant Info">
    <Field label="Name" value={applicant.name} />
    <Field label="Email" value={applicant.email} />
    <Field label="Phone" value={applicant.phone} />
  </Section>

  <Section title="License Information">
    <Field label="License State" value={app.licenseState} />
    <Field label="License Number" value={app.licenseNumber} />
    <Field label="MLS Association" value={app.mlsAssociation} />
    <Field label="MLS ID" value={app.mlsId} />
  </Section>

  <Section title="Brokerage">
    <Field label="Name" value={app.brokerageName} />
    <Field label="Address" value={app.brokerageAddress} />
  </Section>

  <Section title="Experience & Motivation">
    <Field label="Years of Experience" value={app.yearsExperience} />
    <Field label="Why join?" value={app.whyJoin} multiline />
    <Field label="References" value={app.references} multiline />
  </Section>

  {/* Phase 1 Review */}
  {app.phase === "inquiry_pending" && (
    <Section title="Phase 1 Review">
      <Textarea label="Notes (optional)" />
      <ButtonGroup>
        <Button variant="danger" onClick={rejectPhase1}>
          Reject Application
        </Button>
        <Button variant="success" onClick={approvePhase1}>
          Approve & Send to Identity Verification
        </Button>
      </ButtonGroup>
    </Section>
  )}

  {/* Phase 2 Status */}
  {app.phase.startsWith("verification") && (
    <Section title="Identity Verification">
      <Field label="Status" value={app.identityStatus} />
      {app.identityVerified && (
        <Field label="Verified At" value={formatDate(app.identityVerifiedAt)} />
      )}
      <Link href={`https://dashboard.stripe.com/identity/${app.stripeIdentityVerificationId}`}>
        View in Stripe Dashboard →
      </Link>
    </Section>
  )}

  {/* Final Approval */}
  {app.phase === "verification_complete" && (
    <Section title="Final Approval">
      <Select label="Assign to Team">
        {teams.map(team => (
          <option value={team._id}>{team.name}</option>
        ))}
      </Select>
      <Textarea label="Welcome message (optional)" />
      <ButtonGroup>
        <Button variant="danger" onClick={rejectFinal}>
          Reject Application
        </Button>
        <Button variant="success" onClick={approveFinal}>
          Approve & Onboard Agent
        </Button>
      </ButtonGroup>
    </Section>
  )}
</div>
```

---

## 🔌 API ROUTES

### Phase 1: Agent Inquiry

**POST /api/agent/apply**
- Validates user is authenticated
- Checks if user already has pending/approved application
- Saves application to User model
- Sends confirmation email to applicant
- Sends notification email to applications@jpsrealtor.com
- Returns: `{ success: true, applicationId: string }`

**GET /api/agent/application**
- Returns current user's application status (if exists)
- Returns: `{ application: IAgentApplication | null }`

### Admin: Phase 1 Review

**GET /api/admin/applications**
- Requires admin role
- Returns list of all applications
- Filter by phase: `?phase=inquiry_pending`
- Returns: `{ applications: IAgentApplication[] }`

**GET /api/admin/applications/[id]**
- Requires admin role
- Returns full application details
- Returns: `{ application: IAgentApplication, user: IUser }`

**POST /api/admin/applications/[id]/approve-phase1**
- Requires admin role
- Creates Stripe Identity verification session
- Updates application phase to "verification_pending"
- Sends email with verification link to applicant
- Returns: `{ success: true, stripeSessionId: string }`

**POST /api/admin/applications/[id]/reject-phase1**
- Requires admin role
- Updates application phase to "inquiry_rejected"
- Sends rejection email to applicant
- Returns: `{ success: true }`

### Phase 2: Identity Verification

**GET /api/agent/verify-identity**
- Returns Stripe Identity session URL for current user
- Checks if user has approved Phase 1 application
- Returns: `{ sessionUrl: string, sessionId: string }`

**POST /api/webhooks/stripe-identity**
- Webhook endpoint for Stripe Identity events
- Event: `identity.verification_session.verified`
  - Updates application phase to "verification_complete"
  - Sends verification success email
- Event: `identity.verification_session.requires_input`
  - Sends retry email to applicant
- Returns: `{ received: true }`

### Admin: Final Approval

**POST /api/admin/applications/[id]/approve-final**
- Requires admin role
- Adds "realEstateAgent" role to user
- Assigns user to specified team
- Updates application phase to "final_approved"
- Sends welcome email to new agent
- Returns: `{ success: true }`

**POST /api/admin/applications/[id]/reject-final**
- Requires admin role
- Updates application phase to "final_rejected"
- Sends rejection email
- Returns: `{ success: true }`

---

## 🔐 STRIPE IDENTITY INTEGRATION

### Setup

```bash
npm install stripe
```

**Environment Variables:**
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_IDENTITY_WEBHOOK_SECRET=whsec_...
```

### Creating Verification Session

```typescript
// src/lib/stripe.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function createIdentityVerificationSession(userId: string, email: string) {
  const session = await stripe.identity.verificationSessions.create({
    type: 'document',
    metadata: {
      userId,
    },
    options: {
      document: {
        require_id_number: true,
        require_live_capture: true,
        require_matching_selfie: true,
      },
    },
    return_url: `${process.env.NEXTAUTH_URL}/dashboard/agent-application?verified=true`,
  });

  return session;
}
```

### Webhook Handler

```typescript
// src/app/api/webhooks/stripe-identity/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import { sendEmail } from '@/lib/email-resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_IDENTITY_WEBHOOK_SECRET!
    );
  } catch (err) {
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  await dbConnect();

  switch (event.type) {
    case 'identity.verification_session.verified': {
      const session = event.data.object as Stripe.Identity.VerificationSession;
      const userId = session.metadata?.userId;

      if (userId) {
        await User.findByIdAndUpdate(userId, {
          'agentApplication.phase': 'verification_complete',
          'agentApplication.identityVerified': true,
          'agentApplication.identityVerifiedAt': new Date(),
          'agentApplication.identityStatus': 'verified',
          'agentApplication.stripeIdentityVerificationId': session.id,
        });

        // Send success email
        const user = await User.findById(userId);
        if (user) {
          await sendEmail({
            to: user.email,
            subject: 'Identity Verified - Final Review',
            html: `Hi ${user.name}, your identity has been verified...`,
          });
        }
      }
      break;
    }

    case 'identity.verification_session.requires_input': {
      const session = event.data.object as Stripe.Identity.VerificationSession;
      const userId = session.metadata?.userId;

      if (userId) {
        await User.findByIdAndUpdate(userId, {
          'agentApplication.identityStatus': 'requires_input',
        });

        // Send retry email
        const user = await User.findById(userId);
        if (user) {
          await sendEmail({
            to: user.email,
            subject: 'Identity Verification Issue',
            html: `Hi ${user.name}, we need you to retry...`,
          });
        }
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
```

---

## 📊 ADMIN METRICS

### Application Analytics

Track in admin dashboard:
- Total applications received
- Phase 1 approval rate
- Phase 2 completion rate
- Final approval rate
- Average time to approval
- Applications by state
- Applications by MLS association

---

## 🚀 IMPLEMENTATION CHECKLIST

### Phase 1 (No Documents)
- [ ] Update User model with agentApplication fields
- [ ] Create Team model
- [ ] Build agent application form UI
- [ ] Create POST /api/agent/apply route
- [ ] Set up Resend email templates
- [ ] Build admin applications list page
- [ ] Build admin application detail/review page
- [ ] Create approve/reject Phase 1 API routes
- [ ] Test email flows

### Phase 2 (Stripe Identity)
- [ ] Set up Stripe account
- [ ] Install Stripe SDK
- [ ] Create Stripe Identity verification session endpoint
- [ ] Build verification redirect flow
- [ ] Set up Stripe webhook endpoint
- [ ] Configure webhook in Stripe dashboard
- [ ] Build final approval workflow
- [ ] Test end-to-end verification flow

### Team Management
- [ ] Create default team for admin
- [ ] Build team assignment logic
- [ ] Create team hierarchy views
- [ ] Build team leader dashboard

---

**Next Steps:** Start with User model and Team model updates?
