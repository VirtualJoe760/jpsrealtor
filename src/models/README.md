# Models — Mongoose Schema Guide

## The #1 Rule: Interface AND Schema Must Match

Mongoose uses **strict mode by default**. Any field in your TypeScript interface that is NOT in the schema definition will be **silently dropped on save**. No error, no warning — the data just disappears.

### The Problem

```typescript
// Interface says this field exists
export interface IUser extends Document {
  brokerLogo?: string;  // ✅ TypeScript is happy
}

// But schema doesn't define it
const UserSchema = new Schema({
  // brokerLogo is NOT here  ❌ Mongoose silently drops it
});

// This save APPEARS to work but data is lost
user.brokerLogo = "https://cloudinary.com/logo.png";
await user.save();  // ✅ No error thrown
// user.brokerLogo is now undefined in the DB
```

### The Fix

**Every field in the interface MUST have a matching field in the schema.**

```typescript
// Interface
export interface IUser extends Document {
  brokerLogo?: string;
}

// Schema — MUST match
const UserSchema = new Schema({
  brokerLogo: String,  // ✅ Now it persists
});
```

## Checklist: Adding a New Field

1. Add the field to the **TypeScript interface** (e.g., `IUser`)
2. Add the field to the **Mongoose schema** (e.g., `UserSchema`)
3. If the field has an index, add it in **one place only** (either `index: true` in the field definition OR `Schema.index()` — never both)
4. If the field is nested (e.g., `agentProfile.newField`), add it inside the nested schema object
5. Run `npm run build` to verify (not just `tsc --noEmit`)

## Checklist: Adding a New Model

1. Define the TypeScript interface (`IModelName extends Document`)
2. Define the Mongoose schema with **every field from the interface**
3. Add indexes — use `index: true` on the field OR `Schema.index()`, not both
4. Export the model with the hot-reload pattern:
   ```typescript
   export default (mongoose.models.ModelName ||
     mongoose.model<IModelName>("ModelName", ModelNameSchema)) as Model<IModelName>;
   ```
5. Verify with `npm run build`

## Common Mistakes

### 1. Field in interface but not schema
**Result:** Data silently dropped on save.
**Fix:** Add to schema.

### 2. Duplicate indexes
**Result:** Mongoose warning: `Duplicate schema index found`
**Fix:** Use `index: true` on the field definition OR `Schema.index()` — not both.
```typescript
// BAD — duplicate index
name: { type: String, unique: true },  // Creates index
Schema.index({ name: 1 }, { unique: true });  // Creates ANOTHER index

// GOOD — one definition only
name: { type: String, unique: true },  // Just this
```

### 3. Enum mismatch
**Result:** Validation error on save.
**Fix:** Keep enum values identical between interface type and schema enum array.
```typescript
// Interface
type Tier = "free" | "beginner" | "experienced" | "topagent";

// Schema — MUST match exactly
tier: { type: String, enum: ["free", "beginner", "experienced", "topagent"] }
```

### 4. Nested object not using Schema.Types.Mixed
**Result:** Nested updates may not persist.
**Fix:** Use `markModified('path')` after updating nested objects, or define the nested schema explicitly.

## Model Files

| Model | Collection | Purpose |
|-------|-----------|---------|
| User.ts | users | Users with roles, profiles, subscriptions |
| Contact.ts | contacts | CRM contacts |
| Campaign.ts | campaigns | Marketing campaigns |
| ContactCampaign.ts | contactcampaigns | Campaign-contact junction |
| AgentSubscription.ts | agentsubscriptions | Agent subscription tiers |
| PointsLedger.ts | pointsledgers | Credit balance and transactions |
| Partnership.ts | partnerships | Agent-partner relationships |
| PlatformConfig.ts | platform_config | Platform homepage config |
| Article.ts | articles | Blog/CMS articles |
| DomainMapping.ts | domain_mappings | Community domain mappings |
| Team.ts | teams | Agent teams |
| Label.ts | labels | Contact labels |
| ImportBatch.ts | importbatches | Contact import tracking |
