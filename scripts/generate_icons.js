import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Deep Obsidian High-Tech Base Gradient -->
    <linearGradient id="rc-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0e1524"/>
      <stop offset="45%" stop-color="#080c14"/>
      <stop offset="100%" stop-color="#030509"/>
    </linearGradient>

    <!-- Hyper Lime to Electric Cyan Primary Track Gradient -->
    <linearGradient id="rc-track" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#d4ff00"/>
      <stop offset="40%" stop-color="#70ff60"/>
      <stop offset="85%" stop-color="#00f0ff"/>
      <stop offset="100%" stop-color="#00c8ff"/>
    </linearGradient>

    <!-- Sprint Thrust Kick Gradient -->
    <linearGradient id="rc-kick" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00f0ff"/>
      <stop offset="55%" stop-color="#0088ff"/>
      <stop offset="100%" stop-color="#6a00ff"/>
    </linearGradient>

    <!-- Cardiac / GPS Elevation Pulse Line Gradient -->
    <linearGradient id="rc-pulse" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ff2a6d"/>
      <stop offset="35%" stop-color="#ff7700"/>
      <stop offset="70%" stop-color="#c8ff00"/>
      <stop offset="100%" stop-color="#00f0ff"/>
    </linearGradient>

    <!-- Specular Hairline Rim Gradient -->
    <linearGradient id="rc-rim" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.32"/>
      <stop offset="30%" stop-color="#ffffff" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.01"/>
    </linearGradient>

    <!-- Multi-stage Neon Aura Filter -->
    <filter id="rc-glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur1" />
      <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur2" />
      <feMerge>
        <feMergeNode in="blur1"/>
        <feMergeNode in="blur2"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <filter id="rc-glow-subtle" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- 1. Master Squircle Background -->
  <rect width="512" height="512" rx="120" fill="url(#rc-bg)"/>
  
  <!-- 2. Frosted Bevel Rim -->
  <rect x="12" y="12" width="488" height="488" rx="108" fill="none" stroke="url(#rc-rim)" stroke-width="2.5"/>

  <!-- 3. Dynamic Atmospheric Core Glow -->
  <circle cx="280" cy="220" r="160" fill="#00f0ff" opacity="0.08"/>
  <circle cx="180" cy="280" r="140" fill="#c8ff00" opacity="0.08"/>

  <!-- 4. Subtle Precision Speed Ticks -->
  <g opacity="0.3">
    <line x1="56" y1="230" x2="88" y2="230" stroke="#c8ff00" stroke-width="3" stroke-linecap="round"/>
    <line x1="48" y1="256" x2="96" y2="256" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="56" y1="282" x2="84" y2="282" stroke="#00f0ff" stroke-width="3" stroke-linecap="round"/>
  </g>

  <!-- 5. THE RUNCRAFT "R" EMBLEM -->
  <!-- Left Cadence Pillar (Spine) -->
  <path d="M 139 133 L 139 379" 
        stroke="url(#rc-track)" stroke-width="66" stroke-linecap="round" filter="url(#rc-glow)"/>

  <!-- Upper Aerodynamic GPS Route Loop -->
  <path d="M 142 133 H 284 C 344 133 374 165 374 200 C 374 235 344 267 284 267 H 142" 
        fill="none" stroke="url(#rc-track)" stroke-width="66" stroke-linecap="round" stroke-linejoin="round" filter="url(#rc-glow)"/>

  <!-- Lower Sprint Blade (Forward Kick Leg) -->
  <path d="M 256 267 L 368 379" 
        stroke="url(#rc-kick)" stroke-width="66" stroke-linecap="round" filter="url(#rc-glow)"/>

  <!-- 6. Interwoven GPS Telemetry & Cardiac Elevation Waveform -->
  <path d="M 139 320 L 186 320 L 214 336 L 242 175 L 268 350 L 294 275 L 368 275" 
        fill="none" stroke="url(#rc-pulse)" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity="0.95" filter="url(#rc-glow-subtle)"/>

  <!-- 7. Waypoint GPS Telemetry Beacons -->
  <!-- Upper Loop Apex Beacon -->
  <circle cx="374" cy="200" r="17" fill="#00f0ff" filter="url(#rc-glow)"/>
  <circle cx="374" cy="200" r="7.5" fill="#ffffff"/>

  <!-- Bottom Sprint Anchor Pin -->
  <circle cx="368" cy="379" r="14" fill="#0088ff" filter="url(#rc-glow-subtle)"/>
  <circle cx="368" cy="379" r="6" fill="#ffffff"/>

  <!-- Start Waypoint Beacon (Spine Base) -->
  <circle cx="139" cy="379" r="15" fill="#c8ff00" filter="url(#rc-glow-subtle)"/>
  <circle cx="139" cy="379" r="6.5" fill="#090e17"/>
</svg>
`;

async function generate() {
  const publicDir = path.resolve(process.cwd(), 'public');
  const svgPath = path.join(publicDir, 'icon.svg');
  
  // Write icon.svg
  fs.writeFileSync(svgPath, svgContent.trim());
  console.log('✓ Wrote updated public/icon.svg');

  const svgBuffer = Buffer.from(svgContent);

  // Generate 512x512 PNG
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon-512.png'));
  console.log('✓ Generated public/icon-512.png');

  // Generate 192x192 PNG
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'icon-192.png'));
  console.log('✓ Generated public/icon-192.png');

  // Generate stage PNGs
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon-512-stage.png'));
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'icon-192-stage.png'));
  console.log('✓ Generated stage PNG icons');

  // Generate maskable icons with 12% padding
  const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
    <rect width="600" height="600" fill="#080c14"/>
    <g transform="translate(44, 44)">
      ${svgContent.replace('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">', '').replace('</svg>', '')}
    </g>
  </svg>`;
  
  const maskBuffer = Buffer.from(maskableSvg);

  await sharp(maskBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon-maskable-512.png'));
  await sharp(maskBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'icon-maskable-192.png'));
  await sharp(maskBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon-maskable-512-stage.png'));
  await sharp(maskBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'icon-maskable-192-stage.png'));
  console.log('✓ Generated maskable PNG icons');
}

generate().catch(console.error);
