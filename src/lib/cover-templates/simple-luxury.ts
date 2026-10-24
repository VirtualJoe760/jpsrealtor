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
//   3. The hook carries `width` + `crop: "fit"` from fitHeadline(). Without the
//      width cap it is a bare 96pt overlay that runs off the panel and across
//      the photo at anything over ~6 characters. Do not drop the cap or
//      hardcode font_size/y back — the fitter bottom-anchors the block so it
//      never reaches the city subtitle at y:240.
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

import { fitHeadline } from "./fit-headline";

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
  const hook = fitHeadline(d.hook);

  // Address line 1 is sized to fit on ONE line, never wrapped. See §7 below for
  // why wrapping it is the worse failure, and copy-voice.md §8 for the family.
  // maxHeight is one 28pt line (28 × 1.25 = 35), so fitHeadline's height test
  // rejects every two-line candidate and keeps stepping the size down.
  // 80519 AVENIDA SANTA ISADORA needed 22pt; most addresses stay at 28.
  const addr1 = fitHeadline(d.addressLine1, {
    maxSize: 28,
    minSize: 14,
    maxHeight: 36,
    blockBottom: 0, // y is hardcoded at 470 below; only fontSize is used here
  });

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

    // 3. Hook headline — auto-fitted to the panel, bottom-anchored above the
    // city subtitle. See fit-headline.js: `width` + `crop: "fit"` is what makes
    // overflow impossible; `fontSize`/`y` are what make it look deliberate.
    // A short one-line hook resolves to 96pt at y:110, the values this was
    // before the fitter existed.
    {
      overlay: { font_family: FONT, font_size: hook.fontSize, font_weight: "light", text: d.hook },
      width: hook.maxWidth,
      crop: "fit",
      color: "white", gravity: "north_west", x: 70, y: hook.y,
    },

    // 4. City subtitle (letter-spaced for editorial feel)
    //
    // `width` + `crop: "fit"` for the SAME reason the hook carries them
    // (invariant 3 above): a bare overlay has no idea the panel ends at 480 and
    // simply runs onto the photo. The city is not authored copy — it comes
    // straight off the listing — so it cannot be shortened at the config layer
    // the way a hook can. At 28pt with 8px letter-spacing "DESERT HOT SPRINGS"
    // measures ~420px and 16430 Evans Lane shipped its cover with the final S
    // cut in half by the panel edge, one stroke on the accent colour and one on
    // open sky. 390 is the hook's own cap (x:70 + 390 = 460, 20px of margin
    // inside the panel); anything longer wraps to a second line at y:274, which
    // still clears the price at y:360.
    {
      overlay: {
        font_family: FONT,
        font_size: 28,
        font_weight: "light",
        text: d.city,
        letter_spacing: 8,
      },
      width: 390,
      crop: "fit",
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
    //
    // Same 390px cap and crop:fit as the hook and the city, and for the same
    // reason (invariant 3): a bare 28pt overlay does not know the panel ends at
    // 480. This one had simply never been long enough to catch it.
    //
    // NOTE THE ASYMMETRY WITH THE CITY ABOVE. The city is free to wrap, because
    // the next element below it is the price 86px down. This line is NOT — line
    // 2 sits at y:510, 40px below, which is barely one 28pt line. So the cap
    // here converts "runs onto the photo" into "overprints the city", and the
    // caller's job is to keep this line short enough that neither happens. That
    // is why a unit number goes on line 2 (see build-pending-post.ts) rather
    // than being appended here, where "5803 LOS SANTOS DRIVE #19" measures ~388
    // of the 390 available.
    //
    // AND THE CALLER CANNOT DO THAT JOB, because the address is not authored
    // copy — it comes off the feed, the same argument fit-headline.js makes
    // about the hook. 80519 AVENIDA SANTA ISADORA is 27 characters, wrapped to
    // "80519 AVENIDA SANTA" / "ISADORA", and the second line landed straight
    // through the city at y:510. So the size is fitted to one line (see addr1
    // above) rather than fixed at 28. crop:fit stays as the hard guarantee.
    {
      overlay: { font_family: FONT, font_size: addr1.fontSize, font_weight: "light", text: d.addressLine1 },
      width: 390,
      crop: "fit",
      color: "white", gravity: "north_west", x: 70, y: 470,
    },

    // 8. Address line 2 — city, state, and the unit number when there is one.
    // At 20pt this line has real headroom: "#19  ·  PALM SPRINGS, CA" measures
    // ~265 of 390.
    {
      overlay: { font_family: FONT, font_size: 20, font_weight: "light", text: d.addressLine2 },
      width: 390,
      crop: "fit",
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
    // ("Fathom Realty Group, Inc.") wrap at width 360; the shipped
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
