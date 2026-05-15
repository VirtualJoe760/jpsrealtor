// src/lib/turnstile.ts
// Cloudflare Turnstile server-side verification.
// See https://developers.cloudflare.com/turnstile/get-started/server-side-validation/

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export interface TurnstileVerifyResult {
  success: boolean;
  error?: string;
  errorCodes?: string[];
}

/**
 * Verify a Turnstile token against Cloudflare. Returns { success: false } when
 * the token is missing, invalid, expired, or already redeemed.
 *
 * In dev (no TURNSTILE_SECRET_KEY set) this returns success: true so local
 * development isn't blocked by a missing key. Production deployments MUST set
 * TURNSTILE_SECRET_KEY in env.
 */
export async function verifyTurnstile(
  token: string | undefined | null,
  remoteIp?: string | null
): Promise<TurnstileVerifyResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[turnstile] TURNSTILE_SECRET_KEY not set in production — denying request");
      return { success: false, error: "CAPTCHA not configured" };
    }
    console.warn("[turnstile] TURNSTILE_SECRET_KEY not set — allowing in development");
    return { success: true };
  }

  if (!token) {
    return { success: false, error: "Missing CAPTCHA token" };
  }

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp) body.append("remoteip", remoteIp);

    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const data = await res.json();
    if (data.success) {
      return { success: true };
    }

    return {
      success: false,
      error: "CAPTCHA verification failed",
      errorCodes: data["error-codes"],
    };
  } catch (err) {
    console.error("[turnstile] verify error:", err);
    return { success: false, error: "CAPTCHA verification error" };
  }
}

/** Extract the best-guess client IP from a Next.js request. */
export function clientIp(req: Request): string | undefined {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || undefined;
}

/**
 * True if this request was made server-to-server inside our own infra and
 * presented a valid INTERNAL_API_SECRET header. Lets CAPTCHA-protected routes
 * (e.g. /api/contact) be invoked by other backend routes (e.g. the register
 * route's SendFox subscribe call) without going through a user-facing CAPTCHA.
 */
export function isTrustedInternalCall(req: Request): boolean {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) return false;
  return req.headers.get("x-internal-secret") === secret;
}
