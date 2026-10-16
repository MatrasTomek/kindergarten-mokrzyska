export const MAX_SIDE = 1920;
export const THUMB_SIDE = 400;
export const QUALITY = 0.8;

export class UnsupportedImageError extends Error {
  constructor() {
    super('Nieobsługiwany format zdjęcia (np. HEIC). Ustaw w telefonie zapis zdjęć jako JPG lub wybierz inne zdjęcie.');
  }
}

export function targetSize(w: number, h: number, max: number): { w: number; h: number } {
  const scale = Math.min(1, max / Math.max(w, h));
  return { w: Math.round(w * scale), h: Math.round(h * scale) };
}

/** Safari nie koduje WebP z canvasa i po cichu zwraca PNG — wtedy kodujemy JPEG. */
export async function encodeWithFallback(encode: (type: string, quality: number) => Promise<Blob>, quality: number): Promise<Blob> {
  const webp = await encode('image/webp', quality);
  return webp.type === 'image/webp' ? webp : encode('image/jpeg', quality);
}

type AnyCanvas = OffscreenCanvas | HTMLCanvasElement;

function makeCanvas(w: number, h: number): AnyCanvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function encoder(canvas: AnyCanvas) {
  return (type: string, quality: number): Promise<Blob> =>
    'convertToBlob' in canvas
      ? canvas.convertToBlob({ type, quality })
      : new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), type, quality));
}

async function render(bitmap: ImageBitmap, max: number): Promise<Blob> {
  const size = targetSize(bitmap.width, bitmap.height, max);
  const canvas = makeCanvas(size.w, size.h);
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  ctx.imageSmoothingQuality = 'high';
  // Białe tło: przy awaryjnym JPEG przezroczystość nie może zamienić się w czerń.
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, size.w, size.h);
  ctx.drawImage(bitmap, 0, 0, size.w, size.h);
  return encodeWithFallback(encoder(canvas), QUALITY);
}

/** Przerysowanie na canvas usuwa EXIF (w tym GPS). Orientacja z EXIF jest uwzględniana przez createImageBitmap. */
export async function resizeImage(file: Blob): Promise<{ image: Blob; thumb: Blob }> {
  let bitmap: ImageBitmap;
  try {
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch (e) {
      // Przeglądarka nie zna opcji (TypeError) — 'from-image' i tak jest domyślne.
      if (!(e instanceof TypeError)) throw e;
      bitmap = await createImageBitmap(file);
    }
  } catch {
    throw new UnsupportedImageError();
  }
  try {
    return { image: await render(bitmap, MAX_SIDE), thumb: await render(bitmap, THUMB_SIDE) };
  } finally {
    bitmap.close();
  }
}
