// Connection-string hygiene for the pg driver.
//
// WHY: every `npx @chatrealty/sync …` command printed a multi-line SSL
// deprecation warning from `pg-connection-string` before any of its own output.
// It is harmless, but a session reading the output step by step stops at it,
// treats it as a failure, and files a bug — which is exactly what happened
// (session 14, 2026-08-05). Noise that reads like an error is a defect.
//
// The warning fires because the ChatRealty database URL carries
// `?sslmode=require` AND we also pass an explicit `ssl` option. The explicit
// option is the one that takes effect, so the query parameter is doing nothing
// except producing the warning. Strip it and pass `ssl` on its own: same TLS,
// same verification behaviour, no banner.

/**
 * Strip `sslmode` from a Postgres connection string. Everything else — host,
 * credentials, database, `channel_binding`, any other parameter — is preserved
 * byte for byte. Callers MUST still pass their own `ssl` option; this only
 * removes the redundant parameter, it does not disable TLS.
 *
 * Non-URL input (or anything unparseable) is returned unchanged: a connection
 * string we don't understand is the driver's problem to report, not ours to
 * rewrite.
 */
export function pgConnString(raw: string): string {
  if (!raw) return raw;
  try {
    const u = new URL(raw);
    if (!u.searchParams.has("sslmode")) return raw;
    u.searchParams.delete("sslmode");
    return u.toString();
  } catch {
    return raw;
  }
}

/** The pg connection options every command in this package uses. */
export function pgOptions(raw: string): { connectionString: string; ssl: { rejectUnauthorized: boolean } } {
  return { connectionString: pgConnString(raw), ssl: { rejectUnauthorized: false } };
}
