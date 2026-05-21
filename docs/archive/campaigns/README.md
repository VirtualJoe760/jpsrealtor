# Campaign System Documentation

**Last Updated:** 2026-05-11
**Status:** ✅ Production — voicemail, direct mail, and Meta ads all verified launching end-to-end
**Architecture:** Multi-channel marketing (Voicemail · Direct Mail · Meta Ads · Google PPC · YouTube) with per-agent OAuth and a unified credits system

---

## 📚 Start Here

**→ [CAMPAIGNS_CURRENT_STATE.md](./CAMPAIGNS_CURRENT_STATE.md)** — Single source of truth for the system. File paths, API routes, model schemas, credit math, OAuth flow, what's built, what's pending.

If you need the multi-tenant rollout plan: **[../multi-tenant/advertising/campaign-multi-tenant.md](../multi-tenant/advertising/campaign-multi-tenant.md)** — 5-phase plan from creds threading through nightly settle.

---

## Topic Docs

### Digital Ads (Meta / Google / YouTube)
- **[AD_PLATFORMS_OPTIONS.md](./AD_PLATFORMS_OPTIONS.md)** — Platform capability reference (campaign types, scopes, bid strategies)
- **[../ad-campaign-setup/PAID_ADS_STRATEGY_RESEARCH.md](../ad-campaign-setup/PAID_ADS_STRATEGY_RESEARCH.md)** — Keyword data + benchmarks for Coachella Valley
- **[../ad-campaign-setup/CRM_AUDIENCE_INTEGRATION.md](../ad-campaign-setup/CRM_AUDIENCE_INTEGRATION.md)** — How CRM contacts map to Meta/Google audiences
- **[../ad-campaign-setup/TRACKING_STRATEGY.md](../ad-campaign-setup/TRACKING_STRATEGY.md)** — Conversion tracking via Pixel + GA4
- **[../ad-campaign-setup/GOOGLE_ADS_SETUP.md](../ad-campaign-setup/GOOGLE_ADS_SETUP.md)** — Google Ads conversion tracking notes

### Voicemail
- **[VOICEMAIL_SIMPLE_WORKFLOW_USER_GUIDE.md](./VOICEMAIL_SIMPLE_WORKFLOW_USER_GUIDE.md)** — End-user guide
- **[VOICEMAIL_SCRIPT_GENERATION.md](./VOICEMAIL_SCRIPT_GENERATION.md)** — AI script generation (Groq) + ElevenLabs voice
- **[README_VOICEMAIL_SIMPLIFIED.md](./README_VOICEMAIL_SIMPLIFIED.md)** — Why the simplified workflow exists (Drop Cowboy upload limitation)
- **[VOICEMAIL_FULL_PIPELINE_PRESERVED.md](./VOICEMAIL_FULL_PIPELINE_PRESERVED.md)** — Full-pipeline code preserved for future BYOC activation
- **[DROP_COWBOY_ARCHITECTURE.md](./DROP_COWBOY_ARCHITECTURE.md)** — Drop Cowboy integration architecture
- **[DROP_COWBOY_API_LIMITATIONS.md](./DROP_COWBOY_API_LIMITATIONS.md)** — Known API limitations (no audio upload without BYOC)
- **[DROP_COWBOY_INTEGRATION_COMPLETE.md](./DROP_COWBOY_INTEGRATION_COMPLETE.md)** — Marker doc: when Drop Cowboy shipped
- **[RECORDING_SELECTOR_COMPONENT_SPEC.md](./RECORDING_SELECTOR_COMPONENT_SPEC.md)** — `PipelineAudioSimpleStep` component spec

### Prospect Discovery (Contact CSV import + swipe organization)
- **[PROSPECT_DISCOVERY_README.md](./PROSPECT_DISCOVERY_README.md)** — Feature overview
- **[PROSPECT_DISCOVERY_IMPLEMENTATION_GUIDE.md](./PROSPECT_DISCOVERY_IMPLEMENTATION_GUIDE.md)** — Architecture + code paths
- **[PROSPECT_DISCOVERY_TESTING_GUIDE.md](./PROSPECT_DISCOVERY_TESTING_GUIDE.md)** — Test scenarios
- **[PROSPECT_DISCOVERY_COMPLETE.md](./PROSPECT_DISCOVERY_COMPLETE.md)** — Marker doc: when Prospect Discovery shipped
- **[TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md)** — Quick test checklist

### UI / Components
- **[CAMPAIGNS_UI_README.md](./CAMPAIGNS_UI_README.md)** — Card-grid + side-panel UI patterns
- **[CONTACT_BANNER_PHOTO_STRATEGY.md](./CONTACT_BANNER_PHOTO_STRATEGY.md)** — Banner image fetching for contact view

### Historical (kept for context — not the current state)
- **[CAMPAIGN_STRATEGY_ARCHITECTURE.md](./CAMPAIGN_STRATEGY_ARCHITECTURE.md)** — Original multi-channel architecture vision
- **[CAMPAIGN_SYSTEM_VISION.md](./CAMPAIGN_SYSTEM_VISION.md)** — Original vision for ads + direct mail
- **[PIPELINE_STATUS.md](./PIPELINE_STATUS.md)** — Snapshot from the voicemail-only era (Jan 2026)

---

## Quick Reference

### The 3 Strategies an agent can run on a campaign

| Strategy | Wizard | Backend |
|---|---|---|
| **Voicemail** | `CampaignPipelineWizard` | Drop Cowboy + 11Labs + Groq |
| **Direct Mail** | `DirectMailPipelineWizard` | thanks.io |
| **Digital Ads** | `CommunityAdWizard` | Meta Marketing API + Google Ads + (YouTube planned) |

### Where Meta / Google / Credits live

| Concern | Path |
|---|---|
| Meta API client | `src/lib/meta-ads-api.ts` |
| Google Ads client | `src/lib/google-ads-api.ts` |
| Direct mail client | `src/lib/thanksio.ts` |
| Credits config (rates, tiers) | `src/config/credits.ts` |
| Credits operations | `src/lib/credits.ts` |
| Meta OAuth | `src/app/api/auth/meta-ads/{connect,callback,disconnect}` |
| Ad-runs management | `src/app/api/campaigns/[id]/ad-runs` (GET/PATCH/DELETE) |
