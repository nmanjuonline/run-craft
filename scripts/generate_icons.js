import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const SOURCE_IMAGE = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\c7b48d5b-2fe9-4f5f-b8d7-3488b6eb2f14\\runcraft_opt3_viewfinder_stride_1792826475689.jpg';
const PUBLIC_DIR = path.resolve(process.cwd(), 'public');

async function generate() {
  console.log('Reading source image from:', SOURCE_IMAGE);
  const srcBuffer = fs.readFileSync(SOURCE_IMAGE);

  // 1. Master 512x512 PNG
  const icon512Buffer = await sharp(srcBuffer)
    .resize(512, 512, { fit: 'cover' })
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer();

  fs.writeFileSync(path.join(PUBLIC_DIR, 'icon-512.png'), icon512Buffer);
  console.log('✓ Generated public/icon-512.png (512x512)');

  // 2. 192x192 PNG
  const icon192Buffer = await sharp(icon512Buffer)
    .resize(192, 192, { fit: 'cover' })
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer();

  fs.writeFileSync(path.join(PUBLIC_DIR, 'icon-192.png'), icon192Buffer);
  console.log('✓ Generated public/icon-192.png (192x192)');

  // 3. Maskable Icons (safe area 80%, 10% padding around squircle on #0b0f17)
  const maskable512Buffer = await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 11, g: 15, b: 23, alpha: 1 } // #0b0f17
    }
  })
    .composite([
      {
        input: await sharp(icon512Buffer).resize(420, 420).toBuffer(),
        top: 46,
        left: 46
      }
    ])
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer();

  fs.writeFileSync(path.join(PUBLIC_DIR, 'icon-maskable-512.png'), maskable512Buffer);
  console.log('✓ Generated public/icon-maskable-512.png');

  const maskable192Buffer = await sharp(maskable512Buffer)
    .resize(192, 192)
    .png({ quality: 100, compressionLevel: 9 })
    .toBuffer();

  fs.writeFileSync(path.join(PUBLIC_DIR, 'icon-maskable-192.png'), maskable192Buffer);
  console.log('✓ Generated public/icon-maskable-192.png');

  // 4. Stage Variations: Add amber [STAGE] badge across the bottom
  const stageBadgeSvg = `
    <svg width="512" height="512" viewBox="0 0 512 512">
      <defs>
        <filter id="badgeShadow" x="-10%" y="-20%" width="120%" height="150%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000" flood-opacity="0.6"/>
        </filter>
        <linearGradient id="amberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f59e0b"/>
          <stop offset="100%" stop-color="#b45309"/>
        </linearGradient>
      </defs>
      <g filter="url(#badgeShadow)">
        <rect x="106" y="416" width="300" height="64" rx="20" fill="url(#amberGrad)" stroke="#fef3c7" stroke-width="3"/>
        <text x="256" y="460" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="34" font-weight="900" letter-spacing="6" text-anchor="middle">STAGE</text>
      </g>
    </svg>
  `;
  const stageBadgeBuffer = Buffer.from(stageBadgeSvg);

  const icon512StageBuffer = await sharp(icon512Buffer)
    .composite([{ input: stageBadgeBuffer, top: 0, left: 0 }])
    .png({ quality: 100 })
    .toBuffer();

  fs.writeFileSync(path.join(PUBLIC_DIR, 'icon-512-stage.png'), icon512StageBuffer);
  console.log('✓ Generated public/icon-512-stage.png');

  const icon192StageBuffer = await sharp(icon512StageBuffer)
    .resize(192, 192)
    .png({ quality: 100 })
    .toBuffer();

  fs.writeFileSync(path.join(PUBLIC_DIR, 'icon-192-stage.png'), icon192StageBuffer);
  console.log('✓ Generated public/icon-192-stage.png');

  const maskable512StageBuffer = await sharp(maskable512Buffer)
    .composite([{ input: stageBadgeBuffer, top: 0, left: 0 }])
    .png({ quality: 100 })
    .toBuffer();

  fs.writeFileSync(path.join(PUBLIC_DIR, 'icon-maskable-512-stage.png'), maskable512StageBuffer);
  console.log('✓ Generated public/icon-maskable-512-stage.png');

  const maskable192StageBuffer = await sharp(maskable512StageBuffer)
    .resize(192, 192)
    .png({ quality: 100 })
    .toBuffer();

  fs.writeFileSync(path.join(PUBLIC_DIR, 'icon-maskable-192-stage.png'), maskable192StageBuffer);
  console.log('✓ Generated public/icon-maskable-192-stage.png');

  // 5. Generate public/icon.svg with embedded high-resolution icon
  const base64Data = icon512Buffer.toString('base64');
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <clipPath id="squircle">
      <rect width="512" height="512" rx="112" />
    </clipPath>
  </defs>
  <image href="data:image/png;base64,${base64Data}" width="512" height="512" clip-path="url(#squircle)"/>
</svg>
`;

  fs.writeFileSync(path.join(PUBLIC_DIR, 'icon.svg'), svgContent.trim());
  console.log('✓ Generated public/icon.svg');

  console.log('\nAll RunCraft icons successfully updated!');
}

generate().catch(console.error);
