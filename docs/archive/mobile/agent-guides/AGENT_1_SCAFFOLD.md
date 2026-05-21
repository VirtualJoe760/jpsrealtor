# Agent 1: Project Scaffold & Foundation

**Runs:** First (sequential — all other agents depend on this)
**Estimated Time:** 1-2 weeks

---

## Mission

Set up the React Native project, configure navigation, establish the design system, build base UI components, and create the monorepo workspace structure. Every other agent builds on top of this work.

---

## Step 1: Monorepo Structure

Create the workspace layout:

```
jpsrealtor/
├── packages/
│   ├── shared/        # Agent 2 populates this
│   ├── web/           # Move current Next.js app here
│   └── mobile/        # New React Native app
├── package.json       # Workspace root (npm/yarn/pnpm workspaces)
├── tsconfig.base.json # Shared TS config
```

- Use `pnpm workspaces` or `yarn workspaces`
- Create `tsconfig.base.json` with shared compiler options
- Each package gets its own `tsconfig.json` extending the base
- Preserve all existing path aliases (`@/*`, `@/components/*`, etc.) for the web app

---

## Step 2: React Native Project Init

```bash
npx react-native init jpsrealtor-mobile --template react-native-template-typescript
```

Key dependencies to install immediately:

### Navigation
- `@react-navigation/native`
- `@react-navigation/native-stack`
- `@react-navigation/bottom-tabs`
- `@react-navigation/drawer`
- `react-native-screens`
- `react-native-safe-area-context`

### UI Foundation
- `nativewind` (Tailwind CSS for React Native — critical for conversion speed)
- `tailwindcss` (peer dependency for NativeWind)
- `react-native-reanimated` (replaces Framer Motion)
- `react-native-gesture-handler` (touch gestures)

### Maps
- `react-native-maps` (Google Maps on both platforms)

### Auth & Storage
- `react-native-keychain` (secure token storage)
- `@react-native-async-storage/async-storage` (replaces localStorage)

### Push Notifications
- `@react-native-firebase/app`
- `@react-native-firebase/messaging`
- `react-native-push-notification`

### Media
- `react-native-image-picker` (camera/gallery)
- `react-native-fast-image` (replaces next/image)

### Networking
- `socket.io-client` (already in project — works in RN)
- `axios` (already in project — works in RN)

### Charts
- `react-native-chart-kit` or `victory-native` (replaces Recharts)

---

## Step 3: Navigation Architecture

Build the navigator structure matching the web app's routing:

```
RootNavigator (Stack)
├── AuthStack (Stack)
│   ├── SignIn
│   ├── SignUp
│   ├── ForgotPassword
│   ├── ResetPassword
│   ├── VerifyEmail
│   └── TwoFactor
│
├── ConsumerTabs (Bottom Tab)
│   ├── Search (Stack)
│   │   ├── SearchMain (filters + list)
│   │   └── ListingDetail
│   ├── Map (Stack)
│   │   ├── MapMain
│   │   └── ListingDetail
│   ├── Favorites (Stack)
│   │   ├── FavoritesList
│   │   └── ListingDetail
│   ├── Chat (Stack)
│   │   ├── ChatList
│   │   └── ChatConversation
│   └── Profile (Stack)
│       ├── ProfileMain
│       ├── Settings
│       └── Notifications
│
├── AgentTabs (Bottom Tab) — for agent role
│   ├── Dashboard
│   ├── CRM (Stack)
│   │   ├── ContactList
│   │   ├── ContactDetail
│   │   └── AddContact
│   ├── Campaigns (Stack)
│   │   ├── CampaignList
│   │   ├── CampaignDetail
│   │   └── CampaignWizard
│   ├── Messages (Stack)
│   │   ├── ConversationList
│   │   ├── SMSThread
│   │   └── EmailInbox
│   └── More (Stack)
│       ├── Analytics
│       ├── CMS (limited)
│       ├── VoiceTraining
│       └── Settings
```

### Key Navigation Decisions
- **Deep linking:** Configure universal links (iOS) and app links (Android) early. Map web URLs to RN screens.
- **Auth guard:** Wrap consumer/agent tabs in auth check. Redirect to AuthStack if no token.
- **Role switching:** If user has agent role, show AgentTabs. Otherwise, ConsumerTabs.

### Web Route → RN Screen Mapping

