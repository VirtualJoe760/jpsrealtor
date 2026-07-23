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
//   npx create-chatrealty-site my-site --test-data     # no token: 25 fictitious sample listings
//   npx create-chatrealty-site           # prompts for anything not passed
//
// Non-interactive: pass --token/--api-base or set CHATREALTY_API_TOKEN /
// CHATREALTY_API_BASE in the environment.
//
// TEST DATA mode (--test-data, or just press Enter at the token prompt):
// scaffolds the site against 25 FICTITIOUS listings bundled in the template
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
    const positional = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
    // A single readline over stdin — reused for every prompt so piped /
    // non-interactive input works (recreating an interface per prompt eats the
    // buffered lines). Closed before scaffolding.
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = (q, fallback = "") => new Promise((resolve) => rl.question(q, (a) => resolve(a.trim() || fallback)));
    let dir;
    let apiBase = API_BASE_DEFAULT;
    let token = "";
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
                const yn = await ask("  No token — scaffold with 25 fictitious SAMPLE listings instead? [Y/n]: ", "y");
                if (yn.toLowerCase().startsWith("y")) {
                    testMode = true;
                }
            }
        }
    }
    finally {
        rl.close();
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
        console.log("\n  TEST DATA mode: scaffolding with 25 fictitious sample listings.");
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
    // 6. .env.local — the token lives here (git-ignored), server-side only.
    const chapBlock = `\n# CHAP — on-site property chat (BYOK, OpenAI-compatible; Groq recommended).\n# The chat widget appears automatically once a key is set.\n# CHAT_API_KEY=gsk_...\n# CHAT_MODEL=llama-3.3-70b-versatile\n# CHAT_BASE_URL=https://api.groq.com/openai/v1\n`;
    const envContent = testMode
        ? `# TEST DATA MODE — the site serves fictitious, watermarked sample listings from data/test-listings.json.\n# A permanent banner marks every page. LOCALHOST ONLY — deploy builds hard-fail in this mode.\n# When your ChatRealty data is ready: remove CHATREALTY_TEST_DATA and set the token.\nCHATREALTY_TEST_DATA=true\n# CHATREALTY_API_TOKEN=crt_live_...\n# CHATREALTY_API_BASE=${apiBase}\n${chapBlock}`
        : `# ChatRealty API — SERVER-SIDE ONLY. Never expose this token to the browser.\nCHATREALTY_API_TOKEN=${token}\nCHATREALTY_API_BASE=${apiBase}\n${chapBlock}`;
    fs.writeFileSync(path.join(dest, ".env.local"), envContent, { mode: 0o600 });
    console.log(`  ✓ Wrote .env.local (${testMode ? "TEST DATA mode" : "token kept server-side"}; already in .gitignore)`);
    // 7. Next steps
    console.log("\n  Done. Next:\n");
    console.log(`    cd ${dir}`);
    console.log("    npm install");
    console.log("    npm run dev\n");
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
