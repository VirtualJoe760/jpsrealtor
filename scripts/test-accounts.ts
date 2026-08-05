// scripts/test-accounts.ts — account lifecycle for the judge loop.
//
// Tom (the judge — docs/testing/agents/tom.md) uses this to put a test account
// into a known state before dispatching a build, and to tear it back down after.
// Every command prints a before/after so the result can go straight into his
// session report.
//
//   npx tsx scripts/test-accounts.ts personas
//   npx tsx scripts/test-accounts.ts inspect  <email>
//   npx tsx scripts/test-accounts.ts promote  <email> [--tier=free|beginner|experienced|topagent]
//   npx tsx scripts/test-accounts.ts enrich   <email> [--persona=<key>] [--partial]
//   npx tsx scripts/test-accounts.ts degrade  <email> [--tier=free] [--strip-role]
//   npx tsx scripts/test-accounts.ts reset    <email>
//   npx tsx scripts/test-accounts.ts list
//
// Global flags: --json (machine-readable), --session=<n> (stamped into the
// ledger), --dry-run (resolve and report, write nothing).
//
// ---------------------------------------------------------------------------
// WHY THIS USES THE REAL MODELS
//
// scripts/agent-feedback.mjs talks to Mongo through the raw driver, which is
// fine for two flat collections it owns outright. This script must NOT: two
// pre-save hooks carry behaviour a raw write would skip, and skipping them
// produces test accounts that differ from real ones in exactly the places the
// loop is meant to exercise —
//   User.pre("save")             → generates agentProfile.subdomain on the
//                                  first promotion to realEstateAgent
//   AgentSubscription.pre("save") → rewrites `features` from the tier, which is
//                                  what every paid-feature gate reads
// A raw-driver promote yields an agent with no subdomain and a beginner
// subscription still carrying free-tier feature limits. Both would be reported
// as product bugs. So: real models, real hooks, tsx.
//
// ---------------------------------------------------------------------------
// WHY THERE IS NO `create` COMMAND
//
// Tom creates accounts by going through the real signup flow, because that flow
// is part of what's under test. A `create` command here would be a bypass, and
// the first thing it would get used for is routing around a broken signup —
// which is the finding, not an obstacle. If signup breaks, that is the report.

import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import { config } from "dotenv";
import { generateApiToken } from "../src/lib/secrets";
import { PRESETS } from "../src/lib/skill-scopes";
import User from "../src/models/User";
import AgentSubscription, { type SubscriptionTier } from "../src/models/AgentSubscription";
import { getSiteReadiness } from "../src/lib/agent-site-readiness";
import { generateSubdomain } from "../src/lib/generate-subdomain";

config({ path: "F:/web-clients/joseph-sardella/jpsrealtor/.env.local" });

// ---------------------------------------------------------------------------
// SAFETY GATE
//
// This script runs autonomously, against the production database, on a machine
// that also holds ~4,700 seeded MLS agent records belonging to real licensed
// people. The gate is therefore an allowlist, not a denylist: an account is
// touchable only if its address is one the loop could have created on purpose.
//
//   josephsardella+crtest7@gmail.com   ← plus-addressing; mail reaches Joe's
//                                        inbox so signup verification works,
//                                        and it is NOT the admin address (the
//                                        admin check is exact string equality)
//   anything@chatrealty-test.com       ← for accounts that never need mail
//
// Nothing else is writable, and no command deletes a user under any flag.
// Tearing an account down means stripping what the loop added, never removing
// the row — an autonomous agent with a delete verb is a bad trade.
const TEST_EMAIL_RE = /(\+crtest[a-z0-9-]*@)|(@chatrealty-test\.com$)/i;

class Refused extends Error {}

function assertTestEmail(email: string): void {
  if (!TEST_EMAIL_RE.test(email)) {
    throw new Refused(
      `"${email}" is not a test address, so this script will not touch it.\n` +
        `Test accounts must use +crtest plus-addressing (josephsardella+crtest7@gmail.com)\n` +
        `or the @chatrealty-test.com domain. This gate exists because the same\n` +
        `database holds real agents and real users.`
    );
  }
}

