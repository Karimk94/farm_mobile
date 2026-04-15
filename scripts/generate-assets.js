/**
 * generate-assets.js
 * Generates branded PNG assets required by Expo:
 *   assets/icon.png          - 1024x1024  (App Store icon)
 *   assets/adaptive-icon.png - 1024x1024  (Android adaptive icon foreground)
 *   assets/splash-icon.png   - 1284x2778  (Splash screen centred graphic)
 *   assets/favicon.png       -  196x196   (Web favicon)
 *
 * Run once before building:
 *   node scripts/generate-assets.js
 */

const fs   = require('fs');
const path = require('path');
const sharp = require('sharp');

const assetsDir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(assetsDir, { recursive: true });

// ---------------------------------------------------------------------------
// Colour palette (farm theme)
// ---------------------------------------------------------------------------
const GREEN_DARK  = '#166534';
const GREEN_MID   = '#16a34a';
const WHITE       = '#ffffff';
const SPLASH_BG   = '#f0fdf4'; // very light green

// ---------------------------------------------------------------------------
// Helper: render an SVG string → PNG buffer via sharp
// ---------------------------------------------------------------------------
async function svgToPng(svgString, outputPath) {
  const buf = Buffer.from(svgString);
  await sharp(buf).png().toFile(outputPath);
  console.log(`  ✓  ${path.relative(process.cwd(), outputPath)}`);
}

// ---------------------------------------------------------------------------
// 1. App Icon  1024×1024
// ---------------------------------------------------------------------------
async function makeIcon() {
  const size = 1024;
  const r    = Math.round(size * 0.22); // corner radius
  const svg  = `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="${GREEN_DARK}"/>
      <stop offset="100%" stop-color="${GREEN_MID}"/>
    </linearGradient>
  </defs>
  <!-- rounded background -->
  <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="url(#bg)"/>

  <!-- barn silhouette (centred, scaled to ~55% of icon) -->
  <g transform="translate(${size * 0.5}, ${size * 0.52}) scale(${size / 1400})">
    <!-- barn body -->
    <rect x="-260" y="-140" width="520" height="340" fill="${WHITE}" opacity="0.95" rx="12"/>
    <!-- roof left slope -->
    <polygon points="-300,-140 0,-360 0,-140" fill="${WHITE}" opacity="0.95"/>
    <!-- roof right slope -->
    <polygon points="300,-140 0,-360 0,-140" fill="${WHITE}" opacity="0.95"/>
    <!-- door -->
    <rect x="-60" y="40" width="120" height="160" rx="60" fill="${GREEN_DARK}"/>
    <!-- left window -->
    <rect x="-210" y="-70" width="90" height="80" rx="8" fill="${GREEN_DARK}"/>
    <!-- right window -->
    <rect x="120" y="-70" width="90" height="80" rx="8" fill="${GREEN_DARK}"/>
  </g>

  <!-- wordmark beneath barn -->
  <text
    x="${size / 2}" y="${size * 0.865}"
    text-anchor="middle"
    font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
    font-weight="700"
    font-size="82"
    letter-spacing="6"
    fill="${WHITE}"
    opacity="0.92"
  >FARM</text>
</svg>`;
  await svgToPng(svg, path.join(assetsDir, 'icon.png'));
}

