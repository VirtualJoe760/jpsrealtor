// scripts/lib/slide-templates.js
//
// Cloudinary transformation builders for the 10-slide IG carousel.
// All slides are 1080x1350 (4:5). Banner color is parameterized per listing.

const { fitHeadline } = require("../../src/lib/cover-templates/fit-headline.js");

const FONT = "Poppins";
const CREAM = "F1EBE0";
const CREAM_DIM = "C8C0B0";

// ─── Cover (slide 01) ──────────────────────────────────────────────────
function buildCoverTransformation(d) {
  const { color, hook, city, price, addressLine1, addressLine2,
    listingCredit, specs, body, agentName, headshotPublicId } = d;
  // Shared with the MCP-facing cover in src/lib/cover-templates/simple-luxury.ts.
  // Both used to hardcode font_size:96 with no width cap, so both overflowed the
  // panel on any hook over ~6 characters. Importing one fitter is what keeps the
  // two layouts from drifting apart again.
  const fitted = fitHeadline(hook);
  return [
    { width: 1080, aspect_ratio: "4:5", crop: "fill", gravity: "auto", quality: "auto:best" },
    { overlay: "sample", effect: "colorize:100", color: `rgb:${color}`, opacity: 75,
      width: 480, height: 1350, crop: "scale", gravity: "west" },
    { overlay: { font_family: FONT, font_size: fitted.fontSize, font_weight: "light", text: hook },
      width: fitted.maxWidth, crop: "fit",
      color: "white", gravity: "north_west", x: 70, y: fitted.y },
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

// ─── Slides 02-10 ───────────────────────────────────────────────────────
// The banner, CMA, text-post and CTA builders MOVED to
// src/lib/cover-templates/carousel-slides.js so the Next app (and therefore
// the MCP surface) can render them too -- from here they were unreachable,
// which is why the hosted tools could only ever produce the cover slide.
// Re-exported below so this module keeps its original shape for the build
// scripts. Edit the layouts THERE, not here.
const {
  buildBannerTransform,
  buildCmaTransformation,
  buildTextPostTransformation,
  buildCtaTransformation,
} = require("../../src/lib/cover-templates/carousel-slides.js");

module.exports = {
  buildCoverTransformation,
  buildBannerTransform,
  buildCmaTransformation,
  buildTextPostTransformation,
  buildCtaTransformation,
};
