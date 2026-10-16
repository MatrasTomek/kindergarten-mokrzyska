import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, InjectionToken, PLATFORM_ID, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { PublicApi } from '../core/api/public-api';
import { Theme } from '../core/models';
import { fallbackTheme } from './default-themes';
import { PaletteApplier } from './palette-applier';

/** Ostatnia paleta z /api/theme — czyta ją skrypt pre-paint w index.html (ta sama nazwa klucza tam). */
export const THEME_CACHE_KEY = 'theme-palette';

export const TODAY = new InjectionToken<() => Date>('TODAY', { providedIn: 'root', factory: () => () => new Date() });

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly api = inject(PublicApi);
  private readonly applier = inject(PaletteApplier);
  private readonly today = inject(TODAY);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly current = signal<Theme | null>(null);

  async load(): Promise<void> {
    if (!this.browser) return;
    try {
      const theme = await firstValueFrom(this.api.theme().pipe(timeout(5000)));
      this.apply(theme);
      this.cache(theme);
    } catch {
      this.apply(fallbackTheme(this.today()));
    }
  }

  private cache(theme: Theme): void {
    try {
      localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(theme.palette));
    } catch {
      /* tryb prywatny / pełny storage — pre-paint użyje pory roku */
    }
  }

  apply(theme: Theme): void {
    this.current.set(theme);
    this.applier.apply(theme.palette);
  }
}
