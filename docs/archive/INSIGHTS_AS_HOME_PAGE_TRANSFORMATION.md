# Insights Page → Home Page Transformation Guide

**Created**: March 7, 2026
**Purpose**: Transform `/insights` into a dual-purpose page that serves as both a landing page (guest) and personalized insights dashboard (logged in)
**Status**: Implementation Ready

---

## EXECUTIVE SUMMARY

### The Vision
Transform the existing Insights page to intelligently adapt based on authentication state:

**Guest Users (Not Logged In)**:
- Hero section with Joseph Sardella introduction
- "Meet Your Agent" section
- General market insights (Coachella Valley-wide)
- Educational articles organized by category
- CTAs to sign up, start chatting, or view map

**Logged In Users**:
- Personalized hero: "Welcome back, [Name]!"
- Saved searches quick access
- Personalized market insights (based on favorites/search history)
- Recommended articles based on activity
- Recent activity feed

### Why This Works
1. **Single source of truth** - One page, two experiences
2. **Seamless progression** - Guest sees value → Signs up → Gets personalization
3. **Natural positioning** - "Insights" makes sense for both contexts
4. **Leverages existing code** - Already has market stats, articles, AI search

---

## CURRENT STATE ANALYSIS

### Existing Insights Page (`src/app/insights/page.tsx`)

**Current Structure:**
```
[Insights Page]
  ├─ Hero Section ("Real Estate Insights")
  ├─ MarketStats Component
  ├─ FilterTabs (AI Suggestions, Categories, Topics)
  ├─ AISearchBar (conditional on active tab)
  ├─ CategoryFilter / TopicCloud
  └─ ArticleAccordion List
```

**Current Features:**
- ✅ AI-powered article search
- ✅ Market statistics display
- ✅ Category filtering
- ✅ Topic cloud navigation
- ✅ Responsive design
- ❌ No auth state awareness
- ❌ No personalization
- ❌ No agent introduction for guests

---

## TRANSFORMATION PLAN

### Phase 1: Add Auth Context

```tsx
// Updated imports
import { useSession } from "next-auth/react";

export default function InsightsPage() {
  const { data: session, status } = useSession();
  const isAuthenticated = !!session?.user;
  const isLoading = status === "loading";

  // ... existing state

  // New: User preferences state
  const [userPreferences, setUserPreferences] = useState<{
    favoriteLocations: string[];
    searchHistory: string[];
    savedArticles: string[];
  } | null>(null);

  // Load user preferences if logged in
  useEffect(() => {
    if (isAuthenticated && session?.user?.id) {
      loadUserPreferences(session.user.id);
    }
  }, [isAuthenticated, session]);

  const loadUserPreferences = async (userId: string) => {
    try {
      const response = await fetch(`/api/user/preferences`);
      if (response.ok) {
        const data = await response.json();
        setUserPreferences(data);
      }
    } catch (error) {
      console.error("Failed to load user preferences:", error);
    }
  };

  // ... rest of component
}
```

---

### Phase 2: Guest Hero Section (Agent Introduction)

#### Desktop Layout
```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   ┌────────────┐      MEET YOUR LOCAL EXPERT               │
│   │            │      Joseph Sardella                       │
│   │  Joseph's  │      Real Estate Agent                     │
│   │   Photo    │      Palm Desert & Coachella Valley        │
│   │            │                                             │
│   │ (circular) │      "Born Here. Raised Here.              │
│   │            │       Selling Here."                       │
│   └────────────┘                                            │
│                       [Start Searching] [Sign In]            │
│                                                              │
│   eXp Realty | DRE #02083526 | 8+ Figures in Sales         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### Component Code
```tsx
// New component: src/app/components/insights/GuestHero.tsx
"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useThemeClasses } from "@/app/contexts/ThemeContext";
import { MessageSquare, Map, LogIn } from "lucide-react";

