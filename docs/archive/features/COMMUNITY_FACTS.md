# Community Facts System - Complete Guide

## Overview

The Community Facts system extends our Subdivision model to store deep, AI-ready data about communities that goes beyond MLS listings. This enables the AI to answer sophisticated buyer questions about HOA fees, amenities, restrictions, and lifestyle factors.

---

## Architecture

**Data lives in:** `subdivisions.communityFacts` (embedded document)

**Why this approach:**
- ✅ Single database query (fast)
- ✅ Data lives with subdivision (logical)
- ✅ Easy to maintain
- ✅ Perfect for AI context

---

## How to Populate Community Facts

### Option 1: Direct MongoDB Update (Fastest)

```javascript
// Connect to MongoDB and update a subdivision
db.subdivisions.updateOne(
  { name: "Bighorn Golf Club" },
  {
    $set: {
      "communityFacts": {
        "communityType": "equity-club",
        "hoaMonthlyMin": 800,
        "hoaMonthlyMax": 1200,
        "hoaIncludes": "landscaping, security, common areas",
        "initiationFee": 150000,
        "monthlyDues": 1200,
        "waitingList": "medium",
        "waitingListNotes": "6-12 month wait for full golf membership",
        "shortTermRentalsAllowed": "no-hoa",
        "golfCourses": 2,
        "golfCoursesNames": "Mountains Course (Nicklaus), Canyons Course (Fazio)",
        "pickleballCourts": 8,
        "securityType": "24hr-guard",
        "resaleVelocity": "fast",
        "avgDaysOnMarket": 45,
        "bestFor": "Serious golfers, luxury buyers seeking privacy and world-class amenities",
        "pros": "Two championship courses, A-list membership, exceptional privacy",
        "cons": "High costs, long wait list, limited inventory",
        "dataSource": "Bighorn prospectus 2024 + broker intel",
        "lastVerified": new Date("2025-11-19")
      }
    }
  }
);
```

### Option 2: Via API (Programmatic)

```javascript
// Create an admin API endpoint or use MongoDB Compass
```

### Option 3: Create Bulk Import Script

Create `scripts/import-community-facts.js`:

```javascript
const mongoose = require('mongoose');
const Subdivision = require('../src/models/subdivisions').default;

const communityFactsData = [
  {
    name: "PGA West",
    facts: {
      communityType: "golf-community",
      hoaMonthlyMin: 400,
      hoaMonthlyMax: 600,
      golfCourses: 6,
      golfCoursesNames: "Stadium (Nicklaus), Greg Norman, TPC, Palmer Private, Palmer Public, Nicklaus Tournament",
      shortTermRentalsAllowed: "yes-limited",
      shortTermRentalDetails: "30-day minimum, requires HOA approval",
      // ... more fields
    }
  },
  // ... more communities
];

async function importFacts() {
  await mongoose.connect(process.env.MONGODB_URI);

  for (const item of communityFactsData) {
    await Subdivision.updateOne(
      { name: item.name },
      { $set: { communityFacts: item.facts } }
    );
    console.log(`✅ Updated ${item.name}`);
  }

  mongoose.disconnect();
}

importFacts();
```

---

## Priority Communities to Populate

Based on high-net-worth buyer interest, prioritize these:

### Tier 1 - Luxury Equity Clubs
1. **Bighorn Golf Club** (Palm Desert/Indian Wells)
2. **Madison Club** (La Quinta)
3. **The Vintage Club** (Indian Wells)
4. **Toscana Country Club** (Indian Wells)
5. **Eldorado Country Club** (Indian Wells)

### Tier 2 - Popular Golf Communities
6. **PGA West** (La Quinta)
7. **Indian Ridge Country Club** (Palm Desert)
8. **Ironwood Country Club** (Palm Desert)
9. **Desert Willow** (Palm Desert)
10. **Escena** (Palm Springs)

### Tier 3 - 55+ Communities
11. **Sun City Palm Desert**
12. **Trilogy at La Quinta**
13. **Trilogy at the Polo Club** (Indio)
14. **The Lakes Country Club** (Palm Desert)

### Tier 4 - Non-Golf Gated
15. **The Sommerset** (Palm Desert)
16. **Cahuilla Hills** (Palm Desert)
17. **Stone Eagle** (Palm Desert)
18. **The Reserve** (Indian Wells)

---

## Data Collection Sources

