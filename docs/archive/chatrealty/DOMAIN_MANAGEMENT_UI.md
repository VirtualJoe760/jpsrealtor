# Domain Management UI

## Overview

The Domain Management UI is integrated into the agent settings wizard at the "Domain & SEO" step (`DomainSeoStep.tsx`). It provides agents with a self-service interface to purchase domains, connect existing domains, and configure SEO metadata -- all within the existing settings wizard flow.

## Architecture

### Components

| Component | Path | Purpose |
|-----------|------|---------|
| `DomainSeoStep` | `src/app/agent/settings/components/steps/DomainSeoStep.tsx` | Main step component in the settings wizard |
| `DomainSearchCard` | `src/app/components/settings/DomainSearchCard.tsx` | Reusable domain search + purchase widget |

### API Routes (backend, pre-existing)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/domains/check` | POST | Check domain availability + price |
| `/api/domains/purchase` | POST | Purchase domain via Vercel, connect to project, save to user profile |
| `/api/domains/list` | GET | List all domains attached to the Vercel project |

### Backend Library

`src/lib/vercel-domains.ts` -- Vercel Domains API wrapper providing:
- `checkDomainAvailability(domain)` -- GET /v4/domains/status
- `getDomainPrice(domain)` -- GET /v4/domains/price
- `purchaseDomain(domain)` -- POST /v5/domains/buy
- `addDomainToProject(domain)` -- POST /v10/projects/{id}/domains
- `removeDomainFromProject(domain)` -- DELETE /v10/projects/{id}/domains/{domain}
- `listProjectDomains()` -- GET /v10/projects/{id}/domains

## UI Sections

The DomainSeoStep renders five sections in order:

### 1. Your Domain
Shows the currently connected `customDomain` from the agent profile. Displays a green status badge with a "Visit" link when a domain is active, or a neutral message when no domain is configured.

### 2. Get a Domain
Embeds the `DomainSearchCard` component which provides:
- **Search input** with real-time debounced availability checking (300ms delay)
- **TLD suggestion pills** (`.com`, `.io`, `.realtor`, `.homes`, `.realty`) that append to the base query
- **Availability result** showing green check (available + price) or red X (taken)
- **Purchase flow** with inline confirmation prompt before charging
- **Success state** confirming purchase and automatic connection

On successful purchase, the domain is:
1. Purchased via Vercel Domains API
2. Added to the Vercel project for hosting
3. Saved to `agentProfile.customDomain` in MongoDB
4. Reflected in the UI immediately

### 3. Bring Your Own Domain
For agents who already own a domain:
- Displays CNAME target (`cname.vercel-dns.com`) with a copy-to-clipboard button
- Provides a manual domain input field
- "Verify Connection" button that validates the domain format via the check API
- Success/error feedback inline

### 4. Subdomain
Free subdomain on the ChatRealty platform:
- Input field with `.chatrealty.io` suffix
- Auto-sanitizes to lowercase alphanumeric + hyphens
- Preview of the full URL below the input

### 5. SEO Settings
Standard meta tag configuration:
- **Meta Title** -- max 60 characters with counter
- **Meta Description** -- max 160 characters with counter, amber warning at 150+
- **Meta Keywords** -- comma-separated input, parsed to array on change

## Data Flow

```
User interaction
  |
  v
DomainSeoStep (formData.agentProfile.customDomain / subdomain / meta*)
  |
  |-- DomainSearchCard --> POST /api/domains/check --> Vercel API
  |                    --> POST /api/domains/purchase --> Vercel API + MongoDB
  |
  v
onSave(stepFields) --> PUT /api/user/profile --> MongoDB
```

## Step Props Interface

All step components in the wizard share this interface:

```typescript
interface StepProps {
  formData: any;           // Full user profile data
  updateField: (path: string, value: any) => void;  // Dot-notation updater
  isLight: boolean;        // Theme flag for light/dark styling
  onSave: (stepFields: Record<string, any>) => Promise<void>;  // Save + advance
  isSaving: boolean;       // Loading state for save button
}
```

## Styling

Both components follow the project's dual-theme pattern:
- **Light theme**: White backgrounds, gray borders, blue accent colors
- **Dark theme**: Gray-800/900 backgrounds, gray-700 borders, emerald accent colors
- Input styling matches the standard: `w-full px-4 py-3 rounded-lg border text-sm focus:outline-none focus:ring-2`

## Environment Variables Required

- `VERCEL_API_TOKEN` -- Vercel API bearer token
- `VERCEL_PROJECT_ID` -- The Vercel project ID to attach domains to
