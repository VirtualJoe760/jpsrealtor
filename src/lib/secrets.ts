// src/lib/secrets.ts
//
// AES-256-GCM helpers for storing per-agent secrets (Anthropic API keys,
// ChatRealty API token plaintext is NOT stored — only sha256 hashes are).
//
// Format: <iv(12)>:<ciphertext>:<authTag(16)> all base64.
// Keyed by SECRETS_ENCRYPTION_KEY (32 bytes, base64-encoded in env).
// Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

import crypto from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const AUTH_TAG_LEN = 16;

function getKey(): Buffer {
  const raw = process.env.SECRETS_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "SECRETS_ENCRYPTION_KEY is not set. Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\""
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      `SECRETS_ENCRYPTION_KEY must decode to 32 bytes (got ${key.length}). Expected base64 of 32 random bytes.`
    );
  }
  return key;
}

export function encryptSecret(plaintext: string): string {
  if (typeof plaintext !== "string" || plaintext.length === 0) {
    throw new Error("encryptSecret: plaintext required");
  }
  const key = getKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), ct.toString("base64"), tag.toString("base64")].join(":");
}

export function decryptSecret(payload: string): string {
  if (typeof payload !== "string" || !payload.includes(":")) {
    throw new Error("decryptSecret: malformed payload");
  }
  const [ivB64, ctB64, tagB64] = payload.split(":");
  if (!ivB64 || !ctB64 || !tagB64) {
    throw new Error("decryptSecret: malformed payload (missing segments)");
  }
  const key = getKey();
  const iv = Buffer.from(ivB64, "base64");
  const ct = Buffer.from(ctB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  if (iv.length !== IV_LEN || tag.length !== AUTH_TAG_LEN) {
    throw new Error("decryptSecret: invalid iv or auth tag length");
  }
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}

// Tokens (e.g. crt_live_xxx) are stored as sha256 hashes, never reversibly.
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

// Constant-time compare for hashed token lookup.
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

export function generateApiToken(): { plaintext: string; hash: string; last4: string } {
  const raw = crypto.randomBytes(32).toString("base64url");
  const plaintext = `crt_live_${raw}`;
  return {
    plaintext,
    hash: hashToken(plaintext),
    last4: plaintext.slice(-4),
  };
}

export function maskKey(key: string): string {
  if (!key || key.length < 8) return "••••";
  return `${key.slice(0, 6)}…${key.slice(-4)}`;
}
