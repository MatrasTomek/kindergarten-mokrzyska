import { DecorItem, DecorZone, placeDecor } from './decor-placement';

/** Deterministyczny generator (LCG), żeby testy były powtarzalne. */
function seeded(seed = 42): () => number {
  let s = seed;
  return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
}

const GAP = 16;
const inside = (i: DecorItem, z: DecorZone) => i.x >= z.x && i.y >= z.y && i.x + i.size <= z.x + z.w && i.y + i.size <= z.y + z.h;
const overlaps = (a: DecorItem, b: DecorItem) =>
  a.x < b.x + b.size + GAP && b.x < a.x + a.size + GAP && a.y < b.y + b.size + GAP && b.y < a.y + a.size + GAP;
const images = ['a.svg', 'b.svg', 'c.svg', 'd.svg', 'e.svg'];
const opts = (count: number, random = seeded()) => ({ count, minSize: 48, maxSize: 72, random });

describe('placeDecor', () => {
  it('places requested count inside zones without overlapping', () => {
    const zones = [{ x: 0, y: 0, w: 200, h: 2000 }, { x: 1000, y: 0, w: 200, h: 2000 }];
    const items = placeDecor(images, zones, opts(5));
    expect(items.length).toBe(5);
    for (const i of items) {
      expect(zones.some((z) => inside(i, z))).toBe(true);
      expect(i.size).toBeGreaterThanOrEqual(48);
      expect(i.size).toBeLessThanOrEqual(72);
    }
    for (let a = 0; a < items.length; a++) for (let b = a + 1; b < items.length; b++) expect(overlaps(items[a], items[b])).toBe(false);
  });

  it('returns fewer when zones are too small', () => {
    expect(placeDecor(images, [{ x: 0, y: 0, w: 80, h: 80 }], opts(5)).length).toBe(1);
  });

  it('returns nothing when no zone fits even the smallest size', () => {
    expect(placeDecor(images, [{ x: 0, y: 0, w: 40, h: 400 }], opts(3))).toEqual([]);
  });

  it('returns empty for no zones or no images', () => {
    expect(placeDecor(images, [], opts(3))).toEqual([]);
    expect(placeDecor([], [{ x: 0, y: 0, w: 500, h: 500 }], opts(3))).toEqual([]);
  });

  it('never repeats the same image twice in a row when count exceeds images', () => {
    for (let seed = 1; seed < 20; seed++) {
      const items = placeDecor(['a.svg', 'b.svg'], [{ x: 0, y: 0, w: 400, h: 4000 }], opts(5, seeded(seed)));
      expect(items.length).toBe(5);
      for (let k = 1; k < items.length; k++) expect(items[k].src).not.toBe(items[k - 1].src);
    }
  });

  it('uses distinct images while the set lasts', () => {
    const items = placeDecor(images, [{ x: 0, y: 0, w: 400, h: 4000 }], opts(5));
    expect(new Set(items.map((i) => i.src)).size).toBe(5);
  });

  it('keeps a margin for rotation so a tilted image never pokes out of its zone', () => {
    const zone = { x: 100, y: 0, w: 120, h: 4000 };
    for (let seed = 1; seed < 10; seed++) {
      for (const i of placeDecor(images, [zone], opts(5, seeded(seed)))) {
        const pad = Math.ceil(i.size * 0.12);
        expect(i.x).toBeGreaterThanOrEqual(zone.x + pad);
        expect(i.x + i.size).toBeLessThanOrEqual(zone.x + zone.w - pad);
      }
    }
  });

  it('shrinks images to fit zones narrower than maxSize instead of skipping them', () => {
    const zones = [{ x: 0, y: 0, w: 72, h: 3000 }, { x: 1300, y: 0, w: 72, h: 3000 }];
    const items = placeDecor(images, zones, { count: 5, minSize: 56, maxSize: 88, random: seeded() });
    expect(items.length).toBe(5);
    for (const i of items) expect(i.size).toBeGreaterThanOrEqual(56);
  });

  it('keeps rotation and delay within bounds', () => {
    const items = placeDecor(images, [{ x: 0, y: 0, w: 400, h: 4000 }], opts(5));
    for (const i of items) {
      expect(Math.abs(i.rotate)).toBeLessThanOrEqual(12);
      expect(i.delay).toBeGreaterThanOrEqual(0);
      expect(i.delay).toBeLessThan(3);
    }
  });
});
