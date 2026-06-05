// scripts/lib/slide-templates.js
//
// Cloudinary transformation builders for the 10-slide IG carousel.
// All slides are 1080x1350 (4:5). Banner color is parameterized per listing.

const FONT = "Poppins";
const CREAM = "F1EBE0";
const CREAM_DIM = "C8C0B0";

// ─── Cover (slide 01) ──────────────────────────────────────────────────
function buildCoverTransformation(d) {
  const { color, hook, city, price, addressLine1, addressLine2,
    listingCredit, specs, body, agentName, headshotPublicId } = d;
  return [
    { width: 1080, aspect_ratio: "4:5", crop: "fill", gravity: "auto", quality: "auto:best" },
    { overlay: "sample", effect: "colorize:100", color: `rgb:${color}`, opacity: 75,
      width: 480, height: 1350, crop: "scale", gravity: "west" },
    { overlay: { font_family: FONT, font_size: 96, font_weight: "light", text: hook },
      color: "white", gravity: "north_west", x: 70, y: 110 },
    { overlay: { font_family: FONT, font_size: 28, font_weight: "light", text: city, letter_spacing: 8 },
      color: "white", gravity: "north_west", x: 70, y: 240 },
    { overlay: { font_family: FONT, font_size: 60, font_weight: "medium", text: price },
      color: "white", gravity: "north_west", x: 70, y: 360 },
    { overlay: "sample", effect: "colorize:100", color: "white",
      width: 160, height: 1, crop: "scale", gravity: "north_west", x: 70, y: 445 },
    { overlay: { font_family: FONT, font_size: 28, font_weight: "light", text: addressLine1 },
      color: "white", gravity: "north_west", x: 70, y: 470 },
    { overlay: { font_family: FONT, font_size: 20, font_weight: "light", text: addressLine2 },
      color: "white", gravity: "north_west", x: 70, y: 510 },
    { overlay: { font_family: FONT, font_size: 14, font_weight: "light", font_style: "italic", text: listingCredit },
      color: "rgb:E0E0E0", gravity: "north_west", x: 70, y: 548 },
    { overlay: { font_family: FONT, font_size: 22, font_weight: "normal", text: specs },
      color: "white", gravity: "north_west", x: 70, y: 590 },
    { overlay: { font_family: FONT, font_size: 18, font_weight: "light", font_style: "italic",
        text: body, letter_spacing: 1 },
      width: 360, crop: "fit", color: "white", gravity: "north_west", x: 70, y: 660 },
    { overlay: { font_family: FONT, font_size: 26, font_weight: "light", text: agentName, letter_spacing: 6 },
      color: "white", gravity: "south_west", x: 100, y: 500 },
    { overlay: headshotPublicId, width: 480, gravity: "south_west", x: 0, y: 0 },
  ];
}

// ─── Info shot banner (slides 02-05) ────────────────────────────────────
function buildBannerTransform(label, caption) {
  return [
    { width: 1080, aspect_ratio: "4:5", crop: "fill", gravity: "auto", quality: "auto:best" },
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

// ─── CMA (slide 06) ──────────────────────────────────────────────────────
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
    color: "rgb:7CA0AB", gravity: "south", y: 80 });
  return t;
}

// ─── Text post (slides 07-09) ────────────────────────────────────────────
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

// ─── CTA (slide 10) — with headshot + identity ───────────────────────────
function buildCtaTransformation(cta) {
  const BG = cta.color;
  const TEXT = `rgb:${CREAM}`;
  const TEXT_DIM = `rgb:${CREAM_DIM}`;
  return [
    { effect: "colorize:100", color: `rgb:${BG}`, width: 1080, height: 1350, crop: "scale" },
    { overlay: { font_family: FONT, font_size: 16, font_weight: "light", text: cta.label, letter_spacing: 8 },
      color: TEXT_DIM, gravity: "north", y: 100 },
    { overlay: "sample", effect: "colorize:100", color: `rgb:${CREAM}`,
      width: 50, height: 1, crop: "scale", gravity: "north", y: 132 },
    { overlay: cta.headshotPublicId, width: 200, gravity: "north", y: 170 },
    { overlay: { font_family: FONT, font_size: 30, font_weight: "light", text: cta.agentName, letter_spacing: 6 },
      color: TEXT, gravity: "north", y: 410 },
    { overlay: { font_family: FONT, font_size: 16, font_weight: "light", text: cta.agentLicense, letter_spacing: 4 },
      color: TEXT_DIM, gravity: "north", y: 460 },
    { overlay: "sample", effect: "colorize:100", color: `rgb:${CREAM}`,
      width: 40, height: 1, crop: "scale", gravity: "north", y: 510 },
    { overlay: { font_family: FONT, font_size: 34, font_weight: "normal", text: cta.paragraphs[0] },
      width: 880, crop: "fit", color: TEXT, gravity: "north_west", x: 100, y: 600 },
    { overlay: { font_family: FONT, font_size: 34, font_weight: "normal", text: cta.paragraphs[1] },
      width: 880, crop: "fit", color: TEXT, gravity: "north_west", x: 100, y: 760 },
    { overlay: { font_family: FONT, font_size: 38, font_weight: "light", font_style: "italic", text: cta.italicLast },
      width: 880, crop: "fit", color: TEXT, gravity: "north_west", x: 100, y: 1010 },
    { overlay: "sample", effect: "colorize:100", color: `rgb:${BG}`,
      width: 1080, height: 90, crop: "scale", gravity: "south" },
    { overlay: cta.brokerLogoPublicId, width: 70, gravity: "south_west", x: 60, y: 20 },
    { overlay: { font_family: FONT, font_size: 22, font_weight: "normal", text: cta.handle },
      color: "rgb:7CA0AB", gravity: "south_east", x: 60, y: 34 },
  ];
}

module.exports = {
  buildCoverTransformation,
  buildBannerTransform,
  buildCmaTransformation,
  buildTextPostTransformation,
  buildCtaTransformation,
};
