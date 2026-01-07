# Campaign System Documentation

**Last Updated:** January 6, 2026
**Current Status:** ✅ Production-Ready for Voicemail Campaigns
**System Focus:** Linear Pipeline Workflow (Contacts → Scripts → Review → Audio → Send)

---

## 📚 **Documentation Index**

### Current Implementation
- **[PIPELINE_STATUS.md](./PIPELINE_STATUS.md)** - Complete status of what's built vs. what was planned
- **[VOICEMAIL_SCRIPT_GENERATION.md](./VOICEMAIL_SCRIPT_GENERATION.md)** - Script generation system details (Updated Jan 6, 2026)
- **[CAMPAIGN_PANEL_REFACTORING.md](./CAMPAIGN_PANEL_REFACTORING.md)** - Pipeline refactoring approach

### Architecture & Planning
- **[CAMPAIGN_STRATEGY_ARCHITECTURE.md](./CAMPAIGN_STRATEGY_ARCHITECTURE.md)** - Original multi-channel vision
- **[CAMPAIGN_STRATEGY_ACTION_PLAN.md](./CAMPAIGN_STRATEGY_ACTION_PLAN.md)** - 8-9 week implementation plan
- **[CAMPAIGNS_UI_README.md](./CAMPAIGNS_UI_README.md)** - UI design patterns and components
- **[DROP_COWBOY_ARCHITECTURE.md](./DROP_COWBOY_ARCHITECTURE.md)** - Voicemail delivery integration

### Enhancement Planning
- **[VOICEMAIL_ACTION_PLAN.md](./VOICEMAIL_ACTION_PLAN.md)** - Voicemail feature enhancements

---

## 🎯 **Quick Start**

### What Works Right Now
1. **Create Campaign** - Name your campaign, select type
2. **Add Contacts** - Import CSV, add from CRM, or manual entry
3. **Generate Scripts** - 6 templates + custom prompts (AI-generated, 60-80 words)
4. **Review Scripts** - Edit and approve scripts
5. **Add Audio** - Choose AI voice (ElevenLabs) OR record your own
6. **Send** - Send now or schedule for later

### Recent Fixes (Jan 6, 2026)
- ✅ Scripts now display correctly in Review step
- ✅ Using actual user data (no placeholders) in all templates
- ✅ Template-specific content working
- ✅ Script text displays in voice recorder
- ✅ 60-80 word scripts with proper structure
- ✅ Fixed custom prompt logic (only sends if user typed something)
- ✅ Custom prompts now use actual user data instead of placeholders like "[Your Name]", "[First Name]", etc.
- ✅ Bulk script update API endpoint (PUT /api/campaigns/[id]/scripts/update)
- ✅ Voice recording navigation fixed (no longer redirects after recording)
- ✅ **LATEST:** Drop Cowboy integration implemented - campaign send functionality working!

---

## 🏗️ **System Architecture**

### Current State: Single-Channel MVP
**Working:** Voicemail drop campaigns via Drop Cowboy
**Planned:** Multi-channel (Email + SMS + Voicemail)

### Pipeline Flow
```
Campaign Creation
    ↓
Step 1: Contacts (Import/Add)
    ↓
Step 2: Scripts (AI Generation)
    ↓
Step 3: Review (Edit/Approve)
    ↓
Step 4: Audio (AI Voice OR Record)
    ↓
Step 5: Send (Now OR Schedule)
    ↓
Delivery Tracking
```

### Key Components
- **Frontend:** Pipeline wizard with 5 steps
- **Backend:** Next.js API routes
- **Database:** MongoDB with Mongoose
- **AI:** Groq (GPT-OSS 120B) for scripts, ElevenLabs for voice
- **Delivery:** Drop Cowboy integration

---

## 📖 **Documentation Guide**

### For Developers
Start here:
1. [PIPELINE_STATUS.md](./PIPELINE_STATUS.md) - Understand what's built
2. [VOICEMAIL_SCRIPT_GENERATION.md](./VOICEMAIL_SCRIPT_GENERATION.md) - Script generation details
3. [CAMPAIGN_STRATEGY_ARCHITECTURE.md](./CAMPAIGN_STRATEGY_ARCHITECTURE.md) - Long-term vision

