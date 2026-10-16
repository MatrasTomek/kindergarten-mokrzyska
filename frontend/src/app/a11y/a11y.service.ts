import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { effect, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

export interface A11yState { fontScale: 0 | 1 | 2; contrast: boolean; readableFont: boolean; grayscale: boolean }
type ToggleKey = 'contrast' | 'readableFont' | 'grayscale';

const KEY = 'a11y';
const DEFAULT: A11yState = { fontScale: 0, contrast: false, readableFont: false, grayscale: false };

@Injectable({ providedIn: 'root' })
export class A11yService {
  private readonly doc = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly state = signal<A11yState>(this.restore());

  constructor() {
    effect(() => this.applyAndPersist(this.state()));
  }

  increaseFont(): void {
    this.state.update((s) => ({ ...s, fontScale: Math.min(2, s.fontScale + 1) as A11yState['fontScale'] }));
  }

  decreaseFont(): void {
    this.state.update((s) => ({ ...s, fontScale: Math.max(0, s.fontScale - 1) as A11yState['fontScale'] }));
  }

  resetFont(): void {
    this.state.update((s) => ({ ...s, fontScale: 0 }));
  }

  toggle(key: ToggleKey): void {
    this.state.update((s) => ({ ...s, [key]: !s[key] }));
  }

  private restore(): A11yState {
    if (!this.browser) return DEFAULT;
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<A11yState> | null;
      if (!raw || typeof raw !== 'object') return DEFAULT;
      return {
        fontScale: raw.fontScale === 1 || raw.fontScale === 2 ? raw.fontScale : 0,
        contrast: raw.contrast === true,
        readableFont: raw.readableFont === true,
        grayscale: raw.grayscale === true,
      };
    } catch {
      return DEFAULT;
    }
  }

  private applyAndPersist(s: A11yState): void {
    const c = this.doc.documentElement.classList;
    c.toggle('a11y-font-1', s.fontScale === 1);
    c.toggle('a11y-font-2', s.fontScale === 2);
    c.toggle('a11y-contrast', s.contrast);
    c.toggle('a11y-readable', s.readableFont);
    c.toggle('a11y-grayscale', s.grayscale);
    if (!this.browser) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* tryb prywatny / brak miejsca — ustawienia działają do końca wizyty */
    }
  }
}