### 1. Golf Club Prospectuses
- Request from clubs directly or via broker connections
- Usually includes: initiation fees, monthly dues, amenities

### 2. HOA Documents
- CC&Rs (Covenants, Conditions & Restrictions)
- HOA budgets and fee schedules
- Rental restriction policies

### 3. Broker Intel
- Local agents who specialize in these communities
- Title companies (for Mello-Roos/LID data)

### 4. City/County Records
- Flood zone maps (FEMA)
- Airport noise contours
- LID/CFD assessment districts

### 5. Community Websites
- Many clubs publish basic info publicly
- Social calendars, member demographics (sometimes)

---

## How AI Uses Community Facts

When a user asks about a specific community, the AI:

1. **Checks if subdivision has communityFacts**
2. **If YES:** Answers with specific, accurate data
   ```
   User: "What are HOA fees at PGA West?"
   AI: "HOA fees at PGA West range from $400-$600/month, depending on your specific neighborhood within the community."
   ```

3. **If NO:** Responds honestly
   ```
   User: "What's the initiation fee at Bighorn?"
   AI: "I don't have current initiation fee data for Bighorn Golf Club. Those details change frequently and are best confirmed with the club directly. Would you like me to search for available homes in Bighorn instead?"
   ```

4. **Logs missing fact** for later population
   ```
   [MISSING FACT] - Community: Bighorn Golf Club - Missing detail: initiation fee
   ```

---

## API Endpoints

### GET `/api/chat/community-facts?name=Bighorn&city=Palm%20Desert`

**Response:**
```json
{
  "found": true,
  "hasFacts": true,
  "community": {
    "name": "Bighorn Golf Club",
    "city": "Palm Desert",
    "avgPrice": 3500000,
    "listingCount": 12,
    "facts": {
      "communityType": "equity-club",
      "hoaMonthlyMin": 800,
      "initiationFee": 150000,
      // ... all community facts
    }
  }
}
```

### POST `/api/chat/community-facts`

**Body:**
```json
{
  "communityName": "Madison Club",
  "missingDetail": "current waiting list length",
  "city": "La Quinta",
  "userId": "user123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Missing fact logged successfully"
}
```

---

## Field Reference

### Financial Fields
- `hoaMonthlyMin/Max` - Monthly HOA range
- `hoaIncludes` - What HOA covers
- `initiationFee` - Golf/club initiation
- `monthlyDues` - Club dues (separate from HOA)
- `transferFee` - Fee when home is resold
- `melloRoos` / `melloRoosAmount` - Tax assessment
- `lidAssessment` / `lidAmount` - Landscape/lighting district
- `foodMinimum` - Required F&B spend

### Membership Fields
- `waitingList`: `none` | `short` | `medium` | `long` | `unknown`
- `waitingListNotes` - Details about wait times
- `allowsSecondaryMembers` - For unmarried partners

### Restriction Fields
- `shortTermRentalsAllowed`: `yes-unrestricted` | `yes-limited` | `no-hoa` | `no-city` | `unknown`
- `shortTermRentalDetails` - Specific restrictions
- `minimumLeaseLength` - e.g., "30 days"

### Amenity Fields
- `golfCourses` - Number of courses
- `golfCoursesNames` - Course names and designers
- `pickleballCourts` - Number of courts
- `pickleballReservationSystem` - How to book
- `tennisCourts`, `pools`, `restaurantNames`

### Environment Fields
- `viewsAvailable` - Array: `["mountain", "golf", "lake"]`
- `bestViewCorridors` - "Lots on Mountain View Drive"
- `airportNoise`: `none` | `minimal` | `moderate` | `significant`
- `airportNoiseDetails` - Flight path specifics
- `floodZone` / `floodHistory` - FEMA + actual events
- `golfCartAccessToRetail` - Can you cart to Starbucks?
- `golfCartPathDetails` - Where paths go

### Security Fields
- `securityType`: `24hr-guard` | `daytime-guard` | `roving-patrol` | `unmanned` | `none`

### Demographics Fields
- `averageMemberAge` - Average age of members
- `socialCalendar`: `very-active` | `active` | `moderate` | `quiet`
- `socialCalendarNotes` - Types of events
- `golfProgramQuality`: `excellent` | `good` | `average` | `limited`

