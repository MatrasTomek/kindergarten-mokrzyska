import { Palette, Shade, Theme } from '../core/models';

export const SHADES: readonly Shade[] = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'];

const palette = (colors: string[]): Palette =>
  ({ ...Object.fromEntries(SHADES.map((k, i) => [k, colors[i]])), accent: colors[7], text: colors[9] }) as Palette;

const season = (key: string, name: string, seasonStart: string, colors: string[]): Theme =>
  ({ id: null, key, name, type: 'season', seasonStart, palette: palette(colors) });

/** Te same wartości co backend/src/Theme/DefaultThemes.php. */
export const DEFAULT_THEMES: Theme[] = [
  season('spring', 'Wiosna', '03-21', ['#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d']),
  season('summer', 'Lato', '06-23', ['#fefce8', '#fef9c3', '#fef08a', '#fde047', '#facc15', '#eab308', '#ca8a04', '#a16207', '#854d0e', '#713f12']),
  season('autumn', 'Jesień', '09-23', ['#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d']),
  season('winter', 'Zima', '12-21', ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a']),
];

export function seasonFor(date: Date, starts: Record<string, string>): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Warsaw', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const md = `${parts.find((p) => p.type === 'month')!.value}-${parts.find((p) => p.type === 'day')!.value}`;
  const sorted = Object.entries(starts).sort(([, a], [, b]) => a.localeCompare(b));
  let current = sorted[sorted.length - 1][0];
  for (const [key, start] of sorted) {
    if (md >= start) current = key;
  }
  return current;
}

export function fallbackTheme(date: Date): Theme {
  const starts = Object.fromEntries(DEFAULT_THEMES.map((t) => [t.key, t.seasonStart!]));
  const key = seasonFor(date, starts);
  return DEFAULT_THEMES.find((t) => t.key === key)!;
}
