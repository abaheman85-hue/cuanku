/**
 * Menyiapkan lima aset ekspresi maskot CuanKu dari PNG 4K buatan lokal.
 *
 * Pakai:
 *   node scripts/prepare-mascot-expressions.mjs [folder-sumber]
 *
 * Default folder sumber: C:/Users/USER/Downloads
 * File yang dibutuhkan: koin_angry_4k.png, koin_cheering_4k.png,
 * koin_happy_4k.png, koin_sleepy_4k.png, koin_worried_4k.png
 *
 * Kelima gambar dipotong dengan bingkai yang sama supaya ukuran dan posisi
 * karakter konsisten antar ekspresi, lalu dikompres untuk web/PWA.
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceDir = process.argv[2] ?? 'C:/Users/USER/Downloads';
const outputDir = join(root, 'src', 'assets');

const MOODS = ['angry', 'cheering', 'happy', 'sleepy', 'worried'];
const CROP = { left: 176, top: 568, width: 3744, height: 2960 };
const WIDTH = 720;

await mkdir(outputDir, { recursive: true });

for (const mood of MOODS) {
  const input = join(sourceDir, `koin_${mood}_4k.png`);
  const output = join(outputDir, `mascot-${mood}.png`);
  const { width, height } = await sharp(input)
    .extract(CROP)
    .resize({ width: WIDTH, fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9 })
    .toFile(output);
  console.log(`${mood}: ${width}x${height} -> ${output}`);
}