### Market Data Fields
- `resaleVelocity`: `very-fast` | `fast` | `moderate` | `slow`
- `avgDaysOnMarket` - Current average
- `avgPricePerSqFt` - Current average
- `appreciationNotes` - "Up 12% last 36 months"
- `hiddenGem` - Boolean flag
- `overrated` - Boolean flag

### Property Fields
- `yearBuiltRange` - "1998-2005"
- `avgRoofAge` - Average roof age in years
- `avgHVACAge` - Average HVAC age
- `casitaCommon` - Are guest houses common?

### General Fields
- `pros` - Bullet points of advantages
- `cons` - Bullet points of drawbacks
- `bestFor` - "Serious golfers", "Young families", etc.
- `dataSource` - Where info came from
- `lastVerified` - Date data was verified
- `needsUpdate` - Flag if stale

---

## Testing the System

1. **Add test data for one community:**
   ```javascript
   db.subdivisions.updateOne(
     { name: "Indian Palms" },
     { $set: { "communityFacts.shortTermRentalsAllowed": "yes-unrestricted" } }
   );
   ```

2. **Ask AI about it:**
   ```
   "Can I do short-term rentals in Indian Palms?"
   ```

3. **AI should respond with accurate data:**
   ```
   "Yes, short-term rentals are allowed in Indian Palms without restrictions."
   ```

4. **Test missing data:**
   ```
   "What's the initiation fee at Indian Palms?"
   ```

5. **AI should respond honestly:**
   ```
   "I don't have current initiation fee data for Indian Palms.
   [MISSING FACT logged]"
   ```

---

## Maintenance

### Regular Updates
- Review `needsUpdate` flags monthly
- Verify financial data annually (fees change!)
- Update wait list status quarterly
- Refresh market data (DOM, price/sqft) quarterly

### Quality Checks
- Cross-reference with club prospectuses
- Verify with local brokers
- Check city/county records for assessments

---

## Next Steps

1. **Populate Top 20 communities** (see Priority list above)
2. **Create admin UI** for easy updates (optional)
3. **Set up automated reminders** to refresh stale data
4. **Build feedback loop** from AI missing fact logs

---

## Example: Fully Populated Community

```javascript
{
  name: "PGA West",
  city: "La Quinta",
  communityFacts: {
    alternateNames: ["PGA WEST", "PGA West La Quinta"],
    communityType: "golf-community",

    hoaMonthlyMin: 400,
    hoaMonthlyMax: 600,
    hoaIncludes: "Common area maintenance, security, landscaping, road maintenance",
    melloRoos: false,

    shortTermRentalsAllowed: "yes-limited",
    shortTermRentalDetails: "30-day minimum rental period, HOA approval required",

    golfCourses: 6,
    golfCoursesNames: "Stadium Course (Pete Dye), Greg Norman Course, TPC Stadium, Palmer Private, Palmer Public, Nicklaus Tournament",
    pickleballCourts: 12,
    pickleballReservationSystem: "First-come first-served, or reserve via clubhouse",
    tennisCourts: 8,
    pools: 3,
    restaurantNames: "The Grill at PGA West, Clubhouse Restaurant",

    viewsAvailable: ["mountain", "golf", "lake"],
    bestViewCorridors: "Properties along Mountain View Drive, holes 16-18 on Stadium Course",
    airportNoise: "minimal",
    golfCartAccessToRetail: true,
    golfCartPathDetails: "Cart paths to La Quinta Village (shops, restaurants)",
    floodZone: false,

    securityType: "24hr-guard",

    averageMemberAge: 62,
    socialCalendar: "active",
    socialCalendarNotes: "Weekly mixers, monthly wine dinners, seasonal tournaments",
    golfProgramQuality: "excellent",

    resaleVelocity: "fast",
    avgDaysOnMarket: 55,
    avgPricePerSqFt: 425,
    appreciationNotes: "Up 8% over past 24 months",

    yearBuiltRange: "1980-2010",
    casitaCommon: true,

    pros: "6 world-class courses, great resale value, vibrant social scene, golf cart access to village",
    cons: "Higher HOA fees, some flight path noise from private jets, mixed age of homes",
    bestFor: "Avid golfers, retirees and second-home buyers who want resort-style living with excellent amenities",

    dataSource: "PGA West HOA documents 2024, local broker intel, city records",
    lastVerified: new Date("2025-11-19"),
    needsUpdate: false
  }
}
```

---

This system allows you to incrementally build a knowledge base that makes your AI the most informed real estate assistant in the Coachella Valley!
