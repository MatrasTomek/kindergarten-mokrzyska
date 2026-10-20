import { TILES } from '../public/home/tiles';
import { contrastRatio } from '../theme/contrast';
import { groupColor, postSection, SECTIONS, SectionKey } from './sections';

describe('SECTIONS', () => {
  it('every section colour has ≥ 4.5:1 contrast with white', () => {
    for (const s of Object.values(SECTIONS)) {
      expect(contrastRatio(s.color, '#ffffff'), s.key).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('tile colours are pairwise distinct', () => {
    expect(new Set(TILES.map((t) => t.color)).size).toBe(10);
  });

  it('photos match the agreed mapping', () => {
    const photos = Object.fromEntries(Object.values(SECTIONS).map((s) => [s.key, s.photo]));
    expect(photos).toEqual({
      aktualnosci: '3', 'z-zycia-przedszkola': '12', grupy: '6', 'dla-rodzicow': '11', specjalisci: '8', dokumenty: '5',
      rekrutacja: '2', kontakt: '9', 'o-nas': '10', rodo: '7', 'deklaracja-dostepnosci': '4', neutral: null,
    } satisfies Record<SectionKey, string | null>);
  });

  it('paths point at the section routes', () => {
    expect(SECTIONS.rekrutacja.path).toBe('/rekrutacja');
    expect(SECTIONS.neutral.path).toBe('/');
  });
});

describe('postSection', () => {
  it('news post belongs to Aktualności even when it also targets a group', () => {
    expect(postSection({ targets: { news: true, groupIds: ['g'] } })).toBe('aktualnosci');
  });

  it('group-only post belongs to Grupy', () => {
    expect(postSection({ targets: { news: false, groupIds: ['g'] } })).toBe('grupy');
  });

  it('post without news and without groups belongs to Z życia Przedszkola', () => {
    expect(postSection({ targets: { news: false, groupIds: [] } })).toBe('z-zycia-przedszkola');
  });
});

describe('groupColor', () => {
  it('cycles through the tile colours', () => {
    expect(groupColor(0)).toBe(SECTIONS.aktualnosci.color);
    expect(groupColor(1)).toBe(SECTIONS.grupy.color);
    expect(groupColor(10)).toBe(groupColor(0));
  });
});
