// src/lib/neon/__tests__/client.test.ts
//
// Agent 08 — Neon Management API client unit tests. Node built-in runner only
// (the repo has neither vitest nor jest):
//   npx tsx --test src/lib/neon/__tests__/client.test.ts
//
// Pure-logic + mocked-fetch tests (build_plan §3.6: "all external calls (Neon
// API, …) mocked"). We never hit the network. We assert:
//   • neonApi/createProject send the right method/path/body/auth header;
//   • the API key is read from env and placed only in the Authorization header;
//   • createProject parses connection_uris[0] and derives the pooled URI;
//   • derivePooledUri inserts `-pooler` correctly for several host shapes;
//   • NeonApiError carries status + Neon's message on a 4xx.

import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import {
  neonApi,
  createProject,
  getProject,
  listProjects,
  deleteProject,
  derivePooledUri,
  NeonApiError,
  NEON_API_BASE_URL,
} from "../client";

// -----------------------------------------------------------------------------
// Fetch mock harness
// -----------------------------------------------------------------------------

interface CapturedCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

const realFetch = global.fetch;
let calls: CapturedCall[] = [];

/** Build a mock fetch that records calls and returns a canned response. */
function mockFetch(
  responder: (call: CapturedCall) => { status: number; body: unknown },
): typeof fetch {
  return (async (input: unknown, init?: Record<string, unknown>) => {
    const url = String(input);
    const method = String(init?.method ?? "GET");
    const rawHeaders = (init?.headers ?? {}) as Record<string, string>;
    const headers: Record<string, string> = { ...rawHeaders };
    const rawBody = init?.body;
    const body =
      typeof rawBody === "string" && rawBody.length > 0
        ? JSON.parse(rawBody)
        : undefined;

    const call: CapturedCall = { url, method, headers, body };
    calls.push(call);

    const { status, body: respBody } = responder(call);
    const text =
      typeof respBody === "string" ? respBody : JSON.stringify(respBody);
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => text,
    } as Response;
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  calls = [];
  process.env.NEON_API_KEY = "neon_test_key_do_not_log";
});

afterEach(() => {
  global.fetch = realFetch;
  delete process.env.NEON_API_KEY;
});

// A realistic-enough POST /projects response.
function projectsResponse() {
  return {
    project: {
      id: "lingering-frost-12345678",
      name: "chatrealty-dev",
      region_id: "aws-us-west-2",
      pg_version: 16,
    },
    connection_uris: [
      {
        connection_uri:
          "postgresql://neondb_owner:npg_secret@ep-foo-123.us-west-2.aws.neon.tech/neondb?sslmode=require",
      },
    ],
    roles: [{ name: "neondb_owner" }],
    databases: [{ name: "neondb", owner_name: "neondb_owner" }],
    endpoints: [{ id: "ep-foo-123", host: "ep-foo-123.us-west-2.aws.neon.tech" }],
  };
}

// -----------------------------------------------------------------------------
// neonApi — method / path / body / auth
// -----------------------------------------------------------------------------

test("neonApi sends Bearer auth, correct URL/method, and JSON body", async () => {
  global.fetch = mockFetch(() => ({ status: 200, body: { ok: true } }));

  const out = await neonApi<{ ok: boolean }>("POST", "/projects", { a: 1 });
  assert.deepEqual(out, { ok: true });

  assert.equal(calls.length, 1);
  const c = calls[0];
  assert.equal(c.url, `${NEON_API_BASE_URL}/projects`);
  assert.equal(c.method, "POST");
  assert.equal(c.headers.Authorization, "Bearer neon_test_key_do_not_log");
  assert.equal(c.headers["Content-Type"], "application/json");
  assert.deepEqual(c.body, { a: 1 });
});

test("neonApi omits Content-Type and body for GET", async () => {
  global.fetch = mockFetch(() => ({ status: 200, body: { projects: [] } }));

  await neonApi("GET", "/projects");
  const c = calls[0];
  assert.equal(c.method, "GET");
  assert.equal(c.headers["Content-Type"], undefined);
  assert.equal(c.body, undefined);
  // Auth always present.
  assert.equal(c.headers.Authorization, "Bearer neon_test_key_do_not_log");
});

test("neonApi throws a plain Error (not a leak) when NEON_API_KEY is absent", async () => {
  delete process.env.NEON_API_KEY;
  global.fetch = mockFetch(() => ({ status: 200, body: {} }));

  await assert.rejects(() => neonApi("GET", "/projects"), /NEON_API_KEY is not set/);
  // No request should have been made.
  assert.equal(calls.length, 0);
});

// -----------------------------------------------------------------------------
// NeonApiError on non-2xx
// -----------------------------------------------------------------------------

test("NeonApiError carries status + Neon's message on a 4xx", async () => {
  global.fetch = mockFetch(() => ({
    status: 422,
    body: { message: "region_id is invalid", code: "INVALID_INPUT" },
  }));

  await assert.rejects(
    () => neonApi("POST", "/projects", { project: {} }),
    (err: unknown) => {
      assert.ok(err instanceof NeonApiError);
      assert.equal(err.status, 422);
      assert.equal(err.message, "region_id is invalid");
      assert.equal(err.endpoint, "POST /projects");
      // The error must never carry the API key.
      assert.ok(!JSON.stringify(err.message).includes("neon_test_key"));
      return true;
    },
  );
});

