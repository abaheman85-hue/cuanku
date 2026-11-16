const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.82;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Gambar tidak bisa dibuka. Coba file lain.'));
    };
    image.src = url;
  });
}

/**
 * Mengompres foto wishlist menjadi data URL JPEG agar aman disimpan di
 * IndexedDB dan tetap ikut dalam satu file backup JSON.
 */
export async function compressImageFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('File yang dipilih bukan gambar.');
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('Ukuran gambar maksimal 25 MB.');
  }

  const image = await loadImage(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Browser tidak mendukung pengolahan gambar.');

  context.fillStyle = '#FFFDF6';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
}

export function isValidDataImage(value: string | null | undefined): boolean {
  return typeof value === 'string' && /^data:image\/[a-z0-9.+-]+;base64,/i.test(value);
}