### For Product/Planning
Start here:
1. [PIPELINE_STATUS.md](./PIPELINE_STATUS.md) - Current state
2. [VOICEMAIL_ACTION_PLAN.md](./VOICEMAIL_ACTION_PLAN.md) - Enhancement roadmap
3. [CAMPAIGN_STRATEGY_ACTION_PLAN.md](./CAMPAIGN_STRATEGY_ACTION_PLAN.md) - Multi-channel plan

### For UI/UX
Start here:
1. [CAMPAIGNS_UI_README.md](./CAMPAIGNS_UI_README.md) - UI patterns
2. [CAMPAIGN_PANEL_REFACTORING.md](./CAMPAIGN_PANEL_REFACTORING.md) - Pipeline wizard design

---

## ⚠️ **Important Notes**

### Multi-Channel System
The original architecture (CAMPAIGN_STRATEGY_ARCHITECTURE.md) planned for a comprehensive multi-channel system with Email, SMS, and Voicemail working together. **This is NOT yet built.**

**Current Reality:** Only voicemail campaigns work.

**Why the Difference?**
The MVP focused on getting voicemail drop campaigns working end-to-end before expanding to other channels. The architecture supports multi-channel, but implementation is pending.

### Documentation Status
- ✅ **PIPELINE_STATUS.md** - Current (Jan 6, 2026)
- ✅ **VOICEMAIL_SCRIPT_GENERATION.md** - Updated (Jan 6, 2026)
- ⚠️ **CAMPAIGN_STRATEGY_ARCHITECTURE.md** - Aspirational (describes future state)
- ⚠️ **CAMPAIGN_STRATEGY_ACTION_PLAN.md** - Planning doc (8-9 week estimate)
- ⚠️ **VOICEMAIL_ACTION_PLAN.md** - Enhancement roadmap (not all completed)

---

## 🔧 **Technical Details**

### Tech Stack
- **Framework:** Next.js 16 with Turbopack
- **Language:** TypeScript
- **Database:** MongoDB + Mongoose
- **Auth:** NextAuth.js
- **AI Models:**
  - Groq (GPT-OSS 120B) - Script generation
  - Anthropic Claude - Alternative/fallback
- **Voice:** ElevenLabs API
- **Delivery:** Drop Cowboy API
- **UI:** React, Tailwind CSS, Framer Motion
- **Notifications:** React Toastify

### Database Models
- **Campaign** - Main campaign entity
- **VoicemailScript** - Scripts with audio & delivery tracking
- **ContactCampaign** - Junction table for campaign-contact relationship
- **User** - Agent profile (name, phone, brokerage, website)

---

## 📋 **Next Steps**

### Immediate (Week 1-2)
1. Test Drop Cowboy integration end-to-end
2. Test ElevenLabs audio generation
3. Verify webhook for delivery status
4. End-to-end testing with real account

### Short-term (Month 1)
4. Build Analytics Dashboard
5. Create Template Library UI
6. Integrate campaign history into CRM

### Medium-term (Quarter 1)
7. Consider Email Strategy (if needed)
8. Consider SMS Strategy (if needed)
9. Multi-channel coordination

---

## 🤝 **Contributing**

When updating campaign documentation:
1. Update [PIPELINE_STATUS.md](./PIPELINE_STATUS.md) for feature changes
2. Update specific docs (VOICEMAIL_SCRIPT_GENERATION.md, etc.) for technical details
3. Keep this README synchronized with overall system status
4. Mark documents as ✅ Current, ⚠️ Planning, or 🕒 Outdated

---

## 📞 **Support**

For questions about the campaign system:
- **Technical:** See [PIPELINE_STATUS.md](./PIPELINE_STATUS.md) for implementation details
- **Architecture:** See [CAMPAIGN_STRATEGY_ARCHITECTURE.md](./CAMPAIGN_STRATEGY_ARCHITECTURE.md) for design decisions
- **Planning:** See [CAMPAIGN_STRATEGY_ACTION_PLAN.md](./CAMPAIGN_STRATEGY_ACTION_PLAN.md) for roadmap

---

**Document Version:** 1.0
**Created:** January 6, 2026
**Last Updated:** January 6, 2026
**Status:** Active