/** Second gate: the address pattern could in principle be worn by an admin. */
function assertNotPrivileged(user: any): void {
  if (user.isAdmin === true || user.roles?.includes("admin")) {
    throw new Refused(
      `"${user.email}" carries admin privileges. Refusing regardless of the address pattern.`
    );
  }
}

// ---------------------------------------------------------------------------
// PERSONAS — Greater Palm Springs only.
//
// GPS is the only MLS the Spark test credentials cover, so a persona anywhere
// else yields a site with zero real listings and an unjudgeable session (see
// docs/testing/agents/tom.md). Sessions 5 and 6 were lost to exactly that.
//
// Every persona is fictitious and stays obviously fictitious under inspection:
// the licence numbers use a TEST- prefix rather than a plausible 8-digit CA DRE
// format, because these profiles can become publicly reachable at
// {subdomain}.chatrealty.io and a real-looking licence on a public page is a
// compliance problem rather than a cosmetic one.
const PERSONAS: Record<
  string,
  {
    name: string;
    city: string;
    brokerage: string;
    headline: string;
    specializations: string[];
    positioning: string;
  }
> = {
  "snowbird-pd": {
    name: "Dana Reyes",
    city: "Palm Desert",
    brokerage: "Fairway Desert Properties",
    headline: "Second homes and seasonal living in Palm Desert",
    specializations: ["Second Homes", "Snowbird Relocation", "Condos"],
    positioning: "snowbirds and second homes",
  },
  "golf-laquinta": {
    name: "Marcus Whitfield",
    city: "La Quinta",
    brokerage: "Coral Mountain Realty Group",
    headline: "Country club living in La Quinta and PGA West",
    specializations: ["Golf Communities", "Luxury Homes", "Country Club"],
    positioning: "golf and country club",
  },
  "midcentury-ps": {
    name: "Ilse Bergman",
    city: "Palm Springs",
    brokerage: "Deepwell Modern",
    headline: "Mid-century architecture in the Movie Colony and Las Palmas",
    specializations: ["Mid-Century Modern", "Architectural Homes", "Historic Districts"],
    positioning: "mid-century modern architecture",
  },
  "firsttime-indio": {
    name: "Rosa Alcaraz",
    city: "Indio",
    brokerage: "Eastern Valley Homes",
    headline: "First homes in Indio, Coachella, and Bermuda Dunes",
    specializations: ["First-Time Buyers", "New Construction", "FHA/VA"],
    positioning: "eastern-valley first-time buyers",
  },
};

// Cloudinary's public demo assets — permanent fixtures, and res.cloudinary.com
// is already in next.config.mjs remotePatterns. Deliberately generic: a test
// site should never be mistakable for a real agent's site at a glance.
const PLACEHOLDER_HEADSHOT =
  "https://res.cloudinary.com/demo/image/upload/w_400,h_400,c_fill,g_face/woman.jpg";
const PLACEHOLDER_HERO =
  "https://res.cloudinary.com/demo/image/upload/w_1600,h_900,c_fill/sample.jpg";

// ---------------------------------------------------------------------------
// LEDGER — provenance for every mutation, in a collection the testing system
// owns. Kept off the User document so this script never adds a field to the
// platform's core model (and so Mongoose strict mode is never a factor).
async function ledgerRecord(
  email: string,
  userId: mongoose.Types.ObjectId,
  action: string,
  detail: Record<string, unknown>,
  session: string | null
) {
  const db = mongoose.connection.db;
  if (!db) throw new Error("not connected");
  await db.collection("testaccounts").updateOne(
    { email: email.toLowerCase() },
    {
      $set: { email: email.toLowerCase(), userId, lastActionAt: new Date() },
      $setOnInsert: { firstSeenAt: new Date() },
      $push: {
        actions: { action, ...detail, session, at: new Date() } as never,
      },
    },
    { upsert: true }
  );
}

