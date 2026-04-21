# Agent 8: Campaigns & Analytics

**Runs:** Parallel (after Agents 1-3 complete)
**Estimated Time:** 3-5 weeks

---

## Mission

Build the campaign management system and analytics dashboards for React Native. Multi-step campaign wizards, multi-channel execution (voicemail, email, SMS, direct mail, digital ads), performance tracking, and market analytics.

---

## Component Inventory (30-40 components)

### Campaign List & Dashboard

| Component | Complexity | Notes |
|---|---|---|
| **CampaignCard.tsx** | LOW | Delegates to GridView/ListView. Simple refactored version. |
| **GridView.tsx** | LOW | Card layout with status badge, strategy icons, stats |
| **ListView.tsx** | LOW | Compact row layout |
| **CampaignInfo.tsx** | LOW | Name, type, date display |
| **EngagementBars.tsx** | MEDIUM | Visual bars — replace with RN progress bars or chart |
| **StatsDisplay.tsx** | MEDIUM | Uses Recharts — replace with react-native-chart-kit |
| **StatusBadge.tsx** | LOW | Colored badge from shared |
| **StrategyIcons.tsx** | LOW | Channel icons (phone, mail, ad, etc.) |
| **CampaignDetailPanel.tsx** | HIGH | Tabbed detail panel (overview, contacts, history, analytics). Convert to full screen with tab navigator. |
| **CampaignOverview.tsx** | MEDIUM | Overview section with metrics |
| **CampaignContactsManager.tsx** | MEDIUM | Contact list for campaign |
| **CampaignFilters.tsx** | MEDIUM | Filter by type, status, date. Bottom sheet. |
| **DeleteCampaignModal.tsx** | LOW | Confirmation dialog |

### Campaign Wizard (Multi-Step)

| Component | Complexity | Notes |
|---|---|---|
| **CampaignPipelineWizard.tsx** | HIGH | Main wizard orchestrator. Determines simple vs full mode. Manage step state, validation, navigation. |
| **PipelineStepIndicator.tsx** | MEDIUM | Step progress dots/bar. Horizontal stepper. |
| **PipelineContactsStep.tsx** | HIGH | Contact selection with import. Uses ContactSelector (Agent 7). |
| **PipelineScriptsStep.tsx** | MEDIUM | Script generation via AI. Progress tracking. |
| **PipelineReviewStep.tsx** | MEDIUM | Review scripts before audio. Scrollable list. |
| **PipelineAudioStep.tsx** | HIGH | Audio generation with ElevenLabs. Progress tracker. Playback. |
| **PipelineAudioSimpleStep.tsx** | MEDIUM | Simple mode — select pre-recorded audio. |
| **PipelineSendStep.tsx** | MEDIUM | Schedule + send with confirmation. |
| **PipelineSendSimpleStep.tsx** | LOW | Simple send. |

### Channel-Specific Wizards

| Component | Complexity | Notes |
|---|---|---|
| **GoogleAdsPipelineWizard.tsx** | HIGH | Google Ads campaign setup. Account connection, targeting, budget. |
| **MetaAdsPipelineWizard.tsx** | HIGH | Facebook/Instagram ads setup. Similar to Google. |
| **DirectMailPipelineWizard.tsx** | HIGH | Thanks.io integration. Mail type, design, QR, address validation. |
| **CommunityAdWizard.tsx** | MEDIUM | Community advertising with landing page and blog post selection. |
| **DigitalAdsPipelineWizard.tsx** | MEDIUM | Combined digital ads. |

### Contact & Audience Selection

| Component | Complexity | Notes |
|---|---|---|
| **ContactSelector.tsx** | HIGH | Multi-select with search, tag filters, status filters, quick-select by tag. Critical component shared with Agent 7. |
| **PinDropMap.tsx** | MEDIUM | Radius-based targeting on map. Uses react-native-maps (Agent 5). |

### Media & Recording

| Component | Complexity | Notes |
|---|---|---|
| **VoiceRecorder.tsx** | MEDIUM | Record voice for voicemail. Replace MediaRecorder with react-native-audio-recorder-player (Agent 6 pattern). |
| **VoicemailScriptViewer.tsx** | MEDIUM | View script + play audio. |
| **GenerationProgressTracker.tsx** | MEDIUM | Real-time progress for script/audio generation. Polling-based. |

### Utility Components

| Component | Complexity | Notes |
|---|---|---|
| **AdAccountsSetup.tsx** | MEDIUM | Google/Meta account OAuth connection. Use react-native-app-auth. |
| **ProfileCompletionModal.tsx** | LOW | Prompt to complete profile before campaign. |
| **CampaignScriptsList.tsx** | LOW | List of generated scripts. |

