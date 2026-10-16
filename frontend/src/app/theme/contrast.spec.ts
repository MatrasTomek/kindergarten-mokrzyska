import { DEFAULT_THEMES } from './default-themes';
import { contrastRatio, paletteWarnings } from './contrast';

describe('contrast', () => {
  it('computes WCAG ratio', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 1);
    expect(contrastRatio('#abcdef', '#abcdef')).toBeCloseTo(1, 5);
  });

  it('built-in seasonal palettes have no warnings', () => {
    for (const t of DEFAULT_THEMES) expect(paletteWarnings(t.palette)).toEqual([]);
  });

  it('warns about light button colour', () => {
    const p = { ...DEFAULT_THEMES[1].palette, '700': '#facc15' };
    expect(paletteWarnings(p)[0]).toContain('Przyciski');
  });

  it('warns about text on tiles (shade 100 and 200) and accent icons', () => {
    const base = DEFAULT_THEMES[3].palette;
    expect(paletteWarnings({ ...base, text: '#93c5fd' }).some((w) => w.includes('odcieniu 200'))).toBe(true);
    expect(paletteWarnings({ ...base, accent: '#dbeafe' }).some((w) => w.includes('Ikony'))).toBe(true);
  });

  it('warns about white text on dark bars when shade 900 is light', () => {
    const p = { ...DEFAULT_THEMES[3].palette, '900': '#dbeafe' };
    expect(paletteWarnings(p).some((w) => w.includes('Paski'))).toBe(true);
  });
});
