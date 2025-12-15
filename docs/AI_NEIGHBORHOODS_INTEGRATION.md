# AI Chat - Neighborhoods Integration

**Date:** December 14, 2025
**Purpose:** Enable AI chat to reference and link to neighborhood pages

---

## 📍 Overview

The AI chat can now reference California neighborhoods, cities, and counties with direct hyperlinks to dedicated pages. This allows users to ask about specific areas and receive relevant links.

---

## 🔗 API Endpoint

### `/api/neighborhoods/tree`

**Method:** GET
**Response Format:** JSON

Returns the complete California real estate markets hierarchy with URLs for AI reference.

### Response Structure

```json
{
  "success": true,
  "data": {
    "state": "California",
    "totalListings": 79596,
    "url": "/neighborhoods",
    "regions": [
      {
        "name": "Southern California",
        "slug": "southern-california",
        "listings": 45230,
        "url": "/neighborhoods#southern-california",
        "counties": [
          {
            "name": "Riverside County",
            "slug": "riverside-county",
            "listings": 12450,
            "url": "/neighborhoods/riverside-county",
            "cities": [
              {
                "name": "Palm Desert",
                "slug": "palm-desert",
                "listings": 856,
                "url": "/neighborhoods/palm-desert"
              },
              {
                "name": "Palm Springs",
                "slug": "palm-springs",
                "listings": 623,
                "url": "/neighborhoods/palm-springs"
              }
            ]
          }
        ]
      }
    ]
  },
  "meta": {
    "timestamp": "2025-12-14T...",
    "regionsCount": 3,
    "countiesCount": 58,
    "citiesCount": 482
  }
}
```

---

## 💬 AI Chat Usage Examples

### Example 1: User asks about a specific city

**User:** "Tell me about Palm Desert"

**AI Response:**
```
Palm Desert is a beautiful city in Riverside County, Southern California.

🏘️ [View Palm Desert](/neighborhoods/palm-desert)
- Currently 856 active listings
- Part of the Coachella Valley region
- Known for golf resorts and desert living

You can explore all properties, neighborhoods, and community information on the dedicated Palm Desert page.
```

### Example 2: User asks about a county

**User:** "What cities are in Riverside County?"

**AI Response:**
```
Riverside County is in Southern California and has 12,450 active listings across multiple cities:

🏘️ [Riverside County Overview](/neighborhoods/riverside-county)

Top Cities:
- [Palm Desert](/neighborhoods/palm-desert) - 856 listings
- [Palm Springs](/neighborhoods/palm-springs) - 623 listings
- [Indio](/neighborhoods/indio) - 534 listings
- [La Quinta](/neighborhoods/la-quinta) - 445 listings

Click any city to view detailed market data, neighborhoods, and available properties.
```

### Example 3: User asks about regions

**User:** "Show me all California regions"

**AI Response:**
```
California is divided into 3 major real estate regions with 79,596 total active listings:

📍 [Southern California](/neighborhoods#southern-california) - 45,230 listings
- 10 counties including Riverside, San Diego, Orange

📍 [Northern California](/neighborhoods#northern-california) - 28,450 listings
- 8 counties including Sacramento, Alameda, Contra Costa

📍 [Central California](/neighborhoods#central-california) - 5,916 listings
- 6 counties including Fresno, Kern, San Joaquin

[View All Regions](/neighborhoods)
```

### Example 4: User asks about property in specific area

**User:** "Are there homes for sale in Coachella Valley?"

**AI Response:**
```
Yes! The Coachella Valley has excellent inventory. Here are the main cities:

🏘️ Coachella Valley Cities:
- [Palm Desert](/neighborhoods/palm-desert) - 856 homes
- [Palm Springs](/neighborhoods/palm-springs) - 623 homes
- [Indio](/neighborhoods/indio) - 534 homes
- [La Quinta](/neighborhoods/la-quinta) - 445 homes
- [Cathedral City](/neighborhoods/cathedral-city) - 389 homes

Each page shows:
✅ Live property listings with map view
✅ Market statistics (median price, price range)
✅ Neighborhood information
✅ HOA communities

Would you like me to help you search for specific criteria in any of these cities?
```

---

## 🎯 AI Implementation Guidelines

### When to Use Neighborhood Links

**DO use neighborhood links when:**
- User asks about a specific city, county, or region
- User wants to explore areas
- User asks "where should I live?"
- User mentions a location by name
- User asks about market data for an area

