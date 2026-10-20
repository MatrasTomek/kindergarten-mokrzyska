import { InjectionToken } from '@angular/core';
import { DecorZone } from './decor-placement';

/** Margines musi mieć co najmniej tyle px, żeby uznać ekran za szeroki (ilustracje po bokach kolumny). */
const MIN_GUTTER = 96;
const GAP = 16;
const EDGE = 8;
/** Bok wolnego kwadratu na wąskim ekranie (największa ilustracja ma 52 px). */
const CORNER = 52;
const STEP = 8;
/** Jak wysoki pas tuż nad stopką przeszukujemy na wąskim ekranie. */
const ABOVE_FOOTER = 160;

interface Box { left: number; top: number; right: number; bottom: number }

/**
 * Wolne miejsca na ilustracje, w px względem `root` (układ publiczny), liczone z rzeczywistego DOM.
 * Szeroko: marginesy obok kolumny `.site-header`, bez pasów zajętych przez elementy `main` szersze od kolumny
 * i coś rysujących (baner, nagłówek podstrony ze zdjęciem). Wąsko: wolne kwadraty w nagłówku, w stopce i nad stopką.
 */
export function computeZones(root: HTMLElement): { zones: DecorZone[]; wide: boolean } {
  const origin = root.getBoundingClientRect();
  const box = (el: Element | null): Box | null => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { left: r.left - origin.left, top: r.top - origin.top, right: r.right - origin.left, bottom: r.bottom - origin.top };
  };
  const header = box(root.querySelector('.site-header'));
  const footer = box(root.querySelector('footer'));
  if (!header || !footer) return { zones: [], wide: false };
  const width = root.clientWidth;
  const wide = header.left >= MIN_GUTTER && width - header.right >= MIN_GUTTER;

  if (wide) {
    const blocked = Array.from(root.querySelectorAll('main *'))
      .filter(paints)
      .map(box)
      .filter((b): b is Box => !!b && b.bottom > b.top && (b.left < header.left - 1 || b.right > header.right + 1));
    const top = header.bottom;
    const bottom = footer.top - GAP;
    const columns = [
      { x: EDGE, w: header.left - GAP - EDGE },
      { x: header.right + GAP, w: width - EDGE - header.right - GAP },
    ];
    return { wide, zones: columns.flatMap((c) => freeBands(top, bottom, blocked).map(([y, h]) => ({ x: c.x, y, w: c.w, h }))) };
  }

  // Wąsko: wolne kwadraty (siatka co STEP px) w nagłówku, w stopce i w pasie tuż nad stopką.
  const taken = Array.from(root.querySelectorAll('.site-header *, main *, footer *'))
    .filter(paints)
    .map(box)
    .filter((b): b is Box => !!b && b.right > b.left && b.bottom > b.top);
  const areas: Box[] = [header, { left: 0, top: footer.top - ABOVE_FOOTER, right: width, bottom: footer.top }, footer];
  const zones: DecorZone[] = [];
  for (const a of areas) {
    for (let y = a.top + EDGE; y + CORNER <= a.bottom - EDGE; y += STEP) {
      for (let x = Math.max(a.left, 0) + EDGE; x + CORNER <= Math.min(a.right, width) - EDGE; x += STEP) {
        const sq = { left: x - GAP / 2, top: y - GAP / 2, right: x + CORNER + GAP / 2, bottom: y + CORNER + GAP / 2 };
        if (!taken.some((t) => intersects(sq, t))) zones.push({ x, y, w: CORNER, h: CORNER });
      }
    }
  }
  return { wide, zones };
}

/** Pasy [y, wysokość] między `top` i `bottom`, które nie przecinają żadnego z `blocked` (z odstępem). */
function freeBands(top: number, bottom: number, blocked: Box[]): [number, number][] {
  const spans = blocked.map((b) => [b.top - GAP, b.bottom + GAP] as const).sort((a, b) => a[0] - b[0]);
  const bands: [number, number][] = [];
  let y = top;
  for (const [from, to] of spans) {
    if (from > y) bands.push([y, Math.min(from, bottom) - y]);
    y = Math.max(y, to);
    if (y >= bottom) break;
  }
  if (y < bottom) bands.push([y, bottom - y]);
  return bands.filter(([, h]) => h > 0);
}

const MEDIA = new Set(['IMG', 'PICTURE', 'VIDEO', 'SVG', 'CANVAS', 'IFRAME']);

/** Czy element sam coś rysuje (tło, obrazek, ramka, tekst)? Puste kontenery tras na całą szerokość nie blokują marginesów. */
function paints(el: Element): boolean {
  if (MEDIA.has(el.tagName.toUpperCase())) return true;
  const s = getComputedStyle(el);
  if (s.visibility === 'hidden') return false;
  if (s.backgroundImage !== 'none' || !transparent(s.backgroundColor)) return true;
  if (parseFloat(s.borderTopWidth) > 0 || parseFloat(s.borderBottomWidth) > 0) return true;
  return Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && !!n.textContent?.trim());
}

function transparent(color: string): boolean {
  return color === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(color);
}

function intersects(a: Box, b: Box): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

export const DECOR_ZONES = new InjectionToken<typeof computeZones>('DECOR_ZONES', { providedIn: 'root', factory: () => computeZones });
export const DECOR_RANDOM = new InjectionToken<() => number>('DECOR_RANDOM', { providedIn: 'root', factory: () => Math.random });
