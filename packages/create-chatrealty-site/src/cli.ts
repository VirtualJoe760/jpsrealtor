#!/usr/bin/env node
//
// create-chatrealty-site
//
// Scaffolds a Next.js real-estate website wired to the ChatRealty API:
// listings search + map, listing detail, favorites + lead capture, and
// neighborhood pages — every card IDX-attributed. Your tenant API token is
// written to .env.local (git-ignored) and used SERVER-SIDE only; it never ships
// to the browser (the app's own /api routes proxy the ChatRealty skill API).
//
// Usage:
//   npm create chatrealty-site@latest my-site
//   npx create-chatrealty-site my-site
//   npx create-chatrealty-site my-site --token crt_live_xxx --api-base http://localhost:3000
//   npx create-chatrealty-site my-site --test-data     # no token: bundled fictitious sample listings
//   npx create-chatrealty-site           # prompts for anything not passed
//
// Non-interactive: pass --token/--api-base or set CHATREALTY_API_TOKEN /
// CHATREALTY_API_BASE in the environment.
//
// TEST DATA mode (--test-data, or just press Enter at the token prompt):
// scaffolds the site against fictitious listings bundled in the template
// (data/test-listings.json) so you can preview everything before your MLS
// feed / ChatRealty tenant is connected. The site shows a permanent TEST DATA
// banner in this mode — never launch it publicly on sample listings.

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// dist/cli.js -> package root -> template/  (__dirname is a CommonJS global)
const TEMPLATE_DIR = path.join(__dirname, "..", "template");

// Count sample listings from the bundled fixture at runtime, so the number the
// CLI prints can never drift from what actually ships (CRBR bug report).
function sampleListingCount(): number {
  try {
    const data = JSON.parse(
      fs.readFileSync(path.join(TEMPLATE_DIR, "data", "test-listings.json"), "utf8")
    );
    return Array.isArray(data) ? data.length : 0;
  } catch {
    return 0;
  }
}
const API_BASE_DEFAULT = "https://www.chatrealty.io";

// Files shipped WITHOUT a leading dot (npm strips some dotfiles from published
// tarballs) — renamed to their dotted form on scaffold.
const RENAME_ON_COPY: Record<string, string> = {
  gitignore: ".gitignore",
  "env.example": ".env.example",
};

function isValidDirName(name: string): boolean {
  return /^[a-zA-Z0-9._-]+$/.test(name) && name !== "." && name !== "..";
}

function getFlag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
}