// ---------------------------------------------------------------------------
// 2. Adaptive icon (Android)  1024×1024  — full-bleed, no rounded crop
// ---------------------------------------------------------------------------
async function makeAdaptiveIcon() {
  const size = 1024;
  const svg  = `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="${GREEN_DARK}"/>
      <stop offset="100%" stop-color="${GREEN_MID}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)"/>
  <g transform="translate(${size * 0.5}, ${size * 0.5}) scale(${size / 1400})">
    <rect x="-260" y="-140" width="520" height="340" fill="${WHITE}" opacity="0.95" rx="12"/>
    <polygon points="-300,-140 0,-360 0,-140" fill="${WHITE}" opacity="0.95"/>
    <polygon points="300,-140 0,-360 0,-140" fill="${WHITE}" opacity="0.95"/>
    <rect x="-60" y="40" width="120" height="160" rx="60" fill="${GREEN_DARK}"/>
    <rect x="-210" y="-70" width="90" height="80" rx="8" fill="${GREEN_DARK}"/>
    <rect x="120" y="-70" width="90" height="80" rx="8" fill="${GREEN_DARK}"/>
  </g>
  <text
    x="${size / 2}" y="${size * 0.82}"
    text-anchor="middle"
    font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
    font-weight="700" font-size="80" letter-spacing="6"
    fill="${WHITE}" opacity="0.92">FARM</text>
</svg>`;
  await svgToPng(svg, path.join(assetsDir, 'adaptive-icon.png'));
}

// ---------------------------------------------------------------------------
// 3. Splash screen  1284×2778  (iPhone 14 Pro Max — Expo scales for iPad too)
// ---------------------------------------------------------------------------
async function makeSplash() {
  const W = 1284, H = 2778;
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${SPLASH_BG}"/>

  <!-- large soft green circle behind logo -->
  <circle cx="${W / 2}" cy="${H * 0.42}" r="360"
          fill="${GREEN_MID}" opacity="0.12"/>

  <!-- barn icon (centred, larger) -->
  <g transform="translate(${W / 2}, ${H * 0.42}) scale(1.35)">
    <rect x="-260" y="-140" width="520" height="340" fill="${GREEN_DARK}" rx="12"/>
    <polygon points="-300,-140 0,-360 0,-140" fill="${GREEN_DARK}"/>
    <polygon points="300,-140 0,-360 0,-140" fill="${GREEN_DARK}"/>
    <rect x="-60" y="40" width="120" height="160" rx="60" fill="${WHITE}"/>
    <rect x="-210" y="-70" width="90" height="80" rx="8" fill="${WHITE}"/>
    <rect x="120" y="-70" width="90" height="80" rx="8" fill="${WHITE}"/>
  </g>

  <!-- app name -->
  <text
    x="${W / 2}" y="${H * 0.57}"
    text-anchor="middle"
    font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
    font-weight="700" font-size="96" letter-spacing="10"
    fill="${GREEN_DARK}">FARM MANAGER</text>

  <!-- tagline -->
  <text
    x="${W / 2}" y="${H * 0.608}"
    text-anchor="middle"
    font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
    font-weight="400" font-size="48"
    fill="${GREEN_DARK}" opacity="0.55">Your livestock, always in hand</text>
</svg>`;
  await svgToPng(svg, path.join(assetsDir, 'splash-icon.png'));
}

// ---------------------------------------------------------------------------
// 4. Favicon  192×192
// ---------------------------------------------------------------------------
async function makeFavicon() {
  const size = 192;
  const svg  = `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${GREEN_DARK}"/>
  <g transform="translate(${size / 2}, ${size * 0.5}) scale(${size / 380})">
    <rect x="-80" y="-40" width="160" height="100" fill="${WHITE}" rx="4"/>
    <polygon points="-96,-40 0,-120 0,-40" fill="${WHITE}"/>
    <polygon points="96,-40 0,-120 0,-40" fill="${WHITE}"/>
    <rect x="-20" y="18" width="40" height="42" rx="20" fill="${GREEN_DARK}"/>
  </g>
</svg>`;
  await svgToPng(svg, path.join(assetsDir, 'favicon.png'));
}

// ---------------------------------------------------------------------------
// Run all
// ---------------------------------------------------------------------------
(async () => {
  console.log('\nGenerating Farm Mobile branding assets...\n');
  try {
    await makeIcon();
    await makeAdaptiveIcon();
    await makeSplash();
    await makeFavicon();
    console.log('\nAll assets generated successfully.\n');
  } catch (err) {
    console.error('\nAsset generation failed:', err.message);
    process.exit(1);
  }
})();
