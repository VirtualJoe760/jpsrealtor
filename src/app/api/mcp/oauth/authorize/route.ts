// src/app/api/mcp/oauth/authorize/route.ts
//
// OAuth 2.1 authorization endpoint (PKCE). The "consent" screen is a minimal
// page where the agent pastes their existing crt_live_ token from
// Settings → Integrations. That token IS the credential — approving here binds
// a one-time auth code to it (encrypted at rest), which the connector then
// exchanges for an access token at /token.
//
// GET  → render the approval form (or an error page for bad client/redirect).
// POST → validate the pasted token, mint an auth code, 302 back to the client.

import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import { McpOAuthClient, McpOAuthCode } from "@/models/McpOAuth";
import { encryptSecret } from "@/lib/secrets";
import {
  resolveCrtToken,
  randomToken,
  sha256,
  AUTH_CODE_TTL_SECONDS,
  OAUTH_AUTHORIZE_PATH,
} from "@/lib/mcp-oauth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" };

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type AuthParams = {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope: string;
  resource: string;
};

function renderPage(p: AuthParams, opts: { error?: string } = {}): string {
  const hidden = (name: string, value: string) =>
    `<input type="hidden" name="${esc(name)}" value="${esc(value)}" />`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Connect ChatRealty to Claude</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; max-width: 30rem;
    margin: 3rem auto; padding: 0 1.25rem; line-height: 1.5; }
  h1 { font-size: 1.35rem; margin-bottom: .25rem; }
  p.sub { color: #666; margin-top: 0; }
  label { display:block; font-weight:600; margin: 1.25rem 0 .4rem; }
  input[type=text], input[type=password] { width:100%; padding:.7rem .8rem; font-size:1rem;
    border:1px solid #bbb; border-radius:.5rem; box-sizing:border-box; }
  button { margin-top:1.5rem; width:100%; padding:.8rem; font-size:1rem; font-weight:600;
    border:0; border-radius:.5rem; background:#111; color:#fff; cursor:pointer; }
  .err { background:#fdecec; color:#a11; border:1px solid #f3b4b4; padding:.6rem .8rem;
    border-radius:.5rem; margin-top:1rem; font-size:.9rem; }
  .hint { font-size:.82rem; color:#777; margin-top:.4rem; }
  code { background:#f0f0f0; padding:.05rem .3rem; border-radius:.25rem; }
</style></head>
<body>
  <h1>Connect ChatRealty to Claude</h1>
  <p class="sub">Authorize this Claude client to access your ChatRealty MLS tools.</p>
  ${opts.error ? `<div class="err">${esc(opts.error)}</div>` : ""}
  <form method="post" action="${esc(OAUTH_AUTHORIZE_PATH)}">
    <label for="crt_token">Your ChatRealty API token</label>
    <input id="crt_token" name="crt_token" type="password" autocomplete="off"
      placeholder="crt_live_…" required />
    <p class="hint">Mint or copy a token at <code>Settings → Integrations</code>.
      The token's scopes control what Claude can do.</p>
    ${hidden("client_id", p.clientId)}
    ${hidden("redirect_uri", p.redirectUri)}
    ${hidden("state", p.state)}
    ${hidden("code_challenge", p.codeChallenge)}
    ${hidden("code_challenge_method", p.codeChallengeMethod)}
    ${hidden("scope", p.scope)}
    ${hidden("resource", p.resource)}
    <button type="submit">Approve &amp; connect</button>
  </form>
</body></html>`;
}

function htmlError(message: string, status = 400): NextResponse {
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;max-width:30rem;margin:3rem auto;padding:0 1rem">
     <h1 style="font-size:1.2rem">Can't connect</h1><p>${esc(message)}</p></body>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", ...NO_STORE } }
  );
}

function paramsFrom(get: (k: string) => string | null): AuthParams {
  return {
    clientId: get("client_id") || "",
    redirectUri: get("redirect_uri") || "",
    state: get("state") || "",
    codeChallenge: get("code_challenge") || "",
    codeChallengeMethod: get("code_challenge_method") || "S256",
    scope: get("scope") || "",
    resource: get("resource") || "",
  };
}

// Validate the client + redirect_uri. Returns the client doc, or an HTML error
// response (these two failures must NOT redirect — they'd be an open redirector).
async function loadClientOrError(p: AuthParams): Promise<any | NextResponse> {
  if (!p.clientId || !p.redirectUri) return htmlError("Missing client_id or redirect_uri.");
  await dbConnect();
  const client = await McpOAuthClient.findOne({ clientId: p.clientId });
  if (!client) return htmlError("Unknown client_id. Re-add the connector in Claude.");
  if (!client.redirectUris.includes(p.redirectUri)) {
    return htmlError("redirect_uri does not match the registered client.");
  }
  return client;
}

// Build a redirect back to the client with an OAuth error (safe — redirect_uri
// is already validated against the registered set).
function redirectError(p: AuthParams, error: string, desc?: string): NextResponse {
  const u = new URL(p.redirectUri);
  u.searchParams.set("error", error);
  if (desc) u.searchParams.set("error_description", desc);
  if (p.state) u.searchParams.set("state", p.state);
  return NextResponse.redirect(u.toString(), { status: 302, headers: NO_STORE });
}

export async function GET(req: NextRequest) {
  const p = paramsFrom((k) => req.nextUrl.searchParams.get(k));
  const clientOrErr = await loadClientOrError(p);
  if (clientOrErr instanceof NextResponse) return clientOrErr;

  if ((req.nextUrl.searchParams.get("response_type") || "code") !== "code") {
    return redirectError(p, "unsupported_response_type");
  }
  if (!p.codeChallenge || p.codeChallengeMethod !== "S256") {
    return redirectError(p, "invalid_request", "PKCE S256 code_challenge required.");
  }

  return new NextResponse(renderPage(p), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", ...NO_STORE },
  });
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const p = paramsFrom((k) => {
    const v = form.get(k);
    return typeof v === "string" ? v : null;
  });
  const crtToken = (form.get("crt_token") as string | null)?.trim() || "";

  const clientOrErr = await loadClientOrError(p);
  if (clientOrErr instanceof NextResponse) return clientOrErr;

  if (!p.codeChallenge || p.codeChallengeMethod !== "S256") {
    return redirectError(p, "invalid_request", "PKCE S256 code_challenge required.");
  }

  const resolved = await resolveCrtToken(crtToken);
  if (!resolved) {
    return new NextResponse(
      renderPage(p, { error: "That token isn't valid (or was revoked). Check Settings → Integrations and try again." }),
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", ...NO_STORE } }
    );
  }

  // Mint a one-time authorization code bound to this token (encrypted at rest).
  const code = randomToken(32);
  await McpOAuthCode.create({
    codeHash: sha256(code),
    clientId: p.clientId,
    redirectUri: p.redirectUri,
    codeChallenge: p.codeChallenge,
    codeChallengeMethod: "S256",
    userId: resolved.user._id,
    crtTokenEnc: encryptSecret(crtToken),
    crtTokenLast4: resolved.last4,
    scopes: resolved.scopes,
    resource: p.resource || undefined,
    expiresAt: new Date(Date.now() + AUTH_CODE_TTL_SECONDS * 1000),
  });

  const u = new URL(p.redirectUri);
  u.searchParams.set("code", code);
  if (p.state) u.searchParams.set("state", p.state);
  return NextResponse.redirect(u.toString(), { status: 302, headers: NO_STORE });
}
