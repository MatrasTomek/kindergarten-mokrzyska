import { fallbackTheme, seasonFor } from './default-themes';

const STARTS = { spring: '03-21', summer: '06-23', autumn: '09-23', winter: '12-21' };

describe('seasonFor', () => {
  const cases: [string, string][] = [
    ['2026-01-01T10:00:00+01:00', 'winter'],
    ['2026-03-20T23:59:00+01:00', 'winter'],
    ['2026-03-21T00:00:00+01:00', 'spring'],
    ['2026-06-23T00:00:00+02:00', 'summer'],
    ['2026-09-22T12:00:00+02:00', 'summer'],
    ['2026-09-23T00:00:00+02:00', 'autumn'],
    ['2026-12-21T00:00:00+01:00', 'winter'],
    ['2026-12-31T23:59:00+01:00', 'winter'],
  ];
  it.each(cases)('%s → %s', (iso, expected) => {
    expect(seasonFor(new Date(iso), STARTS)).toBe(expected);
  });

  it('uses Warsaw time, not UTC', () => {
    expect(seasonFor(new Date('2026-03-20T23:30:00Z'), STARTS)).toBe('spring');
  });

  it('fallbackTheme returns built-in palette', () => {
    const t = fallbackTheme(new Date('2026-10-15T12:00:00+02:00'));
    expect(t.key).toBe('autumn');
    expect(t.palette['700']).toBe('#b91c1c');
  });
});