// ---------------------------------------------------------------------------
// STATE SNAPSHOT — the shape every command prints before and after.
async function snapshot(email: string) {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw new Refused(`No account for "${email}". Tom creates accounts via the signup flow.`);

  const sub = await AgentSubscription.findOne({ agentId: user._id })
    .sort({ status: 1, updatedAt: -1 })
    .lean<any>();

  const readiness = getSiteReadiness(user as any);
  const ap: any = user.agentProfile ?? {};

  return {
    email: user.email,
    userId: String(user._id),
    name: user.name ?? null,
    roles: user.roles ?? [],
    isAgent: (user.roles ?? []).includes("realEstateAgent"),
    // Source of truth for gating is AgentSubscription.tier, never
    // User.subscriptionTier (that field is the legacy consumer tier).
    tier: (sub?.tier ?? "free") as SubscriptionTier,
    subscriptionStatus: sub?.status ?? null,
    // The two features whose gates are most often mis-tested.
    features: sub?.features
      ? { customDomain: sub.features.customDomain, apiAccess: sub.features.apiAccess }
      : null,
    subdomain: ap.subdomain ?? null,
    publicUrl: ap.subdomain ? `https://${ap.subdomain}.chatrealty.io` : null,
    onboardingComplete: ap.onboardingComplete ?? false,
    licenseNumber: user.licenseNumber ?? null,
    brokerageName: user.brokerageName ?? null,
    serviceAreas: (ap.serviceAreas ?? []).map((a: any) => a?.name).filter(Boolean),
    apiTokens: (ap.aiIntegrations?.apiTokens ?? []).filter((t: any) => !t.revokedAt).length,
    siteReadiness: {
      complete: readiness.complete,
      completed: readiness.completed,
      total: readiness.total,
      missing: readiness.steps.filter((s) => !s.done).map((s) => s.key),
    },
  };
}

type Snap = Awaited<ReturnType<typeof snapshot>>;

function printSnap(label: string, s: Snap) {
  console.log(`\n${label}`);
  console.log("─".repeat(64));
  console.log(`  email          ${s.email}`);
  console.log(`  name           ${s.name ?? "(unset)"}`);
  console.log(`  roles          ${s.roles.join(", ") || "(none)"}`);
  console.log(`  agent?         ${s.isAgent ? "yes" : "no"}`);
  console.log(`  tier           ${s.tier}${s.subscriptionStatus ? ` (${s.subscriptionStatus})` : ""}`);
  if (s.features) {
    console.log(`  customDomain   ${s.features.customDomain}`);
    console.log(`  apiAccess      ${s.features.apiAccess}`);
  }
  console.log(`  subdomain      ${s.subdomain ?? "(none)"}`);
  console.log(`  public URL     ${s.publicUrl ?? "(none)"}`);
  console.log(`  license        ${s.licenseNumber ?? "(unset)"}`);
  console.log(`  brokerage      ${s.brokerageName ?? "(unset)"}`);
  console.log(`  service areas  ${s.serviceAreas.join(", ") || "(none)"}`);
  console.log(`  API tokens     ${s.apiTokens} active`);
  console.log(
    `  site ready     ${s.siteReadiness.completed}/${s.siteReadiness.total}` +
      (s.siteReadiness.complete
        ? "  → COMPLETE (site can go live)"
        : `  → missing: ${s.siteReadiness.missing.join(", ")}`)
  );
}

function diff(before: Snap, after: Snap): string[] {
  const out: string[] = [];
  const cmp = (label: string, a: unknown, b: unknown) => {
    const as = JSON.stringify(a);
    const bs = JSON.stringify(b);
    if (as !== bs) out.push(`${label}: ${as} → ${bs}`);
  };
  cmp("roles", before.roles, after.roles);
  cmp("tier", before.tier, after.tier);
  cmp("subdomain", before.subdomain, after.subdomain);
  cmp("license", before.licenseNumber, after.licenseNumber);
  cmp("brokerage", before.brokerageName, after.brokerageName);
  cmp("serviceAreas", before.serviceAreas, after.serviceAreas);
  cmp("siteReady", before.siteReadiness.completed, after.siteReadiness.completed);
  cmp("customDomain", before.features?.customDomain, after.features?.customDomain);
  cmp("apiAccess", before.features?.apiAccess, after.features?.apiAccess);
  return out;
}

