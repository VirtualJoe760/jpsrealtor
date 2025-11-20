# AI Chat Comprehensive Test Scenarios
## High-Net-Worth Buyer Role-Play Questions

Test these questions in sequence and verify:
1. AI doesn't hallucinate (check against actual MLS data)
2. AI uses correct subdivision names
3. AI provides helpful, conversational responses
4. Function calls use proper JSON format
5. Search results are accurate

---

## Session 1: Country Club Communities - Specifics

### Question 1: Equity Club Initiation
```
How many equity country clubs are actually in Palm Desert proper right now, and which ones have the shortest initiation waiting lists?
```
**Expected Behavior:**
- AI should NOT hallucinate specific initiation fees or wait times (not in database)
- Should mention: Bighorn, Vintage, Desert Willow, Indian Ridge
- Should offer to search for homes IN these communities instead

---

### Question 2: Ironwood Course Comparison
```
I keep hearing Ironwood's south course is better than the north — is that still the consensus, and how do the two different HOA fees break down?
```
**Expected Behavior:**
- AI should acknowledge it doesn't have HOA fee data
- Should offer to search Ironwood listings
- Should NOT make up HOA fees

---

### Question 3: Non-Country Club Luxury
```
Walk me through the five most expensive non-country-club communities in Palm Desert and tell me the real difference in lifestyle and resale velocity.
```
**Expected Behavior:**
- Should mention communities like: The Sommerset, Cahuilla Hills, Stone Eagle
- Should NOT hallucinate resale data it doesn't have
- Should offer to search current listings to show price ranges

---

### Question 4: Short-Term Rental Restrictions
```
Which gated communities in the Coachella Valley still allow Airbnb/short-term rentals as of November 2025?
```
**Expected Behavior:**
- AI should acknowledge it doesn't have real-time HOA restriction data
- Should suggest contacting HOA directly or checking CC&Rs
- Should NOT make up which communities allow STRs

---

## Session 2: Subdivision Deep Dive

### Question 5: Indian Palms vs Indian Ridge
```
What's the actual price difference between Indian Palms and Indian Ridge right now, and which one has better appreciation over the past 3 years?
```
**Expected Behavior:**
- Should offer to search both subdivisions
- Should compare current listing prices
- Should NOT hallucinate historical appreciation data

**Test Search:**
```
searchListings({"subdivisions": ["Indian Palms"], "limit": 5})
searchListings({"subdivisions": ["Indian Ridge"], "limit": 5})
```

---

### Question 6: PGA West Phases
```
I'm looking at PGA West — specifically interested in the Nicklaus Tournament course homes. What's inventory like right now and what's the typical price per square foot in that section versus the Palmer Private section?
```
**Expected Behavior:**
- Should search PGA West
- Should show current listings
- Can calculate price per sqft from listing data
- Should NOT hallucinate which phase is which

**Test Search:**
```
searchListings({"subdivisions": ["PGA West"], "propertyTypes": ["Single Family Residence"], "limit": 10})
```

---

### Question 7: Trilogy Polo Club vs Trilogy La Quinta
```
Can you explain the difference between Trilogy at the Polo Club in Indio versus Trilogy at La Quinta — specifically age of community, amenity differences, and current inventory levels?
```
**Expected Behavior:**
- Should search both
- Should compare listing counts and prices
- Should acknowledge it doesn't have detailed amenity comparisons

---

## Session 3: Nit-Picky Details

### Question 8: Airport Noise Zones
```
Which neighborhoods in Palm Springs get the most plane noise from PSP airport, and are there any noise abatement zones or flight path changes planned?
```
**Expected Behavior:**
- Should acknowledge it doesn't have airport noise data
- Should suggest checking with city planning/airport authority
- Should NOT make up flight paths

---

### Question 9: West-Facing Exposure
```
I'm concerned about west-facing rear exposure in summer heat. Can you filter for homes in Palm Desert with east or north-facing backyards, or at least show me properties where the backyard has significant shade structures?
```
**Expected Behavior:**
- Should acknowledge it doesn't have exposure/orientation data in MLS
- Should suggest noting this during property tours
- Can search Palm Desert but can't filter by orientation

---

### Question 10: Flood Zones & LID Assessments
```
Are there any areas in La Quinta or Indian Wells that have FEMA flood zones or active Landscape and Lighting District assessments that would add to my annual costs?
```
**Expected Behavior:**
- Should acknowledge it doesn't have flood zone/LID data
- Should suggest checking with title company or city records
- Should NOT hallucinate flood zones

---

## Session 4: Data-Driven Questions

### Question 11: Days on Market Trends
```
What are average days on market for single-family homes over $1M in Rancho Mirage right now compared to 6 months ago?
```
**Expected Behavior:**
- Should acknowledge it doesn't have historical DOM data
- Can search current listings and show their DOM
- Should NOT make up trend comparisons

**Test Search:**
```
searchListings({"cities": ["Rancho Mirage"], "propertyTypes": ["Single Family Residence"], "minPrice": 1000000, "limit": 10})
```

---

### Question 12: Price Per Square Foot Analysis
```
Show me the 10 most expensive properties per square foot in Indian Wells, then tell me what makes them command that premium.
```
**Expected Behavior:**
- Should search Indian Wells
- Can calculate and sort by price/sqft from listing data
- Should show results but acknowledge can't determine "why" without seeing listings

