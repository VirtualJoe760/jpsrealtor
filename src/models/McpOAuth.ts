// src/models/McpOAuth.ts
//
// Storage for the MCP remote-connector OAuth shim (docs/mcp/hosting.md).
//
// The hosted MCP server at /api/mcp/[transport] is a *protected resource*. Claude
// mobile/desktop/web connect to it as a standard OAuth 2.1 client (Dynamic Client
// Registration + PKCE). This file holds the three short-lived records that flow
// makes:
//
//   McpOAuthClient — a client registered via DCR (public, PKCE, no secret).
//   McpOAuthCode   — a one-time authorization code (5 min TTL).
//   McpOAuthToken  — an issued access/refresh token pair.
//
// The actual ChatRealty credential is the agent's existing `crt_live_*` token,
// which they paste on the /authorize approval screen. We NEVER store it in
// plaintext: it's AES-256-GCM encrypted at rest (lib/secrets.ts) on the code and
// token docs, decrypted only to forward a tool call to /api/skill/*. OAuth here
// is just the doorway Claude's connector UI requires; the crt_live token remains
// the source of truth for identity, scopes, and rate limits.

import mongoose, { Schema, Document, Model } from "mongoose";

// ---------------------------------------------------------------------------
// Client (Dynamic Client Registration — RFC 7591)
// ---------------------------------------------------------------------------

export interface IMcpOAuthClient extends Document {
  clientId: string;
  clientName?: string;
  redirectUris: string[];
  tokenEndpointAuthMethod: "none";
  grantTypes: string[];
  responseTypes: string[];
  scope?: string;
  createdAt: Date;
  updatedAt: Date;
}

const McpOAuthClientSchema = new Schema<IMcpOAuthClient>(
  {
    clientId: { type: String, required: true, unique: true, index: true },
    clientName: { type: String },
    redirectUris: { type: [String], required: true, default: [] },
    tokenEndpointAuthMethod: { type: String, default: "none" },
    grantTypes: { type: [String], default: ["authorization_code", "refresh_token"] },
    responseTypes: { type: [String], default: ["code"] },
    scope: { type: String },
  },
  { timestamps: true }
);

// ---------------------------------------------------------------------------
// Authorization code (one-time, PKCE-bound, 5 min TTL)
// ---------------------------------------------------------------------------

export interface IMcpOAuthCode extends Document {
  codeHash: string; // sha256 of the issued code; never store plaintext
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: "S256";
  userId: mongoose.Types.ObjectId;
  crtTokenEnc: string; // AES-256-GCM encrypted crt_live_ token
  crtTokenLast4: string;
  scopes: string[];
  resource?: string;
  usedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
}

const McpOAuthCodeSchema = new Schema<IMcpOAuthCode>(
  {
    codeHash: { type: String, required: true, unique: true, index: true },
    clientId: { type: String, required: true },
    redirectUri: { type: String, required: true },
    codeChallenge: { type: String, required: true },
    codeChallengeMethod: { type: String, default: "S256" },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    crtTokenEnc: { type: String, required: true },
    crtTokenLast4: { type: String, required: true },
    scopes: { type: [String], default: [] },
    resource: { type: String },
    usedAt: { type: Date },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
// TTL: Mongo purges the code shortly after it expires.
McpOAuthCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ---------------------------------------------------------------------------
// Access / refresh token
// ---------------------------------------------------------------------------

export interface IMcpOAuthToken extends Document {
  accessTokenHash: string;
  refreshTokenHash?: string;
  clientId: string;
  userId: mongoose.Types.ObjectId;
  crtTokenEnc: string; // AES-256-GCM encrypted crt_live_ token
  crtTokenLast4: string;
  scopes: string[];
  resource?: string;
  revokedAt?: Date;
  lastUsedAt?: Date;
  // Hard expiry of the refresh window; the access token's own expiry is
  // accessTokenExpiresAt. TTL cleans the doc after the longer of the two.
  accessTokenExpiresAt: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const McpOAuthTokenSchema = new Schema<IMcpOAuthToken>(
  {
    accessTokenHash: { type: String, required: true, index: true },
    refreshTokenHash: { type: String, index: true },
    clientId: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    crtTokenEnc: { type: String, required: true },
    crtTokenLast4: { type: String, required: true },
    scopes: { type: [String], default: [] },
    resource: { type: String },
    revokedAt: { type: Date },
    lastUsedAt: { type: Date },
    accessTokenExpiresAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);
McpOAuthTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const McpOAuthClient: Model<IMcpOAuthClient> =
  (mongoose.models.McpOAuthClient as Model<IMcpOAuthClient>) ||
  mongoose.model<IMcpOAuthClient>("McpOAuthClient", McpOAuthClientSchema);

export const McpOAuthCode: Model<IMcpOAuthCode> =
  (mongoose.models.McpOAuthCode as Model<IMcpOAuthCode>) ||
  mongoose.model<IMcpOAuthCode>("McpOAuthCode", McpOAuthCodeSchema);

export const McpOAuthToken: Model<IMcpOAuthToken> =
  (mongoose.models.McpOAuthToken as Model<IMcpOAuthToken>) ||
  mongoose.model<IMcpOAuthToken>("McpOAuthToken", McpOAuthTokenSchema);
