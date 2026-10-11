// src/lib/mongoose.ts

// ✅ Ensure environment variables are loaded early
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../../.env.local") });

import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
}

// ✅ Use global cache to prevent multiple connections in dev
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    // Drop the FAILED promise. Without this, `cached.promise` stays
    // permanently rejected and every later dbConnect() awaits that same
    // rejection — so one bad connect (rotated password, DNS blip, cold-start
    // timeout) poisons the process for its entire lifetime. Fixing the
    // credential then changes nothing until the server is restarted, which
    // reads as "the fix didn't work". On Vercel it means one lambda instance
    // 500ing every request until it is recycled.
    // (2026-10-11: a stale .env.local plus this cache turned a one-line
    // password fix into four rounds of chasing /api/agent-branding.)
    cached.promise = null;
    throw err;
  }
  return cached.conn;
}

export default dbConnect;
