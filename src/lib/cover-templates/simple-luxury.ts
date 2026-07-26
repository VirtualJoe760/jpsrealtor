// src/lib/cover-templates/simple-luxury.ts
//
// "simple-luxury" cover template — 4:5 portrait Instagram cover slide.
//
// Layout (left ~45% panel, right shows photo):
//   - Hook headline (96pt light)
//   - City subtitle (28pt light, letter-spaced)
//   - Price ($, 60pt medium)
//   - Divider rule
//   - Address (2 lines, light)
//   - Listing credit ("Listed by [agent] · [brokerage]") directly under the address
//   - Specs (BD | BA | SQFT)
//   - Flowing 1-2 sentence body copy (italic, light)
//   - Agent headshot bled flush into the bottom-left corner
//
// LAYOUT INVARIANT — do not "fix" these two things back:
//
//   1. The headshot is a background-removed cutout PNG whose source frame ends
//      mid-torso, so it carries a hard horizontal crop edge. It MUST sit flush
//      at x:0, y:0 so that edge bleeds off-canvas. ANY positive y offset floats
//      the cut line over the accent panel and renders the agent as a chopped-off
//      rectangular slab.
//   2. There is NO bottom banner. A full-width band at gravity:south terminates
//      the torso against a solid color and reads as a sliced headshot — it was
//      masking the seam from (1) rather than fixing it. The listing credit lives
//      in the info column under the address instead.
//
// This mirrors the shipped carousel cover in scripts/lib/slide-templates.js
// (buildCoverTransformation) — keep the two in sync.
//
// Accent color (default teal #1C4A5A) can be overridden per call so the
// same layout can run in different brand palettes.
//
// All text is Poppins (closest auto-loaded Cloudinary font to Jost). Once
// raw-asset delivery is enabled on the Cloudinary account, swap font to
// "jpsrealtor:fonts:Jost-Variable.ttf".

export interface SimpleLuxuryData {
  basePhotoPublicId: string;     // Cloudinary public_id of the background photo
  headshotPublicId: string;      // public_id of agent headshot (raw, no crop)

  // Copy
  hook: string;                  // e.g. "TOSCANA LUXURY"
  city: string;                  // e.g. "INDIAN WELLS"
  price: string;                 // formatted, e.g. "$3,095,000"
  addressLine1: string;          // e.g. "75809 VIA PISA"
  addressLine2: string;          // e.g. "INDIAN WELLS, CA"
  specs: string;                 // e.g. "4 BD  |  5 BA  |  3,260 SQFT"
  body: string;                  // 1-2 sentence flowing description

  // Listing credit (compliance)
  listingCredit: string;         // e.g. "Listed by Julianne Pierzak  ·  Coldwell Banker Realty"

  // Theming
  accentColor?: string;          // hex without #, default "1C4A5A" (deep teal)
  font?: string;                 // default "Poppins"
}

export type CloudinaryTransformation = Record<string, any>;

export function buildSimpleLuxuryTransformations(
  d: SimpleLuxuryData
): CloudinaryTransformation[] {
  const FONT = d.font || "Poppins";
  const COLOR = d.accentColor || "1C4A5A";

  return [
    // 1. Base 4:5 portrait crop, 1080w
    { width: 1080, aspect_ratio: "4:5", crop: "fill", gravity: "auto", quality: "auto:best" },

    // 2. Left panel — semi-transparent accent color, full height
    {
      overlay: "sample",
      effect: "colorize:100",
      color: `rgb:${COLOR}`,
      opacity: 75,
      width: 480, height: 1350,
      crop: "scale",
      gravity: "west",
    },

    // 3. Hook headline
    {
      overlay: { font_family: FONT, font_size: 96, font_weight: "light", text: d.hook },
      color: "white", gravity: "north_west", x: 70, y: 110,
    },

    // 4. City subtitle (letter-spaced for editorial feel)
    {
      overlay: {
        font_family: FONT,
        font_size: 28,
        font_weight: "light",
        text: d.city,
        letter_spacing: 8,
      },
      color: "white", gravity: "north_west", x: 70, y: 240,
    },

    // 5. Price
    {
      overlay: { font_family: FONT, font_size: 60, font_weight: "medium", text: d.price },
      color: "white", gravity: "north_west", x: 70, y: 360,
    },

    // 6. Divider rule
    {
      overlay: "sample",
      effect: "colorize:100",
      color: "white",
      width: 160, height: 1,
      crop: "scale",
      gravity: "north_west", x: 70, y: 445,
    },

    // 7. Address line 1
    {
      overlay: { font_family: FONT, font_size: 28, font_weight: "light", text: d.addressLine1 },
      color: "white", gravity: "north_west", x: 70, y: 470,
    },

    // 8. Address line 2
    {
      overlay: { font_family: FONT, font_size: 20, font_weight: "light", text: d.addressLine2 },
      color: "white", gravity: "north_west", x: 70, y: 510,
    },

    // 9. Listing credit (compliance) — sits directly under the address, wrapped.
    // The credit string is long ("Listed by <Agent>  ·  <Full Office Name>"), so
    // it needs crop:fit + a width cap to wrap to two lines rather than running
    // off the accent panel.
    {
      overlay: {
        font_family: FONT,
        font_size: 14,
        font_weight: "light",
        font_style: "italic",
        text: d.listingCredit,
      },
      width: 360,
      crop: "fit",
      color: "rgb:E0E0E0",
      gravity: "north_west",
      x: 70, y: 548,
    },

    // 10. Specs
    // y:605 budgets for a TWO-line credit above. Long brokerage names
    // ("eXp Realty Of Southern California Inc") wrap at width 360; the shipped
    // carousel uses y:590 only because its credits happen to fit on one line.
    // Don't tighten this back to 590 — it crowds the wrapped second line.
    {
      overlay: { font_family: FONT, font_size: 22, font_weight: "normal", text: d.specs },
      color: "white", gravity: "north_west", x: 70, y: 605,
    },

    // 11. Body copy — flowing description (italic light)
    {
      overlay: {
        font_family: FONT,
        font_size: 19,
        font_weight: "light",
        font_style: "italic",
        text: d.body,
        letter_spacing: 1,
      },
      width: 360,
      crop: "fit",
      color: "white",
      gravity: "north_west",
      x: 70, y: 660,
    },

    // 12. Headshot — cutout PNG bled flush into the bottom-left corner.
    // x:0, y:0 is load-bearing (see LAYOUT INVARIANT at the top of this file):
    // the asset's hard bottom crop edge must run off-canvas, not float over
    // the panel. Width 480 matches the accent panel so it fills edge-to-edge.
    {
      overlay: d.headshotPublicId.replace(/\//g, ":"),
      width: 480,
      gravity: "south_west",
      x: 0, y: 0,
    },
  ];
}
