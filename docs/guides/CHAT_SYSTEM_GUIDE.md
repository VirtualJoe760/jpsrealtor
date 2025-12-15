# Chat System - Layman's Technical Guide

**Last Updated**: December 13, 2025
**Audience**: Non-technical stakeholders, new developers, project managers

---

## Table of Contents

1. [What is the Chat System?](#what-is-the-chat-system)
2. [How Does It Work? (Simple Explanation)](#how-does-it-work-simple-explanation)
3. [The Journey of a Chat Message](#the-journey-of-a-chat-message)
4. [Key Components Explained](#key-components-explained)
5. [Tool Calling: The Secret Sauce](#tool-calling-the-secret-sauce)
6. [Available Tools](#available-tools)
7. [Multi-Round Tool Execution](#multi-round-tool-execution)
8. [Pricing Tiers](#pricing-tiers)
9. [Common User Scenarios](#common-user-scenarios)
10. [Troubleshooting](#troubleshooting)

---

## What is the Chat System?

The chat system is an **AI-powered real estate assistant** that helps users find properties, get market statistics, and answer questions about neighborhoods.

**Think of it like this**: It's similar to ChatGPT, but specialized for real estate and connected to your MLS database.

**Key Features**:
- Search for properties by criteria (price, beds, baths, location)
- Get market statistics (average prices, days on market, HOA fees)
- Look up subdivisions and neighborhoods
- Compare different areas
- Search articles from your CMS

---

## How Does It Work? (Simple Explanation)

### The Restaurant Analogy

Imagine the chat system as a **smart restaurant server**:

1. **You (the customer)**: Ask a question like "What homes are for sale in Palm Desert under $500k?"

2. **The AI (the server)**: Understands your request but doesn't have the information memorized

3. **The Tools (the kitchen)**: The server goes to the kitchen (your database) to get the actual data

4. **The Response**: The server brings back a nicely formatted answer with the information you requested

### The Technical Flow

```
User Question
    ↓
AI understands the question
    ↓
AI decides which "tools" to use
    ↓
Tools fetch data from database/APIs
    ↓
AI formats the data into a helpful answer
    ↓
User sees the response
```

---

## The Journey of a Chat Message

Let's follow a real example: **"Show me homes in Indian Wells under $1M"**

### Step 1: User Sends Message
- User types in the chat widget
- Message gets sent to `/api/chat/stream/route.ts`
- System checks if user is logged in and has access

### Step 2: AI Analyzes the Question
- Message goes to **Groq AI** (the AI provider, like OpenAI but faster/cheaper)
- AI reads the question and thinks: "I need to search the database for homes"
- AI decides to use the `queryDatabase` tool

### Step 3: Tool Execution
- AI calls `queryDatabase` with parameters:
  ```json
  {
    "city": "Indian Wells",
    "maxPrice": "1000000",
    "listingType": "sale"
  }
  ```
- Tool makes a request to `/api/query`
- Query API searches MongoDB for matching listings
- Returns list of properties (addresses, prices, photos, etc.)

### Step 4: AI Formats Response
- AI receives the raw data
- Formats it into a friendly message
- Includes property cards with photos, prices, details
- Sends response back to user

### Step 5: User Sees Results
- Chat widget displays the formatted message
- Property cards are clickable
- User can ask follow-up questions

**Total Time**: Usually 1-3 seconds

---

## Key Components Explained

### 1. Chat Widget (`ChatWidget.tsx`)
**What it is**: The chat box you see on the website

**What it does**:
- Displays messages back and forth
- Handles user input
- Shows typing indicators
- Renders property cards and article cards

**Think of it as**: The "face" of the chat system that users interact with

---

### 2. Chat API (`/api/chat/stream/route.ts`)
**What it is**: The backend code that processes chat requests

**What it does**:
- Receives messages from the chat widget
- Manages conversation history
- Coordinates between AI and tools
- Handles errors and logging
- Enforces rate limits

**Think of it as**: The "brain coordinator" that manages the whole conversation

---

### 3. Groq AI Integration (`src/lib/groq.ts`)
**What it is**: Connection to the Groq AI service

**What it does**:
- Sends messages to Groq's AI models
- Handles API authentication
- Manages streaming responses
- Supports different AI models for different tiers

**Think of it as**: The "AI engine" that understands language and makes decisions

**Models Used**:
- **Free tier**: `llama-3.1-70b-versatile` (fast, good quality)
- **Premium tier**: `llama-3.3-70b-versatile` (better reasoning, more accurate)

---

### 4. Query API (`/api/query/route.ts`)
**What it is**: Modular database query system

**What it does**:
- Searches MongoDB for listings
- Applies filters (price, beds, baths, etc.)
- Returns formatted property data
- Handles pagination and limits

**Think of it as**: The "database librarian" that finds exactly what you're looking for

---

### 5. Stats API (`/api/stats/route.ts`)
**What it is**: Market statistics calculator

**What it does**:
- Calculates average prices, price per sqft
- Computes median days on market
- Analyzes HOA fees and property taxes
- Returns sample sizes and distributions

**Think of it as**: The "data analyst" that crunches numbers

---

### 6. Article Search API (`/api/articles/search/route.ts`)
**What it is**: CMS article search system

**What it does**:
- Searches published articles by keywords
- Ranks results by relevance
- Returns article summaries with links

**Think of it as**: The "content librarian" for your blog/insights

---

## Tool Calling: The Secret Sauce

### What Are Tools?

Tools are **specialized functions** the AI can call to get information. Think of them as apps on a smartphone - each does one specific thing.

### How Tool Calling Works

1. **AI reads the user's question**
2. **AI decides which tool(s) to use** (or none if it can answer directly)
3. **AI calls the tool with specific parameters**
4. **Tool executes and returns data**
5. **AI reads the data and formulates a response**

### Example: Tool Call in Action

**User asks**: "What's the average home price in Palm Desert?"

**AI thinks**: "I need the `getMarketStats` tool for this"

**AI calls tool**:
```json
{
  "tool": "getMarketStats",
  "parameters": {
    "city": "Palm Desert",
    "stats": "all"
  }
}
```

**Tool returns**:
```json
{
  "avgPrice": 875000,
  "medianPrice": 725000,
  "avgPriceSqft": 425,
  "avgDaysOnMarket": 45,
  "sampleSize": 342
}
```

**AI formats response**:
> "Based on 342 listings, the average home price in Palm Desert is $875,000, with a median of $725,000. Homes average 45 days on market and cost about $425 per square foot."

---

## Available Tools

### 1. `queryDatabase`
**Purpose**: Search for property listings

**When Used**:
- "Show me homes in [city]"
- "Find condos under $500k"
- "Properties with pools in Indian Wells"

**Parameters**:
- `city`, `subdivision`, `county`
- `minPrice`, `maxPrice`
- `beds`, `baths`
- `propertyType`, `propertySubType`
- `pool`, `spa`, `view`, `garage`
- And many more filters...

**Returns**: Array of property listings with full details

---

### 2. `getMarketStats`
**Purpose**: Calculate market statistics

**When Used**:
- "What's the average price in [area]?"
- "How long do homes sit on market?"
- "What are typical HOA fees?"

**Parameters**:
- `city`, `subdivision`, `county`
- `propertySubType` (to avoid mixing SFR with condos)
- `stats` (which stats to return)

**Returns**: Calculated statistics with sample sizes

---

### 3. `lookupSubdivision`
**Purpose**: Find correct subdivision names

**When Used**:
- "Homes in The Vintage" → finds "Vintage Country Club"
- "Properties in PGA" → finds "PGA West"
- User provides partial/fuzzy name

**Parameters**:
- `query` (partial name)
- `city` (optional, to narrow search)

**Returns**: Best matching subdivision name with confidence score

---

### 4. `searchArticles`
**Purpose**: Search CMS articles

**When Used**:
- "Articles about buying homes"
- "Blog posts on market trends"
- "Insights about [topic]"

**Parameters**:
- `keywords` (search terms)
- `limit` (how many results)

**Returns**: Array of matching articles with summaries

---

## Multi-Round Tool Execution

### What Is It?

Sometimes the AI needs to use **multiple tools** to answer a complex question.

**Example**: "Compare average prices between Palm Desert and Indian Wells"

This requires:
1. First round: Call `getMarketStats` for Palm Desert
2. Second round: Call `getMarketStats` for Indian Wells
3. Third round: Synthesize the comparison

### How It Works

```typescript
const MAX_TOOL_ROUNDS = 3;
let toolRound = 0;

while (toolRound < MAX_TOOL_ROUNDS) {
  // Get AI response with tools
  const response = await groq.chat(messages, { tools });

  // If no tools called, we're done
  if (!response.tool_calls) break;

  // Execute tools and add results to conversation
  const toolResults = await executeTools(response.tool_calls);
  messages.push(toolResults);

  toolRound++;

  // Safety: if max rounds reached, force final response
  if (toolRound >= MAX_TOOL_ROUNDS) {
    const finalResponse = await groq.chat(messages); // No tools
    break;
  }
}
```

### Why Limit to 3 Rounds?

1. **Prevent infinite loops**: AI could theoretically keep calling tools forever
2. **Cost control**: Each AI call costs money
3. **Performance**: Users expect answers in seconds, not minutes

### What Happens at Max Rounds?

- AI gets one final call **without tools**
- Must provide answer with data already collected
- Prevents the "Tool choice is none, but model called a tool" error

---

## Pricing Tiers

### Free Tier
**Model**: `llama-3.1-70b-versatile`

**Features**:
- Standard response quality
- All tools available
- Multi-round tool calling
- Fast responses (~1-2 seconds)

**Limitations**:
- Fewer tokens per response (500 first round, 4000 synthesis)
- May be less accurate for complex queries

---

### Premium Tier
**Model**: `llama-3.3-70b-versatile`

**Features**:
- Enhanced reasoning capabilities
- Better at complex comparisons
- More accurate tool selection
- All free tier features

**Benefits**:
- More nuanced responses
- Better handling of ambiguous questions
- Improved multi-step reasoning

---

## Common User Scenarios

### Scenario 1: Simple Property Search

**User**: "Homes under $600k in La Quinta"

**What Happens**:
1. AI calls `queryDatabase({ city: "La Quinta", maxPrice: "600000" })`
2. Query returns 23 listings
3. AI formats response with property cards
4. Total time: ~1.5 seconds

---

### Scenario 2: Market Statistics

**User**: "What's the market like in Indian Wells?"

**What Happens**:
1. AI calls `getMarketStats({ city: "Indian Wells", stats: "all" })`
2. Stats API calculates averages from database
3. AI formats stats into readable sentences
4. Total time: ~2 seconds

---

### Scenario 3: Complex Comparison

**User**: "Compare Palm Desert and Rancho Mirage condos"

**What Happens**:
1. **Round 1**: AI calls `getMarketStats({ city: "Palm Desert", propertySubType: "Condominium" })`
2. **Round 2**: AI calls `getMarketStats({ city: "Rancho Mirage", propertySubType: "Condominium" })`
3. **Round 3**: AI synthesizes comparison
4. Response includes side-by-side stats
5. Total time: ~3-4 seconds

---

### Scenario 4: Fuzzy Subdivision Search

**User**: "Homes in The Vintage"

**What Happens**:
1. AI calls `lookupSubdivision({ query: "The Vintage" })`
2. Lookup finds "Vintage Country Club"
3. AI calls `queryDatabase({ subdivision: "Vintage Country Club" })`
4. Returns properties with clarification
5. Total time: ~2.5 seconds

---

### Scenario 5: Article Search

**User**: "Articles about buying a home"

**What Happens**:
1. AI calls `searchArticles({ keywords: "buying home" })`
2. Article search ranks by relevance
3. Returns top 5 articles
4. AI formats as clickable article cards
5. Total time: ~1.5 seconds

---

## Troubleshooting

### Problem: Chat Returns "AI service not configured"

**Cause**: Missing or invalid `GROQ_API_KEY` environment variable

**Fix**:
1. Check `.env.local` file
2. Ensure `GROQ_API_KEY=your_actual_key_here`
3. Get key from https://console.groq.com/
4. Restart dev server

---

### Problem: "Tool choice is none, but model called a tool"

**Cause**: Max tool rounds reached, but code sent conflicting parameters

**Fix**: Already fixed in `chat/stream/route.ts:358`
- Now correctly omits `tools` and `tool_choice` on final round

---

### Problem: Chat Returns Empty Results

**Possible Causes**:
1. **No matching listings**: Database has no properties matching criteria
2. **Overly restrictive filters**: AI applied too many filters
3. **Misspelled location**: City/subdivision name incorrect

**Fix**:
- Check MongoDB has data for the area
- Review AI's tool call parameters in logs
- Use `lookupSubdivision` for fuzzy matching

---

### Problem: Slow Response Times (>5 seconds)

**Possible Causes**:
1. **Complex multi-round queries**: 3 tool rounds take time
2. **Large dataset**: Querying thousands of listings
3. **Groq API latency**: External service delay

**Fix**:
- Add indexes to MongoDB (city, subdivision, price)
- Optimize query API with pagination
- Consider caching common queries
- Use premium tier for faster model

---

### Problem: AI Gives Wrong Answer

**Possible Causes**:
1. **Tool returned bad data**: Database has incorrect info
2. **AI misunderstood question**: Ambiguous user input
3. **Tool selection error**: AI chose wrong tool

**Fix**:
- Review tool response in logs (`console.log`)
- Improve system prompt clarity
- Add validation to tool outputs
- Use premium tier for better reasoning

---

### Problem: Chat Widget Not Appearing

**Possible Causes**:
1. **Component not imported**: Missing in page
2. **CSS/Tailwind issue**: Hidden by styles
3. **JavaScript error**: Check browser console

**Fix**:
```tsx
import ChatWidget from '@/app/components/chat/ChatWidget';

export default function Page() {
  return (
    <div>
      {/* Your content */}
      <ChatWidget />
    </div>
  );
}
```

---

## Technical Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                        USER                              │
│                    (Web Browser)                         │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────┐
│                  ChatWidget.tsx                          │
│         (UI: messages, input, property cards)            │
└───────────────────┬─────────────────────────────────────┘
                    │
                    ▼ POST /api/chat/stream
┌─────────────────────────────────────────────────────────┐
│              /api/chat/stream/route.ts                   │
│         (Orchestrator: AI + Tools + Logging)             │
└─────┬───────────────────────────┬───────────────────────┘
      │                           │
      ▼                           ▼
┌──────────────┐          ┌──────────────────────┐
│  Groq AI     │          │   Tool Execution     │
│  (LLaMA 3.x) │          │                      │
└──────────────┘          └─────┬────────────────┘
                                │
                    ┌───────────┼───────────┐
                    │           │           │
                    ▼           ▼           ▼
              ┌──────────┐ ┌─────────┐ ┌──────────────┐
              │/api/query│ │/api/stats│ │/api/articles │
              │          │ │          │ │   /search    │
              └────┬─────┘ └────┬────┘ └──────┬───────┘
                   │            │             │
                   ▼            ▼             ▼
              ┌────────────────────────────────────┐
              │          MongoDB Database           │
              │  (listings, stats, articles)        │
              └────────────────────────────────────┘
```

---

## Key Takeaways

1. **Chat is AI + Tools**: The AI doesn't have data memorized - it uses tools to fetch it from your database

2. **Tools are specialized functions**: Each tool does one specific thing (search listings, get stats, etc.)

3. **Multi-round execution**: Complex questions may require multiple tool calls in sequence

4. **Tiers affect model quality**: Premium tier uses better AI model for improved reasoning

5. **Error handling is important**: Max tool rounds prevent infinite loops and API errors

6. **Performance is fast**: Most queries complete in 1-3 seconds thanks to Groq's speed

7. **It's modular**: Each component (widget, API, tools) can be updated independently

---

## Next Steps

Want to learn more? Check out these related docs:

- **`/docs/API_ENDPOINTS.md`**: Detailed API documentation
- **`/docs/CMS_AND_INSIGHTS_COMPLETE.md`**: Article search system
- **`/src/app/api/chat/stream/route.ts`**: Full source code with comments
- **Groq Docs**: https://console.groq.com/docs

---

## Questions?

If you have questions about the chat system, check:
1. This guide for high-level explanations
2. Code comments for implementation details
3. API logs for debugging specific issues
4. Groq documentation for AI model capabilities
