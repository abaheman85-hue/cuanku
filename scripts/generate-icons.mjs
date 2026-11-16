import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = dirname(fileURLToPath(import.meta.url));
const publicDir = join(root, '..', 'public');
const iconsDir = join(publicDir, 'icons');

await mkdir(iconsDir, { recursive: true });

const targets = [
  { source: 'icon.svg', file: 'icon-192.png', size: 192 },
  { source: 'icon.svg', file: 'icon-512.png', size: 512 },
  { source: 'icon-maskable.svg', file: 'icon-maskable-512.png', size: 512 },
  { source: 'icon.svg', file: 'apple-touch-icon.png', size: 180 },
];

for (const target of targets) {
  await sharp(join(publicDir, target.source))
    .resize(target.size, target.size)
    .png({ compressionLevel: 9 })
    .toFile(join(iconsDir, target.file));
  console.log(`dibuat public/icons/${target.file} (${target.size}x${target.size})`);
}

console.log('Selesai membuat ikon PWA.');
