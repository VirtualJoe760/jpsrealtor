# AI Conversation & User Goal Tracking Strategy

## Problem Statement

### Current Issues:
1. **Map too zoomed in** - Can't see all listings when spread across multiple cities
2. **AI jumps to property search too quickly** - User asks about "family-friendly communities" and gets house listings instead of a conversation
3. **No user profile tracking** - AI doesn't remember or build context about user's life situation
4. **No goal persistence** - User preferences aren't saved or refined over time

### Example of Bad Behavior:
```
User: "which communities in coachella valley do you think are family friendly"
AI: "Found 10 properties matching your criteria." [Shows houses]
```

### What Should Happen Instead:
```
User: "which communities in coachella valley do you think are family friendly"
AI: "Great question! For families, I'd recommend looking at Indian Wells, La Quinta, and
     Palm Desert - they have excellent schools, safe neighborhoods, and lots of family
     activities. Are you looking for a specific school district? Do you have kids in
     a particular age range? That would help me narrow down the best communities for you."

User: "I have two kids, ages 5 and 8"
AI: "Perfect! With elementary school-aged kids, you'll want great schools and parks nearby.
     Indian Wells has top-rated elementary schools and the Indian Wells Tennis Garden for
     family events. Would you like to see some homes in that area?"

User: "yes"
AI: "Found 10 properties in family-friendly Indian Wells neighborhoods." [Shows houses]
```

---

## Solution Architecture

### Phase 1: Intelligent Conversation Flow

#### 1.1 Conversation vs Search Detection
The AI needs to distinguish between:
- **Conversational questions** → Respond naturally, gather info
- **Search intent** → Execute property search

**Conversational Triggers:**
- Questions about neighborhoods, schools, lifestyle
- Asking for recommendations or opinions
- General real estate questions
- Price range questions without specifics
- Questions about the area/amenities

**Search Intent Triggers:**
- Specific property criteria (beds, baths, price)
- "Show me homes..."
- "I want to see properties..."
- User confirms they're ready after conversation
- Follow-up questions on existing search results

#### 1.2 Multi-Turn Conversation System
```typescript
interface ConversationContext {
  phase: 'discovery' | 'refinement' | 'search' | 'viewing';
  hasAskedAboutFamily: boolean;
  hasAskedAboutBudget: boolean;
  hasAskedAboutLocation: boolean;
  hasAskedAboutLifestyle: boolean;
  readyToSearch: boolean;
  propertyPreferences: PropertyPreferences;
  userGoals: UserGoal[];
}
```

---

### Phase 2: User Goal & Profile Tracking

#### 2.1 User Profile Schema
```typescript
interface UserProfile {
  // Demographics
  maritalStatus?: 'single' | 'married' | 'partnered';
  hasChildren?: boolean;
  childrenAges?: number[];
  pets?: string[];

  // Career & Lifestyle
  occupation?: string;
  workLocation?: string;
  commutePreference?: 'short' | 'moderate' | 'long';
  remoteWork?: boolean;

  // Preferences
  lifestylePreferences: string[]; // ['golf', 'hiking', 'nightlife', 'quiet']
  communityType?: 'active' | 'family' | 'luxury' | 'golf' | 'retirement';
  importantAmenities: string[]; // ['pool', 'good schools', 'walkable']

  // Budget & Timeline
  budgetRange?: { min: number; max: number };
  timeline?: 'looking' | 'ready' | 'urgent';
  financing?: 'cash' | 'mortgage' | 'undecided';

  // Goals (discovered over time)
  goals: UserGoal[];

  // Conversation history context
  lastUpdated: Date;
  confidenceScore: number; // How confident we are in this data
}
```

#### 2.2 User Goals Schema
```typescript
interface UserGoal {
  id: string;
  type: 'family' | 'investment' | 'retirement' | 'relocation' | 'lifestyle' | 'upgrade';
  description: string; // Natural language description
  priority: number; // 1-10
  status: 'active' | 'completed' | 'paused';

  // Extracted requirements
  requirements: {
    location?: string[];
    priceRange?: { min: number; max: number };
    propertyType?: string[];
    bedrooms?: { min: number; max?: number };
    bathrooms?: { min: number; max?: number };
    sqft?: { min: number; max?: number };
    amenities?: string[];
    schoolRating?: number; // Minimum school rating
    nearbyPOI?: string[]; // Points of interest
  };

  // Learned from conversation
  extractedFrom: string[]; // Message IDs where this was mentioned
  confidence: number; // 0-1
  lastMentioned: Date;
  created: Date;
}
```

#### 2.3 Goal Extraction System
```typescript
// Extract goals from natural conversation
const goalExtractionPrompt = `
Analyze the user's message and extract their real estate goals and personal context.

Look for:
1. Family situation (married, kids, pets)
2. Lifestyle preferences (golf, hiking, nightlife, quiet)
3. Career/work situation (remote, commute, relocating)
4. Budget hints (without asking directly)
5. Timeline urgency
6. Property must-haves
7. Community preferences

Extract as structured data, mark confidence level.
`;
```

---

### Phase 3: Smart Property Search Timing

#### 3.1 Search Decision Logic
```typescript
function shouldTriggerSearch(context: ConversationContext): boolean {
  // Don't search if just starting conversation
  if (context.phase === 'discovery' && !context.readyToSearch) {
    return false;
  }

  // Search if user explicitly asks to see properties
  if (hasExplicitSearchIntent(lastMessage)) {
    return true;
  }

  // Search if we've gathered enough context and user seems ready
  if (
    context.hasAskedAboutBudget &&
    context.hasAskedAboutLocation &&
    context.readyToSearch
  ) {
    return true;
  }

  return false;
}
```

