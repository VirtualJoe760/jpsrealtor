import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '../public/icons');

// SVG with black background and white JPS text in Raleway Extra Light style
const createSvg = (size) => {
  const fontSize = Math.floor(size * 0.28);
  const yPos = Math.floor(size * 0.58);

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#000000"/>
  <text x="${size/2}" y="${yPos}"
        font-family="Raleway, Helvetica Neue, Arial, sans-serif"
        font-weight="200"
        font-size="${fontSize}"
        fill="#ffffff"
        text-anchor="middle"
        letter-spacing="2">JPS</text>
</svg>`;
};

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generateIcons() {
  for (const size of sizes) {
    const svg = createSvg(size);
    const buffer = Buffer.from(svg);

    await sharp(buffer)
      .png()
      .toFile(join(iconsDir, `icon-${size}x${size}.png`));

    console.log(`Generated icon-${size}x${size}.png`);
  }

  console.log('All icons generated!');
}

generateIcons().catch(console.error);
