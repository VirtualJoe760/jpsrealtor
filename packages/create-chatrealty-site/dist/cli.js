#!/usr/bin/env node
"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const readline = __importStar(require("readline"));
// dist/cli.js -> package root -> template/  (__dirname is a CommonJS global)
const TEMPLATE_DIR = path.join(__dirname, "..", "template");
// Count sample listings from the bundled fixture at runtime, so the number the
// CLI prints can never drift from what actually ships (CRBR bug report).
function sampleListingCount() {
    try {
        const data = JSON.parse(fs.readFileSync(path.join(TEMPLATE_DIR, "data", "test-listings.json"), "utf8"));
        return Array.isArray(data) ? data.length : 0;
    }
    catch {
        return 0;
    }
}
const API_BASE_DEFAULT = "https://www.chatrealty.io";
// Files shipped WITHOUT a leading dot (npm strips some dotfiles from published
// tarballs) — renamed to their dotted form on scaffold.
const RENAME_ON_COPY = {
    gitignore: ".gitignore",
    "env.example": ".env.example",
};
function isValidDirName(name) {
    return /^[a-zA-Z0-9._-]+$/.test(name) && name !== "." && name !== "..";
}
function getFlag(args, name) {
    const i = args.indexOf(name);
    return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined;
}
async function verifyToken(token, apiBase) {
    try {
        const res = await fetch(`${apiBase.replace(/\/+$/, "")}/api/skill/me`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok)
            return { ok: false, reason: `HTTP ${res.status}` };
        const data = await res.json().catch(() => ({}));
        return { ok: true, agentName: data?.agentName || data?.name || null };
    }
    catch (err) {
        return { ok: false, reason: err?.message || "network error" };
    }
}
// Recursively copy TEMPLATE_DIR -> dest, renaming dotfile stand-ins.
function copyTemplate(src, dest) {
    let count = 0;
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        if (entry.name === "node_modules" || entry.name === ".next")
            continue;
        const from = path.join(src, entry.name);
        const outName = RENAME_ON_COPY[entry.name] || entry.name;
        const to = path.join(dest, outName);
        if (entry.isDirectory()) {
            count += copyTemplate(from, to);
        }
        else {
            fs.copyFileSync(from, to);
            count++;
        }
    }
    return count;
}
async function main() {
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
    const ask = (q, fallback = "") => new Promise((resolve) => {
        if (!rl)
            return resolve(fallback);
        let settled = false;
        const done = (v) => {
            if (!settled) {
                settled = true;
                resolve(v.trim() || fallback);
            }
        };
        rl.once("close", () => done(fallback));
        rl.question(q, done);
    });
    let dir;
    let apiBase = API_BASE_DEFAULT;
    let token = "";
    let chapKey = "";
    let testMode = args.includes("--test-data");
    try {
        // 1. Target directory (positional arg, else prompt)
        dir = positional[0] || (await ask("  Project directory (e.g. my-realty-site): ", "chatrealty-site"));
        if (!testMode) {
            // 2. API base (flag/env, else prompt with default)
            apiBase = getFlag(args, "--api-base") || process.env.CHATREALTY_API_BASE || (await ask(`  ChatRealty API base [${API_BASE_DEFAULT}]: `, API_BASE_DEFAULT));
            // 3. Token (flag/env, else prompt). Empty answer → offer TEST DATA mode
            //    instead of erroring, so "no token yet" is a preview path, not a wall.
            token = getFlag(args, "--token") || process.env.CHATREALTY_API_TOKEN || (await ask("  Your ChatRealty API token (crt_live_…) [Enter for TEST DATA mode]: "));
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
        chapKey =
            getFlag(args, "--chat-key") ||
                process.env.CHAT_API_KEY ||
                (args.includes("--no-chap")
                    ? ""
                    : await ask("  Enable CHAP AI listing chat now? Paste a Groq/OpenAI-compatible API key (Enter to skip): "));
    }
    finally {
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
    }
    else {
        console.log(`\n  Verifying token against ${apiBase} …`);
        const v = await verifyToken(token, apiBase);
        if (!v.ok) {
            console.log(`  ⚠ Could not verify token (${v.reason}). Scaffolding anyway — fix CHATREALTY_API_TOKEN in .env.local if data doesn't load.`);
        }
        else {
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
            if (agentName)
                persona.name = agentName;
            if (brokerage)
                persona.brokerageName = brokerage;
            if (market) {
                persona.tagline = `${market} real estate`;
                persona.headline = `Homes in ${market}`;
                persona.serviceAreas = [market];
            }
            fs.writeFileSync(personaPath, JSON.stringify(persona, null, 2) + "\n");
            console.log(`  ✓ Sample persona set to ${[agentName, brokerage].filter(Boolean).join(" · ") || market}`);
        }
        catch {
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
        ? `\n# CHAP — on-site AI listing chat (ChatRealty's flagship search). LIVE.\n# WHICH presentation appears is a design choice, not a default: ChapWidget\n# (floating), ChapPanel (inline), or ChapSearch + /search (full page).\n# Mount one, delete the others.\nCHAT_API_KEY=${chapKey.trim()}\n# CHAT_MODEL=llama-3.3-70b-versatile\n# CHAT_BASE_URL=https://api.groq.com/openai/v1\n`
        : `\n# CHAP — on-site AI listing chat (BYOK, OpenAI-compatible; Groq recommended).\n# Set a key here and CHAP switches on. WHICH presentation appears is a design\n# choice, not a default: ChapWidget (floating), ChapPanel (inline), or\n# ChapSearch + /search (full page). Mount one, delete the others.\n# CHAT_API_KEY=gsk_...\n# CHAT_MODEL=llama-3.3-70b-versatile\n# CHAT_BASE_URL=https://api.groq.com/openai/v1\n`;
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
    const envContent = testMode
        ? `# TEST DATA MODE — the site serves fictitious, watermarked sample listings from data/test-listings.json.\n# A permanent banner marks every page. LOCALHOST ONLY — deploy builds hard-fail in this mode.\n# When your ChatRealty data is ready: remove CHATREALTY_TEST_DATA and set the token.\nCHATREALTY_TEST_DATA=true\n# CHATREALTY_API_TOKEN=crt_live_...\n# CHATREALTY_API_BASE=${apiBase}\n${chapBlock}${authBlock}`
        : `# ChatRealty API — SERVER-SIDE ONLY. Never expose this token to the browser.\nCHATREALTY_API_TOKEN=${token}\nCHATREALTY_API_BASE=${apiBase}\n${chapBlock}${authBlock}`;
    fs.writeFileSync(path.join(dest, ".env.local"), envContent, { mode: 0o600 });
    console.log(`  ✓ Wrote .env.local (${testMode ? "TEST DATA mode" : "token kept server-side"}; already in .gitignore)`);
    // 7. Next steps
    console.log("\n  Done. Next:\n");
    console.log(`    cd ${dir}`);
    console.log("    npm install");
    console.log("    npm run dev\n");
    if (chapKey.trim()) {
        console.log("  ✓ CHAP AI listing chat is ENABLED — the chat bubble appears bottom-right. Try “3 beds under $800k with a pool”.\n");
    }
    else {
        console.log("  ℹ CHAP AI listing chat is off. Put CHAT_API_KEY in .env.local YOURSELF");
        console.log("    (a free Groq key from console.groq.com) — never paste a key into chat.");
        console.log("    Then pick a presentation: floating widget, inline panel, or full-page /search.\n");
    }
    if (testMode) {
        console.log("  Then open http://localhost:3000 — the full site runs on SAMPLE listings (banner shown on every page).");
        console.log("  Go live checklist: connect your MLS feed with ChatRealty, set CHATREALTY_API_TOKEN in .env.local,");
        console.log("  and remove CHATREALTY_TEST_DATA. The banner disappears when real data is serving.\n");
    }
    else {
        console.log("  Then open http://localhost:3000 — listings, map, favorites, and neighborhoods are wired up.");
        console.log("  Customize freely; the ChatRealty client lives in lib/chatrealty.ts.\n");
    }
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
