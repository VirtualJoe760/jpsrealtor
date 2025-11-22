/**
 * PWA Icon Generation Script
 *
 * This script generates PWA icons from a source image.
 * For now, we'll copy the logo to create placeholder icons.
 *
 * For production, use a tool like:
 * - https://realfavicongenerator.net/
 * - npx pwa-asset-generator
 *
 * Run: node scripts/generate-pwa-icons.js
 */

const fs = require('fs');
const path = require('path');

const sourceLogo = path.join(__dirname, '../public/images/brand/EXP-white-square.png');
const iconsDir = path.join(__dirname, '../public/icons');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('📱 PWA Icon Generation');
console.log('=====================');
console.log('');
console.log('Source:', sourceLogo);
console.log('Destination:', iconsDir);
console.log('');

if (!fs.existsSync(sourceLogo)) {
  console.error('❌ Source logo not found!');
  console.log('');
  console.log('Please ensure you have a logo at:', sourceLogo);
  console.log('');
  console.log('Or use an online tool to generate PWA icons:');
  console.log('  - https://realfavicongenerator.net/');
  console.log('  - npx pwa-asset-generator <source-image> public/icons');
  console.log('');
  process.exit(1);
}

// For now, copy the source to each size (placeholder approach)
// In production, you should use proper image resizing
sizes.forEach(size => {
  const destFile = path.join(iconsDir, `icon-${size}x${size}.png`);
  fs.copyFileSync(sourceLogo, destFile);
  console.log(`✓ Created ${size}x${size} icon`);
});

// Copy favicon
const faviconDest = path.join(__dirname, '../public/favicon.ico');
if (fs.existsSync(sourceLogo)) {
  fs.copyFileSync(sourceLogo, faviconDest);
  console.log('✓ Created favicon.ico');
}

// Create apple touch icon
const appleTouchIcon = path.join(__dirname, '../public/apple-touch-icon.png');
fs.copyFileSync(sourceLogo, appleTouchIcon);
console.log('✓ Created apple-touch-icon.png');

console.log('');
console.log('✅ Icon generation complete!');
console.log('');
console.log('⚠️  NOTE: These are placeholder icons.');
console.log('   For production, use proper image resizing:');
console.log('   npx pwa-asset-generator public/images/brand/EXP-white-square.png public/icons');
console.log('');
