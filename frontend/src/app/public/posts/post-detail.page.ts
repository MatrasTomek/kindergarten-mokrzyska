import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { PublicApi } from '../../core/api/public-api';
import { apiErrorMessage } from '../../core/api-error';
import { pageTitle, SITE_SHORT_NAME, uploadUrl } from '../../core/config';
import { Group, Post } from '../../core/models';
import { Seo } from '../../core/seo';
import { GalleryComponent } from '../../shared/gallery.component';
import { Crumb, PageHeaderComponent } from '../../shared/page-header.component';
import { postSection, SECTIONS } from '../../core/sections';

/** Ta sama reguła co App\Seo\SeoPageController::describePost (meta wstawiane przez PHP przed startem aplikacji). */
function describe(p: Post): string {
  const text = p.excerpt.trim() || p.body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > 160 ? text.slice(0, 157).trimEnd() + '…' : text;
}

@Component({
  selector: 'app-post-detail-page',
  imports: [DatePipe, RouterLink, GalleryComponent, PageHeaderComponent],
  template: `
    @if (post(); as p) {
      <app-page-header [section]="section()" [heading]="p.title" [crumbs]="crumbs()" />
    } @else if (notFound()) {
      <app-page-header [section]="neutral" heading="Nie znaleziono wpisu" />
    }
    <div class="page">
      @if (post(); as p) {
        <article>
          @if (p.publishedAt) { <time [attr.datetime]="p.publishedAt">{{ p.publishedAt | date: 'd MMMM y' }}</time> }
          @if (p.excerpt) { <p class="lead">{{ p.excerpt }}</p> }
          <div class="rich" [innerHTML]="p.body"></div>
          <app-gallery [images]="p.images" [label]="'Galeria zdjęć: ' + p.title" />
        </article>
        <p class="back"><a [routerLink]="back().link">{{ back().label }}</a></p>
      } @else if (notFound()) {
        <p><a routerLink="/z-zycia-przedszkola">Zobacz wszystkie wpisy</a></p>
      } @else if (error()) {
        <p role="alert">{{ error() }}</p>
      } @else {
        <p aria-live="polite">Ładowanie…</p>
      }
    </div>
  `,
  styles: `.lead { font-size: 1.125rem; font-weight: 600; }`,
})
export class PostDetailPage {
  private readonly api = inject(PublicApi);
  private readonly title = inject(Title);
  private readonly seo = inject(Seo);
  readonly slug = input.required<string>();
  protected readonly post = signal<Post | null>(null);
  protected readonly notFound = signal(false);
  protected readonly error = signal<string | null>(null);
  /** Lista grup — tylko dla wpisów grupowych (nazwa grupy w ścieżce). */
  private readonly groups = signal<Group[] | null>(null);
  protected readonly neutral = SECTIONS.neutral;
  protected readonly section = computed(() => {
    const p = this.post();
    return p ? SECTIONS[postSection(p)] : this.neutral;
  });
  /** Pierwsza grupa wpisu grupowego (undefined, gdy lista nie dotarła albo grupy już nie ma). */
  private readonly group = computed(() => {
    const p = this.post();
    return p && this.section().key === 'grupy' ? this.groups()?.find((g) => g.id === p.targets.groupIds[0]) : undefined;
  });
  protected readonly back = computed(() => {
    const g = this.group();
    if (g) return { link: `/grupy/${g.slug}`, label: `← Wpisy grupy ${g.name}` };
    const s = this.section();
    return s.key === 'grupy' ? { link: '/grupy', label: '← Wszystkie grupy' } : { link: s.path, label: '← Wszystkie wpisy' };
  });
  protected readonly crumbs = computed<Crumb[]>(() => {
    const p = this.post();
    if (!p) return [];
    const s = this.section();
    const group = this.group();
    return [
      { label: s.title, link: s.path },
      ...(group ? [{ label: group.name, link: `/grupy/${group.slug}` }] : []),
      { label: p.title },
    ];
  });

  constructor() {
    effect((onCleanup) => {
      const p = this.post();
      if (!p || postSection(p) !== 'grupy' || this.groups()) return;
      const sub = this.api.groups().subscribe({ next: (g) => this.groups.set(g), error: () => this.groups.set([]) });
      onCleanup(() => sub.unsubscribe());
    });
    effect((onCleanup) => {
      const slug = this.slug();
      this.title.setTitle(SITE_SHORT_NAME);
      this.post.set(null);
      this.notFound.set(false);
      this.error.set(null);
      const sub = this.api.post(slug).subscribe({
        next: (p) => {
          this.post.set(p);
          this.title.setTitle(pageTitle(p.title));
          const image = p.images[0];
          this.seo.set({
            title: pageTitle(p.title),
            path: `/wpis/${p.slug}`,
            description: describe(p),
            image: image ? uploadUrl(image.file) : undefined,
            type: 'article',
          });
        },
        error: (e) => {
          if (e instanceof HttpErrorResponse && e.status === 404) {
            this.notFound.set(true);
            this.title.setTitle(pageTitle('Nie znaleziono wpisu'));
            this.seo.set({ title: pageTitle('Nie znaleziono wpisu'), path: `/wpis/${slug}`, noindex: true });
          } else {
            this.error.set(apiErrorMessage(e));
            this.title.setTitle(pageTitle('Błąd'));
          }
        },
      });
      onCleanup(() => sub.unsubscribe());
    });
  }
}
