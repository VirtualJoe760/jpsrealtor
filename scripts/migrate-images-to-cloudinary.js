#!/usr/bin/env node
/**
 * Migrate large public images to Cloudinary
 *
 * This script:
 * 1. Scans the codebase to find all referenced image paths
 * 2. Identifies large images (>500KB) in /public that are referenced
 * 3. Uploads them to Cloudinary with auto-format and auto-quality
 * 4. Outputs a mapping file for updating code references
 * 5. Reports unreferenced images that can be safely deleted
 *
 * Usage:
 *   node scripts/migrate-images-to-cloudinary.js --dry-run     # Scan only, no uploads
 *   node scripts/migrate-images-to-cloudinary.js --upload       # Upload and generate mapping
 *   node scripts/migrate-images-to-cloudinary.js --report       # Just report sizes and references
 *
 * Required env vars for --upload:
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(PROJECT_ROOT, "public");
const SRC_DIR = path.join(PROJECT_ROOT, "src");
const POSTS_DIR = path.join(SRC_DIR, "posts");

const SIZE_THRESHOLD = 500 * 1024; // 500KB
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"];

// ── Step 1: Find all image files in /public ─────────────────────────────────

function findPublicImages() {
  const images = [];

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Skip node_modules, .next, .git
        if (["node_modules", ".next", ".git", "sw.js"].includes(entry.name)) continue;
        walk(fullPath);
      } else if (IMAGE_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) {
        const stats = fs.statSync(fullPath);
        const relativePath = "/" + path.relative(PUBLIC_DIR, fullPath).replace(/\\/g, "/");
        images.push({
          absolutePath: fullPath,
          publicPath: relativePath,
          size: stats.size,
          sizeMB: (stats.size / 1024 / 1024).toFixed(1),
          ext: path.extname(entry.name).toLowerCase(),
        });
      }
    }
  }

  walk(PUBLIC_DIR);
  return images.sort((a, b) => b.size - a.size);
}

// ── Step 2: Find all image references in source code ────────────────────────

function findImageReferences() {
  const refs = new Set();

  function scanFile(filePath) {
    const content = fs.readFileSync(filePath, "utf-8");

    // Match string literals containing image paths
    // Patterns: "/misc/buying.jpeg", '/joey/about.png', `/images/events/...`
    const patterns = [
      /["'`](\/[^"'`\s]*\.(?:jpg|jpeg|png|webp|gif|svg))["'`]/gi,
      /src=["'](\/[^"'\s]*\.(?:jpg|jpeg|png|webp|gif|svg))["']/gi,
      /image:\s*["'](\/[^"'\s]*\.(?:jpg|jpeg|png|webp|gif|svg))["']/gi,
      /href=["'](\/[^"'\s]*\.(?:jpg|jpeg|png|webp|gif|svg))["']/gi,
      /url\(["']?(\/[^"'\s)]*\.(?:jpg|jpeg|png|webp|gif|svg))["']?\)/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        refs.add(match[1]);
      }
    }
  }

  function walkSrc(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (["node_modules", ".next", ".git"].includes(entry.name)) continue;
        walkSrc(fullPath);
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        if ([".tsx", ".ts", ".jsx", ".js", ".css", ".mdx", ".md", ".json"].includes(ext)) {
          scanFile(fullPath);
        }
      }
    }
  }

  walkSrc(SRC_DIR);

  // Also scan root config files
  const rootFiles = ["next.config.mjs", "tailwind.config.ts", "tailwind.config.js"];
  for (const f of rootFiles) {
    const fp = path.join(PROJECT_ROOT, f);
    if (fs.existsSync(fp)) scanFile(fp);
  }

  return refs;
}

// ── Step 3: Upload to Cloudinary ────────────────────────────────────────────

async function uploadToCloudinary(imagePath, publicPath) {
  // Dynamic import for cloudinary
  const cloudinary = require("cloudinary").v2;

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  // Create a public_id from the path: /misc/buying.jpeg → jpsrealtor/misc/buying
  const publicId = "jpsrealtor" + publicPath.replace(/\.[^.]+$/, "");

  try {
    const result = await cloudinary.uploader.upload(imagePath, {
      public_id: publicId,
      overwrite: false,
      resource_type: "image",
      // Auto-format and auto-quality for optimal delivery
      transformation: [{ fetch_format: "auto", quality: "auto" }],
    });

    return {
      success: true,
      url: result.secure_url,
      optimizedUrl: `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/f_auto,q_auto/${publicId}`,
      bytes: result.bytes,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const mode = process.argv[2] || "--report";

  console.log("Scanning public images...");
  const allImages = findPublicImages();
  const largeImages = allImages.filter((img) => img.size > SIZE_THRESHOLD);

  console.log("Scanning source code for image references...");
  const refs = findImageReferences();

  // Categorize images
  const referenced = [];
  const unreferenced = [];

  for (const img of largeImages) {
    if (refs.has(img.publicPath)) {
      referenced.push(img);
    } else {
      unreferenced.push(img);
    }
  }

  // Small images (under threshold)
  const smallImages = allImages.filter((img) => img.size <= SIZE_THRESHOLD);

  // Summary
  const totalSizeMB = allImages.reduce((sum, img) => sum + img.size, 0) / 1024 / 1024;
  const largeSizeMB = largeImages.reduce((sum, img) => sum + img.size, 0) / 1024 / 1024;
  const referencedSizeMB = referenced.reduce((sum, img) => sum + img.size, 0) / 1024 / 1024;
  const unreferencedSizeMB = unreferenced.reduce((sum, img) => sum + img.size, 0) / 1024 / 1024;

  console.log("\n═══════════════════════════════════════════════════");
  console.log("  IMAGE AUDIT REPORT");
  console.log("═══════════════════════════════════════════════════\n");
  console.log(`  Total images in /public:     ${allImages.length} (${totalSizeMB.toFixed(1)} MB)`);
  console.log(`  Images > 500KB:              ${largeImages.length} (${largeSizeMB.toFixed(1)} MB)`);
  console.log(`  ├─ Referenced in code:        ${referenced.length} (${referencedSizeMB.toFixed(1)} MB)`);
  console.log(`  └─ NOT referenced in code:    ${unreferenced.length} (${unreferencedSizeMB.toFixed(1)} MB)`);
  console.log(`  Small images (< 500KB):      ${smallImages.length}`);
  console.log(`  Total references found:      ${refs.size}`);

  if (mode === "--report") {
    // Top 20 largest referenced images
    console.log("\n── Top 20 Largest Referenced Images ──\n");
    for (const img of referenced.slice(0, 20)) {
      console.log(`  ${img.sizeMB.padStart(6)} MB  ${img.publicPath}`);
    }

    // Top 20 largest unreferenced images
    console.log("\n── Top 20 Largest UNREFERENCED Images (safe to delete) ──\n");
    for (const img of unreferenced.slice(0, 20)) {
      console.log(`  ${img.sizeMB.padStart(6)} MB  ${img.publicPath}`);
    }

    // Save full lists
    const reportDir = path.join(PROJECT_ROOT, "docs", "seo");
    fs.writeFileSync(
      path.join(reportDir, "unreferenced-images.txt"),
      unreferenced.map((img) => `${img.sizeMB} MB\t${img.publicPath}`).join("\n")
    );
    fs.writeFileSync(
      path.join(reportDir, "referenced-large-images.txt"),
      referenced.map((img) => `${img.sizeMB} MB\t${img.publicPath}`).join("\n")
    );
    console.log(`\n  Full lists saved to docs/seo/`);
  }

  if (mode === "--dry-run") {
    console.log("\n── DRY RUN: Would upload these referenced images to Cloudinary ──\n");
    for (const img of referenced) {
      const publicId = "jpsrealtor" + img.publicPath.replace(/\.[^.]+$/, "");
      console.log(`  ${img.sizeMB.padStart(6)} MB  ${img.publicPath}  →  ${publicId}`);
    }
    console.log(`\n  Total to upload: ${referenced.length} images (${referencedSizeMB.toFixed(1)} MB)`);
  }

  if (mode === "--upload") {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
      console.error("\n  ERROR: Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET env vars");
      process.exit(1);
    }

    console.log(`\n── Uploading ${referenced.length} images to Cloudinary ──\n`);
    const mapping = {};
    let uploaded = 0;
    let failed = 0;

    for (const img of referenced) {
      process.stdout.write(`  [${uploaded + failed + 1}/${referenced.length}] ${img.publicPath}...`);
      const result = await uploadToCloudinary(img.absolutePath, img.publicPath);
      if (result.success) {
        mapping[img.publicPath] = result.optimizedUrl;
        uploaded++;
        const savings = ((1 - result.bytes / img.size) * 100).toFixed(0);
        console.log(` ✓ (${savings}% smaller)`);
      } else {
        failed++;
        console.log(` ✗ ${result.error}`);
      }
    }

    // Save mapping file
    const mappingPath = path.join(PROJECT_ROOT, "docs", "seo", "cloudinary-mapping.json");
    fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));

    console.log(`\n  Uploaded: ${uploaded}  Failed: ${failed}`);
    console.log(`  Mapping saved to: docs/seo/cloudinary-mapping.json`);
    console.log(`\n  Next step: Use the mapping file to update code references.`);
  }
}

main().catch(console.error);