export default function GuestHero() {
  const router = useRouter();
  const { cardBg, cardBorder, textPrimary, textSecondary, currentTheme } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className={`${cardBg} ${cardBorder} border rounded-3xl p-8 md:p-12 mb-12 ${
        isLight ? 'shadow-xl' : 'shadow-2xl shadow-emerald-900/10'
      }`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left: Photo + Badge */}
        <div className="flex flex-col items-center lg:items-start">
          <div className="relative">
            {/* Circular photo */}
            <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-full overflow-hidden shadow-2xl border-4 border-white dark:border-gray-800">
              <Image
                src="/joey/about.png"
                alt="Joseph Sardella - Your Coachella Valley Real Estate Expert"
                fill
                className="object-cover"
                priority
              />
            </div>

            {/* Floating badge */}
            <div className={`absolute -bottom-3 -right-3 px-4 py-2 rounded-full shadow-lg ${
              isLight
                ? 'bg-blue-600 text-white'
                : 'bg-emerald-600 text-white'
            }`}>
              <span className="text-sm font-bold">8+ Figures</span>
            </div>
          </div>
        </div>

        {/* Right: Content */}
        <div className="text-center lg:text-left space-y-4">
          {/* Label */}
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${
            isLight ? 'bg-blue-50 text-blue-700' : 'bg-emerald-950 text-emerald-400'
          }`}>
            <span className="text-sm font-semibold uppercase tracking-wide">
              Meet Your Local Expert
            </span>
          </div>

          {/* Name & Title */}
          <div>
            <h2 className={`text-4xl md:text-5xl font-bold mb-2 ${textPrimary}`}>
              Joseph Sardella
            </h2>
            <p className={`text-lg md:text-xl ${textSecondary}`}>
              Real Estate Agent
            </p>
            <p className={`text-base ${textSecondary} opacity-80`}>
              Palm Desert & Coachella Valley
            </p>
          </div>

          {/* Tagline */}
          <p className={`text-xl md:text-2xl font-medium italic ${
            isLight ? 'text-blue-600' : 'text-emerald-400'
          }`}>
            "Born Here. Raised Here. Selling Here."
          </p>

          {/* Description */}
          <p className={`text-base leading-relaxed ${textSecondary}`}>
            Indian Wells native with deep local roots and cutting-edge technology.
            Part of eXp's Obsidian Real Estate Group managing 8 figures in property sales.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              onClick={() => router.push('/')}
              className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all hover:scale-105 ${
                isLight
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              Start Searching
            </button>

            <button
              onClick={() => router.push('/map')}
              className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all hover:scale-105 border-2 ${
                isLight
                  ? 'border-blue-600 text-blue-600 hover:bg-blue-50'
                  : 'border-emerald-600 text-emerald-400 hover:bg-emerald-950'
              }`}
            >
              <Map className="w-5 h-5" />
              View Map
            </button>

            <button
              onClick={() => router.push('/auth/signin')}
              className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all hover:scale-105 ${
                isLight
                  ? 'text-gray-600 hover:bg-gray-100'
                  : 'text-gray-400 hover:bg-gray-900'
              }`}
            >
              <LogIn className="w-5 h-5" />
              Sign In
            </button>
          </div>

          {/* Credentials */}
          <div className={`pt-4 flex flex-wrap gap-2 text-sm ${textSecondary} opacity-70`}>
            <span>eXp Realty</span>
            <span>•</span>
            <span>DRE #02083526</span>
            <span>•</span>
            <span>Indian Wells Native</span>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
```

---

### Phase 3: Logged In Hero (Personalized Welcome)

```tsx
// New component: src/app/components/insights/UserHero.tsx
"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useThemeClasses } from "@/app/contexts/ThemeContext";
import { Heart, Search, BookmarkCheck, TrendingUp } from "lucide-react";

interface UserHeroProps {
  userName: string;
  savedSearches: number;
  favoriteListings: number;
  savedArticles: number;
}

export default function UserHero({
  userName,
  savedSearches,
  favoriteListings,
  savedArticles
}: UserHeroProps) {
  const router = useRouter();
  const { cardBg, cardBorder, textPrimary, textSecondary, currentTheme } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";

  const quickStats = [
    { icon: Search, label: "Saved Searches", value: savedSearches, link: "/dashboard/searches" },
    { icon: Heart, label: "Favorites", value: favoriteListings, link: "/dashboard/favorites" },
    { icon: BookmarkCheck, label: "Saved Articles", value: savedArticles, link: "/insights?filter=saved" },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className={`${cardBg} ${cardBorder} border rounded-3xl p-6 md:p-8 mb-8`}
    >
      {/* Welcome Header */}
      <div className="mb-6">
        <h2 className={`text-3xl md:text-4xl font-bold mb-2 ${textPrimary}`}>
          Welcome back, {userName}! 👋
        </h2>
        <p className={`text-base md:text-lg ${textSecondary}`}>
          Here's what's happening in your markets
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {quickStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <button
              key={index}
              onClick={() => router.push(stat.link)}
              className={`p-4 rounded-xl transition-all hover:scale-105 text-left ${
                isLight
                  ? 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                  : 'bg-gray-900 hover:bg-gray-800 border border-gray-800'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon className={`w-5 h-5 ${
                  isLight ? 'text-blue-600' : 'text-emerald-400'
                }`} />
                <span className={`text-sm font-medium ${textSecondary}`}>
                  {stat.label}
                </span>
              </div>
              <div className={`text-2xl font-bold ${textPrimary}`}>
                {stat.value}
              </div>
            </button>
          );
        })}
      </div>
    </motion.section>
  );
}
```

---

### Phase 4: Personalized Market Stats

Update MarketStats component to accept personalization props:

```tsx
// Updated: src/app/components/insights/MarketStats.tsx