// ---------------------------------------------------------------------------
// COMMANDS

async function cmdPromote(email: string, tier: SubscriptionTier, dry: boolean, session: string | null) {
  const before = await snapshot(email);
  const user = await User.findOne({ email: email.toLowerCase() });
  assertNotPrivileged(user);

  if (dry) return { before, after: before, dryRun: true };

  if (!user!.roles.includes("realEstateAgent")) {
    user!.roles.push("realEstateAgent");
    user!.markModified("roles");
  }
  // .save() fires the pre-save hook that mints agentProfile.subdomain.
  await user!.save();

  // The hook resolves "@/lib/generate-subdomain" through a dynamic import that
  // depends on tsconfig path aliases, and it swallows its own failure by design
  // (a subdomain is not worth blocking a signup over). Under tsx that resolution
  // can fail silently, so verify the result rather than trusting the exit — the
  // house rule is to check the result, not the exit code.
  const reloaded = await User.findById(user!._id);
  if (!reloaded!.agentProfile?.subdomain) {
    const sub = await generateSubdomain(reloaded!.name, reloaded!.email, reloaded!._id);
    if (!reloaded!.agentProfile) reloaded!.agentProfile = {} as any;
    reloaded!.agentProfile.subdomain = sub;
    reloaded!.markModified("agentProfile");
    await reloaded!.save();
    console.log(`  (subdomain hook did not fire under tsx; generated "${sub}" directly)`);
  }

  // Subscription: the tier setter must go through .save() so the pre-save hook
  // rewrites `features`. Assigning tier with updateOne would leave a beginner
  // subscription wearing free-tier limits.
  let subDoc = await AgentSubscription.findOne({ agentId: user!._id }).sort({ updatedAt: -1 });
  if (!subDoc) {
    // currentPeriodStart/End are set by the model's own pre-save hook, but
    // validation runs FIRST and both fields are `required` — so a new document
    // fails validation before the hook that would have filled them ever runs.
    // Supplying them here is what makes creation work at all.
    const periodStart = new Date();
    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    subDoc = new AgentSubscription({
      agentId: user!._id,
      tier,
      status: "active",
      billingInterval: "monthly",
      monthlyPrice: 0,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      notes: `judge-loop test account${session ? ` (session ${session})` : ""}`,
    });
  } else {
    subDoc.tier = tier;
    subDoc.status = "active";
  }
  await subDoc.save();

  const after = await snapshot(email);
  await ledgerRecord(email, user!._id, "promote", { tier }, session);
  return { before, after, dryRun: false };
}

async function cmdDegrade(
  email: string,
  tier: SubscriptionTier,
  stripRole: boolean,
  dry: boolean,
  session: string | null
) {
  const before = await snapshot(email);
  const user = await User.findOne({ email: email.toLowerCase() });
  assertNotPrivileged(user);

  if (dry) return { before, after: before, dryRun: true };

  const subDoc = await AgentSubscription.findOne({ agentId: user!._id }).sort({ updatedAt: -1 });
  if (subDoc) {
    subDoc.tier = tier;
    await subDoc.save();
  }

  if (stripRole) {
    user!.roles = (user!.roles ?? []).filter((r) => r !== "realEstateAgent");
    user!.markModified("roles");
    // The subdomain is deliberately left in place: reclaiming it would let a
    // later promotion mint a different one, and a moving public URL makes a
    // multi-session test harder to follow. `reset` is what clears it.
    await user!.save();
  }

  const after = await snapshot(email);
  await ledgerRecord(email, user!._id, "degrade", { tier, stripRole }, session);
  return { before, after, dryRun: false };
}

