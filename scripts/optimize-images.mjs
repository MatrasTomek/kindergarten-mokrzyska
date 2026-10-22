// Jednorazowa optymalizacja zdjęć strony: oryginały z frontend/src/assets/images/{start,headers}
// → WebP w kilku szerokościach w frontend/public/images-kindergarten/ (wynik commitujemy, build go tylko kopiuje).
//
// sharp nie jest zależnością frontendu (node_modules budowane na Windows). Uruchomienie:
//   npm i --prefix <tmp> sharp@0.34
//   SHARP_PATH=<tmp>/node_modules/sharp/lib/index.js node scripts/optimize-images.mjs
// Sprawdzenie: node --test scripts/optimize-images.test.mjs
import { mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
export const HEADERS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
export const START_WIDTHS = [768, 1280, 1920];
export const HEADER_WIDTHS = [480, 960];

/** Proporcje kadru (szer./wys.) — nagłówek podstrony i baner desktopowy pokazują tylko poziomy wycinek; baner 768 bez kadrowania. */
const ASPECT = { start: { 1280: 2, 1920: 2 }, headers: { 480: 16 / 9, 960: 16 / 9 } };

/** Kadr inny niż środek: 10.jpeg ma cytat zaczynający się u góry. */
const POSITION = { '10': 'north' };

/** Maks. rozmiar pliku dla szerokości (bajty) — brak wpisu = bez limitu, tylko jakość startowa. */
const BUDGETS = {
  start: { 768: 120_000, 1280: 180_000, 1920: 250_000 },
  headers: { 480: 50_000, 960: 100_000 },
};

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'frontend');
const SRC = join(ROOT, 'src', 'assets', 'images');
const OUT = join(ROOT, 'public', 'images-kindergarten');

/** Kolejne próby: jakość 78 → 54, potem lekkie rozmycie (bardzo szczegółowe zdjęcia, np. kora w ogródku). */
const ATTEMPTS = [[78, 0], [72, 0], [66, 0], [60, 0], [54, 0], [54, 0.6], [50, 0.8]];

async function encode(sharp, src, out, width, aspect, position, max) {
  const resize = aspect ? { width, height: Math.round(width / aspect), fit: 'cover', position } : { width, withoutEnlargement: true };
  for (const [quality, blur] of ATTEMPTS) {
    let img = sharp(src).rotate().resize(resize);
    if (blur) img = img.blur(blur);
    await img.webp({ quality, effort: 6, smartSubsample: true }).toFile(out);
    const size = statSync(out).size;
    if (size <= max) return { quality, blur, size };
  }
  throw new Error(`${out}: nie mieści się w ${max} B`);
}

async function main() {
  const sharp = (await import(process.env.SHARP_PATH ? pathToFileURL(process.env.SHARP_PATH).href : 'sharp')).default;
  const jobs = [
    ...SEASONS.map((s) => ['start', `${s}.png`, s, START_WIDTHS]),
    ...HEADERS.map((h) => ['headers', `${h}.jpeg`, h, HEADER_WIDTHS]),
  ];
  for (const [dir, file, name, widths] of jobs) {
    mkdirSync(join(OUT, dir), { recursive: true });
    for (const w of widths) {
      const out = join(OUT, dir, `${name}-${w}.webp`);
      const { quality, blur, size } = await encode(sharp, join(SRC, dir, file), out, w, ASPECT[dir][w], POSITION[name] ?? 'centre', BUDGETS[dir][w]);
      console.log(`${dir}/${name}-${w}.webp  q${quality}${blur ? ` blur ${blur}` : ''}  ${Math.round(size / 1024)} kB`);
    }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
