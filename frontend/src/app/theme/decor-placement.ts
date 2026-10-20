/** Wolny obszar strony (px względem dokumentu), w którym wolno postawić ilustrację. */
export interface DecorZone { x: number; y: number; w: number; h: number }
/** Postawiona ilustracja: lewy górny róg, bok kwadratu (px), obrót (°) i opóźnienie animacji (s). */
export interface DecorItem { src: string; x: number; y: number; size: number; rotate: number; delay: number }

const GAP = 16;
const TRIES = 20;
const MAX_ROTATE = 12;
const MAX_DELAY = 3;
/** Obrót do ±15° (12° + 3° kołysania) wysuwa róg kwadratu o ~12% boku — tyle zapasu zostawiamy przy brzegu strefy. */
const ROTATE_PAD = 0.12;
const pad = (size: number) => Math.ceil(size * ROTATE_PAD);

/**
 * Losowo rozstawia do `count` ilustracji w strefach tak, by się nie nakładały (z odstępem GAP).
 * Gdy brakuje miejsca, zwraca mniej — zasada „nigdy na treści” ma pierwszeństwo przed liczbą.
 */
export function placeDecor(
  images: readonly string[],
  zones: readonly DecorZone[],
  opts: { count: number; minSize: number; maxSize: number; random: () => number },
): DecorItem[] {
  const { count, minSize, maxSize, random } = opts;
  const between = (lo: number, hi: number) => lo + random() * (hi - lo);
  const items: DecorItem[] = [];
  if (images.length === 0) return items;
  let deck: string[] = [];

  const nextImage = (): string => {
    if (deck.length === 0) {
      deck = shuffle([...images], random);
      const last = items.at(-1)?.src;
      if (deck.length > 1 && deck[0] === last) [deck[0], deck[1]] = [deck[1], deck[0]];
    }
    return deck.shift()!;
  };

  // Wąskie strefy (np. laptop 1280 px) zmniejszają górną granicę rozmiaru zamiast gubić ilustracje.
  const widest = Math.max(0, ...zones.map((z) => Math.min(z.w, z.h)));
  const top = Math.min(maxSize, Math.floor(widest / (1 + 2 * ROTATE_PAD)));
  if (top < minSize) return items;

  for (let n = 0; n < count; n++) {
    const size = Math.round(between(minSize, top));
    const p = pad(size);
    const fitting = zones.filter((z) => z.w >= size + 2 * p && z.h >= size + 2 * p);
    for (let t = 0; t < TRIES && fitting.length > 0; t++) {
      const z = fitting[Math.floor(random() * fitting.length)];
      const x = Math.round(between(z.x + p, z.x + z.w - size - p));
      const y = Math.round(between(z.y + p, z.y + z.h - size - p));
      const clash = items.some((o) => x < o.x + o.size + GAP && o.x < x + size + GAP && y < o.y + o.size + GAP && o.y < y + size + GAP);
      if (clash) continue;
      items.push({ src: nextImage(), x, y, size, rotate: Math.round(between(-MAX_ROTATE, MAX_ROTATE)), delay: Math.floor(between(0, MAX_DELAY * 10)) / 10 });
      break;
    }
  }
  return items;
}

function shuffle<T>(a: T[], random: () => number): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
