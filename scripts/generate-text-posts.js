// scripts/generate-text-posts.js
//
// Text-only slides (Peyson Robertson style) — cream background, Poppins
// body (Jost stand-in until raw-asset delivery is enabled on Cloudinary),
// magazine-style paragraphs, italic light final paragraph, @handle at bottom.
//
// Posts 11-14 for the 75809 Via Pisa carousel:
//   11. About the listing
//   12. CMA data (from get_subdivision_cma)
//   13. Qualities buyers should look for in an agent
//   14. CTA — DM Joseph

require("dotenv").config({ path: ".env.local" });
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const SLUG = "75809-via-pisa";
const EDITS_DIR = path.join(__dirname, "..", "temp-images", SLUG, "_edits");
const FONT = "Poppins";

// Cream / off-white background per Peyson reference
const BG_COLOR = "F1EBE0";
const TEXT_COLOR = "rgb:2D2D2D";       // body
const TEXT_LIGHT_COLOR = "rgb:4A4A4A";  // last italic paragraph (slightly lighter)
const HANDLE_COLOR = "rgb:8A8A8A";

const HANDLE = "@instadella";

const POSTS = [
  {
    n: 11,
    title: "About the listing",
    paragraphs: [
      "A 3,260-square-foot Italianate villa sits on the 10th fairway of Toscana's North Course.",
      "Detached casita. Wolf and Sub-Zero kitchen. Mountain views you don't have to lean to see.",
    ],
    italicLast: "A Tuscan villa where the desert ends.",
  },
  {
    n: 12,
    title: "CMA",
    paragraphs: [
      "25 homes closed in Toscana Country Club this year. Median close price: $3,395,000.",
      "This one is listed at $3,095,000.",
    ],
    italicLast: "Three hundred thousand below the median, for the same neighborhood.",
  },
  {
    n: 13,
    title: "Qualities in an agent",
    paragraphs: [
      "The right agent isn't the one with the most listings.",
      "It's the one who answers when you call. Who knows the difference between a 4 percent equity move and a 10 percent one.",
    ],
    italicLast: "You don't pay extra for a good agent. You pay extra for a bad one.",
  },
  {
    n: 14,
    title: "CTA",
    paragraphs: [
      "DM me to walk through 75809 Via Pisa.",
      "Or call 760-333-3676.",
    ],
    italicLast: "Let's find the home that fits the life you're building.",
  },
];

function buildTransformation(post) {
  const t = [
    // 1. Recolor the sample image to a 1080x1350 cream canvas
    {
      effect: "colorize:100",
      color: `rgb:${BG_COLOR}`,
      width: 1080,
      height: 1350,
      crop: "scale",
    },
  ];

  // Compose body paragraphs + italic last
  // Vertical layout: start at y=300 from top, each paragraph ~180px tall,
  // italic last paragraph ~200px below the last regular paragraph.
  let y = 300;
  const paraSpacing = 170;
  for (const p of post.paragraphs) {
    t.push({
      overlay: {
        font_family: FONT,
        font_size: 38,
        font_weight: "normal",
        text: p,
      },
      width: 880,
      crop: "fit",
      color: TEXT_COLOR,
      gravity: "north_west",
      x: 100,
      y,
    });
    y += paraSpacing;
  }

  // Italic last paragraph — lighter weight per Joseph's note
  y += 30; // extra breathing room
  t.push({
    overlay: {
      font_family: FONT,
      font_size: 36,
      font_weight: "light",
      font_style: "italic",
      text: post.italicLast,
    },
    width: 880,
    crop: "fit",
    color: TEXT_LIGHT_COLOR,
    gravity: "north_west",
    x: 100,
    y,
  });

  // Handle at bottom center
  t.push({
    overlay: {
      font_family: FONT,
      font_size: 22,
      font_weight: "normal",
      text: HANDLE,
    },
    color: HANDLE_COLOR,
    gravity: "south",
    y: 80,
  });

  return t;
}

(async () => {
  const t0 = Date.now();
  fs.mkdirSync(EDITS_DIR, { recursive: true });

  const results = await Promise.all(
    POSTS.map(async (p) => {
      try {
        // Use the sample image as the base — Cloudinary's built-in. Recolor it.
        const url = cloudinary.url("sample", { transformation: buildTransformation(p) });

        const r = await fetch(url);
        if (!r.ok) {
          const body = await r.text();
          return { n: p.n, error: `HTTP ${r.status}: ${body.slice(0, 200)}` };
        }
        const buf = Buffer.from(await r.arrayBuffer());
        const num = String(p.n).padStart(2, "0");
        const outPath = path.join(EDITS_DIR, `slide-${num}.jpg`);
        fs.writeFileSync(outPath, buf);
        return { n: p.n, outPath, kb: (buf.length / 1024).toFixed(0) };
      } catch (e) {
        return { n: p.n, error: e.message };
      }
    })
  );

  console.log(`Done in ${Date.now() - t0}ms\n`);
  for (const r of results) {
    if (r.error) console.log(`[${r.n}] ❌ ${r.error}`);
    else console.log(`[${r.n}] ✅ ${path.basename(r.outPath)} (${r.kb} KB)`);
  }
})().catch((e) => { console.error(e); process.exit(1); });
