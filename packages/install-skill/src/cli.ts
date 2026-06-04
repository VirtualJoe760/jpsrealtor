#!/usr/bin/env node
//
// chatrealty-install-skill
//
// Installs the ChatRealty Claude skill into the user's ~/.claude/skills
// directory and writes their ChatRealty API token to ~/.claude/.chatrealty.env.
//
// Usage:
//   npx @chatrealty/install-skill <crt_live_xxx>
//   npx @chatrealty/install-skill            # then prompted for the token
//
// After install, restart Claude Code or Claude Desktop. Ask any Claude window:
//   "create a chatrealty landing page about luxury condos in Indian Wells"
// — the skill activates, asks any missing details, and creates the draft.

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as readline from "readline";

const SKILL_DIR_NAME = "chatrealty-landing-page";
const API_BASE_DEFAULT = "https://jpsrealtor.com";

function home(): string {
  return process.env.HOME || process.env.USERPROFILE || os.homedir();
}

function claudeDir(): string {
  return path.join(home(), ".claude");
}

function skillDir(): string {
  return path.join(claudeDir(), "skills", SKILL_DIR_NAME);
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (a) => { rl.close(); resolve(a.trim()); }));
}

async function verifyToken(token: string, apiBase: string): Promise<{ ok: true; agentName: string | null } | { ok: false; reason: string }> {
  try {
    const res = await fetch(`${apiBase}/api/skill/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      return { ok: false, reason: `HTTP ${res.status}` };
    }
    const data: any = await res.json();
    return { ok: true, agentName: data.agentName || null };
  } catch (err: any) {
    return { ok: false, reason: err?.message || "network error" };
  }
}

async function main(): Promise<void> {
  console.log("\n  ChatRealty Claude skill installer\n  ---------------------------------\n");

  let token = process.argv[2] || "";
  const apiBase = process.env.CHATREALTY_API_BASE || API_BASE_DEFAULT;

  if (!token) {
    token = await prompt("Paste your ChatRealty API token (crt_live_…): ");
  }
  if (!token.startsWith("crt_live_")) {
    console.error("\n  ERROR: token should start with 'crt_live_'. Get one from Settings → Integrations on your ChatRealty site.\n");
    process.exit(1);
  }

  console.log(`\n  Verifying token with ${apiBase}…`);
  const v = await verifyToken(token, apiBase);
  if (!v.ok) {
    console.error(`\n  ERROR: token verification failed (${v.reason}). Check the token and your network.\n`);
    process.exit(1);
  }
  console.log(`  ✓ Token verified${v.agentName ? ` (agent: ${v.agentName})` : ""}\n`);

  // Write skill files
  const dir = skillDir();
  fs.mkdirSync(dir, { recursive: true });
  const skillMdPath = path.join(dir, "SKILL.md");
  const skillMdContent = renderSkillMd(apiBase);
  fs.writeFileSync(skillMdPath, skillMdContent, "utf8");
  console.log(`  ✓ Wrote ${skillMdPath}`);

  // Token file — kept separate from SKILL.md so we never accidentally publish
  // the token to a git repo if the agent versions their ~/.claude directory.
  const envPath = path.join(claudeDir(), ".chatrealty.env");
  fs.writeFileSync(
    envPath,
    `CHATREALTY_API_TOKEN=${token}\nCHATREALTY_API_BASE=${apiBase}\n`,
    { mode: 0o600 }
  );
  console.log(`  ✓ Wrote ${envPath} (chmod 600)`);

  console.log("\n  Next steps:");
  console.log("    1. Restart Claude Code or Claude Desktop.");
  console.log("    2. Ask any Claude window:");
  console.log("       \"create a chatrealty landing page about <topic>\"");
  console.log("    3. The skill will ask any missing details, then create a draft.\n");
}

function renderSkillMd(apiBase: string): string {
  return `---
name: chatrealty-landing-page
description: |
  Creates landing-page drafts on the user's ChatRealty real estate site.
  Use when the user asks to "create a landing page" / "build a landing page on chatrealty" / similar.
  The user must have a ChatRealty API token configured (~/.claude/.chatrealty.env).
---

# ChatRealty Landing Page Skill

When the user asks you to create a landing page on ChatRealty (their real estate website), use this skill.

## When to activate

Activate when the user's request matches any of:
- "create a landing page" (on chatrealty / on my site)
- "build a landing page about X"
- "draft a landing page for the [community / listing / event]"
- "make a chatrealty page about X"

If the user is asking for a generic article or blog post (not a landing page), do NOT use this skill — articles are created in the CMS UI by the agent.

## How to use it

1. **Load the token** from \`~/.claude/.chatrealty.env\` (variable: \`CHATREALTY_API_TOKEN\`). If you cannot find it, tell the user to run \`npx @chatrealty/install-skill\` first. The API base is in the same file as \`CHATREALTY_API_BASE\` (default: \`${apiBase}\`).

2. **Ask the user up to 5 short questions to scope the page**, one at a time:
   - What is the page for? (a listing, a community, a lead magnet, an event, a service)
   - Who is the audience? (buyers, sellers, investors, renters, etc.)
   - What is the primary call-to-action? (call, contact form, schedule a tour, download a guide)
   - Hero photo: any specific image URL? (Cloudinary or otherwise — leave blank to set later in the CMS)
   - Lead-capture form on the page? (yes/no — if yes, which fields)

   Don't ask all five at once. Use prior answers to skip irrelevant ones (e.g. don't ask hero photo if the user already provided one).

3. **Write the landing page content** as MDX, 400-900 words. Punchy real-estate landing-page style: strong headline, 1-3 short paragraphs, scannable bullets, clear CTA. Use the local market specifics the user gave.

4. **POST to the ChatRealty API** to create the draft:

   \`\`\`bash
   curl -X POST "${apiBase}/api/skill/landing-pages" \\
     -H "Authorization: Bearer $CHATREALTY_API_TOKEN" \\
     -H "Content-Type: application/json" \\
     -d '{
       "title": "...",
       "excerpt": "...",
       "content": "<MDX body>",
       "featuredImage": { "url": "...", "alt": "..." },
       "seo": { "title": "...", "description": "...", "keywords": ["...", "..."] },
       "landingPage": {
         "heroType": "photo",
         "themeOverride": "",
         "formEnabled": true,
         "formHeading": "Get in touch",
         "formButtonText": "Send",
         "formFields": [
           { "id": "name",  "label": "Full Name",  "type": "text",  "required": true },
           { "id": "email", "label": "Email",      "type": "email", "required": true },
           { "id": "phone", "label": "Phone",      "type": "tel",   "required": false }
         ]
       }
     }'
   \`\`\`

5. **Report the URLs from the response** to the user. The response includes \`editUrl\` (where they review on the CMS) and \`previewUrl\` (the public draft URL once they publish). Remind them this is a DRAFT — nothing goes live until they publish from the CMS.

## API contract

\`POST ${apiBase}/api/skill/landing-pages\` — creates a draft. Returns:
\`\`\`json
{
  "slugId": "...",
  "id": "...",
  "status": "draft",
  "title": "...",
  "previewUrl": "https://.../lp/...",
  "editUrl": "https://.../agent/cms/edit/...",
  "message": "Draft created. Review and publish from the CMS."
}
\`\`\`

\`GET ${apiBase}/api/skill/me\` — sanity-check the token + returns agent name.

\`GET ${apiBase}/api/skill/landing-pages/{slugId}\` — fetch a draft you created (for follow-up edits, though v1 has no update endpoint — re-create with a new slug or edit in the CMS).

## Style rules for the landing page content

- Second person (\"you / your\").
- Conversion-focused, not blog-like. No fluff.
- Tie to local market specifics (subdivision / city / community names).
- Strong headline, 1-3 short paragraphs, scannable bullets, clear CTA.
- 400-900 words of MDX.
- Do NOT invent hero photo URLs. If the user doesn't provide one, leave \`featuredImage.url\` as an empty string and remind them to add an image before publishing.

## What this skill does NOT do (v1)

- Does not publish — only creates drafts.
- Does not update an existing landing page — only creates new ones.
- Does not create articles, listings, contacts, or other entity types.
- Does not upload images. Hero photos must be added in the CMS after the draft is created (or supplied as a URL the user already hosts).
`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
