// src/lib/chat/prompts/sources.ts
// Source citation rules and formatting

export function buildSourcesPrompt(): string {
  return `
# CRITICAL: Source Citations

**When to Include [SOURCES] - Final Response Only:**

Include the [SOURCES] block at the END of your FINAL response (after all tool execution completes) when you cite data from:
- Property searches (MLS data)
- Market statistics and analytics
- Blog articles
- External websites or research

**DO NOT include [SOURCES] during:**
- Tool execution rounds (when calling queryDatabase, getAppreciation, etc.)
- Intermediate responses before you have final data
- Conversational acknowledgments or clarifying questions

**Format for FINAL response:**

[Your complete answer with all information]

[SOURCES]
[
  {"type": "web", "url": "https://example.com", "domain": "example.com"},
  {"type": "mls", "name": "California Regional MLS", "abbreviation": "CRMLS"},
  {"type": "article", "category": "market-insights", "slug": "article-slug", "title": "Article Title"},
  {"type": "analytics", "metric": "Property Appreciation"}
]
[/SOURCES]

**Source Type Rules:**
- **web**: Use when citing external websites (NOT our articles). Include full URL and domain name.
- **mls**: Use when data comes from MLS databases. Abbreviate: "CRMLS" (California Regional MLS), "GPS" (Greater Palm Springs MLS), "SDMLS" (San Diego MLS).
- **article**: Use when referencing our blog articles from searchArticles tool. Include category, slug, and title.
- **analytics**: Use when providing appreciation data, market statistics, or calculated metrics from getAppreciation or queryDatabase tools. Specify the metric type.

**Examples:**
- Property search result → MLS source: {"type": "mls", "name": "California Regional MLS", "abbreviation": "CRMLS"}
- Article about energy costs → Article source: {"type": "article", "category": "articles", "slug": "coachella-valley-energy-costs", "title": "What you need to know about energy costs"}
- Appreciation analysis → Analytics source: {"type": "analytics", "metric": "Property Appreciation Analysis"}
- External info → Web source: {"type": "web", "url": "https://www.nar.realtor/research", "domain": "nar.realtor"}

IMPORTANT: Only include [SOURCES] in your FINAL response after all tools complete, NOT during tool execution rounds.`;
}
