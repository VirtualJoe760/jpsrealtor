// src/lib/neon/client.ts
//
// Agent 08 — typed Neon Management API v2 client (build_plan §6.2).
//
// A thin, SDK-free client over the Neon Management API. Every HTTP call goes
// through `neonApi<T>` (Bearer `NEON_API_KEY`); there is NO inline `fetch`
// elsewhere in the Neon subsystem (acceptance criterion). On a non-2xx the
// helper throws a `NeonApiError` carrying the HTTP status and Neon's own error
// message — and it NEVER logs, echoes, or embeds the API key anywhere.
//
// This file is the Neon-API mechanics layer. The one-shot provisioning CLI
// (`scripts/neon-setup.ts`) and the higher-level provisioning service
// (`src/lib/neon/provision.ts`, separate task) build on top of it.
//
// SECURITY: the API key is read from `process.env.NEON_API_KEY` and only ever
// placed in the `Authorization` header. It is never returned, never logged, and
// the error path deliberately surfaces Neon's message body but not the request
// headers. Connection strings (which embed a password) are returned to the
// caller but must be encrypted before they touch any store (build_plan §6.2).

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/** Neon Management API v2 base URL. */
export const NEON_API_BASE_URL = "https://console.neon.tech/api/v2";

/** Default Postgres major version for new projects. */
export const DEFAULT_PG_VERSION = 16 as const;

/**
 * Default Neon region. `aws-us-west-2` is closest to the Coachella Valley
 * market (and to the legacy DigitalOcean box's traffic profile). Override per
 * call or via the CLI's `NEON_REGION` env var.
 */
export const DEFAULT_REGION_ID = "aws-us-west-2";

// -----------------------------------------------------------------------------
// Errors
// -----------------------------------------------------------------------------

/**
 * Thrown on any non-2xx Neon API response. Carries the HTTP `status` and the
 * best human-readable `message` we could extract from Neon's error body. The
 * API key is NEVER included.
 */
export class NeonApiError extends Error {
  readonly status: number;
  /** The method+path that failed, for debugging (no secrets). */
  readonly endpoint: string;

  constructor(status: number, message: string, endpoint: string) {
    super(message);
    this.name = "NeonApiError";
    this.status = status;
    this.endpoint = endpoint;
  }
}

// -----------------------------------------------------------------------------
// Low-level request helper
// -----------------------------------------------------------------------------

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

/**
 * Pull a useful error message out of a Neon error response body without ever
 * assuming a shape. Neon returns `{ message, code, ... }` for most errors, but
 * gateway/proxy failures may return text. Falls back to a generic line.
 */
function extractNeonErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    const rec = body as Record<string, unknown>;
    if (typeof rec.message === "string" && rec.message.length > 0) {
      return rec.message;
    }
    // Some endpoints nest under `error`.
    if (rec.error && typeof rec.error === "object") {
      const inner = rec.error as Record<string, unknown>;
      if (typeof inner.message === "string" && inner.message.length > 0) {
        return inner.message;
      }
    }
  }
  if (typeof body === "string" && body.trim().length > 0) {
    return body.trim();
  }
  return `Neon API request failed with status ${status}`;
}

/**
 * The single Neon HTTP entry point. JSON in, JSON out. Throws `NeonApiError`
 * (status + Neon's message) on any non-2xx. Reads `NEON_API_KEY` lazily so the
 * module can be imported (and unit-tested) without the key present — only an
 * actual call requires it.
 *
 * @param method HTTP verb.
 * @param path   API path beginning with `/` (e.g. `/projects`).
 * @param body   Optional JSON request body.
 */
