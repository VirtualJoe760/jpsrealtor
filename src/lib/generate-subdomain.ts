// src/lib/generate-subdomain.ts
// Shared utility for generating unique agent subdomains.
//
// Pattern: firstName + lastName → lowercase alphanumeric slug
//   "Joseph Sardella" → "josephsardella"
//   "María García"    → "maragarca"
//   Conflict?         → "josephsardella2", "josephsardella3", ...

import mongoose from "mongoose";

// Reserved words that can't be used as subdomains
const RESERVED = new Set([
  "admin", "api", "app", "auth", "blog", "cdn", "chat", "cms",
  "dashboard", "dev", "docs", "ftp", "help", "mail", "map",
  "media", "news", "proxy", "search", "shop", "staging", "status",
  "support", "test", "www", "chatrealty", "jpsrealtor",
]);

/**
 * Generate a unique subdomain for an agent.
 *
 * @param name      User's display name (e.g. "Joseph Sardella")
 * @param email     Fallback if name is empty
 * @param userId    The user's ObjectId (excluded from uniqueness check)
 * @returns         The final unique subdomain string
 */
export async function generateSubdomain(
  name: string | undefined,
  email: string,
  userId: mongoose.Types.ObjectId | string
): Promise<string> {
  // Build base slug from name, fall back to email prefix
  const raw = (name || email.split("@")[0]).toLowerCase();
  let base = raw.replace(/[^a-z0-9]/g, "");

  // Enforce minimum length
  if (base.length < 3) {
    base = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
  }
  if (base.length < 3) {
    base = "agent";
  }

  // Truncate overly long subdomains
  if (base.length > 30) {
    base = base.slice(0, 30);
  }

  // Check reserved words
  if (RESERVED.has(base)) {
    base = `${base}agent`;
  }

  // Find a unique subdomain (check conflicts, append number if needed)
  // Use raw collection query to avoid model union type issues
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database not connected");
  const usersCol = db.collection("users");

  let final = base;
  let attempt = 0;

  while (true) {
    const existing = await usersCol.findOne({
      "agentProfile.subdomain": final,
      _id: { $ne: new mongoose.Types.ObjectId(String(userId)) },
    });
    if (!existing) break;
    attempt++;
    final = `${base}${attempt}`;
  }

  // Auto-register with Vercel (fire-and-forget)
  registerSubdomainWithVercel(final).catch((err) =>
    console.error(`[generate-subdomain] Vercel registration failed for ${final}.chatrealty.io:`, err)
  );

  return final;
}

/**
 * Register a subdomain with Vercel so it resolves to our deployment.
 * Non-blocking — failures are logged but don't prevent the subdomain from being saved.
 */
export async function registerSubdomainWithVercel(subdomain: string): Promise<void> {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) {
    console.warn("[generate-subdomain] VERCEL_API_TOKEN or VERCEL_PROJECT_ID not set, skipping registration");
    return;
  }

  const domain = `${subdomain}.chatrealty.io`;
  const teamId = process.env.VERCEL_TEAM_ID;
  const url = `https://api.vercel.com/v10/projects/${projectId}/domains${teamId ? `?teamId=${teamId}` : ""}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: domain }),
  });

  if (!res.ok) {
    const body = await res.text();
    // 409 = already registered, which is fine
    if (res.status === 409) {
      console.log(`[generate-subdomain] ${domain} already registered with Vercel`);
      return;
    }
    throw new Error(`Vercel API ${res.status}: ${body}`);
  }

  console.log(`[generate-subdomain] Registered ${domain} with Vercel`);
}

/**
 * Remove a subdomain from Vercel (when agent is demoted).
 */
export async function removeSubdomainFromVercel(subdomain: string): Promise<void> {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) return;

  const domain = `${subdomain}.chatrealty.io`;
  const teamId = process.env.VERCEL_TEAM_ID;
  const url = `https://api.vercel.com/v9/projects/${projectId}/domains/${domain}${teamId ? `?teamId=${teamId}` : ""}`;

  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok && res.status !== 404) {
    const body = await res.text();
    throw new Error(`Vercel API ${res.status}: ${body}`);
  }

  console.log(`[generate-subdomain] Removed ${domain} from Vercel`);
}