**DON'T use neighborhood links when:**
- User is asking about specific property features (beds/baths/price)
- User wants to see listings (use map view instead)
- Question is about general real estate advice
- User is in the middle of a property search flow

### Link Format in Responses

Always use markdown links with descriptive text:

✅ **Good:**
```
[View Palm Desert](/neighborhoods/palm-desert)
[Riverside County Overview](/neighborhoods/riverside-county)
[Explore Southern California](/neighborhoods#southern-california)
```

❌ **Bad:**
```
/neighborhoods/palm-desert (raw URL)
Click here (non-descriptive)
neighborhoods/palm-desert (missing leading slash)
```

### Hierarchy Rules

Always reference the hierarchy when discussing locations:

```
City → County → Region → California
Palm Desert → Riverside County → Southern California → California
```

Example: "Palm Desert is located in Riverside County in Southern California."

---

## 🔄 Data Freshness

- Tree data is generated on-demand from live UnifiedListing collection
- Listing counts are real-time active listings
- No caching - always current data
- Automatically includes new cities as listings are added

---

## 📊 URL Structure Reference

| Level | URL Pattern | Example |
|-------|-------------|---------|
| California | `/neighborhoods` | [All Regions](/neighborhoods) |
| Region | `/neighborhoods#slug` | [Southern California](/neighborhoods#southern-california) |
| County | `/neighborhoods/slug-county` | [Riverside County](/neighborhoods/riverside-county) |
| City | `/neighborhoods/slug` | [Palm Desert](/neighborhoods/palm-desert) |
| Subdivision | `/neighborhoods/city-slug/subdivision-slug` | [PGA West](/neighborhoods/la-quinta/pga-west) |

---

## 🛠️ Technical Implementation

### AI Chat Tool Definition

```typescript
{
  name: "get_neighborhoods_tree",
  description: "Get California real estate regions, counties, and cities with URLs for linking in responses",
  parameters: {},
  handler: async () => {
    const response = await fetch('/api/neighborhoods/tree');
    const data = await response.json();
    return data.data; // Returns the full tree
  }
}
```

### Caching Strategy

For performance, the AI chat can cache the tree data:
- Cache duration: 1 hour
- Cache key: `neighborhoods_tree`
- Invalidate on: Manual refresh or time expiry

```typescript
let cachedTree = null;
let cacheTime = null;

async function getNeighborhoodsTree() {
  const now = Date.now();
  const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

  if (cachedTree && cacheTime && (now - cacheTime) < CACHE_DURATION) {
    return cachedTree;
  }

  const response = await fetch('/api/neighborhoods/tree');
  const data = await response.json();

  cachedTree = data.data;
  cacheTime = now;

  return cachedTree;
}
```

---

## 🎨 Response Templates

### Template: City Information

```
{cityName} is located in {countyName}, {regionName}.

🏘️ [View {cityName}](/neighborhoods/{citySlug})
- {listingCount} active listings
- Market data, neighborhoods, and community info available

{additionalContext}
```

### Template: County Overview

```
{countyName} is in {regionName} with {totalListings} active listings.

🏘️ [Explore {countyName}](/neighborhoods/{countySlug})

Top Cities:
{citiesList}

[View all cities in {countyName}](/neighborhoods/{countySlug})
```

### Template: Region Navigation

```
📍 California Real Estate Regions:

{regionsList}

[View complete directory](/neighborhoods)
```

---

## ✅ Testing Checklist

- [ ] API returns valid JSON structure
- [ ] All URLs are properly formatted
- [ ] Listing counts are accurate
- [ ] Cities are sorted by listing count
- [ ] "Other" regions/counties/cities are filtered out
- [ ] Slugs are URL-safe
- [ ] Links work in chat responses
- [ ] Mobile-friendly link rendering
- [ ] Hash anchors work for regions
- [ ] County pages accessible
- [ ] City pages accessible

---

## 📝 Future Enhancements

### Phase 2: Subdivisions
- Add subdivision data to tree
- Include HOA information
- Add price range data per subdivision

### Phase 3: Enhanced Metadata
- Add median prices per city
- Include population data
- Add market trends (up/down indicators)
- Include property type breakdown

### Phase 4: Smart Recommendations
- AI suggests similar cities
- "People also searched for" based on criteria
- Area comparisons

---

**Integration Complete!** 🎉

The AI chat can now intelligently reference and link to neighborhood pages, providing users with seamless navigation to detailed market information.
