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

  return final;
}
