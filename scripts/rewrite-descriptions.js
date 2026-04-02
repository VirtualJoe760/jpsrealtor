#!/usr/bin/env node
/**
 * rewrite-descriptions.js
 *
 * Phase 3: Generates professional subdivision descriptions from scraped website
 * content, Google Places data, and existing community facts.
 *
 * Two modes:
 *   1. --generate-review : Creates a review CSV/JSON for manual editing
 *   2. --auto            : Uses AI (requires ANTHROPIC_API_KEY) to rewrite
 *
 * Usage:
 *   node scripts/rewrite-descriptions.js --generate-review
 *   node scripts/rewrite-descriptions.js --auto
 *   node scripts/rewrite-descriptions.js --auto --city "Indian Wells"
 *
 * Input:  local-logs/all-subdivision-descriptions.json
 *         local-logs/subdivision-website-catalog.json
 * Output: local-logs/rewritten-descriptions.json
 *         local-logs/description-review.html (for manual review)
 */

require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const generateReview = args.includes("--generate-review");
const autoMode = args.includes("--auto");
const cityFilter = args.includes("--city") ? args[args.indexOf("--city") + 1] : null;
const limitArg = args.includes("--limit") ? parseInt(args[args.indexOf("--limit") + 1]) : null;

const GROQ_API_KEY = process.env.GROQ_API_KEY;

const OUTPUT_DIR = path.join(__dirname, "../local-logs");

/**
 * Load all source data
 */
function loadData() {
  const catalogPath = path.join(OUTPUT_DIR, "subdivision-website-catalog.json");
  const scrapedPath = path.join(OUTPUT_DIR, "all-subdivision-descriptions.json");

  const catalog = fs.existsSync(catalogPath)
    ? JSON.parse(fs.readFileSync(catalogPath, "utf-8"))
    : [];

  const scraped = fs.existsSync(scrapedPath)
    ? JSON.parse(fs.readFileSync(scrapedPath, "utf-8"))
    : [];

  // Merge by slug
  const bySlug = new Map();

  for (const entry of catalog) {
    bySlug.set(entry.slug, {
      name: entry.name,
      slug: entry.slug,
      city: entry.city,
      currentDescription: entry.currentDescription,
      features: entry.features || [],
      officialUrl: entry.officialUrl,
      googleDescription: entry.googleDescription,
      googleRating: entry.googleRating,
      googleRatingsTotal: entry.googleRatingsTotal,
      scrapedText: null,
      scrapedFrom: null,
    });
  }

  for (const entry of scraped) {
    const existing = bySlug.get(entry.slug) || {
      name: entry.name,
      slug: entry.slug,
      city: entry.city,
    };
    existing.scrapedText = entry.scrapedText || existing.scrapedText;
    existing.scrapedFrom = entry.scrapedFrom || existing.scrapedFrom;
    existing.googleDescription = entry.googleDescription || existing.googleDescription;
    bySlug.set(entry.slug, existing);
  }

  return Array.from(bySlug.values());
}

/**
 * Build the AI prompt for rewriting a description
 */
function buildPrompt(entry) {
  let context = `Community: ${entry.name}\nCity: ${entry.city}, California (Coachella Valley)\n\n`;

  if (entry.scrapedText) {
    // Check if scraped text is actually about this specific community
    // (not generic corporate parent text like InvitedClubs, Shea Homes, Del Webb, etc.)
    const communityName = entry.name.toLowerCase();
    const firstWord = communityName.split(/\s+/)[0];
    const scrapedLower = entry.scrapedText.toLowerCase();
    const mentionsCommunity = scrapedLower.includes(communityName) ||
      scrapedLower.includes(entry.slug.replace(/-/g, ' ')) ||
      (firstWord.length > 3 && scrapedLower.includes(firstWord));

    if (mentionsCommunity) {
      const truncated = entry.scrapedText.substring(0, 4000);
      context += `Official website text (USE THESE DETAILS):\n${truncated}\n\n`;
    } else {
      context += `NOTE: Scraped website text was from a parent company site and is NOT relevant to ${entry.name}. Ignore it.\n\n`;
    }
  }

  if (entry.googleDescription) {
    context += `Google Places description:\n${entry.googleDescription}\n\n`;
  }

  if (entry.currentDescription) {
    context += `Current description (keep any specific facts like founding year, course designers, number of courses, property types — but rewrite the prose and remove generic filler and nicknames):\n${entry.currentDescription}\n\n`;
  }

  if (entry.features && entry.features.length > 0) {
    context += `Known features: ${entry.features.join(", ")}\n\n`;
  }

  const prompt = `${context}Write a professional 3-5 sentence description for this community to be displayed on a real estate website.

CRITICAL: Your #1 job is to EXTRACT AND INCLUDE specific details from the source text above. Do NOT summarize generically. Specifically include any of these details if mentioned in the source:

- Golf: course designer names, number of holes, course names, par info
- Dining: restaurant names, number of restaurants, cuisine types
- Amenities: pool count, tennis/pickleball court count, spa name, fitness facilities
- Architecture: specific styles mentioned (Mediterranean, Spanish Colonial, Mid-Century Modern, etc.)
- History: founding year, founders, historical significance
- Size: number of homes, acreage, number of neighborhoods/villages
- Membership: equity vs non-equity, club type
- Unique features: racing tracks, lakes, views, signature holes, etc.

Other rules:
- KEEP specific facts from the current description (founding year, course designers, number of holes, property types like condos/villas/estates)
- COMBINE facts from both the current description AND the scraped website text into one cohesive description
- If scraped text has details the current description lacks (restaurant names, court counts, spa info), ADD them
- If the current description has facts the scraped text lacks (founding year, architects), KEEP them
- Do NOT use generic filler: "world-class," "breathtaking," "discerning," "unparalleled," "premier," "nestled," "a range of amenities"
- Do NOT use nicknames unless it is the official brand name
- Do NOT mention parent companies (Invited Clubs, Shea Homes, etc.) — focus on the community itself
- Write in third person, present tense
- Keep it 80-150 words — detailed but concise
- Tone: informative, professional, factual

Return ONLY the description text, no quotes or labels.`;

  return prompt;
}