export async function neonApi<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
): Promise<T> {
  const apiKey = process.env.NEON_API_KEY;
  if (!apiKey) {
    throw new Error(
      "NEON_API_KEY is not set. Create one at https://console.neon.tech/app/settings/api-keys",
    );
  }

  const endpoint = `${method} ${path}`;
  const url = `${NEON_API_BASE_URL}${path}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Parse the body defensively; Neon returns JSON for both success and error,
  // but proxies/gateways occasionally return text or an empty body.
  const text = await res.text();
  let parsed: unknown = undefined;
  if (text.length > 0) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    throw new NeonApiError(
      res.status,
      extractNeonErrorMessage(parsed, res.status),
      endpoint,
    );
  }

  return parsed as T;
}

// -----------------------------------------------------------------------------
// Response shapes (the subset we depend on)
// -----------------------------------------------------------------------------

export interface NeonProject {
  id: string;
  name: string;
  region_id: string;
  pg_version: number;
  // Many more fields exist; we only type what we read.
  [k: string]: unknown;
}

export interface NeonConnectionUri {
  connection_uri: string;
  [k: string]: unknown;
}

export interface NeonRole {
  name: string;
  [k: string]: unknown;
}

export interface NeonDatabase {
  name: string;
  owner_name?: string;
  [k: string]: unknown;
}

export interface NeonEndpoint {
  id: string;
  host: string;
  [k: string]: unknown;
}

/** The shape of `POST /projects` (the fields we consume). */
export interface CreateProjectResponse {
  project: NeonProject;
  connection_uris: NeonConnectionUri[];
  roles: NeonRole[];
  databases: NeonDatabase[];
  endpoints: NeonEndpoint[];
}

/** The shape of `GET /projects/{id}` (the fields we consume). */
export interface GetProjectResponse {
  project: NeonProject;
}

/** The shape of `GET /projects` (the fields we consume). */
export interface ListProjectsResponse {
  projects: NeonProject[];
}

// -----------------------------------------------------------------------------
// Pooled-URI derivation (pure — exported for unit test)
// -----------------------------------------------------------------------------

/**
 * Derive Neon's POOLED connection URI from a DIRECT one by suffixing the
 * endpoint host's FIRST DNS label with `-pooler`. Neon's pgBouncer pooler lives
 * at the same host with `-pooler` injected into the endpoint id, e.g.
 *
 *   ep-foo-123.us-west-2.aws.neon.tech
 *     -> ep-foo-123-pooler.us-west-2.aws.neon.tech
 *
 * Everything else in the URI (user, password, db, query params) is preserved
 * verbatim. The pooled URI is what tenant runtime traffic uses; the direct URI
 * is reserved for DDL / `CREATE EXTENSION` (pgBouncer cannot run session DDL —
 * build_plan §6.2).
 *
 * Pure string transform. If the URI is unparseable or the host already contains
 * `-pooler`, it is returned unchanged (idempotent + defensive).
 */
export function derivePooledUri(directUri: string): string {
  let url: URL;
  try {
    url = new URL(directUri);
  } catch {
    return directUri;
  }

  const host = url.hostname;
  if (host.length === 0) return directUri;

  const labels = host.split(".");
  const first = labels[0];
  if (!first || first.includes("-pooler")) {
    // Already pooled (or no host label) — leave untouched.
    return directUri;
  }

  labels[0] = `${first}-pooler`;
  url.hostname = labels.join(".");
  return url.toString();
}

// -----------------------------------------------------------------------------
// Typed project operations
// -----------------------------------------------------------------------------

export interface CreateProjectOptions {
  /** Human-readable project name (also the dashboard label). */
  name: string;
  /** Postgres major version. Defaults to {@link DEFAULT_PG_VERSION}. */
  pgVersion?: number;
  /** Neon region id. Defaults to {@link DEFAULT_REGION_ID}. */
  regionId?: string;
}

/**
 * The normalized result of {@link createProject} — exactly what the setup CLI
 * needs to proceed. `directConnUri` runs the migration / extensions; runtime
 * traffic uses `pooledConnUri`.
 */
export interface CreatedProject {
  projectId: string;
  /** The direct (non-pooled) connection URI — DDL / CREATE EXTENSION only. */
  directConnUri: string;
  /** The pooled (`-pooler`) connection URI — runtime traffic. */
  pooledConnUri: string;
  /** The default database Neon created (typically `neondb`). */
  defaultDatabase: string;
  /** The default role/owner Neon created. */
  defaultRole: string;
}

/**
 * Create a new Neon project (which provisions a default database, owner role,
 * and a primary endpoint). Returns the normalized {@link CreatedProject} with
 * both the direct and pooled connection URIs.
 *
 * Neon returns the connection URI(s) in `connection_uris[]` ONLY on project
 * creation — they are not retrievable later without the password, so the caller
 * MUST capture and (encrypt + ) store them now.
 */
export async function createProject(
  opts: CreateProjectOptions,
): Promise<CreatedProject> {
  const pgVersion = opts.pgVersion ?? DEFAULT_PG_VERSION;
  const regionId = opts.regionId ?? DEFAULT_REGION_ID;

  const requestBody = {
    project: {
      name: opts.name,
      pg_version: pgVersion,
      region_id: regionId,
    },
  };

  const data = await neonApi<CreateProjectResponse>(
    "POST",
    "/projects",
    requestBody,
  );

  const first = data.connection_uris?.[0];
  if (!first || typeof first.connection_uri !== "string") {
    throw new NeonApiError(
      502,
      "Neon createProject returned no connection_uris[0].connection_uri",
      "POST /projects",
    );
  }

  const directConnUri = first.connection_uri;
  const pooledConnUri = derivePooledUri(directConnUri);

  // Neon always creates a default database + owner role on project creation.
  const defaultDatabase = data.databases?.[0]?.name ?? "neondb";
  const defaultRole =
    data.roles?.[0]?.name ?? data.databases?.[0]?.owner_name ?? "neondb_owner";

  return {
    projectId: data.project.id,
    directConnUri,
    pooledConnUri,
    defaultDatabase,
    defaultRole,
  };
}

/** Fetch a single project by id. */
export async function getProject(projectId: string): Promise<NeonProject> {
  const data = await neonApi<GetProjectResponse>(
    "GET",
    `/projects/${encodeURIComponent(projectId)}`,
  );
  return data.project;
}

/** List all projects on the account. */
export async function listProjects(): Promise<NeonProject[]> {
  const data = await neonApi<ListProjectsResponse>("GET", "/projects");
  return data.projects ?? [];
}

/**
 * Delete a project (and its databases/endpoints) by id. Used by teardown. The
 * caller should swallow a 404 (already gone) — this function does not.
 */
export async function deleteProject(projectId: string): Promise<void> {
  await neonApi<unknown>(
    "DELETE",
    `/projects/${encodeURIComponent(projectId)}`,
  );
}