| Web Route | RN Screen | Navigator |
|---|---|---|
| `/mls-listings` | SearchMain | ConsumerTabs > Search |
| `/mls-listings/[slug]` | ListingDetail | ConsumerTabs > Search |
| `/map` | MapMain | ConsumerTabs > Map |
| `/neighborhoods` | NeighborhoodList | ConsumerTabs > Search |
| `/neighborhoods/[city]` | CityDetail | ConsumerTabs > Search |
| `/neighborhoods/[city]/[sub]` | SubdivisionDetail | ConsumerTabs > Search |
| `/insights` | InsightsMain | ConsumerTabs > Profile |
| `/auth/signin` | SignIn | AuthStack |
| `/auth/signup` | SignUp | AuthStack |
| `/agent/contacts` | ContactList | AgentTabs > CRM |
| `/agent/campaigns` | CampaignList | AgentTabs > Campaigns |
| `/agent/campaigns/new` | CampaignWizard | AgentTabs > Campaigns |
| `/agent/messages` | ConversationList | AgentTabs > Messages |
| `/dashboard` | Dashboard | AgentTabs > Dashboard |

---

## Step 4: Theme & Design System

### NativeWind Configuration

The web app uses Tailwind extensively. NativeWind lets us keep the same class names:

```js
// tailwind.config.js (mobile)
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Copy colors from web tailwind.config.ts
      colors: {
        neutral: { /* ... */ },
        foreground: { /* ... */ },
        // etc.
      },
      fontFamily: {
        sans: ['Jost'],
        heading: ['Raleway'],
      },
    },
  },
};
```

### Theme Context

Port from web's `src/app/contexts/ThemeContext.tsx`:
- Support `lightgradient` and `blackspace` themes
- Store preference in AsyncStorage (replaces cookies)
- Inject theme via React Context
- NativeWind handles class-based dark mode

### Base Components to Build

These are the atomic building blocks every other agent will use:

| Component | Replaces (Web) | Notes |
|---|---|---|
| `Button` | `<button>` | Primary, secondary, ghost, destructive variants |
| `TextInput` | `<input>` | With label, error state, icon slots |
| `Card` | `<div className="...card...">` | Elevated card with shadow |
| `Modal` | Headless UI Dialog | `react-native-modal` or custom with Reanimated |
| `BottomSheet` | Headless UI Dialog (mobile) | `@gorhom/bottom-sheet` |
| `Avatar` | ContactAvatar.tsx | Initials or image |
| `Badge` | StatusBadge.tsx | Status indicators |
| `Tag` | Label chips | Colored tag pills |
| `Toast` | react-toastify | `react-native-toast-message` |
| `Skeleton` | Loading skeletons | Shimmer placeholder |
| `IconButton` | Icon + button combos | Heroicons → Lucide RN or custom SVGs |
| `Tabs` | Headless UI Tabs | Tab bar component |
| `SearchBar` | MapSearchBar | Text input with icon + clear button |
| `EmptyState` | Various empty states | Icon + message + CTA |
| `ErrorState` | Error boundaries | Error icon + retry button |
| `ListItem` | Various list items | Pressable row with chevron |
| `Divider` | `<hr>` or border classes | Thin line separator |
| `LoadingOverlay` | Spinner overlays | Centered activity indicator |

### Icon System

The web app uses:
- `lucide-react` (primary)
- `@heroicons/react` (secondary)
- `react-icons` (tertiary)

For RN, use `lucide-react-native` which has the same icon names. Map heroicons to closest lucide equivalents.

---

## Step 5: Auth Infrastructure

### Token-Based Auth (replaces NextAuth cookies)

The web app uses NextAuth with JWT strategy. For mobile:

1. **Login flow:**
   - POST to `/api/auth/callback/credentials` with email/password
   - Receive JWT token
   - Store in `react-native-keychain` (secure, encrypted)

2. **OAuth flow:**
   - Use `react-native-app-auth` for Google/Facebook OAuth
   - Exchange OAuth token with backend for JWT
   - Store JWT in keychain

3. **Token refresh:**
   - Implement refresh token rotation
   - Attach JWT to all API requests via Axios interceptor
   - Auto-refresh on 401 response

4. **Auth Context:**
   ```typescript
   interface AuthContext {
     user: User | null;
     token: string | null;
     isLoading: boolean;
     signIn: (email: string, password: string) => Promise<void>;
     signInWithGoogle: () => Promise<void>;
     signInWithFacebook: () => Promise<void>;
     signOut: () => Promise<void>;
     refreshToken: () => Promise<void>;
   }
   ```

### Backend Changes Required

