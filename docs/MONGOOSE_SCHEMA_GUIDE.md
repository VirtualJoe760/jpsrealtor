# Mongoose Schema & Data Persistence Guide

**Created:** April 29, 2026
**Status:** Active — read this before creating or modifying any model

---

## Why This Document Exists

We lost data multiple times because of a Mongoose behavior called **strict mode**. When strict mode is enabled (the default), any field you set on a document that is NOT defined in the schema is **silently discarded** on save. No error is thrown, no warning is logged — the save appears successful but the data never reaches the database.

This caused:
- Agent branding settings (logos, fonts, theme) appearing to save but being empty on reload
- Photo uploads that "worked" but disappeared after navigation
- Fields that existed in the TypeScript interface but never persisted

---

## The Rule

**Every field in the TypeScript interface MUST have a corresponding field in the Mongoose schema.**

This applies to:
- Top-level fields
- Nested object fields (e.g., `agentProfile.brokerLogo`)
- Array item fields (e.g., `likedListings[].county`)
- Deeply nested fields (e.g., `agentProfile.socialMedia.facebook`)

---

## How To Verify

### When adding a field:

```
1. Add to interface (IModelName)     → TypeScript knows about it
2. Add to schema (ModelNameSchema)   → Mongoose will persist it
3. Add to API response (if GET)      → Frontend can read it
4. Add to API handler (if PUT/POST)  → Frontend can write it
5. Run npm run build                 → Catches type mismatches
```

### When auditing an existing model:

Search for fields in the interface that don't appear in the schema:

```bash
# List interface fields
grep -n "?:" src/models/User.ts | head -50

# List schema fields
grep -n ": String\|: Number\|: Boolean\|: Date\|Schema.Types" src/models/User.ts | head -50

# Compare — any interface field not in the schema is a bug
```

Or use the full data chain check:
```
DB document → Model schema → Interface → API route → UI component
     ↑              ↑            ↑           ↑            ↑
  Data stored?  Field defined? Type exists? Returned?  Displayed?
```

---

## Common Patterns

### Simple field
```typescript
// Interface
export interface IUser extends Document {
  phone?: string;
}

// Schema
const UserSchema = new Schema({
  phone: String,
});
```

### Nested object
```typescript
// Interface
export interface IUser extends Document {
  agentProfile?: {
    brokerLogo?: string;
    fontFamily?: string;
  };
}

// Schema — define each nested field
const UserSchema = new Schema({
  agentProfile: {
    brokerLogo: String,
    fontFamily: String,
  },
});
```

### Array of objects
```typescript
// Interface
export interface IUser extends Document {
  likedListings: Array<{
    listingKey: string;
    county?: string;
    viewDuration?: number;
  }>;
}

// Schema — define each array item field
const UserSchema = new Schema({
  likedListings: [{
    listingKey: { type: String, required: true },
    county: String,
    viewDuration: Number,
  }],
});
```

### Enum field
```typescript
// Interface
type Status = "active" | "cancelled" | "past_due";

// Schema — enum must match exactly
status: {
  type: String,
  enum: ["active", "cancelled", "past_due"],
  default: "active",
}
```

---

## Index Rules

Only define an index in **one place**:

```typescript
// Option A: On the field (preferred for simple indexes)
email: { type: String, unique: true, index: true }

// Option B: Separate Schema.index() call (for compound indexes)
UserSchema.index({ userId: 1, createdAt: -1 });

// NEVER BOTH — causes "Duplicate schema index" warnings
```

---

## Debug Checklist

If data isn't persisting after save:

1. **Check the schema** — is the field defined?
2. **Check strict mode** — is the schema using `{ strict: false }`? (We don't — we use default strict)
3. **Check `markModified()`** — for nested object updates, call `doc.markModified('path')` before save
4. **Check the API handler** — is it accepting the field in the PUT body?
5. **Check the save call** — `validateModifiedOnly: true` may skip some validations
6. **Check the logs** — the profile API logs all changes; look for your field in the merge output

---

## Incident History

| Date | Issue | Root Cause | Fix |
|------|-------|-----------|-----|
| 2026-04-28 | Agent logos, fonts, theme not saving | 9 agentProfile fields in interface but not schema | Added to schema |
| 2026-04-28 | Liked listing analytics data lost | 5 likedListings fields + 3 analytics fields missing from schema | Added to schema |
| 2026-04-28 | ImageUploadField overwrote entire agentProfile | fieldPath="agentProfile" sent URL string as the profile object | Fixed fieldPath to use full dot-notation |
| 2026-04-23 | Birthday not persisting | Empty string "" overwrote saved Date on profile save | Added empty string guard |
| 2026-04-23 | cancellationReason build failure | Field in schema but not in interface | Added to interface |

---

## Model File Reference

See `src/models/README.md` for the complete model inventory and quick-reference checklist.
