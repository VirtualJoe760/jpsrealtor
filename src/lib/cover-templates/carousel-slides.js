// src/lib/cover-templates/carousel-slides.js
//
// Cloudinary transformation builders for the non-cover slides of the 10-slide
// Instagram carousel: the photo caption band, the CMA stat card, the text
// posts, and the closing CTA.
//
// WHY THESE LIVE HERE NOW
// -----------------------
// These four builders shipped inside scripts/lib/slide-templates.js and ran
// four production carousels from there. But scripts/ is plain Node tooling the
// Next app cannot import, so the API — and therefore the MCP surface an agent
// talks to — could only ever render the COVER. An agent asking Claude to build
// a listing carousel got slide 1 of 10 and no way to reach the rest.
//
// Moving them into src/ makes them reachable from a route handler.
// scripts/lib/slide-templates.js now re-exports from here rather than keeping
// its own copies, so there is exactly one implementation of each layout.
//
// Plain CommonJS on purpose: scripts/ is CJS (no "type" field in package.json)
// and the Next app has allowJs, so a single .js file is the one format both
// sides can consume without a build step.
//
// CANVAS: every slide is 1080x1350 (4:5 portrait, Instagram's tallest feed
// crop). Coordinates below are absolute within that canvas.

const FONT = "Poppins";
const CREAM = "F1EBE0";
const CREAM_DIM = "C8C0B0";
const HANDLE_COLOR = "rgb:7CA0AB";

/**
 * Caption band for a staged room photo (carousel slides 2-5).
 *
 * This is the piece that was missing from the hosted surface entirely: the
 * agent-staging route generates the composited photo but deliberately tells
 * the image model "no text overlays", and nothing added the band afterwards.
 * The result was bare photos where the reference carousels have a room label
 * and a line of copy.
 *
 * @param {string} label   Room label, e.g. "THE GREAT ROOM" (letter-spaced).
 * @param {string} caption One line of italic copy under the rule.
 */
function buildBannerTransform(label, caption) {
  return [
    { width: 1080, aspect_ratio: "4:5", crop: "fill", gravity: "auto", quality: "auto:best" },
    // Scrim so white type stays legible over any photo.
    { overlay: "sample", effect: "colorize:100", color: "rgb:000000", opacity: 75,
      width: 1080, height: 340, crop: "scale", gravity: "south" },
    { overlay: { font_family: FONT, font_size: 22, font_weight: "light", text: label, letter_spacing: 8 },
      color: "rgb:DDDDDD", gravity: "south", y: 250 },
    { overlay: "sample", effect: "colorize:100", color: "white",
      width: 60, height: 1, crop: "scale", gravity: "south", y: 230 },
    { overlay: { font_family: FONT, font_size: 38, font_weight: "light", font_style: "italic",
        text: caption, letter_spacing: 1 },
      width: 900, crop: "fit", color: "white", gravity: "south", y: 80 },
  ];
}

/**
 * CMA stat card (carousel slide 6) — a solid-color slide with a 2x2 stat grid
 * over the subject listing's price.
 *
 * `stats` renders as a 2-column grid in order, so pass them in reading order.
 * The grid is positioned for exactly 4 entries; more will overflow the card.
 *
 * @param {{color:string, scope:string, period:string,
 *          stats:Array<{value:string,label:string}>,
 *          listingLabel:string, listingPrice:string, pitch:string}} cma
 * @param {string} handle e.g. "@instadella"
 */