#### 3.2 Conversation Phases
```
1. DISCOVERY (1-3 messages)
   - Understand user's situation
   - Ask clarifying questions
   - Build initial profile
   - DON'T search yet!

2. REFINEMENT (2-5 messages)
   - Narrow down preferences
   - Confirm budget and location
   - Discuss trade-offs
   - Build confidence in requirements

3. SEARCH (triggered by user readiness)
   - Execute property search
   - Present results
   - Explain why these match their goals

4. VIEWING (post-search)
   - Discuss specific properties
   - Refine search based on feedback
   - Learn from what they like/dislike
```

---

### Phase 4: Map Improvements

#### 4.1 Auto-Zoom to Fit All Listings
```typescript
// Calculate bounds from all listings
function calculateMapBounds(listings: Listing[]) {
  const lats = listings.map(l => l.latitude);
  const lngs = listings.map(l => l.longitude);

  return {
    north: Math.max(...lats),
    south: Math.min(...lats),
    east: Math.max(...lngs),
    west: Math.min(...lngs)
  };
}

// Add padding so markers aren't on edge
function fitBoundsWithPadding(bounds, paddingPercent = 0.1) {
  const latPadding = (bounds.north - bounds.south) * paddingPercent;
  const lngPadding = (bounds.east - bounds.west) * paddingPercent;

  return {
    north: bounds.north + latPadding,
    south: bounds.south - latPadding,
    east: bounds.east + lngPadding,
    west: bounds.west - lngPadding
  };
}
```

---

## Implementation Plan

### Step 1: Fix Map Zoom (Quick Win - 15 min)
- Update `ChatMapView.tsx` to calculate bounds from all listings
- Use fitBounds instead of center + zoom
- Add padding for better UX

### Step 2: Improve AI Prompts (30 min)
- Update system prompt to have conversation phases
- Add logic to detect conversation vs search intent
- Make AI ask follow-up questions instead of searching immediately

### Step 3: Create User Profile Database (1 hour)
- Add UserProfile collection to Payload CMS
- Create API endpoints for updating profile
- Build profile extraction from conversation

### Step 4: Implement Goal Tracking (1-2 hours)
- Create UserGoals collection
- Build goal extraction from messages
- Update AI to reference and build on goals

### Step 5: Conversation State Management (1 hour)
- Track conversation phase
- Store conversation context
- Make decisions based on what's been asked

### Step 6: AI Prompt Enhancement (1 hour)
- Multi-stage prompt system
- Different prompts for different phases
- Include user profile and goals in context

---

## Example Improved Conversation Flow

### Scenario: User asks about family-friendly communities

**Turn 1:**
```
User: "which communities in coachella valley do you think are family friendly"

AI Context:
- Phase: discovery
- No profile data yet
- This is a CONVERSATIONAL question, not search intent

AI Response:
"Great question! For families, I'd highly recommend Indian Wells, La Quinta, and parts
of Palm Desert - they all have excellent schools, safe neighborhoods, and tons of family
activities.

Do you have kids? If so, what ages? That'll help me point you to the best school
districts and communities for your family."

[Internally: Create goal "family-friendly community", mark hasChildren as unknown]
```

**Turn 2:**
```
User: "yes, I have a 5 year old and an 8 year old"

AI Context:
- Phase: discovery → refinement
- Profile: hasChildren = true, childrenAges = [5, 8]
- Goal updated: elementary school importance HIGH

AI Response:
"Perfect! With kids in elementary school, you'll definitely want to look at Indian Wells
and South La Quinta - they have some of the highest-rated elementary schools in the valley.

Are you looking to stay within a certain budget? That way I can show you the best options
in these family-friendly areas."

[Internally: Update profile, mark hasAskedAboutFamily = true]
```

**Turn 3:**
```
User: "around 500-700k"

AI Context:
- Phase: refinement
- Profile: budgetRange = {min: 500000, max: 700000}
- hasAskedAboutBudget = true
- hasAskedAboutFamily = true
- readyToSearch = true (enough context)

AI Response:
"Great! In the $500-700K range, you'll find some wonderful family homes in these areas.
Would you like me to show you some properties that fit your needs?"

[Internally: Ready to search, but waiting for confirmation]
```

**Turn 4:**
```
User: "yes please"

AI Context:
- Phase: search
- Explicit search confirmation

AI Response:
"Found 12 family-friendly properties in Indian Wells and La Quinta, all with great
schools nearby and priced between $500-700K."

[Execute search with refined criteria]
```

---

## Key Principles

1. **Listen First, Search Later** - Have a conversation before jumping to listings
2. **Build Context Gradually** - Don't interrogate, discover naturally
3. **Remember Everything** - User profile persists across sessions
4. **Refine Over Time** - Each conversation improves understanding
5. **Be Helpful, Not Pushy** - Guide without forcing searches
6. **Explain Recommendations** - Tell them WHY you're suggesting something

---

## Success Metrics

- **Conversation depth**: Average messages before first search (target: 3-5)
- **Profile completeness**: % of user profiles with key fields filled
- **Goal accuracy**: How often searches align with stated goals
- **User satisfaction**: Qualitative feedback on AI helpfulness
- **Conversion rate**: % of conversations leading to property views

---

## Next Steps

1. Start with map fix (quick win)
2. Improve AI conversation flow (immediate impact)
3. Build user profile database (foundation for personalization)
4. Implement goal tracking (advanced personalization)
5. Continuous refinement based on real conversations