### Analytics & Insights

| Component | Complexity | Notes |
|---|---|---|
| **AppreciationCard.tsx** | MEDIUM | Property appreciation metrics |
| **ComparisonCard.tsx** | MEDIUM | Multi-location comparison |
| **MarketStats.tsx** | MEDIUM | Market indicators (mortgage rates, economic data) |
| **CommunitySpotlight.tsx** | LOW | Community highlight |
| **FaveSpot.tsx** | LOW | Favorite spotlight |

### Chart Components (All need Recharts → RN chart lib)

| Component | Chart Type | RN Replacement |
|---|---|---|
| **DaysOnMarket.tsx** | Bar chart | `BarChart` from react-native-chart-kit |
| **HighVsLowSalePriceChart.tsx** | Comparison bars | `BarChart` grouped |
| **ListPriceVsExpired.tsx** | Plot | `LineChart` |
| **PricePerSqftChart.tsx** | Bar | `BarChart` |
| **PriceRangeChart.tsx** | Range display | Custom component |
| **SaleListPriceMetrics.tsx** | Metrics | `BarChart` |
| **SalesVsExpired.tsx** | Comparison | `BarChart` |
| **AnnualReview.tsx** | Timeline | `LineChart` |
| **QuarterlyAnalysis.tsx** | Grouped bars | `BarChart` |
| **CMA charts (8 files)** | Various | Various chart types |

### Insights Hub Components

| Component | Complexity | Notes |
|---|---|---|
| **AISearchBar.tsx** | MEDIUM | AI-powered search |
| **ArticleCard.tsx** | LOW | Insight article card |
| **ArticleAccordion.tsx** | LOW | Expandable article list |
| **CategoryFilter.tsx** | LOW | Tab/chip filtering |
| **DateFilter.tsx** | LOW | Date range picker |
| **FilterTabs.tsx** | LOW | Tab-based filters |
| **TopicCloud.tsx** | MEDIUM | Tag cloud — convert to chip/pill grid |
| **BrowseByCityGrid.tsx** | LOW | City grid — FlatList numColumns |
| **AgentHero.tsx** | LOW | Agent info section |
| **AccountBentoGrid.tsx** | MEDIUM | Dashboard grid layout |
| **InsightsCTABanner.tsx** | LOW | CTA banner |

---

## Key Conversion Challenges

### 1. Multi-Step Campaign Wizard

The wizard is the most complex UI in this domain. Current web flow:

**Voicemail (Full Mode):** Contacts → Scripts → Review → Audio → Send
**Voicemail (Simple):** Contacts → Audio Selection → Send
**Direct Mail:** Design → Recipients → Review → Submit
**Digital Ads:** Platform → Targeting → Creative → Budget → Launch

Mobile implementation:

```typescript
// Use a step-based pattern with state machine
const [currentStep, setCurrentStep] = useState(0);
const [wizardData, setWizardData] = useState<WizardData>({});
const [completedSteps, setCompletedSteps] = useState<number[]>([]);

const steps = [
  { title: 'Audience', component: ContactsStep, validate: validateContacts },
  { title: 'Scripts', component: ScriptsStep, validate: validateScripts },
  { title: 'Review', component: ReviewStep, validate: validateReview },
  { title: 'Audio', component: AudioStep, validate: validateAudio },
  { title: 'Send', component: SendStep, validate: validateSend },
];
```

**Step Indicator:** Horizontal dots/bar at the top showing progress:
```
○ ● ● ○ ○
Audience → Scripts → Review → Audio → Send
```

**Navigation:** Next/Back buttons at bottom. Disable Next until step validates.

### 2. ContactSelector (Shared with Agent 7)

This is used in campaign wizard for audience selection:

```
┌─────────────────────────────────┐
│ [🔍 Search contacts...      ] │
│ [Tag1] [Tag2] [All Clients] → │  ← Quick-select by tag
│                                 │
│ ☑ John Smith     (555) 123-... │
│ ☑ Jane Doe       jane@email... │
│ ☐ Bob Wilson     (555) 456-... │
│ ☐ Alice Brown    alice@emai... │
│ ...                             │
│                                 │
│ [3 contacts selected]           │
│ [Next →]                        │
└─────────────────────────────────┘
```

Features:
- Search with debounce
- Quick-select entire tag/label group
- Multi-select with checkboxes
- Selected count indicator
- Select all / deselect all

### 3. Script Generation Progress

The web uses `GenerationProgressTracker` to show AI script generation progress:

