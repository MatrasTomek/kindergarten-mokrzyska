import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, InjectionToken, PLATFORM_ID, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { PublicApi } from '../core/api/public-api';
import { Theme } from '../core/models';
import { fallbackTheme } from './default-themes';
import { PaletteApplier } from './palette-applier';

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
      this.apply(await firstValueFrom(this.api.theme().pipe(timeout(5000))));
    } catch {
      this.apply(fallbackTheme(this.today()));
    }
  }

  apply(theme: Theme): void {
    this.current.set(theme);
    this.applier.apply(theme.palette);
  }
}
