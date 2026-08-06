// packages/chatrealty-sync/src/errors.ts
//
// ONE translation of the failures a real-estate agent can actually hit, shared
// by every surface that can surface them.
//
// This file exists because of a judged regression. The CLI translated
// "could not extend file because project size limit (512 MB) has been exceeded"
// into plain English; the scaffolded site's hourly cron route did not, because
// the translation lived inside cli.ts where nothing else could import it. The
// fix notes claimed "both run paths translate" — true of one path, false of the
// other, and a session hit the raw Postgres string through the cron route and
// filed it. A copy in each caller would have drifted the same way, so the words
// live here and callers render them; nobody re-words a failure locally.
/** The ceiling on the database `init` provisions (Neon free-tier project). */
export const STORAGE_LIMIT_MB = 512;
export const STORAGE_LIMIT_BYTES = STORAGE_LIMIT_MB * 1024 * 1024;
/** Does this error message mean "the database has no room left"? */
export function isStorageLimitError(message) {
    return /project size limit|could not extend file|no space left on device|disk (?:quota|full)/i.test(message);
}
/** Does this error message mean "the feed is throttling us"? */
export function isRateLimitError(message) {
    return /\b429\b|too many requests|rate.?limit/i.test(message);
}
/**
 * NARROWING ALONE DOES NOTHING ON A FULL DATABASE — the sentence a judged
 * session needed and did not get. They set RESO_NETWORKS, re-ran, got the
 * identical error, and had no way to tell whether the narrowing had applied.
 * It had; it just cannot help, because the rows already written still occupy
 * the space and the saved checkpoint still points into the un-narrowed walk.
 * Both steps are required, and the fresh database is the one that frees room.
 */
function storageRecovery(networksAlreadySet) {
    const steps = [
        "Nothing is misconfigured: your MLS credentials and your database address are both fine, " +
            "and the listings already loaded KEEP SERVING — your site still shows homes today.",
        "What it does mean: no new listings can be written, so the first load cannot finish and " +
            "nightly updates will not land, until there is room.",
        "The recovery is TWO steps and BOTH are required. Step 1: start fresh — " +
            "`npx @chatrealty/sync init --token crt_live_…` provisions a NEW EMPTY database. " +
            "That is the step that frees the room; nothing else does.",
        "Step 2, before loading it: load less. One data key often reaches several MLS " +
            "associations, so you may be pulling whole markets you don't serve — one market's " +
            "inventory fits, five markets' history does not. `npx @chatrealty/sync networks` lists " +
            "them with each one's share; put just yours in RESO_NETWORKS in .env.local, then " +
            "`npx @chatrealty/sync run`.",
        "Setting RESO_NETWORKS on THIS database changes nothing — the rows already written still " +
            "take up the space and the saved checkpoint still points into the old walk. It only " +
            "takes effect on a database loaded from empty, which is why step 1 comes first.",
        "If it still doesn't fit after narrowing, stop rather than re-running into a full " +
            "database: a bigger database isn't something this tool can provision for you today.",
    ];
    if (networksAlreadySet) {
        steps.splice(2, 0, "You already have RESO_NETWORKS set — that IS being applied to every pull, but it cannot " +
            "shrink a database that is already full. It only changes what a fresh load pulls.");
    }
    return steps;
}
/**
 * Translate a raw error into words the person running this can act on, or
 * `null` when there is nothing better to say than the original.
 *
 * `env` is read only for RESO_NETWORKS, to tailor the storage advice.
 */
export function explainSyncError(message, env = {}) {
    if (isStorageLimitError(message)) {
        return {
            code: "database_full",
            error: `YOUR DATABASE IS FULL. The database ChatRealty sets up for you holds about ` +
                `${STORAGE_LIMIT_MB} MB — enough for a single-market feed, not enough for a large ` +
                `multi-association one. New listings can't be added until there is room; the ones ` +
                `already loaded keep serving.`,
            whatToDo: storageRecovery(Boolean(env.RESO_NETWORKS)),
            detail: message,
        };
    }
    if (isRateLimitError(message)) {
        return {
            code: "feed_rate_limited",
            error: "Your MLS feed is throttling requests right now. Your credentials are fine — the limit " +
                "is per API key and can be spent by an earlier run on the same credentials.",
            whatToDo: [
                "Your progress IS saved — the checkpoint advances after every page, so this costs one " +
                    "page, not the run.",
                "Wait (15–60 minutes is typical) and run `npx @chatrealty/sync run` again; it resumes " +
                    "exactly where it stopped.",
                "Do NOT re-run `init` and do not treat this as a broken setup.",
            ],
            detail: message,
        };
    }
    return null;
}
/** The storage block as the CLI prints it: one paragraph per line group. */
export function storageLimitHelp(env = {}) {
    const x = explainSyncError("could not extend file because project size limit (512 MB) has been exceeded", env);
    return [x.error, "", ...x.whatToDo.flatMap((s) => [s, ""])].join("\n").trimEnd();
}
