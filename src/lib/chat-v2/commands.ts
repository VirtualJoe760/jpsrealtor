/**
 * Chat Commands - Special slash commands for help and guidance
 */

export const HELP_COMMAND = `/help`;
export const GET_STARTED_COMMAND = `/get-started`;

export const HELP_RESPONSE = `# 🤖 AI Real Estate Assistant - Advanced Guide

Welcome to your AI-powered real estate assistant! Here's everything you can do:

---

## 🔍 Search & Discovery Tools

### **Search for Homes**
\`\`\`
"Show me 3-bed homes in Palm Springs under $500k"
"Find condos in Indian Wells with pools"
"What's available in La Quinta with mountain views?"
\`\`\`
- Filter by: bedrooms, bathrooms, price, property type, amenities
- View results in chat or on the interactive map
- Swipe through listings with detailed info

### **Location Insights**
\`\`\`
"Tell me about Palm Desert"
"What's the market like in Rancho Mirage?"
\`\`\`
- Get city/neighborhood overviews
- Market trends and price ranges
- Community highlights and amenities

### **Map Search Integration**
- Search locations directly in the map search bar
- AI automatically provides market snapshots
- Seamless switching between map and chat views

---

## 📊 Market Analysis Tools

### **Price Appreciation Data**
\`\`\`
"How much have homes appreciated in Indio over 5 years?"
"Show me appreciation trends in Desert Hot Springs"
\`\`\`
- Historical price growth analysis
- Compare neighborhoods
- Investment potential insights

### **Market Statistics**
\`\`\`
"What's the average home price in Cathedral City?"
"How many homes are for sale in Coachella?"
\`\`\`
- Current market inventory
- Average prices by property type
- Days on market trends

---

## 📰 Real Estate Articles & Insights

\`\`\`
"Find articles about Coachella Valley market"
"What's new in Palm Springs real estate?"
\`\`\`
- Latest market news
- Expert insights
- Community updates

---

## 🎯 Smart Filtering

The AI understands natural language filters:

**Bedrooms/Bathrooms:**
- "3+ bedrooms" or "at least 3 beds"
- "2.5 baths minimum"

**Price Ranges:**
- "under $400k" or "less than 400000"
- "between $500k and $700k"
- "$1M+" or "luxury homes"

**Property Types:**
- Single Family, Condo, Townhouse, Multi-Family
- Land, Commercial, Mobile/Manufactured

**Amenities:**
- Pool, spa, gated community
- Mountain/golf course/water views
- RV parking, solar panels

**Special Features:**
- "New construction"
- "Recently listed" (last 7 days)
- "Price reduced"

---

## 💡 Pro Tips

1. **Be Specific:** "3-bed homes in Palm Springs under $500k" works better than "homes"
2. **Combine Filters:** "4-bed homes with pool in La Quinta under $800k"
3. **Ask Follow-ups:** "Show me more" or "What else is available?"
4. **Map + Chat:** Search on map, get instant AI insights, then chat for details
5. **Save Favorites:** Like listings while swiping to save for later

---

## 🆘 Need Help?

- Type \`/get-started\` for a beginner's guide
- Ask "How do I..." for specific tasks
- "Show me examples" for sample searches

Ready to find your dream home? Let's get started! 🏡`;

export const GET_STARTED_RESPONSE = `# 🏡 Welcome to JPS Realtor - Get Started Guide

Hi! I'm your AI real estate assistant. Let me show you how to find your perfect home in 3 easy steps.

---

## Step 1️⃣ - Tell Me What You're Looking For

Just chat naturally! Here are some examples:

### **Basic Search**
\`\`\`
"Show me homes in Palm Springs"
"What's available in Indian Wells?"
\`\`\`

### **Add Your Preferences**
\`\`\`
"I want a 3-bedroom home in La Quinta"
"Find condos in Desert Hot Springs under $400k"
"Show me houses with pools in Palm Desert"
\`\`\`

### **Be as Specific as You Want**
\`\`\`
"3-bed, 2-bath homes in Rancho Mirage with mountain views under $600k"
\`\`\`

---

## Step 2️⃣ - Explore the Results

After searching, you have two ways to view homes:

### **📱 Swipe Through Listings**
- Tap any listing to see full details
- Swipe left ❌ to pass
- Swipe right ❤️ to save favorites
- Photo gallery, price, specs, and more

### **🗺️ View on Map**
- Click "View on Map" to see exact locations
- Explore neighborhoods visually
- Click markers for listing details
- Filter and sort on the fly

---

## Step 3️⃣ - Refine Your Search

Found something you like? Ask follow-up questions:

\`\`\`
"Show me more like this"
"What else is available nearby?"
"How does this compare to other homes in the area?"
"Tell me more about this neighborhood"
\`\`\`

Or adjust your search:
\`\`\`
"Actually, show me 4-bedroom homes instead"
"What about homes with a lower price?"
"Any with a pool?"
\`\`\`

---

## 🎯 Quick Start Searches

Try one of these to get started right now:

**For First-Time Buyers:**
\`\`\`
"Show me affordable homes under $350k"
"What condos are available for under $300k?"
\`\`\`

**For Families:**
\`\`\`
"Find 4-bedroom family homes in good school districts"
"Show me homes with large yards in safe neighborhoods"
\`\`\`

**For Retirees:**
\`\`\`
"Find 55+ senior communities in Palm Desert"
"Show me single-story homes with low maintenance"
\`\`\`

**For Investors:**
\`\`\`
"What areas have the best appreciation?"
"Show me multi-family properties"
\`\`\`

---

## 🗺️ Using the Map Search

Don't forget about the interactive map!

1. **Click the map icon** in the bottom navigation
2. **Search for a city** in the search bar (e.g., "Palm Springs")
3. **Get instant market insights** from the AI
4. **Explore listings** by clicking map markers
5. **Switch back to chat** to ask questions

---

## 💡 Pro Tips for Beginners

✅ **Start broad, then narrow down**
- First: "Show me homes in Palm Springs"
- Then: "Only 3-bedroom ones under $500k"

✅ **Save homes you like**
- Swipe right ❤️ on favorites
- Access them anytime in your saved listings

✅ **Ask about neighborhoods**
- "What's the area like?" or "Tell me about this community"
- Get local insights before committing

✅ **Compare options**
- "How does this compare to [address]?"
- "What's the price difference between these areas?"

---

## 🆘 Need More Help?

- Type \`/help\` for advanced features and all tools
- Ask me "How do I..." for specific tasks
- Say "I'm confused" and I'll guide you step-by-step

**Ready to find your dream home?** Just tell me what you're looking for! 🏠✨`;

/**
 * Detect if a message is a command
 * Supports multiple formats: /help, help, /get-started, get-started, /get started, get started
 */
export function detectCommand(message: string): string | null {
  const trimmed = message.trim().toLowerCase();

  // Normalize: remove leading slash, replace spaces with hyphens
  const normalized = trimmed.replace(/^\//, '').replace(/\s+/g, '-');

  // Check for help command
  if (normalized === 'help') {
    return 'help';
  }

  // Check for get-started command
  if (normalized === 'get-started') {
    return 'get-started';
  }

  return null;
}

/**
 * Get command response
 */
export function getCommandResponse(command: string): string {
  switch (command) {
    case 'help':
      return HELP_RESPONSE;
    case 'get-started':
      return GET_STARTED_RESPONSE;
    default:
      return '';
  }
}
