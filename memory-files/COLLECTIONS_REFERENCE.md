# Collections Reference Guide

**Version:** 2.0
**Last Updated:** 2025-01-23
**Database:** MongoDB (`jpsrealtor`)

---

## Quick Reference

| Collection | Documents | Owner | Purpose |
|------------|-----------|-------|---------|
| `users` | ~500 | PayloadCMS | User accounts & auth |
| `listings` | 11,592 | Frontend | GPS MLS listings |
| `crmlsListings` | 20,406 | Frontend | CRMLS MLS listings |
| `cities` | ~50 | PayloadCMS | City entities |
| `neighborhoods` | ~200 | PayloadCMS | Subdivision entities |
| `schools` | ~300 | PayloadCMS | School data |
| `blogPosts` | ~50 | PayloadCMS | Blog content |
| `contacts` | ~1,000 | PayloadCMS | Contact submissions |
| `media` | ~500 | PayloadCMS | File uploads |
| `chatMessages` | ~10,000 | Frontend | AI chat history |
| `swipeReviewSessions` | ~1,000 | Frontend | Swipe analytics |

---

## PayloadCMS Collections

### Users
**API**: `GET /api/users`
**Fields**: email, password, role, subscription, profile
**Access**: Create (public), Read/Update (self/admin), Delete (admin)

### Cities
**API**: `GET /api/cities`
**Fields**: name, slug, coordinates, description, seoMetadata
**Access**: Read (public), Write (admin)

### Neighborhoods
**API**: `GET /api/neighborhoods`
**Fields**: name, slug, city (ref), boundary, statistics, schools (ref)
**Access**: Read (public), Write (admin/agent)

### Schools
**API**: `GET /api/schools`
**Fields**: name, type, district, ratings, demographics
**Access**: Read (public), Write (admin)

### BlogPosts
**API**: `GET /api/blogPosts`
**Fields**: title, slug, content (Lexical), author (ref), status
**Access**: Read (public published), Write (admin/agent)

### Contacts
**API**: `GET /api/contacts`
**Fields**: name, email, phone, message, source, status
**Access**: Create (public), Read/Update (admin/assigned agent)

### Media
**API**: `GET /api/media`
**Fields**: filename, mimeType, url, alt
**Access**: Read (public), Create (admin/agent), Delete (admin)

---

## Frontend Collections

### Listings (GPS MLS)
**Model**: `src/models/listings.ts`
**Key Fields**: ListingId, City, SubdivisionName, ListPrice, BedroomsTotal, location (GeoJSON)
**Indexes**: ListingId (unique), City, SubdivisionName, ListingStatus, location (2dsphere)

### CRMLS Listings
**Model**: `src/models/crmlsListings.ts`
**Same schema as GPS listings**, with `MLSSource: "CRMLS"` field

### Chat Messages
**Model**: `src/models/chatMessages.ts`
**Key Fields**: conversationId, userId, role, content, listingIds, timestamp
**Indexes**: conversationId, userId, timestamp (desc)

### Swipe Review Sessions
**Model**: `src/models/swipeReviewSessions.ts`
**Key Fields**: batchId, userId, visibleListings, swipeActions, analytics
**Indexes**: batchId (unique), userId, startedAt (desc)

---

## Cross-References

- **Database Architecture**: See `DATABASE_ARCHITECTURE.md`
- **Backend Architecture**: See `BACKEND_ARCHITECTURE.md`
- **Frontend Architecture**: See `FRONTEND_ARCHITECTURE.md`
