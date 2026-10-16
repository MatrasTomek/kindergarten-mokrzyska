import { Palette } from '../core/models';

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const HEX = /^#[0-9a-f]{6}$/i;

/** Ikony (elementy graficzne) wymagają 3:1 wg WCAG 1.4.11, tekst 4.5:1. Pary kolorów faktycznie używane w serwisie (przyciski, kafelki, stopka, paski) – patrz app-preset.ts i style stron. */
export function paletteWarnings(p: Palette): string[] {
  const checks: [string, string, string, number?][] = [
    ['Przyciski (odcień 700 z białym tekstem)', p['700'], '#ffffff'],
    ['Przyciski po najechaniu (odcień 800 z białym tekstem)', p['800'], '#ffffff'],
    ['Paski u góry (biały tekst na odcieniu 900)', '#ffffff', p['900']],
    ['Teksty i nagłówki (kolor tekstu na białym tle)', p.text, '#ffffff'],
    ['Stopka i menu panelu (kolor tekstu na odcieniu 50)', p.text, p['50']],
    ['Kafelki (kolor tekstu na odcieniu 100)', p.text, p['100']],
    ['Kafelki po najechaniu (kolor tekstu na odcieniu 200)', p.text, p['200']],
    ['Ikony kafelków (kolor akcentu na odcieniu 100)', p.accent, p['100'], 3],
    ['Ikony kafelków po najechaniu (kolor akcentu na odcieniu 200)', p.accent, p['200'], 3],
  ];
  return checks
    .filter(([, fg, bg]) => HEX.test(fg) && HEX.test(bg))
    .filter(([, fg, bg, min = 4.5]) => contrastRatio(fg, bg) < min)
    .map(([label, fg, bg, min = 4.5]) => `${label}: kontrast ${contrastRatio(fg, bg).toFixed(2)}:1 — wymagane min. ${min}:1`);
}
