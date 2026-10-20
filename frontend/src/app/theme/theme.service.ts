import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, InjectionToken, PLATFORM_ID, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { PublicApi } from '../core/api/public-api';
import { Theme } from '../core/models';
import { bannerSeason, SEASON_CACHE_KEY } from './banner-season';
import { DecorTheme, decorTheme } from './decor-catalog';
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
  private readonly doc = inject(DOCUMENT);
  readonly current = signal<Theme | null>(null);
  /** Aktywny motyw świąteczny (ilustracje); niezależny od palety. */
  readonly decor = signal<DecorTheme | null>(null);

  async load(): Promise<void> {
    if (!this.browser) return;
    try {
      const theme = await firstValueFrom(this.api.theme().pipe(timeout(5000)));
      this.apply(theme);
      this.cache(theme);
      this.decor.set(decorTheme(theme.decor));
    } catch {
      this.apply(fallbackTheme(this.today()));
      this.decor.set(null);
    }
  }

  private cache(theme: Theme): void {
    try {
      localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(theme.palette));
      if (theme.type === 'season') localStorage.setItem(SEASON_CACHE_KEY, theme.key);
      else localStorage.removeItem(SEASON_CACHE_KEY);
    } catch {
      /* tryb prywatny / pełny storage — pre-paint użyje pory roku */
    }
  }

  apply(theme: Theme): void {
    this.current.set(theme);
    this.applier.apply(theme.palette);
    // Obrazek banera strony głównej (CSS: html[data-season]); pre-paint ustawił go już przed malowaniem.
    if (this.browser) this.doc.documentElement.dataset['season'] = bannerSeason(theme, this.today());
  }
}
