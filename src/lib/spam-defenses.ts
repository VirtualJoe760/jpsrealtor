// src/lib/spam-defenses.ts
// Lightweight heuristics for spotting bot signups.

const VOWELS = /[aeiouy]/i;
const NON_LETTERS = /[^a-zA-Z]/g;

/**
 * True if the supplied name looks bot-generated (e.g. "huUnwmncpxBqZSyvDlKjcs",
 * "PzWwluuziVfPmwayLlnlSLnA"). Real human names almost always contain vowels
 * and don't have long consonant runs.
 *
 * Returns false for empty/short names — those are handled by other validation.
 */
export function isGibberishName(name: string | undefined | null): boolean {
  if (!name) return false;
  const cleaned = name.trim();
  if (cleaned.length < 8) return false; // short names get a pass

  const letters = cleaned.replace(NON_LETTERS, "");
  if (letters.length < 8) return false;

  // 1. No vowels at all → gibberish
  if (!VOWELS.test(letters)) return true;

  // 2. Vowel ratio < 15% → almost certainly random characters
  const vowelCount = (letters.match(/[aeiouy]/gi) || []).length;
  if (vowelCount / letters.length < 0.15) return true;

  // 3. Long consonant run (>5 in a row) → gibberish
  if (/[bcdfghjklmnpqrstvwxz]{6,}/i.test(letters)) return true;

  // 4. Mixed-case run with no spaces and length > 16 → random token style
  //    e.g. "huUnwmncpxBqZSyvDlKjcs" (22 chars, has both cases, no spaces)
  if (
    cleaned.length > 16 &&
    !cleaned.includes(" ") &&
    /[a-z]/.test(cleaned) &&
    /[A-Z]/.test(cleaned)
  ) {
    // Count case changes — a real CamelCase name has 1-3; gibberish has many
    let caseChanges = 0;
    for (let i = 1; i < cleaned.length; i++) {
      const prevUpper = cleaned[i - 1] >= "A" && cleaned[i - 1] <= "Z";
      const currUpper = cleaned[i] >= "A" && cleaned[i] <= "Z";
      if (prevUpper !== currUpper) caseChanges++;
    }
    if (caseChanges >= 6) return true;
  }

  return false;
}

/**
 * Check a honeypot field. Real users never see it (it's hidden via CSS) so it
 * stays empty. Bots that auto-fill form inputs will populate it.
 *
 * The field should be named something innocuous — we use "website" because
 * dumb autofillers love that.
 */
export function honeypotTripped(value: string | undefined | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
