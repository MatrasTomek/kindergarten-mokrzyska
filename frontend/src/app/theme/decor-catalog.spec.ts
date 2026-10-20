import { DECOR_THEMES, decorTheme } from './decor-catalog';

describe('DECOR_THEMES', () => {
  it('lists the eight holidays in order with their names', () => {
    expect(DECOR_THEMES.map((t) => [t.key, t.name])).toEqual([
      ['christmas', 'Boże Narodzenie'],
      ['epiphany', 'Trzech Króli'],
      ['easter', 'Wielkanoc'],
      ['pentecost', 'Zesłanie Ducha Świętego'],
      ['corpus-christi', 'Boże Ciało'],
      ['all-saints', 'Wszystkich Świętych'],
      ['st-nicholas', 'Mikołajki'],
      ['childrens-day', 'Dzień Dziecka'],
    ]);
  });

  it('gives every set 4–6 unique svg files in its own folder', () => {
    for (const t of DECOR_THEMES) {
      expect(t.images.length).toBeGreaterThanOrEqual(4);
      expect(t.images.length).toBeLessThanOrEqual(6);
      expect(new Set(t.images).size).toBe(t.images.length);
      for (const src of t.images) expect(src).toMatch(new RegExp(`^decor/${t.key}/[a-z-]+\\.svg$`));
    }
  });

  it('looks up a set by key and ignores unknown keys', () => {
    expect(decorTheme('easter')?.name).toBe('Wielkanoc');
    expect(decorTheme('halloween')).toBeNull();
    expect(decorTheme(null)).toBeNull();
    expect(decorTheme(undefined)).toBeNull();
  });
});
