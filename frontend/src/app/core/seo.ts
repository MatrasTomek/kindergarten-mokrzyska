import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, NavigationEnd, Router, TitleStrategy } from '@angular/router';
import { filter } from 'rxjs';
import { SITE_SHORT_NAME } from './config';

/** Adres kanoniczny strony (bez www) — canonical, og:url, og:image. Te same wartości ma backend (App\Seo\Site). */
export const SITE_URL = 'https://przedszkolemokrzyska.pl';
export const DEFAULT_DESCRIPTION =
  'Publiczne Przedszkole Parafialne pw. bł. Karoliny Kózka w Mokrzyskach – aktualności, grupy, rekrutacja, dokumenty i kontakt.';
export const DEFAULT_IMAGE = `${SITE_URL}/logo.jpg`;

/** Ta sama reguła co App\Seo\SeoPageController (meta wstawiane przez PHP przed startem aplikacji). */
export function groupDescription(g: { name: string; description: string }): string {
  return g.description.trim() || `Grupa ${g.name} w Przedszkolu Parafialnym w Mokrzyskach – wpisy i zdjęcia z życia grupy.`;
}

export interface SeoPage {
  title: string;
  /** Ścieżka strony (bez domeny), np. `/wpis/slug`. */
  path: string;
  description?: string;
  /** Ścieżka obrazka (np. `/uploads/…`) albo pełny adres. */
  image?: string;
  type?: 'website' | 'article';
  noindex?: boolean;
}

/** Opis, canonical, Open Graph i robots w <head>. Przy prerenderze trafiają do HTML-a (podgląd linków, wyszukiwarki). */
@Injectable({ providedIn: 'root' })
export class Seo {
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);

  set(page: SeoPage): void {
    const url = SITE_URL + page.path;
    const description = page.description || DEFAULT_DESCRIPTION;
    const image = page.image ? (page.image.startsWith('http') ? page.image : SITE_URL + page.image) : DEFAULT_IMAGE;
    this.meta.updateTag({ name: 'description', content: description });
    for (const [property, content] of [
      ['og:type', page.type ?? 'website'],
      ['og:site_name', SITE_SHORT_NAME],
      ['og:locale', 'pl_PL'],
      ['og:title', page.title],
      ['og:description', description],
      ['og:url', url],
      ['og:image', image],
    ]) {
      this.meta.updateTag({ property, content });
    }
    this.meta.updateTag({ name: 'twitter:card', content: 'summary' });
    if (page.noindex) this.meta.updateTag({ name: 'robots', content: 'noindex' });
    else this.meta.removeTag("name='robots'");
    this.canonical().setAttribute('href', url);
  }

  private canonical(): HTMLLinkElement {
    let link = this.doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(link);
    }
    return link;
  }
}

/** `data` trasy od korzenia do liścia (dzieci nadpisują rodziców) — np. `noindex` z `admin` obejmuje cały panel. */
function routeData(root: ActivatedRouteSnapshot): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (let r: ActivatedRouteSnapshot | null = root; r; r = r.firstChild) Object.assign(data, r.data);
  return data;
}

/**
 * Po każdej nawigacji ustawia meta z trasy: tytuł (jak TitleStrategy), `data.description`, `data.noindex`.
 * Trasy z `data.seo: 'manual'` (wpis, grupa) ustawiają meta same, gdy dotrą dane.
 * Wywołać w kontekście wstrzykiwania (konstruktor App). Działa też przy prerenderze.
 */
export function seoOnNavigation(): void {
  const router = inject(Router);
  const titles = inject(TitleStrategy);
  const seo = inject(Seo);
  const sub = router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe((e) => {
    const snapshot = router.routerState.snapshot;
    const data = routeData(snapshot.root);
    if (data['seo'] === 'manual') return;
    const tree = router.parseUrl(e.urlAfterRedirects);
    tree.queryParams = {};
    tree.fragment = null;
    seo.set({
      title: titles.buildTitle(snapshot) ?? SITE_SHORT_NAME,
      path: router.serializeUrl(tree),
      description: data['description'] as string | undefined,
      noindex: data['noindex'] === true,
    });
  });
  inject(DestroyRef).onDestroy(() => sub.unsubscribe());
}