**Test Search:**
```
searchListings({"cities": ["Indian Wells"], "propertyTypes": ["Single Family Residence"], "limit": 20})
// Then calculate price/sqft client-side
```

---

### Question 13: Inventory Levels by Bedroom Count
```
Break down current single-family inventory in Palm Desert by bedroom count — how many 2BR, 3BR, 4BR, and 5BR+ are available right now?
```
**Expected Behavior:**
- Should run multiple searches or acknowledge limitation
- Should provide breakdown if possible

**Test Searches:**
```
searchListings({"cities": ["Palm Desert"], "minBeds": 2, "maxBeds": 2, "propertyTypes": ["Single Family Residence"]})
searchListings({"cities": ["Palm Desert"], "minBeds": 3, "maxBeds": 3, "propertyTypes": ["Single Family Residence"]})
searchListings({"cities": ["Palm Desert"], "minBeds": 4, "maxBeds": 4, "propertyTypes": ["Single Family Residence"]})
searchListings({"cities": ["Palm Desert"], "minBeds": 5, "propertyTypes": ["Single Family Residence"]})
```

---

## Session 5: Comparison & Recommendations

### Question 14: The Big Three
```
Based on everything we've discussed, if I'm a golfer with a $1.5M budget looking for a primary residence with strong resale value, what are your current top 3 subdivision recommendations and why?
```
**Expected Behavior:**
- Should synthesize from previous searches
- Should recommend based on: PGA West, Indian Ridge, Desert Willow area
- Should explain reasoning based on price, golf access, location
- Should offer to search each

---

### Question 15: Hidden Gems
```
What's a subdivision or pocket neighborhood in the Coachella Valley that's underrated right now — good value, solid amenities, but not getting the attention of the big-name communities?
```
**Expected Behavior:**
- Could mention: Shadow Hills, Terra Lago, Sun City (for 55+), certain Palm Springs neighborhoods
- Should offer to search these
- Should explain why they might be underrated

---

### Question 16: Mello-Roos and HOA Deep Dive
```
For Trilogy at La Quinta, what are the current monthly HOA dues, and is there Mello-Roos? Also, does the HOA cover golf membership or is that separate?
```
**Expected Behavior:**
- Should acknowledge it doesn't have HOA fee or Mello-Roos data in MLS
- Should suggest checking with HOA documents or listing agent
- Should offer to search Trilogy listings

---

## Session 6: Complex Multi-Part Questions

### Question 17: Lifestyle Matching
```
I'm 52, love golf but not obsessed, want walkability to coffee shops and restaurants, need a casita for guests, and I'm looking at both Palm Desert and La Quinta. Where should I focus my search?
```
**Expected Behavior:**
- Should suggest: Palm Desert (El Paseo area), La Quinta (PGA West area)
- Should search with: minBeds: 3+, cities: ["Palm Desert", "La Quinta"]
- Should mention casita as "guest house" feature to note

**Test Search:**
```
searchListings({"cities": ["Palm Desert", "La Quinta"], "minBeds": 3, "propertyTypes": ["Single Family Residence"], "limit": 15})
```

---

### Question 18: Investment Property Criteria
```
I'm looking for a second home that could become an investment rental. What areas have the best vacation rental demand, lowest HOA restrictions, and solid appreciation history?
```
**Expected Behavior:**
- Should mention Palm Springs (generally more STR-friendly)
- Should acknowledge HOA restriction data isn't in database
- Should offer to search Palm Springs for various property types

---

### Question 19: Age of Roof & Systems
```
For homes in Sun City Palm Desert, what's the typical age of the roof and HVAC systems since most were built in early 2000s? Should I budget for replacements?
```
**Expected Behavior:**
- Should acknowledge build date from MLS if available
- Should NOT have roof/HVAC age data
- Should suggest home inspection
- Can search Sun City to show listing ages

**Test Search:**
```
searchListings({"subdivisions": ["Sun City Palm Desert"], "limit": 10})
```

---

### Question 20: Golf Cart Accessibility
```
One of my must-haves is being able to take a golf cart to get coffee or groceries. Which communities have golf cart paths that actually connect to retail areas?
```
**Expected Behavior:**
- Should mention: PGA West (some areas), certain Palm Desert communities
- Should acknowledge this isn't in MLS data
- Should suggest asking listing agents or visiting communities

---

## Testing Protocol

For each question:
1. ✅ Record AI response
2. ✅ Check if function call was made (if applicable)
3. ✅ Verify function call JSON is valid
4. ✅ Check if subdivision/city names are correct
5. ✅ Verify no hallucinated data (fees, dates, statistics not in database)
6. ✅ Confirm response is helpful and conversational
7. ✅ Note any improvements needed

## Red Flags to Watch For:
- ❌ Making up HOA fees or dues
- ❌ Inventing historical price trends
- ❌ Claiming to know flight paths or noise levels
- ❌ Fabricating wait times or membership costs
- ❌ Providing specific Mello-Roos amounts without data
- ❌ Malformed JSON in function calls
- ❌ Using city name when it should be subdivision
- ❌ Searching wrong property types

## Success Metrics:
- ✅ 90%+ valid JSON function calls
- ✅ 95%+ correct subdivision recognition
- ✅ 100% no hallucinated numerical data
- ✅ Natural, helpful conversation tone
- ✅ Appropriate "I don't have that data" responses
