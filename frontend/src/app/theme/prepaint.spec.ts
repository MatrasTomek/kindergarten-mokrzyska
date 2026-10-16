import indexHtml from '../../index.html' with { loader: 'text' };
import { A11yState } from '../a11y/a11y.service';
import { Palette } from '../core/models';
import { DEFAULT_THEMES, fallbackTheme, SHADES } from './default-themes';
import { THEME_CACHE_KEY } from './theme.service';

/** Skrypt inline z index.html uruchamiany przed pierwszym malowaniem (bez sieci): kolory pory roku / zapamiętany motyw + klasy a11y. */
describe('pre-paint script in index.html', () => {
  const html = document.documentElement;
  const script = /<script id="prepaint">([\s\S]*?)<\/script>/.exec(indexHtml)?.[1] ?? '';

  function run(now: Date): void {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(now);
    try {
      new Function(script)();
    } finally {
      vi.useRealTimers();
    }
  }

  const painted = (): Partial<Palette> => ({
    ...Object.fromEntries(SHADES.map((k) => [k, html.style.getPropertyValue(`--app-primary-${k}`)])),
    accent: html.style.getPropertyValue('--app-accent'),
    text: html.style.getPropertyValue('--app-text'),
  });

  beforeEach(() => {
    localStorage.clear();
    html.removeAttribute('style');
    html.className = '';
  });

  afterAll(() => {
    localStorage.clear();
    html.removeAttribute('style');
    html.className = '';
  });

  it('is present in <head>', () => {
    expect(script.length).toBeGreaterThan(0);
    expect(indexHtml.indexOf('id="prepaint"')).toBeLessThan(indexHtml.indexOf('</head>'));
  });

  it('paints the same season as fallbackTheme() for every day of the year (drift guard vs DEFAULT_THEMES)', () => {
    for (let day = 0; day < 366; day++) {
      // 23:30 UTC dnia poprzedniego (= 00:30/01:30 w Warszawie) i 21:30 UTC (= 22:30/23:30) — doba liczona w Europe/Warsaw, nie UTC
      for (const hourUtc of [-0.5, 21.5]) {
        const date = new Date(Date.UTC(2028, 0, 1) + day * 86_400_000 + hourUtc * 3_600_000);
        run(date);
        expect(painted(), date.toISOString()).toEqual(fallbackTheme(date).palette);
      }
    }
  });

  it('switches on the boundary day in Europe/Warsaw', () => {
    const [spring, , , winter] = DEFAULT_THEMES;
    run(new Date('2026-03-20T23:30:00+01:00'));
    expect(painted()).toEqual(winter.palette);
    run(new Date('2026-03-21T00:30:00+01:00')); // = 03-20 23:30 UTC
    expect(painted()).toEqual(spring.palette);
    run(new Date('2026-12-21T00:10:00+01:00'));
    expect(painted()).toEqual(winter.palette);
  });

  it('prefers the cached palette from the last /api/theme', () => {
    const cached = { ...Object.fromEntries(SHADES.map((k, i) => [k, `#10${i}0${i}0`])), accent: '#123456', text: '#654321' } as Palette;
    localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(cached));
    run(new Date('2026-07-01T12:00:00+02:00'));
    expect(painted()).toEqual(cached);
  });

  it('ignores a corrupted or incomplete cache and falls back to the season', () => {
    const summer = DEFAULT_THEMES[1].palette;
    for (const bad of ['{nie-json', JSON.stringify({ '500': '#ff0000' }), JSON.stringify({ ...summer, '700': 'red;background:url(x)' }), '42']) {
      localStorage.setItem(THEME_CACHE_KEY, bad);
      run(new Date('2026-07-01T12:00:00+02:00'));
      expect(painted()).toEqual(summer);
    }
  });

  it('applies saved a11y classes with the same validation as A11yService.restore', () => {
    const saved: A11yState = { fontScale: 2, contrast: true, readableFont: true, grayscale: true };
    localStorage.setItem('a11y', JSON.stringify(saved));
    run(new Date());
    expect([...html.classList].sort()).toEqual(['a11y-contrast', 'a11y-font-2', 'a11y-grayscale', 'a11y-readable']);

    html.className = '';
    localStorage.setItem('a11y', JSON.stringify({ fontScale: 1, contrast: 'tak', readableFont: 1, grayscale: false }));
    run(new Date());
    expect([...html.classList]).toEqual(['a11y-font-1']);

    for (const bad of ['{nie-json', JSON.stringify({ fontScale: 7 }), 'null']) {
      html.className = '';
      localStorage.setItem('a11y', bad);
      run(new Date());
      expect(html.classList.length).toBe(0);
    }
  });

  it('still paints the season when storage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('SecurityError'); });
    run(new Date('2026-10-16T12:00:00+02:00'));
    spy.mockRestore();
    expect(painted()).toEqual(DEFAULT_THEMES[2].palette);
    expect(html.classList.length).toBe(0);
  });
});
