/**
 * Membuat ikon PWA dari maskot koin (src/assets/mascot-coin.png) di atas
 * latar kuning butter. Jalankan: npm run icons
 */
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = dirname(fileURLToPath(import.meta.url));
const publicDir = join(root, '..', 'public');
const iconsDir = join(publicDir, 'icons');
const mascot = join(root, '..', 'src', 'assets', 'mascot-coin.png');

/** Sama dengan THEME.background di src/lib/theme.ts. */
const BACKGROUND = '#FFE76A';

await mkdir(iconsDir, { recursive: true });

const targets = [
  { file: 'favicon.png', size: 64, fill: 0.82 },
  { file: 'icons/apple-touch-icon.png', size: 180, fill: 0.76 },
  { file: 'icons/icon-192.png', size: 192, fill: 0.78 },
  { file: 'icons/icon-512.png', size: 512, fill: 0.78 },
  { file: 'icons/icon-maskable-512.png', size: 512, fill: 0.56 },
];

for (const target of targets) {
  const content = Math.round(target.size * target.fill);
  const layer = await sharp(mascot)
    .resize(content, content, { fit: 'inside' })
    .png()
    .toBuffer();

  const output = join(publicDir, target.file);
  await sharp({
    create: {
      width: target.size,
      height: target.size,
      channels: 4,
      background: BACKGROUND,
    },
  })
    .composite([{ input: layer, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(output);
  console.log(`dibuat public/${target.file} (${target.size}x${target.size})`);
}

console.log('Selesai membuat ikon PWA.');
