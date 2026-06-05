// 1 Makena Lane, Rancho Mirage — staging-reel config
// Brand-new 2025 desert modernist, $3,600,000, 4BR/5BA, 4483 sqft

module.exports = {
  slug: "1-makena",
  listingKey: "20260401180904628018000000",
  address: "1 Makena Lane, Rancho Mirage, CA 92270",

  // 45-second reel storyboard. Each shot maps to a single Luma generation.
  // Timelapse = empty + staged keyframes (uses /empties/<id>.png + /originals/<photo>).
  // Dolly = single image with forward camera motion.
  shots: [
    {
      id: "open",
      type: "dolly",
      photo: "photo-52.jpg",
      duration: 4.0,
      lumaPrompt: "Smooth steady forward camera dolly approaching the Makena Lane gate entrance, consistent slow speed, cinematic, real-estate luxury reel style.",
    },
    {
      id: "great-room",
      type: "timelapse",
      photo: "photo-10.jpg",
      roomDesc: "soaring modern great room with double-height wood-clad cathedral ceiling, a wall of glass opening to the pool deck, and an open kitchen visible beyond",
      duration: 8.0,
      lumaPrompt: "Furniture, sofa, coffee table, dining chairs, decor and rug appear and assemble into the room, smooth time-lapse staging effect, the empty room becomes a fully staged great room, consistent natural lighting throughout.",
    },
    {
      id: "dolly-1",
      type: "dolly",
      photo: "photo-38.jpg",
      duration: 3.0,
      lumaPrompt: "Smooth forward dolly camera motion through an interior corridor with vibrant artwork on the left, consistent steady speed, magazine-quality.",
    },
    {
      id: "kitchen",
      type: "timelapse",
      photo: "photo-15.jpg",
      roomDesc: "modern chef's kitchen with white-oak millwork, large marble waterfall island, dining table for eight, stone slab backsplash, integrated Miele appliances",
      duration: 7.0,
      lumaPrompt: "Dining table, chairs, bar stools, decorative bowl with greenery, vases and kitchen styling appear and arrange into the room, smooth time-lapse staging effect, empty kitchen becomes fully styled, consistent natural light.",
    },
    {
      id: "dolly-2",
      type: "dolly",
      photo: "photo-40.jpg",
      duration: 3.0,
      lumaPrompt: "Smooth forward dolly camera motion down a hallway lined with vibrant rainbow gradient artwork, consistent steady slow speed, depth of field shifts naturally.",
    },
    {
      id: "primary",
      type: "timelapse",
      photo: "photo-25.jpg",
      roomDesc: "primary suite bedroom with wood-slat accent wall, low king bed, lounge chairs, oversized portrait artwork, neutral tones, recessed lighting",
      duration: 6.0,
      lumaPrompt: "Bed with pillows and bedding, nightstands with lamps, lounge chairs, area rug and artwork appear and arrange into the room, smooth time-lapse staging effect, empty bedroom becomes fully styled primary suite, consistent warm interior lighting.",
    },
    {
      id: "dolly-3",
      type: "dolly",
      photo: "photo-55.jpg",
      duration: 3.0,
      lumaPrompt: "Smooth forward dolly camera motion through a covered patio with wood-clad ceiling, out toward the pool deck and mountains beyond, consistent steady speed, cinematic.",
    },
    {
      id: "outdoor",
      type: "timelapse",
      photo: "photo-44.jpg",
      roomDesc: "backyard pool area with an octagonal mosaic-tiled spa in the foreground on a grass lawn, a rectangular pool beyond, a green ball sculpture and white hexagonal sculpture pieces decorating the grass, palm trees and the modern house in the background",
      duration: 6.0,
      lumaPrompt: "Outdoor pool deck decor, sculptures, lounge chairs and styled landscape elements appear and arrange across the backyard, smooth time-lapse staging effect, empty pool deck becomes a fully styled outdoor space, consistent bright desert daylight.",
    },
    {
      id: "sunset",
      type: "dolly",
      photo: "photo-07.jpg",
      duration: 5.0,
      lumaPrompt: "Very slow gentle camera drift forward across a twilight pool patio with a lit fire bar in foreground, palm trees and pink-purple sunset sky, magic-hour golden light, cinematic ending shot, the flames flicker softly.",
    },
  ],

  // Narration mp3 (generated separately via generate-narration.js)
  narrationFile: "narration.mp3",
  narrationDurationSec: 39.73,
  totalDurationSec: 45,
};