```typescript
// Poll generation session status
useEffect(() => {
  const interval = setInterval(async () => {
    const session = await fetch(`/api/campaigns/${id}/generation-session`);
    const data = await session.json();
    setProgress({
      total: data.totalItems,
      completed: data.successCount + data.failureCount,
      current: data.lastProcessedIndex,
    });
    if (data.status === 'completed' || data.status === 'failed') {
      clearInterval(interval);
    }
  }, 2000);
  return () => clearInterval(interval);
}, []);
```

Mobile: Same polling pattern. Show progress bar with percentage:
```
Generating scripts... 15/30
[████████████░░░░░░░░░░░░] 50%
```

### 4. Audio Playback & Recording

**Playback (script preview):**
```typescript
import Sound from 'react-native-sound';

const playScript = async (scriptId: string) => {
  const url = `/api/campaigns/${campaignId}/scripts/${scriptId}/audio`;
  const sound = new Sound(url, '', (error) => {
    if (!error) {
      sound.play(() => sound.release());
    }
  });
};
```

**Recording (custom voicemail):**
Use same pattern as Agent 6 — `react-native-audio-recorder-player`.

### 5. Charts (Recharts → react-native-chart-kit)

All 20+ chart components need migration. Pattern:

```typescript
// Web (Recharts)
import { BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

<BarChart data={data}>
  <XAxis dataKey="name" />
  <YAxis />
  <Bar dataKey="value" fill="#8884d8" />
</BarChart>

// Mobile (react-native-chart-kit)
import { BarChart } from 'react-native-chart-kit';

<BarChart
  data={{
    labels: data.map(d => d.name),
    datasets: [{ data: data.map(d => d.value) }],
  }}
  width={screenWidth - 32}
  height={220}
  chartConfig={{
    backgroundColor: '#fff',
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    color: (opacity = 1) => `rgba(136, 132, 216, ${opacity})`,
  }}
/>
```

**Alternative:** `victory-native` provides more chart types and customization, closer to Recharts API.

### 6. Direct Mail Preview

Web shows front/back image preview of postcards. Mobile:
- Two `Image` components (front/back) with tap to zoom
- Mail type selector (postcard sizes, letter, notecard)
- Address verification display
- QR code preview (`react-native-qrcode-svg`)

### 7. Ad Account OAuth

Web uses popup windows for Google/Meta OAuth. Mobile:
- Use `react-native-app-auth` for OAuth flow
- Opens system browser → returns to app with auth code
- Store tokens securely

---

## Navigation Structure

```
CampaignsStack (in AgentTabs)
├── CampaignList (with filters, search, grid/list toggle)
├── CampaignDetail (params: { campaignId })
│   ├── Tab: Overview
│   ├── Tab: Contacts
│   ├── Tab: History
│   └── Tab: Analytics
├── NewCampaign (params: { type? })
│   └── CampaignWizard (step-based)
├── VoicemailWizard
├── DirectMailWizard
├── DigitalAdsWizard
└── CommunityAdWizard

InsightsStack (in ConsumerTabs or AgentTabs)
├── InsightsHub
├── CategoryList (params: { category })
├── ArticleDetail (params: { slugId })
└── MarketAnalysis
```

---

## API Endpoints Used

### Campaign CRUD
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/campaigns/list` | GET | List with analytics aggregation |
| `/api/campaigns/create` | POST | Create campaign |
| `/api/campaigns/[id]` | GET/PATCH | Get/update campaign |
| `/api/campaigns/[id]/archive` | POST | Archive campaign |
| `/api/campaigns/[id]/contacts` | GET | Campaign contacts |

### Scripts & Audio
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/campaigns/[id]/generate-scripts` | POST | AI script generation |
| `/api/campaigns/[id]/scripts` | GET | List scripts |
| `/api/campaigns/[id]/scripts/update` | POST | Batch update scripts |
| `/api/campaigns/[id]/scripts/[scriptId]` | GET/PATCH | Single script |
| `/api/campaigns/[id]/generate-audio` | POST | Batch audio generation |
| `/api/campaigns/[id]/scripts/[scriptId]/generate-audio` | POST | Single audio gen |
| `/api/campaigns/[id]/scripts/[scriptId]/preview-audio` | GET | Audio preview |
| `/api/campaigns/[id]/scripts/[scriptId]/upload-audio` | POST | Upload custom audio |

### Execution
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/campaigns/[id]/send` | POST | Send voicemail campaign |
| `/api/campaigns/[id]/send-simple` | POST | Simple send |
| `/api/campaigns/[id]/history` | GET | Execution history |
| `/api/campaigns/[id]/generation-session` | GET/POST | Progress tracking |
| `/api/campaigns/[id]/test-sample-script` | POST | Test with Drop Cowboy |

### Ads
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/campaigns/[id]/save-ads` | POST | Save ad config |
| `/api/campaigns/[id]/launch-ads` | POST | Launch Google/Meta ads |