test("NeonApiError falls back to a generic message when body has none", async () => {
  global.fetch = mockFetch(() => ({ status: 500, body: "" }));
  await assert.rejects(
    () => neonApi("GET", "/projects"),
    (err: unknown) => {
      assert.ok(err instanceof NeonApiError);
      assert.equal(err.status, 500);
      assert.match(err.message, /status 500/);
      return true;
    },
  );
});

// -----------------------------------------------------------------------------
// createProject — request body + parse
// -----------------------------------------------------------------------------

test("createProject posts the right body and parses connection_uris", async () => {
  global.fetch = mockFetch(() => ({ status: 201, body: projectsResponse() }));

  const created = await createProject({ name: "chatrealty-dev" });

  // Request shape.
  const c = calls[0];
  assert.equal(c.url, `${NEON_API_BASE_URL}/projects`);
  assert.equal(c.method, "POST");
  assert.deepEqual(c.body, {
    project: { name: "chatrealty-dev", pg_version: 16, region_id: "aws-us-west-2" },
  });

  // Parsed result.
  assert.equal(created.projectId, "lingering-frost-12345678");
  assert.equal(
    created.directConnUri,
    "postgresql://neondb_owner:npg_secret@ep-foo-123.us-west-2.aws.neon.tech/neondb?sslmode=require",
  );
  assert.equal(
    created.pooledConnUri,
    "postgresql://neondb_owner:npg_secret@ep-foo-123-pooler.us-west-2.aws.neon.tech/neondb?sslmode=require",
  );
  assert.equal(created.defaultDatabase, "neondb");
  assert.equal(created.defaultRole, "neondb_owner");
});

test("createProject honors pgVersion and regionId overrides", async () => {
  global.fetch = mockFetch(() => ({ status: 201, body: projectsResponse() }));

  await createProject({ name: "x", pgVersion: 15, regionId: "aws-eu-central-1" });
  assert.deepEqual(calls[0].body, {
    project: { name: "x", pg_version: 15, region_id: "aws-eu-central-1" },
  });
});

test("createProject throws NeonApiError when connection_uris is empty", async () => {
  const bad = projectsResponse();
  bad.connection_uris = [];
  global.fetch = mockFetch(() => ({ status: 201, body: bad }));

  await assert.rejects(
    () => createProject({ name: "x" }),
    (err: unknown) => {
      assert.ok(err instanceof NeonApiError);
      assert.match(err.message, /no connection_uris/);
      return true;
    },
  );
});

// -----------------------------------------------------------------------------
// getProject / listProjects / deleteProject
// -----------------------------------------------------------------------------

test("getProject GETs /projects/{id} and unwraps .project", async () => {
  global.fetch = mockFetch(() => ({
    status: 200,
    body: { project: { id: "abc", name: "n", region_id: "r", pg_version: 16 } },
  }));
  const p = await getProject("abc");
  assert.equal(calls[0].method, "GET");
  assert.equal(calls[0].url, `${NEON_API_BASE_URL}/projects/abc`);
  assert.equal(p.id, "abc");
});

test("listProjects unwraps .projects (and tolerates missing)", async () => {
  global.fetch = mockFetch(() => ({ status: 200, body: {} }));
  const list = await listProjects();
  assert.deepEqual(list, []);
  assert.equal(calls[0].url, `${NEON_API_BASE_URL}/projects`);
});

test("deleteProject DELETEs /projects/{id}", async () => {
  global.fetch = mockFetch(() => ({ status: 200, body: {} }));
  await deleteProject("proj-9");
  assert.equal(calls[0].method, "DELETE");
  assert.equal(calls[0].url, `${NEON_API_BASE_URL}/projects/proj-9`);
});

// -----------------------------------------------------------------------------
// derivePooledUri — pure, multiple host shapes
// -----------------------------------------------------------------------------

test("derivePooledUri inserts -pooler into the first host label", () => {
  assert.equal(
    derivePooledUri(
      "postgresql://u:p@ep-foo-123.us-west-2.aws.neon.tech/db?sslmode=require",
    ),
    "postgresql://u:p@ep-foo-123-pooler.us-west-2.aws.neon.tech/db?sslmode=require",
  );
});

test("derivePooledUri handles a different region/host shape", () => {
  assert.equal(
    derivePooledUri(
      "postgresql://owner:secret@ep-cool-darkness-9876.eu-central-1.aws.neon.tech/neondb",
    ),
    "postgresql://owner:secret@ep-cool-darkness-9876-pooler.eu-central-1.aws.neon.tech/neondb",
  );
});

test("derivePooledUri is idempotent (already-pooled host unchanged)", () => {
  const pooled =
    "postgresql://u:p@ep-foo-123-pooler.us-west-2.aws.neon.tech/db?sslmode=require";
  assert.equal(derivePooledUri(pooled), pooled);
});

test("derivePooledUri preserves user, password, db, and query params", () => {
  const out = derivePooledUri(
    "postgresql://neondb_owner:npg_xY%40z@ep-a-b.us-west-2.aws.neon.tech/neondb?sslmode=require&options=project%3Dep-a",
  );
  assert.ok(out.includes("neondb_owner:npg_xY%40z@"));
  assert.ok(out.includes("ep-a-b-pooler.us-west-2.aws.neon.tech"));
  assert.ok(out.includes("sslmode=require"));
  assert.ok(out.includes("options=project%3Dep-a"));
});

test("derivePooledUri returns an unparseable string unchanged", () => {
  assert.equal(derivePooledUri("not a uri"), "not a uri");
});
