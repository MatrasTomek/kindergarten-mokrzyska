import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { afterNextRender, DestroyRef, inject, Injector, PLATFORM_ID } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, skip } from 'rxjs';

/**
 * Po każdej zmianie trasy (poza pierwszą — wczytanie strony) przenosi fokus do `#main` (tabindex=-1 w obu layoutach),
 * żeby czytnik ekranu i klawiatura nie zostawały na usuniętym linku / <body>. Pomija nawigację z fragmentem (#kotwica).
 * Tylko w przeglądarce. Wywołać w kontekście wstrzykiwania (konstruktor App).
 */
export function focusMainOnNavigation(): void {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
  const router = inject(Router);
  const doc = inject(DOCUMENT);
  const injector = inject(Injector);
  const sub = router.events
    .pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      skip(1),
      filter((e) => !router.parseUrl(e.urlAfterRedirects).fragment),
    )
    .subscribe(() =>
      // Po wyrenderowaniu nowego widoku (przy zmianie layoutu #main powstaje dopiero teraz).
      afterNextRender(() => doc.getElementById('main')?.focus({ preventScroll: true }), { injector }),
    );
  inject(DestroyRef).onDestroy(() => sub.unsubscribe());
}