interface MarketStatsProps {
  // Guest mode: show general stats
  mode?: 'guest' | 'personalized';

  // Personalized mode: filter by user's favorite locations
  favoriteLocations?: string[];
}

export default function MarketStats({
  mode = 'guest',
  favoriteLocations = []
}: MarketStatsProps) {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadStats();
  }, [mode, favoriteLocations]);

  const loadStats = async () => {
    const endpoint = mode === 'personalized' && favoriteLocations.length > 0
      ? `/api/market/stats?locations=${favoriteLocations.join(',')}`
      : `/api/market/stats`; // General Coachella Valley stats

    const response = await fetch(endpoint);
    if (response.ok) {
      const data = await response.json();
      setStats(data);
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Display stats */}
      {mode === 'personalized' && favoriteLocations.length > 0 && (
        <div className="col-span-2 md:col-span-4 mb-2">
          <p className="text-sm text-gray-500">
            Showing stats for: {favoriteLocations.join(', ')}
          </p>
        </div>
      )}

      {/* ... stat cards ... */}
    </div>
  );
}
```

---

### Phase 5: Personalized Article Recommendations

```tsx
// New component: src/app/components/insights/RecommendedArticles.tsx

interface RecommendedArticlesProps {
  userInterests: string[]; // Topics user has searched/clicked
  recentSearches: string[]; // Recent search queries
}

export default function RecommendedArticles({
  userInterests,
  recentSearches
}: RecommendedArticlesProps) {
  const [recommendations, setRecommendations] = useState<Article[]>([]);

  useEffect(() => {
    loadRecommendations();
  }, [userInterests, recentSearches]);

  const loadRecommendations = async () => {
    const response = await fetch('/api/articles/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        interests: userInterests,
        searches: recentSearches,
        limit: 5
      })
    });

    if (response.ok) {
      const data = await response.json();
      setRecommendations(data.articles);
    }
  };

  if (recommendations.length === 0) return null;

  return (
    <section className="mb-8">
      <h3 className="text-2xl font-bold mb-4">
        Recommended for You
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recommendations.map(article => (
          <ArticleCard key={article.slug} article={article} />
        ))}
      </div>
    </section>
  );
}
```

---

### Phase 6: Conditional Rendering Logic

Update main Insights page:

```tsx
// Updated: src/app/insights/page.tsx

