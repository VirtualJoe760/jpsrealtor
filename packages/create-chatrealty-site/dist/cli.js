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
//   npx create-chatrealty-site           # prompts for anything not passed
//
// Non-interactive: pass --token/--api-base or set CHATREALTY_API_TOKEN /
// CHATREALTY_API_BASE in the environment.
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
    let apiBase;
    let token;
    try {
        // 1. Target directory (positional arg, else prompt)
        dir = positional[0] || (await ask("  Project directory (e.g. my-realty-site): ", "chatrealty-site"));
        // 2. API base (flag/env, else prompt with default)
        apiBase = getFlag(args, "--api-base") || process.env.CHATREALTY_API_BASE || (await ask(`  ChatRealty API base [${API_BASE_DEFAULT}]: `, API_BASE_DEFAULT));
        // 3. Token (flag/env, else prompt)
        token = getFlag(args, "--token") || process.env.CHATREALTY_API_TOKEN || (await ask("  Your ChatRealty API token (crt_live_…): "));
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
    if (!token) {
        console.error("\n  ERROR: a token is required. Pass --token, set CHATREALTY_API_TOKEN, or paste it when prompted.\n  Get one from Settings → Integrations on your ChatRealty site.\n");
        process.exit(1);
    }
    if (!token.startsWith("crt_")) {
        console.log("  (heads-up: tokens usually start with 'crt_live_' — continuing anyway)");
    }
    // 4. Verify the token so the scaffold isn't dead on arrival
    console.log(`\n  Verifying token against ${apiBase} …`);
    const v = await verifyToken(token, apiBase);
    if (!v.ok) {
        console.log(`  ⚠ Could not verify token (${v.reason}). Scaffolding anyway — fix CHATREALTY_API_TOKEN in .env.local if data doesn't load.`);
    }
    else {
        console.log(`  ✓ Token verified${v.agentName ? ` (agent: ${v.agentName})` : ""}`);
    }
    // 5. Scaffold
    const n = copyTemplate(TEMPLATE_DIR, dest);
    console.log(`\n  ✓ Wrote ${n} files to ${dest}`);
    // 6. .env.local — the token lives here (git-ignored), server-side only.
    fs.writeFileSync(path.join(dest, ".env.local"), `# ChatRealty API — SERVER-SIDE ONLY. Never expose this token to the browser.\nCHATREALTY_API_TOKEN=${token}\nCHATREALTY_API_BASE=${apiBase}\n`, { mode: 0o600 });
    console.log(`  ✓ Wrote .env.local (token kept server-side; already in .gitignore)`);
    // 7. Next steps
    console.log("\n  Done. Next:\n");
    console.log(`    cd ${dir}`);
    console.log("    npm install");
    console.log("    npm run dev\n");
    console.log("  Then open http://localhost:3000 — listings, map, favorites, and neighborhoods are wired up.");
    console.log("  Customize freely; the ChatRealty client lives in lib/chatrealty.ts.\n");
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