// Accept a token the way people actually hand one over.
//
// A judged session kept its token in a file as a dotenv line and ran
// `--token $(cat token.txt)`. The whole line — `CHATREALTY_API_TOKEN=crt_live_…`
// — became the value, .env.local got `CHATREALTY_API_TOKEN=CHATREALTY_API_TOKEN=
// crt_live_…`, verification 401'd, and the CLI blamed the token ("tokens usually
// start with 'crt_live_'") when the token was perfectly valid. Nobody can debug
// a doubled key name they never typed. So: strip a `NAME=` prefix, an `export `,
// surrounding quotes, and stray lines, from every source (flag, env, prompt).
//
// `marker` guards the one way this could bite: some API keys contain `=`, and a
// blind prefix strip would eat half of one. The prefix is only removed when it
// reads as an env-var name (ALL_CAPS) or the tail carries the expected marker.
export function normalizeSecret(raw: string | undefined, marker?: string): string {
  let t = (raw ?? "").trim();
  if (!t) return "";
  // Multi-line paste (a whole .env file, or a file with a trailing comment):
  // keep the line that carries the secret, else the first non-empty one.
  if (t.includes("\n")) {
    const lines = t.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
    t = (marker && lines.find((l) => l.includes(marker))) || lines[0] || "";
  }
  const unquote = (s: string) => s.replace(/^(["'])([\s\S]*)\1$/, "$2").trim();
  t = unquote(t).replace(/^export\s+/i, "").trim();
  const kv = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([\s\S]+)$/.exec(t);
  if (kv) {
    const [, name, value] = kv;
    const looksLikeEnvName = /^[A-Z][A-Z0-9_]*$/.test(name);
    if (looksLikeEnvName || (marker && value.includes(marker))) t = value.trim();
  }
  return unquote(t);
}

const normalizeToken = (raw: string | undefined) => normalizeSecret(raw, "crt_");

async function verifyToken(
  token: string,
  apiBase: string
): Promise<{ ok: true; agentName: string | null } | { ok: false; reason: string }> {
  try {
    const res = await fetch(`${apiBase.replace(/\/+$/, "")}/api/skill/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    const data: any = await res.json().catch(() => ({}));
    return { ok: true, agentName: data?.agentName || data?.name || null };
  } catch (err: any) {
    return { ok: false, reason: err?.message || "network error" };
  }
}

// Recursively copy TEMPLATE_DIR -> dest, renaming dotfile stand-ins.
function copyTemplate(src: string, dest: string): number {
  let count = 0;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const from = path.join(src, entry.name);
    const outName = RENAME_ON_COPY[entry.name] || entry.name;
    const to = path.join(dest, outName);
    if (entry.isDirectory()) {
      count += copyTemplate(from, to);
    } else {
      fs.copyFileSync(from, to);
      count++;
    }
  }
  return count;
}

async function main(): Promise<void> {
  console.log("\n  create-chatrealty-site\n  ----------------------\n  A real-estate site on the ChatRealty API.\n");

  if (!fs.existsSync(TEMPLATE_DIR)) {
    console.error(`  ERROR: template not found at ${TEMPLATE_DIR}. Reinstall the package.\n`);
    process.exit(1);
  }

  const args = process.argv.slice(2);

  // Real --help (previously this fell through into the interactive flow).
  if (args.includes("--help") || args.includes("-h")) {
    console.log(`  Usage: npx create-chatrealty-site [dir] [flags]

  Flags:
    --test-data          Scaffold with bundled fictitious sample listings (no token; localhost preview only)
    --token <crt_live_…> ChatRealty API token (or env CHATREALTY_API_TOKEN)
    --api-base <url>     API base (default ${API_BASE_DEFAULT}; or env CHATREALTY_API_BASE)
    --chat-key <key>     Enable CHAP AI chat with this Groq/OpenAI-compatible key (or env CHAT_API_KEY)
    --no-chap            Skip the CHAP prompt entirely
    --agent-name <name>  Test-data mode: whose site this is (from the interview)
    --brokerage <name>   Test-data mode: their brokerage
    --market <place>     Test-data mode: the market they work
    --yes, -y            Non-interactive: accept defaults, never prompt
    --help, -h           This help

  Non-TTY stdin (agents, CI, pipes) is automatically non-interactive: prompts
  are skipped and defaults/flags/env are used — EOF never aborts the scaffold.
`);
    process.exit(0);
  }

  const positional = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--") && !["--test-data", "--yes", "-y", "--no-chap"].includes(args[i - 1])));

  // Non-interactive when stdin isn't a TTY (agent/CI runs — the PRIMARY path)
  // or when --yes is passed. In that mode ask() resolves its fallback
  // immediately: EOF means "accept default / skip", never "abort".
  const interactive = Boolean(process.stdin.isTTY) && !args.includes("--yes") && !args.includes("-y");

  // A single readline over stdin — reused for every prompt so piped input
  // works (recreating an interface per prompt eats the buffered lines).
  // Guarded against stdin closing mid-question (EOF → fallback, not a hang).
  const rl = interactive
    ? readline.createInterface({ input: process.stdin, output: process.stdout })
    : null;
  const ask = (q: string, fallback = ""): Promise<string> =>
    new Promise((resolve) => {
      if (!rl) return resolve(fallback);
      let settled = false;
      const done = (v: string) => {
        if (!settled) {
          settled = true;
          resolve(v.trim() || fallback);
        }
      };
      rl.once("close", () => done(fallback));
      rl.question(q, done);
    });

  let dir: string;
  let apiBase: string = API_BASE_DEFAULT;
  let token: string = "";
  let chapKey: string = "";
  let testMode = args.includes("--test-data");
  try {
    // 1. Target directory (positional arg, else prompt)
    dir = positional[0] || (await ask("  Project directory (e.g. my-realty-site): ", "chatrealty-site"));

    if (!testMode) {
      // 2. API base (flag/env, else prompt with default)
      apiBase = getFlag(args, "--api-base") || process.env.CHATREALTY_API_BASE || (await ask(`  ChatRealty API base [${API_BASE_DEFAULT}]: `, API_BASE_DEFAULT));

      // 3. Token (flag/env, else prompt). Empty answer → offer TEST DATA mode
      //    instead of erroring, so "no token yet" is a preview path, not a wall.
      token = normalizeToken(
        getFlag(args, "--token") ||
          process.env.CHATREALTY_API_TOKEN ||
          (await ask("  Your ChatRealty API token (crt_live_…) [Enter for TEST DATA mode]: "))
      );
      if (!token) {
        const yn = await ask(`  No token — scaffold with ${sampleListingCount()} fictitious SAMPLE listings instead? [Y/n]: `, "y");
        if (yn.toLowerCase().startsWith("y")) {
          testMode = true;
        }
      }
    }

    // CHAP — ChatRealty's flagship on-site AI listing search. It's a headline
    // feature, so offer it up front (works in test-data mode too). BYOK: any
    // OpenAI-compatible key; Groq (console.groq.com) has a generous free tier.
    // --no-chap skips the ask; non-interactive runs skip it automatically.
    chapKey = normalizeSecret(
      getFlag(args, "--chat-key") ||
        process.env.CHAT_API_KEY ||
        (args.includes("--no-chap")
          ? ""
          : await ask("  Enable CHAP AI listing chat now? Paste a Groq/OpenAI-compatible API key (Enter to skip): "))
    );
  } finally {
    rl?.close();
  }

  apiBase = apiBase.replace(/\/+$/, "");

  if (!isValidDirName(dir)) {
    console.error(`\n  ERROR: "${dir}" is not a valid directory name (use letters, numbers, - _ .).\n`);
    process.exit(1);
  }
  const dest = path.resolve(process.cwd(), dir);
  if (fs.existsSync(dest) && fs.readdirSync(dest).length > 0) {
    console.error(`\n  ERROR: ${dest} already exists and is not empty. Pick another name or empty it first.\n`);
    process.exit(1);
  }
  if (!testMode && !token) {
    console.error("\n  ERROR: a token is required (or use --test-data). Pass --token, set CHATREALTY_API_TOKEN, or paste it when prompted.\n  Get one from Settings → Integrations on your ChatRealty site.\n");
    process.exit(1);
  }
  if (!testMode && !token.startsWith("crt_")) {
    console.log("  (heads-up: tokens usually start with 'crt_live_' — continuing anyway)");
  }

  // 4. Verify the token so the scaffold isn't dead on arrival (skipped in
  //    test-data mode — there's nothing to verify against).
  if (testMode) {
    console.log(`\n  TEST DATA mode: scaffolding with ${sampleListingCount()} fictitious sample listings.`);
    console.log("  ⚠ These listings are NOT real. Preview only — do not launch publicly until your own MLS data is connected.");
  } else {
    console.log(`\n  Verifying token against ${apiBase} …`);
    const v = await verifyToken(token, apiBase);
    if (!v.ok) {
      console.log(`  ⚠ Could not verify token (${v.reason}). Scaffolding anyway — fix CHATREALTY_API_TOKEN in .env.local if data doesn't load.`);
    } else {
      console.log(`  ✓ Token verified${v.agentName ? ` (agent: ${v.agentName})` : ""}`);
    }
  }

  // 5. Scaffold
  const n = copyTemplate(TEMPLATE_DIR, dest);
  console.log(`\n  ✓ Wrote ${n} files to ${dest}`);

  // 5b. Make the sample persona THE AGENT'S.
  //
  // In test-data mode the site hydrates data/test-agent.json into the header,
  // footer, About page and <title>. That file ships a stock persona ("Jordan
  // Avery, Oasis Grove Realty"), so the reveal — which is supposed to be "this
  // is already YOUR site, not a neutral wireframe" — showed the agent a
  // stranger's name. The first real build fixed it by hand-overwriting the
  // file, which is the right outcome by the wrong route.
  const agentName = getFlag(args, "--agent-name") || "";
  const brokerage = getFlag(args, "--brokerage") || "";
  const market = getFlag(args, "--market") || "";
  if (testMode && (agentName || brokerage || market)) {
    const personaPath = path.join(dest, "data", "test-agent.json");
    try {
      const persona = JSON.parse(fs.readFileSync(personaPath, "utf8"));
      if (agentName) persona.name = agentName;
      if (brokerage) persona.brokerageName = brokerage;
      if (market) {
        persona.tagline = `${market} real estate`;
        persona.headline = `Homes in ${market}`;
        // Objects, not bare strings: AgentProfile types serviceAreas as
        // { name, type? }[] and every consumer reads `.name`. Writing [market]
        // here type-checked fine (the JSON is parsed as any) and then rendered
        // an EMPTY pill on /about plus a React key warning, while the homepage
        // CTA silently fell back to "Ready when you are" instead of naming the
        // market. Shape it the way the type says.
        persona.serviceAreas = [{ name: market, type: "city" }];
      }
      fs.writeFileSync(personaPath, JSON.stringify(persona, null, 2) + "\n");
      console.log(`  ✓ Sample persona set to ${[agentName, brokerage].filter(Boolean).join(" · ") || market}`);
    } catch {
      console.log("  ! Could not personalize data/test-agent.json — edit it by hand.");
    }
  }

  // The bundled sample listings are Coachella Valley. Say so out loud when the
  // agent works somewhere else, so they hear it from the tool at the moment of
  // the reveal rather than from whoever is walking them through the build.
  if (testMode && market && !/coachella|palm (desert|springs)|la quinta|rancho mirage|indian wells|indio|desert/i.test(market)) {
    console.log(`  ! Sample listings are Coachella Valley homes, not ${market}. The layout,`);
    console.log(`    map and stat band are real; the inventory is placeholder until your`);
    console.log(`    MLS feed is connected.`);
  }

  // 6. .env.local — the token lives here (git-ignored), server-side only.
  const chapBlock = chapKey.trim()
    ? `\n# CHAP — on-site AI listing chat (ChatRealty's flagship search). LIVE.\n# WHICH presentation appears is a design choice, not a default. Set ONE\n# constant — CHAP_PRESENTATION in lib/chap-presentation.ts — to "widget"\n# (floating), "panel" (inline), or "search" (full-page /search). The ones you\n# don't pick render nothing and /search 404s unless it IS the pick, so there\n# is nothing to delete and no way to leave two presentations live at once.\nCHAT_API_KEY=${chapKey.trim()}\n# CHAT_MODEL=llama-3.3-70b-versatile\n# CHAT_BASE_URL=https://api.groq.com/openai/v1\n`
    : `\n# CHAP — on-site AI listing chat (BYOK, OpenAI-compatible; Groq recommended).\n# Set a key here and CHAP switches on. WHICH presentation appears is a design\n# choice, not a default. Set ONE constant — CHAP_PRESENTATION in\n# lib/chap-presentation.ts — to "widget" (floating), "panel" (inline), or\n# "search" (full-page /search). The ones you don't pick render nothing and\n# /search 404s unless it IS the pick, so there is nothing to delete and no way\n# to leave two presentations live at once.\n# CHAT_API_KEY=gsk_...\n# CHAT_MODEL=llama-3.3-70b-versatile\n# CHAT_BASE_URL=https://api.groq.com/openai/v1\n`;
  const authSecret = require("crypto").randomBytes(32).toString("base64url");
  const authBlock = `
# Auth.js session secret (generated at scaffold time). Social login: add your
# OWN OAuth app keys and the sign-in buttons appear automatically.
AUTH_SECRET=${authSecret}
# AUTH_GOOGLE_ID=
# AUTH_GOOGLE_SECRET=
# AUTH_FACEBOOK_ID=
# AUTH_FACEBOOK_SECRET=
`;
  // Identity overrides — written COMMENTED, prefilled with whatever the flags
  // already told us. The site's name/license/brokerage normally come from the
  // ChatRealty profile the token belongs to, which is right for the token's
  // owner and wrong for everyone else: a build done on someone else's token
  // shipped every page, title and CTA under the token holder's name, because
  // the usual `agent.name || "Their Name"` fallback never fires against an API
  // that returns a real — just incorrect — name. Uncommenting a line here is
  // the supported fix. Also the place to put a license number collected in the
  // interview that the profile doesn't carry yet.
  const identityBlock = `
# Identity overrides (optional). Uncomment any line to make it win over the
# ChatRealty profile for that field alone. Use when the site is for someone
# other than the token holder, or for details the profile doesn't have yet.
# AGENT_SERVICE_AREAS drives the /neighborhoods index AND the default listing
# browse — set it for a single-market site whose feed reaches beyond that
# market, or the unfiltered /listings serves the whole feed (a judged build
# opened on Oakland and Stockton homes on a Coachella Valley site).
# MARKET_CITIES overrides just the browse scope when it differs from the
# service areas; set it to "off" to browse the whole feed.
# Note: set_site_live checks the license on your ChatRealty PROFILE, so an
# override here shows on the site but does not unblock going live.
#
# QUOTE ANY VALUE CONTAINING '#' — in a .env file '#' starts a comment, so
# AGENT_LICENSE=CA DRE #02241837 parses as "CA DRE " and the license number is
# SILENTLY DROPPED from the footer. The license number is required IDX display
# content and CA's standard format always contains '#', so this is the normal
# case. Write it quoted: AGENT_LICENSE="CA DRE #02241837"
# AGENT_NAME=${agentName}
# AGENT_LICENSE="CA DRE #01234567"
# AGENT_BROKERAGE=${brokerage}
# AGENT_SERVICE_AREAS=${market}
# MARKET_CITIES=${market}
# AGENT_PHONE=
# AGENT_EMAIL=
# AGENT_HEADLINE=
# AGENT_TAGLINE=
# AGENT_BIO=
# AGENT_HEADSHOT=
`;
  const envContent = testMode
    ? `# TEST DATA MODE — the site serves fictitious, watermarked sample listings from data/test-listings.json.\n# A permanent banner marks every page. LOCALHOST ONLY — deploy builds hard-fail in this mode.\n# When your ChatRealty data is ready: remove CHATREALTY_TEST_DATA and set the token.\nCHATREALTY_TEST_DATA=true\n# CHATREALTY_API_TOKEN=crt_live_...\n# CHATREALTY_API_BASE=${apiBase}\n${chapBlock}${authBlock}${identityBlock}`
    : `# ChatRealty API — SERVER-SIDE ONLY. Never expose this token to the browser.\nCHATREALTY_API_TOKEN=${token}\nCHATREALTY_API_BASE=${apiBase}\n${chapBlock}${authBlock}${identityBlock}`;
  fs.writeFileSync(path.join(dest, ".env.local"), envContent, { mode: 0o600 });
  console.log(`  ✓ Wrote .env.local (${testMode ? "TEST DATA mode" : "token kept server-side"}; already in .gitignore)`);

  // 7. Next steps
  console.log("\n  Done. Next:\n");
  console.log(`    cd ${dir}`);
  console.log("    npm install");
  console.log("    npm run dev\n");
  if (chapKey.trim()) {
    console.log("  ✓ CHAP AI listing chat is ENABLED — the chat bubble appears bottom-right. Try “3 beds under $800k with a pool”.\n");
  } else {
    console.log("  ℹ CHAP AI listing chat is off. Put CHAT_API_KEY in .env.local YOURSELF");
    console.log("    (a free Groq key from console.groq.com) — never paste a key into chat.");
    console.log("    Then pick a presentation: set CHAP_PRESENTATION in lib/chap-presentation.ts");
    console.log("    to \"widget\" (floating), \"panel\" (inline), or \"search\" (full-page /search).\n");
  }
  if (testMode) {
    console.log("  Then open http://localhost:3000 — the full site runs on SAMPLE listings (banner shown on every page).");
    console.log("  Go live checklist: connect your MLS feed with ChatRealty, set CHATREALTY_API_TOKEN in .env.local,");
    console.log("  and remove CHATREALTY_TEST_DATA. The banner disappears when real data is serving.\n");
  } else {
    console.log("  Then open http://localhost:3000 — listings, map, favorites, and neighborhoods are wired up.");
    console.log("  Customize freely; the ChatRealty client lives in lib/chatrealty.ts.\n");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