function buildCmaTransformation(cma, handle) {
  const color = cma.color;
  const t = [
    { effect: "colorize:100", color: `rgb:${color}`, width: 1080, height: 1350, crop: "scale" },
    { overlay: { font_family: FONT, font_size: 26, font_weight: "light", text: cma.scope, letter_spacing: 10 },
      color: `rgb:${CREAM}`, gravity: "north", y: 140 },
    { overlay: "sample", effect: "colorize:100", color: `rgb:${CREAM}`,
      width: 60, height: 1, crop: "scale", gravity: "north", y: 195 },
    { overlay: { font_family: FONT, font_size: 16, font_weight: "light", text: cma.period, letter_spacing: 4 },
      color: `rgb:${CREAM_DIM}`, gravity: "north", y: 225 },
  ];
  const COL_X = [110, 590];
  const ROW_V = [380, 620];
  const ROW_L = [490, 730];
  for (let i = 0; i < cma.stats.length; i++) {
    const s = cma.stats[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    t.push({ overlay: { font_family: FONT, font_size: 92, font_weight: "medium", text: s.value },
      color: `rgb:${CREAM}`, gravity: "north_west", x: COL_X[col], y: ROW_V[row] });
    t.push({ overlay: { font_family: FONT, font_size: 16, font_weight: "light", text: s.label, letter_spacing: 4 },
      color: `rgb:${CREAM_DIM}`, gravity: "north_west", x: COL_X[col], y: ROW_L[row] });
  }
  t.push({ overlay: "sample", effect: "colorize:100", color: `rgb:${CREAM}`,
    width: 100, height: 1, crop: "scale", gravity: "north", y: 870 });
  t.push({ overlay: { font_family: FONT, font_size: 16, font_weight: "light", text: cma.listingLabel, letter_spacing: 6 },
    color: `rgb:${CREAM_DIM}`, gravity: "north", y: 900 });
  t.push({ overlay: { font_family: FONT, font_size: 96, font_weight: "light", text: cma.listingPrice },
    color: `rgb:${CREAM}`, gravity: "north", y: 940 });
  t.push({ overlay: { font_family: FONT, font_size: 28, font_weight: "light", font_style: "italic", text: cma.pitch },
    width: 900, crop: "fit", color: `rgb:${CREAM_DIM}`, gravity: "north", y: 1080 });
  t.push({ overlay: { font_family: FONT, font_size: 22, text: handle },
    color: HANDLE_COLOR, gravity: "south", y: 80 });
  return t;
}

/**
 * Text post (carousel slides 7-9) — copy on a flat background, closing on an
 * italic line.
 *
 * NOTE ON VERTICAL FLOW: paragraph height is ESTIMATED at 32 chars/line to
 * advance `y`, because Cloudinary wraps server-side and cannot report back how
 * tall a block rendered. Long paragraphs therefore drift. Keep each paragraph
 * to roughly 2-3 lines; a 5+ line paragraph will crowd whatever follows it.
 *
 * @param {{paragraphs:string[], italicLast:string, bg?:string}} post
 * @param {string} handle
 */
function buildTextPostTransformation(post, handle) {
  const bg = post.bg || CREAM;
  const bodyColor = "rgb:2D2D2D";
  const italicColor = "rgb:4A4A4A";
  const handleColor = "rgb:8A8A8A";
  const t = [
    { effect: "colorize:100", color: `rgb:${bg}`, width: 1080, height: 1350, crop: "scale" },
  ];
  let y = 300;
  const lineHeight = 50;
  const paraGap = 50;
  const charsPerLine = 32;
  for (const p of post.paragraphs) {
    const estLines = Math.max(1, Math.ceil(p.length / charsPerLine));
    t.push({
      overlay: { font_family: FONT, font_size: 38, font_weight: "normal", text: p },
      width: 880, crop: "fit",
      color: bodyColor, gravity: "north_west", x: 100, y,
    });
    y += estLines * lineHeight + paraGap;
  }
  y += 30;
  t.push({
    overlay: { font_family: FONT, font_size: 36, font_weight: "light", font_style: "italic", text: post.italicLast },
    width: 880, crop: "fit",
    color: italicColor, gravity: "north_west", x: 100, y,
  });
  t.push({
    overlay: { font_family: FONT, font_size: 22, text: handle },
    color: handleColor, gravity: "south", y: 80,
  });
  return t;
}

/**
 * Closing CTA (carousel slide 10) — headshot, agent identity, two paragraphs,
 * an italic ask, and the broker logo.
 *
 * `paragraphs` is indexed at [0] and [1] against fixed y positions, so exactly
 * two are required; a third would render off-slide.
 *
 * The agent's license belongs here — this is the slide that names them, so it
 * carries the compliance line for the post.
 *
 * @param {{color:string, label:string, agentName:string, agentLicense:string,
 *          paragraphs:string[], italicLast:string, handle:string,
 *          headshotPublicId:string, brokerLogoPublicId:string}} cta
 */
/**
 * Place the pre-baked circular headshot.
 *
 * THE CIRCLE IS NOT MADE HERE, AND THAT IS THE POINT. This slide once shipped
 * with a HOLE where the agent should be, from a single-step overlay:
 *
 *   { overlay: id, width: 200, height: 200, crop: "thumb", gravity: "face",
 *     radius: "max", y: 170 }
 *
 * which the SDK flattens to `c_thumb,g_face,h_200,l_<id>,r_max,w_200,y_170`.
 * In one component Cloudinary reads `g_face` as where to POSITION the layer
 * rather than what to centre its crop on, and the layer renders as nothing —
 * no error, just a plausible card with the agent missing. Splitting it with
 * `fl_layer_apply` brought the headshot back but square, and reset the
 * positioning context so every overlay below it moved; several `r_max`
 * spellings then filled the square instead of masking it.
 *
 * So the circle is baked into its own asset by
 * `scripts/make-circle-headshot.js`, which verifies the mask before uploading.
 * This function only does the thing Cloudinary is dependable at — placing a
 * finished PNG — and falls back to the raw headshot if the circle asset is
 * missing, so a fresh agent without one gets a square photo rather than a hole.
 */
function circleOverlay(publicId, size, y, gravity = "north") {
  const circleId = /-circle$/.test(publicId) ? publicId : `${publicId}-circle`;
  return [{ overlay: circleId, width: size, crop: "scale", gravity, y }];
}

function buildCtaTransformation(cta) {
  const BG = cta.color;
  
  // Cloudinary overlay ids use COLONS as the folder separator, not slashes.
  // A raw public_id like "headshots/head-shot-2026" produces l_headshots/head-
  // shot-2026, which 404s — and a 404 overlay doesn't error, it just renders
  // nothing, so the slide comes back as a blank colour card that looks
  // plausible until you notice the agent is missing. The cover template has
  // always done this conversion; this one did not.
  const oid = (id) => String(id || "").replace(/\//g, ":");
  const headshot = oid(cta.headshotPublicId);

  // Pick the logo variant that can actually be SEEN on this background.
  // (see circleOverlay above for why the headshot is two steps, not one)
  // A black eXp mark on a light champagne card is invisible-ish and reads as a
  // smudge; the same card also carried near-white body text, so the slide had
  // dark and light marks fighting each other. Choose by luminance instead of
  // hoping the caller passed the right file.
  const hex = String(cta.color || "1C4A5A").replace(/^#/, "");
  const lum =
    (0.299 * parseInt(hex.slice(0, 2), 16) +
      0.587 * parseInt(hex.slice(2, 4), 16) +
      0.114 * parseInt(hex.slice(4, 6), 16)) / 255;
  const bgIsLight = lum > 0.55;
  const requested = oid(cta.brokerLogoPublicId);
  const brokerLogo = bgIsLight
    ? requested.replace(/[-_]?white/i, "").replace(/EXP-?square/i, "EXP-Black-square")
    : requested.replace(/Black/i, "white");
  // Body copy has to flip with it, or light text lands on a light card.
  const BODY = bgIsLight ? "rgb:1F1F1F" : `rgb:${CREAM}`;
  const BODY_DIM = bgIsLight ? "rgb:5A5A5A" : `rgb:${CREAM_DIM}`;
  return [
    { effect: "colorize:100", color: `rgb:${BG}`, width: 1080, height: 1350, crop: "scale" },
    { overlay: { font_family: FONT, font_size: 16, font_weight: "light", text: cta.label, letter_spacing: 8 },
      color: BODY_DIM, gravity: "north", y: 100 },
    { overlay: "sample", effect: "colorize:100", color: BODY,
      width: 50, height: 1, crop: "scale", gravity: "north", y: 132 },
    ...circleOverlay(headshot, 200, 170),
    { overlay: { font_family: FONT, font_size: 30, font_weight: "light", text: cta.agentName, letter_spacing: 6 },
      color: BODY, gravity: "north", y: 410 },
    { overlay: { font_family: FONT, font_size: 16, font_weight: "light", text: cta.agentLicense, letter_spacing: 4 },
      color: BODY_DIM, gravity: "north", y: 460 },
    { overlay: "sample", effect: "colorize:100", color: `rgb:${CREAM}`,
      width: 40, height: 1, crop: "scale", gravity: "north", y: 510 },
    { overlay: { font_family: FONT, font_size: 34, font_weight: "normal", text: cta.paragraphs[0] },
      width: 880, crop: "fit", color: BODY, gravity: "north_west", x: 100, y: 600 },
    { overlay: { font_family: FONT, font_size: 34, font_weight: "normal", text: cta.paragraphs[1] },
      width: 880, crop: "fit", color: BODY, gravity: "north_west", x: 100, y: 760 },
    { overlay: { font_family: FONT, font_size: 38, font_weight: "light", font_style: "italic", text: cta.italicLast },
      width: 880, crop: "fit", color: BODY, gravity: "north_west", x: 100, y: 1010 },
    // Repaint the footer strip so wrapped copy above cannot collide with the
    // logo/handle row.
    { overlay: "sample", effect: "colorize:100", color: `rgb:${BG}`,
      width: 1080, height: 90, crop: "scale", gravity: "south" },
    { overlay: brokerLogo, width: 70, gravity: "south_west", x: 60, y: 20 },
    { overlay: { font_family: FONT, font_size: 22, font_weight: "normal", text: cta.handle },
      color: HANDLE_COLOR, gravity: "south_east", x: 60, y: 34 },
  ];
}

module.exports = {
  FONT,
  CREAM,
  CREAM_DIM,
  buildBannerTransform,
  buildCmaTransformation,
  buildTextPostTransformation,
  buildCtaTransformation,
};
