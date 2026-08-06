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
export declare function pgConnString(raw: string): string;
/** The pg connection options every command in this package uses. */
export declare function pgOptions(raw: string): {
    connectionString: string;
    ssl: {
        rejectUnauthorized: boolean;
    };
};