async function cmdEnrich(
  email: string,
  personaKey: string,
  partial: boolean,
  dry: boolean,
  session: string | null
) {
  const persona = PERSONAS[personaKey];
  if (!persona) {
    throw new Refused(
      `Unknown persona "${personaKey}". Available: ${Object.keys(PERSONAS).join(", ")}\n` +
        `(All are Greater Palm Springs — the only MLS the test credentials cover.)`
    );
  }

  const before = await snapshot(email);
  const user = await User.findOne({ email: email.toLowerCase() });
  assertNotPrivileged(user);
  if (dry) return { before, after: before, dryRun: true, persona: personaKey };

  user!.name = persona.name;
  user!.phone = "(760) 555-0142";
  user!.licenseNumber = `TEST-${String(Math.abs(hashCode(email)) % 9000000 + 1000000)}`;
  user!.brokerageName = persona.brokerage;
  user!.contactVisibility = "public";

  if (!user!.agentProfile) user!.agentProfile = {} as any;
  const ap: any = user!.agentProfile;

  ap.headshot = PLACEHOLDER_HEADSHOT;
  ap.headline = persona.headline;
  ap.cellPhone = "(760) 555-0142";
  ap.bio = `Test-account profile for ChatRealty QA. ${persona.name} is a fictitious agent used to exercise the ${persona.positioning} positioning in ${persona.city}.`;
  ap.onboardingComplete = true;
  ap.specializations = persona.specializations;
  // serviceAreas is { name, type }[] — a bare string here rendered an empty chip
  // on /about and dropped the market name from the homepage CTA (cr-bug 6a713553).
  ap.serviceAreas = [{ name: persona.city, type: "city" }];

  // `--partial` stops one step short of readiness so the "Coming Soon" gate
  // stays closed. That gate is a test surface in its own right, and it is the
  // only way to enrich an account without making a fictitious licensed agent
  // publicly reachable.
  if (partial) {
    ap.heroPhoto = undefined;
    ap.heroPhotoDark = undefined;
    ap.personalStory = undefined;
    ap.videoIntro = undefined;
  } else {
    ap.heroPhoto = PLACEHOLDER_HERO;
    ap.personalStory = `This is a ChatRealty test account. ${persona.name} does not exist and this site is generated for automated QA of the agent site build. Positioning under test: ${persona.positioning}.`;
  }

  user!.markModified("agentProfile");
  await user!.save();

  const after = await snapshot(email);
  await ledgerRecord(email, user!._id, "enrich", { persona: personaKey, partial }, session);
  return { before, after, dryRun: false, persona: personaKey };
}

/**
 * Mint a crt_live token for a test account — the piece `promote` alone does not
 * give Tom. Without one he cannot scaffold a site or provision a tenant
 * database, which is the wall every session so far has routed around.
 *
 * Mirrors POST /api/integrations/api-tokens exactly: same generator, same
 * storage shape, same `website` preset a scaffolded build uses. It bypasses the
 * UI only because the UI needs an interactive session, not to dodge a gate.
 *
 * The plaintext is written to a FILE and never printed. A token is a secret
 * even when it belongs to a throwaway account: echoing it would put it in a
 * transcript, and the report format treats a leaked `crt_live_` as a gate-5
 * failure. Only the last four are reported.
 */
async function cmdToken(
  email: string,
  outPath: string,
  dry: boolean,
  session: string | null
) {
  const before = await snapshot(email);
  const user = await User.findOne({ email: email.toLowerCase() });
  assertNotPrivileged(user);
  if (dry) return { before, after: before, dryRun: true };

  if (!user!.agentProfile) user!.agentProfile = {} as any;
  const ap: any = user!.agentProfile;
  ap.aiIntegrations = ap.aiIntegrations || {};
  const tokens = (ap.aiIntegrations.apiTokens ||= []);

  const { plaintext, hash, last4 } = generateApiToken();
  tokens.push({
    tokenHash: hash,
    last4,
    name: `judge-loop${session ? `-${session}` : ""}`,
    // The preset a scaffolded create-chatrealty-site build runs on.
    scopes: [...PRESETS.website.scopes],
    createdAt: new Date(),
  });
  user!.markModified("agentProfile.aiIntegrations.apiTokens");
  await user!.save();

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `CHATREALTY_API_TOKEN=${plaintext}\n`, { mode: 0o600 });

  await ledgerRecord(email, user!._id, "token", { last4, outPath }, session);
  const after = await snapshot(email);
  return { before, after, dryRun: false, last4, outPath };
}

