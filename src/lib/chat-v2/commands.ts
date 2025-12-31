// src/lib/chat-v2/commands.ts
// Chat command handlers for special user inputs

/**
 * Help Command Response
 * Warm, inviting guide for buyers and sellers
 */
export const HELP_RESPONSE = `# 🏡 Welcome! I'm Here to Help You Find Your Perfect Home

I'm your personal AI real estate assistant, and I'm here to make your home search **simple, personalized, and stress-free**. Whether you're buying your first home, upgrading to your dream property, or looking for an investment, I can help you find exactly what you're looking for.

---

## 💬 How to Talk to Me

**Just ask naturally!** I understand what you're looking for, even if you're not sure how to describe it. Here are some examples:

### 🏠 Starting Your Search

**Simple searches:**
- *"Show me homes in Palm Desert"*
- *"What's available in PGA West?"*
- *"I want to see condos in Indian Wells"*

**With your budget:**
- *"3 bedroom homes in La Quinta under $600k"*
- *"Show me houses between $400k and $800k in Palm Springs"*

---

## 🎯 Getting Specific - I Can Filter By Almost Anything!

The more you tell me about what you want, the better I can help. Here's what I can search for:

### 💰 **Price Range**
- *"Homes under $500,000"*
- *"Properties between $600k and $1.2M"*
- *"What can I get for around $750k?"*

### 🛏️ **Bedrooms & Bathrooms**
- *"3 bedroom, 2 bath homes"*
- *"At least 4 bedrooms"*
- *"2 bath minimum"*

### 📏 **Size & Space**
- *"Over 2,000 square feet"*
- *"Between 1,500 and 2,500 sqft"*
- *"Large lot, at least 10,000 sqft"*
- *"Single story homes"* (I'll find one-story properties)

### 🏊 **Lifestyle & Amenities**
This is where it gets fun! Tell me about your lifestyle:

- *"I want a pool"* ☀️
- *"Must have a spa"* 🛁
- *"Looking for mountain or golf course views"* 🏔️
- *"Needs a fireplace"* 🔥
- *"Gated community only"* 🚪
- *"Looking in 55+ communities"* 👴👵
- *"At least a 2-car garage"* 🚗

### 🏗️ **Age & Condition**
- *"Built after 2010"*
- *"New construction"*
- *"Newer homes, built in the last 5 years"*

### 🏘️ **Property Type**
- *"Single family homes only"*
- *"Condos or townhouses"*
- *"No HOA properties"*

---

## ✨ Combine Anything You Want!

**Here's the magic:** You can combine as many criteria as you want in one sentence:

**Example 1:** *"Show me single-story, 3 bedroom homes with pools in PDCC under $700k"*

**Example 2:** *"I'm looking for a 4 bedroom house in a gated community with mountain views, between $800k and $1.2M, built after 2015"*

**Example 3:** *"Find me condos in Indian Wells with 2+ bedrooms, under $500k, with a pool and spa"*

**Example 4:** *"What's available in PGA West with at least 2,500 sqft, a 3-car garage, and golf course views?"*

I'll understand what you're looking for and show you the perfect matches!

---

## 📊 Market Insights

I'm not just here to show you homes - I can help you make informed decisions:

### 📈 **Appreciation & Market Trends**
- *"How much have homes appreciated in Palm Desert?"*
- *"What's the market like in La Quinta over the last 5 years?"*
- *"Is Indian Wells a good investment?"*

### 📚 **Educational Resources**
- *"Tell me about first-time homebuyer programs"*
- *"What is an FHA loan?"*
- *"How does the home buying process work?"*

---

## 🎯 Pro Tips for Best Results

**✅ DO:**
- Be specific about what matters most to you
- Mention your lifestyle needs (pool, views, quiet community)
- Tell me your budget range
- Ask follow-up questions to refine your search

**💡 EXAMPLES:**
- Instead of: *"Show me homes"*
- Try: *"Show me 3-bedroom homes in gated communities with pools under $650k"*

---

## 🤝 I'm Here to Help You Every Step of the Way

Remember, there are **no silly questions**. Whether you're:
- 🏠 A first-time homebuyer feeling overwhelmed
- 📈 An investor looking for the next opportunity
- 🌴 Relocating to the Coachella Valley
- ⬆️ Upgrading to your dream home
- 📉 Downsizing to something more manageable

**I'm here to make this process easy and enjoyable for you.**

---

## 💬 Ready to Get Started?

Just tell me what you're looking for, and let's find your perfect home together!

**Try asking me something like:**
- *"Show me what's available in my price range"*
- *"I'm looking for a family home with a pool in a good school district"*
- *"What can I get in Rancho Mirage for under $1M?"*

I'm listening and ready to help! 🎯

---

*Type your question or search in the chat box below, and I'll get to work finding your perfect match.*
`;

/**
 * Tutorial Command Response
 * Shows YouTube tutorial video
 */
export const TUTORIAL_RESPONSE = `# 🎓 Welcome to jpsrealtor.com!

Here's a quick video tutorial to help you get started finding your dream home:

[YOUTUBE:HOJAy74Fovg]

Feel free to ask me anything about properties, neighborhoods, or search for homes! Try asking me something like:
- *"Show me 3 bedroom homes in Palm Springs under $500k"*
- *"What's the market like in Indian Wells?"*
- *"I want a pool home in a gated community"*

I'm here to help! 🏡
`;

/**
 * Detect if a message is a command
 * Returns the command name if detected, null otherwise
 */
export function detectCommand(message: string): string | null {
  const trimmed = message.trim().toLowerCase();

  // Remove leading slash if present
  const normalized = trimmed.replace(/^\//, '');

  // Replace spaces and hyphens with consistent format
  const cleaned = normalized.replace(/[\s-]+/g, '-');

  // Check for help command
  if (cleaned === 'help' || normalized === 'help') {
    return 'help';
  }

  // Check for tutorial command
  if (cleaned === 'tutorial' || normalized === 'tutorial') {
    return 'tutorial';
  }

  return null;
}

/**
 * Get the response for a command
 */
export function getCommandResponse(command: string): string {
  switch (command) {
    case 'help':
      return HELP_RESPONSE;
    case 'tutorial':
      return TUTORIAL_RESPONSE;
    default:
      return 'Unknown command';
  }
}
