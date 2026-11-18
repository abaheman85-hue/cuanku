/**
 * Menyiapkan maskot CuanKu dari file sumber (JPEG/PNG) menjadi PNG transparan.
 *
 * Pakai:
 *   node scripts/prepare-mascot.mjs "C:/path/ke/maskot.jpeg"
 *
 * Latar polos dihapus dengan flood fill dari tepi gambar, sehingga bagian
 * terang di dalam karakter tidak ikut hilang. Hasil: src/assets/mascot-coin.png
 */
import sharp from 'sharp';
import { mkdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source =
  process.argv[2] ??
  'C:/Users/USER/OneDrive/Documents/Semua projek Dicky/koin maskot.jpeg';
const output = join(root, 'src', 'assets', 'mascot-coin.png');

const TOLERANCE = 52;
const SOFT = 26;

await stat(source);
await mkdir(dirname(output), { recursive: true });

const { data, info } = await sharp(source)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height, channels } = info;
if (channels !== 4) throw new Error('Format piksel tak terduga.');

const at = (x, y) => (y * width + x) * channels;
const distance = (i, bg) => {
  const dr = data[i] - bg[0];
  const dg = data[i + 1] - bg[1];
  const db = data[i + 2] - bg[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
};

// Warna latar: rata-rata piksel tepi.
const edge = [];
for (let x = 0; x < width; x += 1) {
  edge.push(at(x, 0), at(x, height - 1));
}
for (let y = 0; y < height; y += 1) {
  edge.push(at(0, y), at(width - 1, y));
}
const bg = [0, 1, 2].map((channel) =>
  Math.round(edge.reduce((total, i) => total + data[i + channel], 0) / edge.length),
);
console.log('warna latar:', bg.join(','));

// Flood fill dari seluruh tepi yang warnanya mirip latar.
const mask = new Uint8Array(width * height);
const queue = [];
const push = (x, y) => {
  const index = y * width + x;
  if (mask[index]) return;
  if (distance(at(x, y), bg) > TOLERANCE) return;
  mask[index] = 1;
  queue.push(index);
};
for (let x = 0; x < width; x += 1) {
  push(x, 0);
  push(x, height - 1);
}
for (let y = 0; y < height; y += 1) {
  push(0, y);
  push(width - 1, y);
}
for (let head = 0; head < queue.length; head += 1) {
  const index = queue[head];
  const x = index % width;
  const y = (index - x) / width;
  if (x > 0) push(x - 1, y);
  if (x < width - 1) push(x + 1, y);
  if (y > 0) push(x, y - 1);
  if (y < height - 1) push(x, y + 1);
}

// Alpha: 0 untuk latar, transisi halus di tepi, 255 untuk karakter.
const alpha = new Float32Array(width * height);
for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const index = y * width + x;
    if (mask[index]) continue;
    let nearEdge = false;
    for (let dy = -1; dy <= 1 && !nearEdge; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        if (mask[ny * width + nx]) {
          nearEdge = true;
          break;
        }
      }
    }
    const d = distance(at(x, y), bg);
    alpha[index] = nearEdge
      ? Math.min(1, Math.max(0, (d - SOFT) / (TOLERANCE - SOFT)))
      : 1;
  }
}

// Blur alpha 1px supaya tepi tidak bergerigi.
const blurred = new Float32Array(alpha);
const radius = 1;
for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    let total = 0;
    let count = 0;
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        total += alpha[ny * width + nx];
        count += 1;
      }
    }
    blurred[y * width + x] = total / count;
  }
}

// Kotak batas karakter.
let minX = width;
let minY = height;
let maxX = -1;
let maxY = -1;
for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    if (blurred[y * width + x] < 0.08) continue;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
}

const pad = 2;
minX = Math.max(0, minX - pad);
minY = Math.max(0, minY - pad);
maxX = Math.min(width - 1, maxX + pad);
maxY = Math.min(height - 1, maxY + pad);
const cropWidth = maxX - minX + 1;
const cropHeight = maxY - minY + 1;

const out = Buffer.alloc(cropWidth * cropHeight * 4);
for (let y = 0; y < cropHeight; y += 1) {
  for (let x = 0; x < cropWidth; x += 1) {
    const src = at(minX + x, minY + y);
    const dst = (y * cropWidth + x) * 4;
    out[dst] = data[src];
    out[dst + 1] = data[src + 1];
    out[dst + 2] = data[src + 2];
    out[dst + 3] = Math.round(blurred[(minY + y) * width + (minX + x)] * 255);
  }
}

const image = sharp(out, {
  raw: { width: cropWidth, height: cropHeight, channels: 4 },
});
const limit = 900;
const resized =
  cropWidth > limit
    ? await image.resize({ width: limit, fit: 'inside' }).png({ compressionLevel: 9 }).toBuffer()
    : await image.png({ compressionLevel: 9 }).toBuffer();

await sharp(resized).toFile(output);

const removed = [...mask].filter(Boolean).length / (width * height);
console.log(`latar dihapus: ${(removed * 100).toFixed(1)}%`);
console.log(`hasil: ${Math.min(cropWidth, limit)}x${Math.round(cropHeight * Math.min(1, limit / cropWidth))} -> src/assets/mascot-coin.png`);