async function cmdReset(email: string, dry: boolean, session: string | null) {
  const before = await snapshot(email);
  const user = await User.findOne({ email: email.toLowerCase() });
  assertNotPrivileged(user);
  if (dry) return { before, after: before, dryRun: true };

  // Strip only what this script adds. The row itself is never deleted, and
  // nothing the signup flow created (email, password, verification) is touched
  // — so the same account can be promoted again without re-registering.
  user!.roles = (user!.roles ?? []).filter((r) => r !== "realEstateAgent");
  user!.markModified("roles");
  user!.licenseNumber = undefined;
  user!.brokerageName = undefined;
  // The persona's name and phone must go too. Leaving them behind is not just
  // untidy: generateSubdomain() builds the slug from `name`, so a reset account
  // still called "Marcus Whitfield" would mint the subdomain marcuswhitfield on
  // its NEXT promotion — carrying one session's persona into the next one's
  // public URL.
  user!.name = undefined;
  user!.phone = undefined;
  user!.contactVisibility = undefined;

  if (user!.agentProfile) {
    const ap: any = user!.agentProfile;
    for (const k of [
      "headshot",
      "heroPhoto",
      "heroPhotoDark",
      "headline",
      "personalStory",
      "bio",
      "cellPhone",
      "serviceAreas",
      "specializations",
      "subdomain",
    ]) {
      ap[k] = undefined;
    }
    ap.onboardingComplete = false;
    user!.markModified("agentProfile");
  }
  await user!.save();

  const subDoc = await AgentSubscription.findOne({ agentId: user!._id }).sort({ updatedAt: -1 });
  if (subDoc) {
    subDoc.tier = "free";
    subDoc.status = "cancelled";
    await subDoc.save();
  }

  const after = await snapshot(email);
  await ledgerRecord(email, user!._id, "reset", {}, session);
  return { before, after, dryRun: false };
}

