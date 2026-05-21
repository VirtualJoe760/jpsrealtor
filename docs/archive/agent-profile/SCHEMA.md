# Agent Profile — MongoDB Schema

The agent profile lives **inside the `User` document** as a subdocument named
`agentProfile`. The User itself is in the `users` collection.

> Source of truth: `src/models/User.ts`. If anything in this doc disagrees with
> the model file, the model file wins — update this doc.

## Top-level User fields used by the public route

These are read alongside `agentProfile` for legacy fallback purposes:

| Field | Type | Notes |
|---|---|---|
| `User.name` | `string` | Display name. |
| `User.email` | `string` | Used to look up the primary agent. |
| `User.phone` | `string?` | Legacy top-level phone. Falls back to `agentProfile.cellPhone` / `officePhone`. |
| `User.licenseNumber` | `string?` | Legacy. Prefer `agentProfile.licenseNumber`. |
| `User.brokerageName` | `string?` | Legacy. Prefer `agentProfile.brokerageName`. |
| `User.image` | `string?` | NextAuth profile image (separate from the agent headshot — used by the dashboard, not by public pages). |

## `agentProfile` subdocument

```ts
agentProfile?: {
  // === Photos & Media (all Cloudinary URLs) ===
  headshot?: string;            // Transparent PNG headshot. Uploaded via /agent/dashboard.
  heroPhoto?: string;           // Landing page hero background.
  teamPhoto?: string;
  officePhoto?: string;
  galleryPhotos?: string[];
  videoIntro?: string;

  // 4-variant theme backgrounds
  customBackgrounds?: {
    lightDesktop?: string;
    lightMobile?: string;
    darkDesktop?: string;
    darkMobile?: string;
  };

  // === Landing Page Content ===
  headline?: string;            // Main hero headline (e.g. "Your Trusted Real Estate Partner")
  tagline?: string;             // Subheadline
  bio?: string;                 // About-me paragraph
  valuePropositions?: Array<{
    icon: string;               // Icon name (lucide) or URL
    title: string;
    description: string;
  }>;
  testimonials?: Array<{
    clientName: string;
    clientPhoto?: string;
    rating: number;             // 1–5
    text: string;
    date: Date;
    propertyAddress?: string;
  }>;
  stats?: Array<{               // e.g. "Years Experience: 30+"
    label: string;
    value: string;
    icon?: string;
  }>;

  // === Social Media ===
  // Stored NESTED in the DB, but the public route flattens these to
  // top-level keys (instagram, facebook, ...). Always check both shapes.
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
    youtube?: string;
    tiktok?: string;
  };

  // === Business Info ===
  businessHours?: Array<{
    day: string;                // "Monday"
    open: string;               // "9:00 AM"
    close: string;
    closed: boolean;
  }>;
  officeAddress?: string;
  officePhone?: string;
  cellPhone?: string;

  // === Service Areas & Specializations ===
  serviceAreas?: Array<{
    name: string;               // "Indian Wells"
    type: "city" | "county" | "zip" | "custom";
    geoJson?: any;
  }>;
  specializations?: string[];   // ["Luxury Homes", "Golf Communities", ...]
  certifications?: Array<{
    name: string;
    issuedBy: string;
    year: number;
    logoUrl?: string;
  }>;

  // === MLS Data Sources ===
  mlsDataSources?: Array<{
    name: string;               // "CRMLS"
    mlsId: string;
    coverage: { type: "MultiPolygon"; coordinates: any[][]; cities: string[]; counties: string[]; states: string[] };
    listingCount: number;
    lastSyncedAt: Date;
    status: "active" | "inactive" | "pending";
    dataBrokerRights: boolean;
  }>;

  // === Licenses ===
  licenses: Array<{
    state: string;              // "CA"
    licenseNumber: string;
    status: "active" | "inactive" | "expired";
    expiresAt?: Date;
  }>;

  // === Domain & Branding ===
  customDomain?: string;        // "jpsrealtor.com"
  subdomain?: string;           // "joseph"
  brandColors?: {
    primary?: string;           // Hex
    secondary?: string;
    accent?: string;
  };

  // === SEO ===
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
};
```

## Indexes

```ts
UserSchema.index({ "agentProfile.subdomain": 1 });
UserSchema.index({ "agentProfile.customDomain": 1 });
UserSchema.index({ "agentProfile.mlsDataSources.dataBrokerRights": 1 });
```

## Important field-name gotchas

These caused real bugs and are easy to get wrong:

| Looks like | Actually is |
|---|---|
| `agentProfile.brandColor` | `agentProfile.brandColors.primary` (the route exposes it flattened as `brandColor`) |
| `agentProfile.secondaryColor` | `agentProfile.brandColors.secondary` (flattened by the route) |
| `agentProfile.instagram` | `agentProfile.socialMedia.instagram` (flattened by the route) |
| `agentProfile.phone` | `agentProfile.cellPhone` or `agentProfile.officePhone` (the route picks one) |
| `User.image` | NextAuth profile pic, **not** the agent transparent headshot. The headshot lives at `agentProfile.headshot`. |

## Looking up the primary agent

For now, the primary agent is identified by **email**, set in env:

```bash
PRIMARY_AGENT_EMAIL=josephsardella@gmail.com
```

Future plan: look up by `req.headers.host` → `agentProfile.customDomain` or
`agentProfile.subdomain` for full multi-tenancy.
