# Integration Notes

**Version:** 2.0
**Last Updated:** 2025-01-23
**Project:** ChatRealty / JPSRealtor

---

## External Service Integrations

### 1. Spark API (MLS Data)
**Purpose**: GPS MLS listing data
**Endpoint**: Custom MLS aggregator
**Authentication**: API key
**Data Sync**: Daily batch updates
**Collections**: `listings` (GPS), `crmlsListings` (CRMLS)

---

### 2. Groq AI (Conversational Search)
**Purpose**: AI-powered chat interface
**Model**: `llama-3.1-70b-versatile`
**SDK**: `groq-sdk` 0.8.0
**Rate Limits**: Based on API key tier
**Features**: Function calling, streaming responses

**Integration** (`src/lib/groq.ts`):
```typescript
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const stream = await groq.chat.completions.create({
  model: 'llama-3.1-70b-versatile',
  messages: [...],
  stream: true,
  tools: [/* location_match, listing_search */]
});
```

---

### 3. Cloudinary (Image CDN)
**Purpose**: Image optimization and delivery
**Plan**: Free tier
**Features**: Auto-format, responsive images, transformations

**Integration**:
```typescript
const optimizedUrl = listing.photos[0].replace(
  '/upload/',
  '/upload/w_800,h_600,c_fill,f_auto,q_auto/'
);
```

---

### 4. OpenCage (Geocoding)
**Purpose**: Address → coordinates conversion
**Plan**: Free tier (2,500 requests/day)

---

### 5. Stripe (Payments - Future)
**Purpose**: Subscription billing
**Plan**: TBD
**Integration Points**: Webhook for subscription events

---

## Internal Service Integration

### Frontend ↔ PayloadCMS

**Pattern 1**: REST API calls
```typescript
const response = await fetch('https://cms.chatrealty.io/api/users/me', {
  credentials: 'include'
});
```

**Pattern 2**: Direct MongoDB queries (performance-critical)
```typescript
import Listing from '@/models/listings';
const listings = await Listing.find({ City: 'Palm Desert' }).lean();
```

---

### Frontend ↔ MongoDB

**Connection**: Via `mongoose` client
**File**: `src/lib/mongodb.ts`
**Collections**: Direct access to `listings`, `chatMessages`, `swipeReviewSessions`

---

## API Endpoint Map

### Frontend API Routes
- `/api/chat/stream` - AI chat streaming
- `/api/chat/match-location` - Location NLP parsing
- `/api/mls-listings` - Listing search
- `/api/mls-listings/[id]` - Single listing
- `/api/subdivisions/[slug]/listings` - Subdivision listings
- `/api/auth/google` - Google OAuth initiation
- `/api/auth/google/callback` - OAuth callback

### PayloadCMS API Routes
- `/api/users/login` - User authentication
- `/api/users/me` - Current user
- `/api/users` - User CRUD
- `/api/cities` - City entities
- `/api/neighborhoods` - Subdivision entities
- `/api/schools` - School data
- `/api/blogPosts` - Blog content
- `/api/contacts` - Contact submissions

---

## Webhook Endpoints (Future)

### Stripe Webhooks
**Endpoint**: `/api/webhooks/stripe`
**Events**: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`

### MLS Data Webhooks
**Endpoint**: `/api/webhooks/mls`
**Purpose**: Real-time listing updates from Spark API

---

## Cross-References

- **Frontend Architecture**: See `FRONTEND_ARCHITECTURE.md`
- **Backend Architecture**: See `BACKEND_ARCHITECTURE.md`
- **Auth Architecture**: See `AUTH_ARCHITECTURE.md`