async function cmdList() {
  const db = mongoose.connection.db;
  if (!db) throw new Error("not connected");
  const rows = await db.collection("testaccounts").find({}).sort({ lastActionAt: -1 }).toArray();
  const out = [];
  for (const r of rows) {
    try {
      out.push({ ...(await snapshot(r.email)), actions: (r.actions ?? []).length });
    } catch {
      out.push({ email: r.email, missing: true, actions: (r.actions ?? []).length });
    }
  }
  return out;
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

// ---------------------------------------------------------------------------

async function main() {
  const argv = process.argv.slice(2);
  const flags = new Map<string, string>();
  const positional: string[] = [];
  for (const a of argv) {
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=");
      flags.set(k, v ?? "true");
    } else positional.push(a);
  }

  const [cmd, email] = positional;
  const json = flags.has("json");
  const dry = flags.has("dry-run");
  const session = flags.get("session") ?? null;

  if (cmd === "personas") {
    if (json) console.log(JSON.stringify(PERSONAS, null, 2));
    else {
      console.log("\nGPS-market personas (the only MLS the test credentials cover):\n");
      for (const [k, p] of Object.entries(PERSONAS)) {
        console.log(`  ${k.padEnd(18)} ${p.name} — ${p.city}, ${p.positioning}`);
      }
      console.log();
    }
    return;
  }

  const needsEmail = ["inspect", "promote", "degrade", "enrich", "reset", "token"];
  if (!cmd || (needsEmail.includes(cmd) && !email)) {
    console.error(
      [
        "usage: npx tsx scripts/test-accounts.ts <command> [email] [flags]",
        "",
        "  personas                              list the GPS-market personas",
        "  inspect  <email>                      current state, no writes",
        "  promote  <email> [--tier=beginner]    add realEstateAgent + subscription",
        "  enrich   <email> [--persona=k] [--partial]   fill the profile",
        "  token    <email> --out=<path>         mint a crt_live token to a file",
        "  degrade  <email> [--tier=free] [--strip-role]",
        "  reset    <email>                      strip everything the loop added",
        "  list                                  every account in the ledger",
        "",
        "  --json  --dry-run  --session=<n>",
      ].join("\n")
    );
    process.exitCode = 1;
    return;
  }

  await mongoose.connect(process.env.MONGODB_URI!);

  if (cmd === "list") {
    const rows = await cmdList();
    if (json) console.log(JSON.stringify(rows, null, 2));
    else {
      console.log(`\n${rows.length} test account(s) in the ledger\n`);
      for (const r of rows as any[]) {
        console.log(
          r.missing
            ? `  ${r.email}  — DELETED from users (${r.actions} actions logged)`
            : `  ${r.email.padEnd(38)} ${r.isAgent ? "agent" : "user "} ${String(r.tier).padEnd(12)} ` +
                `site ${r.siteReadiness.completed}/${r.siteReadiness.total}  ${r.publicUrl ?? ""}`
        );
      }
      console.log();
    }
    return;
  }

  assertTestEmail(email);

  let result: any;
  switch (cmd) {
    case "inspect": {
      const s = await snapshot(email);
      result = { before: s, after: s, dryRun: true };
      break;
    }
    case "promote":
      result = await cmdPromote(
        email,
        (flags.get("tier") ?? "free") as SubscriptionTier,
        dry,
        session
      );
      break;
    case "enrich":
      result = await cmdEnrich(
        email,
        flags.get("persona") ?? "snowbird-pd",
        flags.has("partial"),
        dry,
        session
      );
      break;
    case "degrade":
      result = await cmdDegrade(
        email,
        (flags.get("tier") ?? "free") as SubscriptionTier,
        flags.has("strip-role"),
        dry,
        session
      );
      break;
    case "token": {
      const out = flags.get("out");
      if (!out) {
        throw new Refused(
          "token requires --out=<path>. The plaintext is written to that file and\n" +
            "never printed — a crt_live_ string in a transcript is a gate-5 failure."
        );
      }
      result = await cmdToken(email, out, dry, session);
      break;
    }
    case "reset":
      result = await cmdReset(email, dry, session);
      break;
    default:
      throw new Refused(`Unknown command "${cmd}".`);
  }

  const changes = diff(result.before, result.after);

  if (json) {
    console.log(JSON.stringify({ command: cmd, ...result, changes }, null, 2));
  } else {
    if (cmd !== "inspect") printSnap(`BEFORE — ${cmd}`, result.before);
    printSnap(cmd === "inspect" ? "STATE" : `AFTER — ${cmd}`, result.after);
    if (cmd !== "inspect") {
      console.log(`\n${result.dryRun ? "DRY RUN — nothing written" : "Changed"}`);
      console.log("─".repeat(64));
      if (!changes.length) console.log("  (no change — already in this state)");
      for (const c of changes) console.log(`  ${c}`);
    }
    if (result.after.siteReadiness.complete && result.after.publicUrl) {
      console.log(
        `\n  NOTE: readiness is complete, so ${result.after.publicUrl} is publicly\n` +
          `  reachable. The licence number is a TEST- prefix, not a DRE format, and the\n` +
          `  copy says it is a test account. Use --partial on enrich to keep it gated.`
      );
    }
    console.log();
  }
}

main()
  .catch((e) => {
    if (e instanceof Refused) {
      console.error(`\nREFUSED\n${"─".repeat(64)}\n${e.message}\n`);
      process.exitCode = 2;
    } else {
      console.error("ERROR:", e.message);
      process.exitCode = 1;
    }
  })
  .finally(() => mongoose.disconnect());
