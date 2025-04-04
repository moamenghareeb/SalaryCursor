const fs = require('fs');
const path = require('path');

// Skip icon generation in Vercel or when env var is set
if (process.env.VERCEL || process.env.NEXT_PUBLIC_SKIP_ICON_GENERATION === 'true') {
  console.log('Skipping icon generation in deployment environment');
  process.exit(0);
}

// Only require canvas if we're actually going to use it
let createCanvas;
try {
  ({ createCanvas } = require('canvas'));
} catch (error) {
  console.error('Canvas package not available - icons will not be generated');
  process.exit(0);
}

// Icon sizes needed for PWA
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const ICONS_DIR = path.join(__dirname, '../public/icons');

// Ensure the icons directory exists
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

// Generate simple placeholder icons with "SC" text for SalaryCursor
function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#0066cc'; // Blue background
  ctx.fillRect(0, 0, size, size);

  // Border radius - make it slightly rounded
  ctx.fillStyle = '#0066cc';
  ctx.beginPath();
  ctx.arc(size/10, size/10, size/10, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();

  // Text
  const fontSize = Math.floor(size * 0.4);
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SC', size / 2, size / 2);

  // Save the icon
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(ICONS_DIR, `icon-${size}x${size}.png`), buffer);
  console.log(`Generated icon-${size}x${size}.png`);
}

// Generate all icon sizes
ICON_SIZES.forEach(generateIcon);

console.log('All PWA icons generated successfully!');
