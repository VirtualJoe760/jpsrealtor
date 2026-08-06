/** The ceiling on the database `init` provisions (Neon free-tier project). */
export declare const STORAGE_LIMIT_MB = 512;
export declare const STORAGE_LIMIT_BYTES: number;
/** Does this error message mean "the database has no room left"? */
export declare function isStorageLimitError(message: string): boolean;
/** Does this error message mean "the feed is throttling us"? */
export declare function isRateLimitError(message: string): boolean;
/**
 * A translated failure. `error` is the one-line plain-English replacement for
 * the raw text; `whatToDo` is the ordered recovery; `detail` keeps the original
 * message so a developer reading logs still has it.
 */
export interface SyncErrorExplanation {
    readonly code: "database_full" | "feed_rate_limited";
    readonly error: string;
    readonly whatToDo: readonly string[];
    readonly detail: string;
}
/**
 * Translate a raw error into words the person running this can act on, or
 * `null` when there is nothing better to say than the original.
 *
 * `env` is read only for RESO_NETWORKS, to tailor the storage advice.
 */
export declare function explainSyncError(message: string, env?: Record<string, string | undefined>): SyncErrorExplanation | null;
/** The storage block as the CLI prints it: one paragraph per line group. */
export declare function storageLimitHelp(env?: Record<string, string | undefined>): string;