The existing NextAuth setup uses cookie-based sessions. Add a parallel token-based auth option:

- New endpoint: `POST /api/auth/mobile/login` → returns `{ accessToken, refreshToken }`
- New endpoint: `POST /api/auth/mobile/refresh` → returns new `{ accessToken }`
- Middleware: Accept `Authorization: Bearer <token>` header alongside existing cookie auth
- This is additive — web app continues using cookies unchanged

---

## Step 6: API Client

Create a shared API client that both web and mobile can use:

```typescript
// packages/shared/src/api-client.ts
class APIClient {
  private baseURL: string;
  private getToken: () => Promise<string | null>;

  constructor(config: { baseURL: string; getToken: () => Promise<string | null> }) {
    this.baseURL = config.baseURL;
    this.getToken = config.getToken;
  }

  // Listings
  async getListings(params: ListingSearchParams): Promise<MapListing[]> { ... }
  async getListingDetail(slug: string): Promise<ListingData> { ... }
  async getListingPhotos(listingKey: string): Promise<Photo[]> { ... }

  // Favorites
  async getFavorites(): Promise<FavoriteProperty[]> { ... }
  async addFavorite(listingKey: string): Promise<void> { ... }
  async removeFavorite(listingKey: string): Promise<void> { ... }

  // Chat
  async sendChatMessage(message: ChatRequest): Promise<ReadableStream> { ... }
  async saveChat(chat: SavedChat): Promise<void> { ... }

  // Contacts
  async getContacts(params?: ContactSearchParams): Promise<Contact[]> { ... }
  async createContact(data: Partial<Contact>): Promise<Contact> { ... }
  async updateContact(id: string, data: Partial<Contact>): Promise<Contact> { ... }

  // Campaigns
  async getCampaigns(): Promise<Campaign[]> { ... }
  async createCampaign(data: Partial<Campaign>): Promise<Campaign> { ... }

  // SMS
  async getConversations(): Promise<Conversation[]> { ... }
  async sendSMS(to: string, body: string): Promise<SMSMessage> { ... }

  // ... etc
}
```

---

## Step 7: Firebase Setup

### iOS
- Create Firebase project
- Add iOS app with bundle identifier
- Download `GoogleService-Info.plist`
- Configure APNs for push notifications

### Android
- Add Android app with package name
- Download `google-services.json`
- Configure FCM

### Push Notification Handler
```typescript
// Handle foreground notifications
messaging().onMessage(async remoteMessage => {
  // Show local notification
});

// Handle background/quit notifications
messaging().setBackgroundMessageHandler(async remoteMessage => {
  // Process silently
});

// Register device token
const token = await messaging().getToken();
// POST to /api/push/subscribe with { deviceToken, platform: 'ios'|'android' }
```

**Backend change needed:** Update `/api/push/subscribe` to accept FCM device tokens alongside web push subscriptions.

---

## Step 8: App Store Prep (Parallel)

While building, prepare:

### iOS
- Apple Developer account ($99/year)
- App ID and provisioning profiles
- App Store Connect listing (name, description, screenshots placeholders)
- Privacy policy URL (already at `/privacy-policy`)

### Android
- Google Play Console ($25 one-time)
- App signing key
- Play Store listing (name, description, screenshots placeholders)
- Privacy policy URL

---

## Deliverables Checklist

- [ ] Monorepo workspace configured and building
- [ ] React Native project initialized with TypeScript
- [ ] All navigation dependencies installed
- [ ] Full navigator structure implemented (Auth, Consumer, Agent)
- [ ] NativeWind configured with web app's color/font tokens
- [ ] Theme context ported (light/dark with AsyncStorage persistence)
- [ ] All base UI components built (Button through LoadingOverlay)
- [ ] Auth infrastructure (keychain storage, token refresh, OAuth)
- [ ] API client skeleton with typed methods
- [ ] Firebase project created, FCM configured
- [ ] Deep linking configuration
- [ ] App store accounts and initial listings created

---

## Dependencies on Other Agents

| Agent | What They Need From Us |
|---|---|
| Agent 2 (Shared) | Monorepo workspace structure must exist |
| Agent 3 (Script) | RN project must exist to receive converted files |
| Agents 4-8 | Navigation structure, base components, theme, auth context, API client |

## What We Need From Others

| From | What |
|---|---|
| Agent 2 | Shared types package for API client typing |

**Note:** Agent 2 can work in parallel once the workspace structure from Step 1 is complete.