export default function InsightsPage() {
  const { data: session, status } = useSession();
  const isAuthenticated = !!session?.user;
  const isLoading = status === "loading";

  // ... existing state ...
  const [userPreferences, setUserPreferences] = useState<any>(null);

  // Load user data if authenticated
  useEffect(() => {
    if (isAuthenticated && session?.user?.id) {
      loadUserData(session.user.id);
    }
  }, [isAuthenticated, session]);

  const loadUserData = async (userId: string) => {
    try {
      const [prefsRes, statsRes] = await Promise.all([
        fetch('/api/user/preferences'),
        fetch('/api/user/stats')
      ]);

      if (prefsRes.ok && statsRes.ok) {
        const prefs = await prefsRes.json();
        const stats = await statsRes.json();

        setUserPreferences({
          ...prefs,
          stats
        });
      }
    } catch (error) {
      console.error("Failed to load user data:", error);
    }
  };

  // Show loading state
  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen pt-12 md:pt-16 pb-6 md:pb-12 px-4">
      <div className="max-w-7xl mx-auto">

        {/* CONDITIONAL HERO SECTION */}
        {!isAuthenticated ? (
          // Guest: Show agent introduction
          <GuestHero />
        ) : (
          // Logged in: Show personalized welcome
          <UserHero
            userName={session?.user?.name?.split(' ')[0] || 'there'}
            savedSearches={userPreferences?.stats?.savedSearches || 0}
            favoriteListings={userPreferences?.stats?.favoriteListings || 0}
            savedArticles={userPreferences?.stats?.savedArticles || 0}
          />
        )}

        {/* CONDITIONAL TITLE */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 md:mb-8 text-center"
        >
          <h1 className={`text-3xl md:text-6xl font-bold mb-4 ${textPrimary}`}>
            {isAuthenticated ? 'Your Insights' : 'Real Estate Insights'}
          </h1>
          <p className={`text-base md:text-xl max-w-3xl mx-auto ${textSecondary}`}>
            {isAuthenticated
              ? 'Personalized market data and recommendations based on your activity'
              : 'Discover expert advice, market insights, and tips for Coachella Valley real estate'
            }
          </p>
        </motion.div>

        {/* PERSONALIZED RECOMMENDATIONS (logged in only) */}
        {isAuthenticated && userPreferences && (
          <RecommendedArticles
            userInterests={userPreferences.interests || []}
            recentSearches={userPreferences.recentSearches || []}
          />
        )}

        {/* MARKET STATS (personalized if logged in) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 md:mb-8"
        >
          <MarketStats
            mode={isAuthenticated ? 'personalized' : 'guest'}
            favoriteLocations={userPreferences?.favoriteLocations || []}
          />
        </motion.div>

        {/* Rest of the page (filter tabs, articles) stays the same */}
        <FilterTabs ... />
        {/* ... existing code ... */}
      </div>
    </div>
  );
}
```

---

## API ENDPOINTS NEEDED

### 1. User Preferences API

```typescript
// src/app/api/user/preferences/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();

  const user = await User.findById(session.user.id).select(
    'favoriteLocations searchHistory savedArticles interests'
  );

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    favoriteLocations: user.favoriteLocations || [],
    searchHistory: user.searchHistory?.slice(0, 10) || [],
    savedArticles: user.savedArticles || [],
    interests: user.interests || []
  });
}
```

### 2. User Stats API

```typescript
// src/app/api/user/stats/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await dbConnect();

  const user = await User.findById(session.user.id);

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    savedSearches: user.savedSearches?.length || 0,
    favoriteListings: user.favorites?.length || 0,
    savedArticles: user.savedArticles?.length || 0,
    totalSearches: user.searchHistory?.length || 0
  });
}
```

### 3. Article Recommendations API

```typescript
// src/app/api/articles/recommendations/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const body = await req.json();

  const { interests = [], searches = [], limit = 5 } = body;

  // Load all published articles
  const articles = await loadPublishedArticles();

  // Score articles based on user interests and searches
  const scoredArticles = articles.map(article => {
    let score = 0;

    // Match topics with interests
    article.topics?.forEach(topic => {
      if (interests.includes(topic)) score += 10;
    });

    // Match search keywords
    searches.forEach(search => {
      const searchLower = search.toLowerCase();
      if (article.title.toLowerCase().includes(searchLower)) score += 5;
      if (article.excerpt.toLowerCase().includes(searchLower)) score += 3;
    });

    return { article, score };
  });

  // Sort by score and return top N
  const recommendations = scoredArticles
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.article);

  return NextResponse.json({ articles: recommendations });
}
```

---

## USER MODEL UPDATES

Add fields to track user preferences:

```typescript
// models/User.ts - Add these fields

const UserSchema = new mongoose.Schema({
  // ... existing fields ...

  // Insights personalization
  favoriteLocations: [{ type: String }], // ["Palm Desert", "Indian Wells"]
  searchHistory: [{
    query: String,
    timestamp: { type: Date, default: Date.now }
  }],
  savedArticles: [{ type: String }], // Article slugs
  interests: [{ type: String }], // Topics user has shown interest in

  // Activity tracking
  lastVisited: { type: Date },
  visitCount: { type: Number, default: 0 },
});
```

---

## ROUTING CHANGES

### Option 1: Make Insights the Home Page (Recommended)

```bash
# Move current home page to /search
mv src/app/page.tsx src/app/search/page.tsx

