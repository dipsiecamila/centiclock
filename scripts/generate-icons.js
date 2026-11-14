import fs from 'fs';
import path from 'path';
import { Resvg } from '@resvg/resvg-js';

const SOURCE_IMAGE_PATH = path.resolve('public/assets/aistudio/image_611de102.png');

if (!fs.existsSync(SOURCE_IMAGE_PATH)) {
  console.error(`❌ Source icon image not found at: ${SOURCE_IMAGE_PATH}`);
  process.exit(1);
}

const sourceBase64 = fs.readFileSync(SOURCE_IMAGE_PATH).toString('base64');
const dataUri = `data:image/png;base64,${sourceBase64}`;

function buildIconSvg(mode = 'standard') {
  const size = 512;
  // Adaptive foregrounds need ~0.68 scale inside 108dp canvas so launchers never clip the green outer ring
  // Maskable icons need ~0.78 scale so safe-zone circle keeps all outer tick numbers intact
  const scale = mode === 'foreground' ? 0.68 : mode === 'maskable' ? 0.78 : 1.0;
  const imgSize = size * scale;
  const offset = (size - imgSize) / 2;

  if (mode === 'round') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <defs>
    <clipPath id="roundClip">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" />
    </clipPath>
  </defs>
  <rect width="${size}" height="${size}" rx="${size / 2}" fill="#070a11" />
  <image href="${dataUri}" x="0" y="0" width="${size}" height="${size}" preserveAspectRatio="xMidYMid slice" clip-path="url(#roundClip)" />
</svg>`;
  }

  if (mode === 'foreground') {
    const r = imgSize * 0.485;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <defs>
    <clipPath id="fgCircleClip">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" />
    </clipPath>
  </defs>
  <image href="${dataUri}" x="${offset}" y="${offset}" width="${imgSize}" height="${imgSize}" preserveAspectRatio="xMidYMid slice" clip-path="url(#fgCircleClip)" />
</svg>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="#070a11" />
  <image href="${dataUri}" x="${offset}" y="${offset}" width="${imgSize}" height="${imgSize}" preserveAspectRatio="xMidYMid slice" />
</svg>`;
}

function buildNotificationSmallIconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">
  <circle cx="48" cy="48" r="40" fill="none" stroke="#ffffff" stroke-width="7" />
  <circle cx="48" cy="48" r="30" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-opacity="0.7" />
  <line x1="48" y1="48" x2="31" y2="44" stroke="#ffffff" stroke-width="6" stroke-linecap="round" />
  <line x1="48" y1="48" x2="73" y2="42" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" />
  <circle cx="48" cy="48" r="5" fill="#ffffff" />
</svg>`;
}

async function renderPng(svgString, targetWidth) {
  const resvg = new Resvg(svgString, {
    fitTo: {
      mode: 'width',
      value: targetWidth,
    },
  });
  const pngData = resvg.render();
  return pngData.asPng();
}

async function run() {
  const standardSvg = buildIconSvg('standard');
  const maskableSvg = buildIconSvg('maskable');
  const roundSvg = buildIconSvg('round');
  const foregroundSvg = buildIconSvg('foreground');

  // 1. Save standard icon.svg (wraps the exact user icon image)
  fs.writeFileSync('public/icon.svg', standardSvg);
  console.log('✓ public/icon.svg updated from image_611de102.png');

  // 2. Render PWA & Web icons
  fs.writeFileSync('public/pwa-192x192.png', await renderPng(standardSvg, 192));
  fs.writeFileSync('public/pwa-512x512.png', await renderPng(standardSvg, 512));
  fs.writeFileSync('public/pwa-maskable-512x512.png', await renderPng(maskableSvg, 512));
  fs.writeFileSync('public/apple-touch-icon.png', await renderPng(standardSvg, 180));
  fs.writeFileSync('public/favicon.ico', await renderPng(standardSvg, 48));
  console.log('✓ Web/PWA PNGs updated from image_611de102.png');

  // 3. Android Mipmap icons: regular, round, and adaptive foreground
  const mipmaps = [
    { dir: 'android/app/src/main/res/mipmap-mdpi', size: 48, fgSize: 108 },
    { dir: 'android/app/src/main/res/mipmap-hdpi', size: 72, fgSize: 162 },
    { dir: 'android/app/src/main/res/mipmap-xhdpi', size: 96, fgSize: 216 },
    { dir: 'android/app/src/main/res/mipmap-xxhdpi', size: 144, fgSize: 324 },
    { dir: 'android/app/src/main/res/mipmap-xxxhdpi', size: 192, fgSize: 432 },
  ];

  for (const m of mipmaps) {
    if (fs.existsSync(m.dir)) {
      fs.writeFileSync(path.join(m.dir, 'ic_launcher.png'), await renderPng(standardSvg, m.size));
      fs.writeFileSync(path.join(m.dir, 'ic_launcher_round.png'), await renderPng(roundSvg, m.size));
      fs.writeFileSync(path.join(m.dir, 'ic_launcher_foreground.png'), await renderPng(foregroundSvg, m.fgSize));
      console.log(`✓ Android ${m.dir} (launcher: ${m.size}px, fg: ${m.fgSize}px) updated`);
    }
  }

  // 4. Android notification monochrome icon in drawable
  const drawableDir = 'android/app/src/main/res/drawable';
  if (fs.existsSync(drawableDir)) {
    fs.writeFileSync(
      path.join(drawableDir, 'ic_stat_alarm.png'),
      await renderPng(buildNotificationSmallIconSvg(), 96)
    );
    console.log('✓ Android drawable/ic_stat_alarm.png generated');
  }

  console.log('🎉 ALL ICONS UPDATED FROM USER IMAGE public/assets/aistudio/image_611de102.png!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