/**
 * Call Groq API to rewrite a description
 */
async function rewriteWithAI(entry) {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY not set in .env.local");
  }

  const prompt = buildPrompt(entry);

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 300,
      temperature: 0.3,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  const data = await res.json();

  if (data.error) {
    throw new Error(data.error.message || JSON.stringify(data.error));
  }

  return data.choices[0].message.content.trim();
}

/**
 * Generate HTML review page
 */
function generateReviewPage(entries) {
  const rows = entries
    .map((e) => {
      const sourceInfo = e.officialUrl
        ? `<a href="${e.officialUrl}" target="_blank">${e.officialUrl}</a>`
        : e.googleDescription
        ? "Google Places only"
        : "No source found";

      const confidence = e.officialUrl
        ? "🟢 High"
        : e.googleDescription
        ? "🟡 Medium"
        : "🔴 Low";

      return `
      <tr>
        <td><strong>${e.name}</strong><br><small>${e.city}</small></td>
        <td>${confidence}</td>
        <td><div class="desc old">${e.currentDescription || "<em>None</em>"}</div></td>
        <td><div class="desc new">${e.newDescription || e.scrapedText?.substring(0, 500) || e.googleDescription || "<em>No data</em>"}</div></td>
        <td>${sourceInfo}</td>
      </tr>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html>
<head>
  <title>Subdivision Description Review</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 2rem; background: #f5f5f5; }
    h1 { color: #1a1a2e; }
    table { width: 100%; border-collapse: collapse; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    th { background: #1a1a2e; color: white; padding: 12px; text-align: left; position: sticky; top: 0; }
    td { padding: 12px; border-bottom: 1px solid #eee; vertical-align: top; }
    tr:hover { background: #f0f7ff; }
    .desc { max-width: 400px; font-size: 13px; line-height: 1.5; }
    .old { color: #666; }
    .new { color: #1a5276; font-weight: 500; }
    a { color: #2980b9; }
    small { color: #888; }
    .summary { background: white; padding: 1rem 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  </style>
</head>
<body>
  <h1>Subdivision Description Review</h1>
  <div class="summary">
    <strong>${entries.length}</strong> subdivisions |
    <strong>${entries.filter(e => e.officialUrl).length}</strong> with websites |
    <strong>${entries.filter(e => e.newDescription).length}</strong> rewritten |
    <strong>${entries.filter(e => !e.officialUrl && !e.googleDescription).length}</strong> need manual research
  </div>
  <table>
    <thead>
      <tr>
        <th>Community</th>
        <th>Confidence</th>
        <th>Current Description</th>
        <th>New / Scraped</th>
        <th>Source</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>`;
}

/**
 * Main execution
 */
async function main() {
  console.log("✏️  Subdivision Description Rewriter");
  console.log("=====================================\n");

  let entries = loadData();
  console.log(`📋 Loaded ${entries.length} subdivision entries\n`);

  if (cityFilter) {
    entries = entries.filter((e) => e.city?.toLowerCase() === cityFilter.toLowerCase());
    console.log(`🔍 Filtered to ${entries.length} in ${cityFilter}\n`);
  }

  if (limitArg) {
    entries = entries.slice(0, limitArg);
  }

  if (autoMode) {
    if (!GROQ_API_KEY) {
      console.error("❌ Auto mode requires GROQ_API_KEY in .env.local");
      process.exit(1);
    }

    console.log("🤖 Auto-rewriting with Claude Haiku...\n");

    let rewritten = 0;
    let errors = 0;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const progress = `[${i + 1}/${entries.length}]`;

      // Skip entries with no source material
      if (!entry.scrapedText && !entry.googleDescription && !entry.currentDescription) {
        console.log(`${progress} ${entry.name} — ⏭️  No source material, skipping`);
        continue;
      }

      process.stdout.write(`${progress} ${entry.name}... `);

      try {
        const newDesc = await rewriteWithAI(entry);
        entry.newDescription = newDesc;
        rewritten++;
        console.log(`✅ (${newDesc.length} chars)`);

        // Rate limit
        await new Promise((r) => setTimeout(r, 500));
      } catch (err) {
        console.log(`💥 ${err.message}`);
        errors++;
      }

      // Save progress every 10
      if (i % 10 === 0) {
        const outputPath = path.join(OUTPUT_DIR, "rewritten-descriptions.json");
        fs.writeFileSync(outputPath, JSON.stringify(entries, null, 2));
      }
    }

    console.log(`\n✅ Rewritten: ${rewritten} | Errors: ${errors}`);
  }

  // Save results
  const outputPath = path.join(OUTPUT_DIR, "rewritten-descriptions.json");
  fs.writeFileSync(outputPath, JSON.stringify(entries, null, 2));
  console.log(`📄 Saved to: ${outputPath}`);

  // Always generate review page
  const reviewPath = path.join(OUTPUT_DIR, "description-review.html");
  const html = generateReviewPage(entries);
  fs.writeFileSync(reviewPath, html);
  console.log(`📄 Review page: ${reviewPath}`);
}

main().catch(console.error);
