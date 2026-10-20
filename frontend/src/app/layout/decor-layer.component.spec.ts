import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { DECOR_RANDOM, DECOR_ZONES } from '../theme/decor-zones';
import { DecorTheme, decorTheme } from '../theme/decor-catalog';
import { ThemeService } from '../theme/theme.service';
import { DecorLayerComponent } from './decor-layer.component';

@Component({ template: '' })
class Blank {}

const WIDE = { wide: true, zones: [{ x: 0, y: 0, w: 150, h: 3000 }, { x: 1300, y: 0, w: 150, h: 3000 }] };
const NARROW = { wide: false, zones: [{ x: 300, y: 0, w: 70, h: 90 }, { x: 8, y: 900, w: 56, h: 56 }, { x: 320, y: 900, w: 56, h: 56 }] };

function setup(decor: DecorTheme | null, zones = WIDE) {
  const calls = { n: 0 };
  const theme = { decor: signal(decor) };
  let s = 7;
  TestBed.configureTestingModule({
    imports: [DecorLayerComponent],
    providers: [
      provideRouter([{ path: 'a', component: Blank }]),
      { provide: ThemeService, useValue: theme },
      { provide: DECOR_ZONES, useValue: () => (calls.n++, zones) },
      { provide: DECOR_RANDOM, useValue: () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296 },
    ],
  });
  const f = TestBed.createComponent(DecorLayerComponent);
  const settle = async () => { f.detectChanges(); await f.whenStable(); f.detectChanges(); };
  return { f, calls, theme, settle, imgs: () => Array.from(f.nativeElement.querySelectorAll('.decor img')) as HTMLImageElement[] };
}

describe('DecorLayerComponent', () => {
  afterEach(() => vi.useRealTimers());

  it('renders nothing when decor is null', async () => {
    const { settle, imgs } = setup(null);
    await settle();
    expect(imgs().length).toBe(0);
  });

  it('renders 4–6 decorative images from the active set on wide zones', async () => {
    const { f, settle, imgs } = setup(decorTheme('easter'));
    await settle();
    const easter = decorTheme('easter')!.images;
    expect(imgs().length).toBeGreaterThanOrEqual(4);
    expect(imgs().length).toBeLessThanOrEqual(6);
    for (const img of imgs()) {
      expect(easter).toContain(img.getAttribute('src'));
      expect(img.getAttribute('alt')).toBe('');
    }
    expect(f.nativeElement.querySelector('.decor').getAttribute('aria-hidden')).toBe('true');
  });

  it('renders 2–3 smaller images on narrow zones', async () => {
    const { settle, imgs } = setup(decorTheme('christmas'), NARROW);
    await settle();
    expect(imgs().length).toBeGreaterThanOrEqual(2);
    expect(imgs().length).toBeLessThanOrEqual(3);
    for (const img of imgs()) expect(parseFloat(img.style.width)).toBeLessThanOrEqual(52);
  });

  it('clears images when decor is switched off', async () => {
    const { theme, settle, imgs } = setup(decorTheme('easter'));
    await settle();
    theme.decor.set(null);
    await settle();
    expect(imgs().length).toBe(0);
  });

  it('reshuffles after navigation', async () => {
    const { calls, settle } = setup(decorTheme('easter'));
    await settle();
    const before = calls.n;
    await TestBed.inject(Router).navigateByUrl('/a');
    await settle();
    expect(calls.n).toBeGreaterThan(before);
  });

  const layoutOf = (imgs: HTMLImageElement[]) => imgs.map((i) => `${i.getAttribute('src')}@${i.style.left},${i.style.top},${i.style.width}`);

  it('keeps the same images and places when re-laid out without navigation (e.g. phone address bar)', async () => {
    const { settle, imgs } = setup(decorTheme('easter'));
    await settle();
    const before = layoutOf(imgs());
    vi.useFakeTimers();
    window.dispatchEvent(new Event('resize'));
    vi.advanceTimersByTime(150);
    vi.useRealTimers();
    await settle();
    expect(layoutOf(imgs())).toEqual(before);
  });

  it('draws a new layout after navigation', async () => {
    const { settle, imgs } = setup(decorTheme('easter'));
    await settle();
    const before = layoutOf(imgs());
    await TestBed.inject(Router).navigateByUrl('/a');
    await settle();
    expect(layoutOf(imgs())).not.toEqual(before);
  });

  it('recomputes after window resize (debounced)', async () => {
    const { calls, settle } = setup(decorTheme('easter'));
    await settle();
    vi.useFakeTimers();
    const before = calls.n;
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('resize'));
    vi.advanceTimersByTime(149);
    expect(calls.n).toBe(before);
    vi.advanceTimersByTime(1);
    expect(calls.n).toBe(before + 1);
  });
});