### Analytics
| Endpoint | Method | Purpose |
|---|---|---|
| `/api/analytics/market-stats` | GET | Market statistics |
| `/api/analytics/appreciation` | GET | Appreciation data |
| `/api/analytics/subdivision-lookup` | GET | Subdivision analytics |
| `/api/insights/community-spotlight` | GET | Community data |
| `/api/insights/favorite-spotlight` | GET | Favorite analysis |

---

## Database Models (for context — stay server-side)

| Model | Key Fields | Agent Needs to Know |
|---|---|---|
| **Campaign** | type, status, activeStrategies, stats, integration configs | Status flow: draft → generating → review → approved → active → completed |
| **CampaignExecution** | strategy, status, metrics by channel | Tracks delivery metrics per send |
| **ContactCampaign** | status, isDuplicate, daysSinceLastContact | Junction table — anti-spam tracking |
| **VoicemailScript** | script text, audio URL, review status, delivery status | Per-contact personalized scripts |
| **DirectMailPiece** | mailType, images, QR tracking, delivery status | Per-contact mail pieces |
| **AdCampaignRecord** | platform, metrics snapshot, spend | Time-series ad performance |
| **GenerationSession** | progress tracking, resume capability | Long-running operation tracking |

---

## Campaign Type Reference

| Type | Channels | Notes |
|---|---|---|
| `sphere_of_influence` | Voicemail, Email, SMS | Past contacts outreach |
| `past_clients` | Voicemail, Email | Client re-engagement |
| `neighborhood_expireds` | Voicemail, Direct Mail | Expired listing targeting |
| `high_equity` | Voicemail, Direct Mail | High-equity homeowner outreach |
| `custom` | Any combination | User-defined campaign |
| `direct_mail` | Direct Mail only | Thanks.io postcards/letters |
| `digital_ads` | Google/Meta Ads | Digital advertising |
| `multi_channel` | All channels | Full multi-channel campaign |

---

## External Dependencies

| Library | Purpose | Replaces |
|---|---|---|
| `react-native-chart-kit` or `victory-native` | All charts | Recharts |
| `react-native-audio-recorder-player` | Voice recording | MediaRecorder API |
| `react-native-sound` | Audio playback | Web Audio API |
| `react-native-qrcode-svg` | QR code display | qrcode.react |
| `react-native-app-auth` | Ad account OAuth | Browser popup OAuth |
| `react-native-maps` | PinDropMap, radius targeting | MapLibre (via Agent 5) |
| `react-native-date-picker` | Schedule date/time selection | HTML date input |
| `@gorhom/bottom-sheet` | Filter panels, quick views | Headless UI dialogs |
| `react-native-progress` | Progress bars | CSS progress bars |

---

## Deliverables Checklist

### Campaign Management
- [ ] Campaign list screen with grid/list toggle
- [ ] Campaign filters (type, status, date) in bottom sheet
- [ ] Campaign detail screen with tabs (Overview, Contacts, History, Analytics)
- [ ] Campaign delete confirmation

### Campaign Wizards
- [ ] Step indicator component (horizontal dots with labels)
- [ ] Voicemail wizard (full mode: 5 steps)
- [ ] Voicemail wizard (simple mode: 3 steps)
- [ ] Direct mail wizard
- [ ] Digital ads wizard (Google + Meta)
- [ ] Community ad wizard
- [ ] Contact selector with search, tags, quick-select
- [ ] Script generation with progress tracking
- [ ] Script review list with edit capability
- [ ] Audio generation with progress tracking
- [ ] Audio playback for preview
- [ ] Voice recording for custom voicemail
- [ ] Schedule picker (date + time)
- [ ] Send confirmation with cost estimate

### Analytics & Charts
- [ ] All 20+ chart components migrated to RN chart library
- [ ] AppreciationCard with metrics
- [ ] ComparisonCard for location comparison
- [ ] MarketStats dashboard
- [ ] Campaign performance metrics display

### Insights Hub
- [ ] Insights home screen
- [ ] Category filtering
- [ ] Article list and detail views
- [ ] AI search bar
- [ ] Community spotlight
- [ ] Browse by city grid

### Ad Integration
- [ ] Google Ads account connection via OAuth
- [ ] Meta Ads account connection via OAuth
- [ ] Ad campaign configuration screens
- [ ] Ad performance metrics display

---

## Dependencies

| From | What We Need |
|---|---|
| Agent 1 | Base components, navigation, theme, Firebase |
| Agent 2 | Campaign types, analytics calculations, CMA types, constants |
| Agent 3 | Pre-converted component files |
| Agent 5 | react-native-maps for PinDropMap |
| Agent 6 | Audio recording/playback patterns |
| Agent 7 | ContactSelector component, contact data integration |
