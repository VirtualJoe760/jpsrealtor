// src/lib/cover-templates/fit-headline.js
//
// Sizes and positions the cover hook so it CANNOT overflow the accent panel.
//
// WHY THIS EXISTS
// ---------------
// The hook shipped as a bare `font_size: 96` text overlay with no width cap, in
// BOTH cover implementations. At 96pt Poppins Light, roughly six uppercase
// characters fit inside the 480px accent panel. Every hook longer than that ran
// out of the panel and across the listing photo. It happened to stay legible
// when the bleed landed on open sky, which is why it survived: the failure was
// silent and photo-dependent, not an error.
//
// The fix is a layout constraint, not editorial discipline. Callers must not
// have to count characters to avoid breaking the design.
//
// TWO GUARANTEES, in order of importance:
//
//   1. HARD: the caller pairs this with `width: maxWidth, crop: "fit"` on the
//      overlay. Cloudinary then wraps the text at that width no matter what
//      font size we compute, so overflow is structurally impossible even if the
//      metrics below are wrong.
//   2. SOFT: `fontSize` picks the largest size that still looks like a headline
//      at the resulting line count, and `y` bottom-anchors the block.
//
// BOTTOM-ANCHORING: the city subtitle is pinned at y:240 in both templates, so
// a hook that wraps downward would collide with it. Instead the block's BOTTOM
// is fixed (`blockBottom`) and it grows upward into the empty top margin. A
// one-line 96pt hook therefore lands at exactly y:110 — the value both
// templates hardcoded before this existed — so short hooks render unchanged.
//
// The advance width is deliberately over-estimated (0.64em vs a measured ~0.62
// for uppercase Poppins Light). Over-estimating means we predict MORE wrapped
// lines than Cloudinary actually produces, so we err toward a smaller font and
// a shorter block. That fails upward (a slightly larger gap above the city
// subtitle) rather than downward (a collision).

/** Uppercase Poppins Light, em per character. Over-estimated on purpose. */
const UPPERCASE_ADVANCE = 0.64;

const DEFAULTS = {
  maxWidth: 390,     // 480px panel − 70px left inset − 20px right breathing room
  maxHeight: 180,    // keeps the tallest block's top edge at y:50
  blockBottom: 230,  // city subtitle sits at y:240
  maxSize: 96,
  minSize: 44,
  lineHeight: 1.25,
  advance: UPPERCASE_ADVANCE,
};

/**
 * Greedy word wrap, measured in characters.
 * @returns line count, or null if any single word is too long to fit.
 */
function wrapCount(words, perLine) {
  let lines = 1;
  let len = 0;
  for (const w of words) {
    if (w.length > perLine) return null; // must shrink further
    if (len === 0) {
      len = w.length;
    } else if (len + 1 + w.length <= perLine) {
      len += 1 + w.length;
    } else {
      lines++;
      len = w.length;
    }
  }
  return lines;
}

/**
 * @param {string} text  The hook, e.g. "DESERT SANCTUARY".
 * @param {object} [opts] Overrides for the DEFAULTS above.
 * @returns {{fontSize:number, lines:number, y:number, maxWidth:number}}
 *   Spread `fontSize` into the overlay and use `y` + `maxWidth` on the
 *   transformation. ALWAYS pair `maxWidth` with `crop: "fit"`.
 */
function fitHeadline(text, opts) {
  const o = { ...DEFAULTS, ...(opts || {}) };
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return { fontSize: o.maxSize, lines: 0, y: o.blockBottom, maxWidth: o.maxWidth };
  }

  for (let size = o.maxSize; size >= o.minSize; size -= 2) {
    const perLine = Math.max(1, Math.floor(o.maxWidth / (o.advance * size)));
    const lines = wrapCount(words, perLine);
    if (lines === null) continue;
    const height = lines * size * o.lineHeight;
    if (height <= o.maxHeight) {
      return {
        fontSize: size,
        lines,
        y: Math.max(0, Math.round(o.blockBottom - height)),
        maxWidth: o.maxWidth,
      };
    }
  }

  // Pathologically long hook: clamp to minSize and let crop:fit wrap it. The
  // block may then be taller than maxHeight, so keep it on-canvas at minimum.
  const perLine = Math.max(1, Math.floor(o.maxWidth / (o.advance * o.minSize)));
  const lines = wrapCount(words, perLine) || 1;
  const height = lines * o.minSize * o.lineHeight;
  return {
    fontSize: o.minSize,
    lines,
    y: Math.max(0, Math.round(o.blockBottom - height)),
    maxWidth: o.maxWidth,
  };
}

module.exports = { fitHeadline, UPPERCASE_ADVANCE, DEFAULTS };
