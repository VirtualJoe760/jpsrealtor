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
//   - Specs (BD | BA | SQFT)
//   - Flowing 1-2 sentence body copy (italic, light)
//   - Agent headshot at bottom, sits flush with the bottom banner
// Bottom: thin banner with "Listed by [agent] · [brokerage]" in italic small print.
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

    // 9. Specs
    {
      overlay: { font_family: FONT, font_size: 22, font_weight: "normal", text: d.specs },
      color: "white", gravity: "north_west", x: 70, y: 575,
    },

    // 10. Body copy — flowing description (italic light)
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

    // 11. Headshot — native aspect ratio, flush with the bottom banner
    {
      overlay: d.headshotPublicId.replace(/\//g, ":"),
      width: 400,
      gravity: "south_west",
      x: 40, y: 40,
    },

    // 12. Bottom banner — solid accent color, full width
    {
      overlay: "sample",
      effect: "colorize:100",
      color: `rgb:${COLOR}`,
      width: 1080, height: 40,
      crop: "scale",
      gravity: "south",
    },

    // 13. Listing credit — italic, light, small print
    {
      overlay: {
        font_family: FONT,
        font_size: 13,
        font_weight: "light",
        font_style: "italic",
        text: d.listingCredit,
      },
      color: "rgb:EFEFEF",
      gravity: "south",
      y: 13,
    },
  ];
}