# Insights becomes the new home
mv src/app/insights/page.tsx src/app/page.tsx

# Update navigation
# Update all internal links from "/" to "/search" for chat+map experience
```

**Routing after change:**
```
/ → Insights (dual-purpose: landing for guests, personalized for users)
/search → Chat + Map experience
/map → Map-only view
/about → Joseph's bio
/dashboard → User dashboard
```

### Option 2: Keep Current Structure, Add Smart Redirect

```typescript
// src/middleware.ts - Add redirect for first-time visitors

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // If visiting root for the first time
  if (pathname === '/') {
    const hasVisited = request.cookies.get('has_visited');

    if (!hasVisited) {
      // First-time visitor → redirect to insights
      const response = NextResponse.redirect(new URL('/insights', request.url));
      response.cookies.set('has_visited', 'true', { maxAge: 60 * 60 * 24 * 365 }); // 1 year
      return response;
    }
  }

  return NextResponse.next();
}
```

---

## MOBILE OPTIMIZATIONS

### Guest Hero Mobile View

```tsx
// Mobile-specific layout for GuestHero
<div className="flex flex-col items-center text-center">
  {/* Smaller circular photo */}
  <div className="w-32 h-32 rounded-full overflow-hidden mb-4">
    <Image src="/joey/about.png" alt="Joseph" fill />
  </div>

  {/* Compact content */}
  <h2 className="text-3xl font-bold mb-2">Joseph Sardella</h2>
  <p className="text-lg text-gray-600 mb-4">Palm Desert Agent</p>

  {/* Stacked CTAs */}
  <div className="space-y-2 w-full">
    <button className="w-full py-3 bg-blue-600 text-white rounded-xl">
      Start Searching
    </button>
    <button className="w-full py-3 border-2 border-blue-600 text-blue-600 rounded-xl">
      View Map
    </button>
  </div>
</div>
```

---

## ANALYTICS & TRACKING

### Track User Journey

```tsx
// Track when users convert from guest to logged in
useEffect(() => {
  if (isAuthenticated && typeof window !== 'undefined') {
    // Check if this is first login after viewing guest hero
    const viewedGuestHero = localStorage.getItem('viewed_guest_hero');

    if (viewedGuestHero) {
      // Track conversion
      if (window.gtag) {
        window.gtag('event', 'guest_to_user_conversion', {
          source: 'insights_page'
        });
      }

      localStorage.removeItem('viewed_guest_hero');
    }
  }
}, [isAuthenticated]);

// Track guest hero views
useEffect(() => {
  if (!isAuthenticated && typeof window !== 'undefined') {
    localStorage.setItem('viewed_guest_hero', 'true');
  }
}, [isAuthenticated]);
```

---

## TESTING CHECKLIST

### Guest Experience
- [ ] Hero displays Joseph's photo and bio
- [ ] CTAs navigate to correct pages
- [ ] Market stats show general Coachella Valley data
- [ ] Articles display correctly
- [ ] Sign in CTA works
- [ ] Mobile layout responsive

### Logged In Experience
- [ ] Welcome message shows user's first name
- [ ] Quick stats display correct counts
- [ ] Personalized market stats based on favorites
- [ ] Recommended articles relevant to user
- [ ] Saved articles accessible
- [ ] All links functional

### Auth Transitions
- [ ] No flash of wrong content on page load
- [ ] Smooth transition when logging in
- [ ] Smooth transition when logging out
- [ ] Loading states during auth check

---

## CONCLUSION

This transformation achieves:

1. **Brand Introduction** - Guests immediately see Joseph as the local expert
2. **Value Demonstration** - Market insights and educational content build trust
3. **Personalization** - Logged-in users get tailored experience
4. **Seamless Flow** - Natural progression from guest → sign up → personalized

**Timeline:**
- **Week 1**: Build GuestHero and UserHero components
- **Week 2**: Add auth logic, conditional rendering
- **Week 3**: Build personalization APIs
- **Week 4**: Mobile optimization, testing, launch

Ready to start building? 🚀
