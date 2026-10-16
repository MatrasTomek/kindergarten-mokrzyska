import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { PublicApi } from '../../core/api/public-api';
import { apiErrorMessage } from '../../core/api-error';
import { pageTitle, SITE_SHORT_NAME } from '../../core/config';
import { Post } from '../../core/models';
import { GalleryComponent } from '../../shared/gallery.component';

function describe(p: Post): string {
  const text = p.excerpt.trim() || p.body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > 160 ? text.slice(0, 157).trimEnd() + '…' : text;
}

@Component({
  selector: 'app-post-detail-page',
  imports: [DatePipe, RouterLink, GalleryComponent],
  template: `
    <div class="page">
      @if (post(); as p) {
        <article>
          <h1>{{ p.title }}</h1>
          @if (p.publishedAt) { <time [attr.datetime]="p.publishedAt">{{ p.publishedAt | date: 'd MMMM y' }}</time> }
          @if (p.excerpt) { <p class="lead">{{ p.excerpt }}</p> }
          <div class="rich" [innerHTML]="p.body"></div>
          <app-gallery [images]="p.images" [label]="'Galeria zdjęć: ' + p.title" />
        </article>
        <p><a routerLink="/z-zycia-przedszkola">← Wszystkie wpisy</a></p>
      } @else if (notFound()) {
        <h1>Nie znaleziono wpisu</h1>
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
  private readonly meta = inject(Meta);
  private readonly destroyRef = inject(DestroyRef);
  readonly slug = input.required<string>();
  protected readonly post = signal<Post | null>(null);
  protected readonly notFound = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.destroyRef.onDestroy(() => this.meta.removeTag("name='description'"));
    effect((onCleanup) => {
      const slug = this.slug();
      this.meta.removeTag("name='description'");
      this.title.setTitle(SITE_SHORT_NAME);
      this.post.set(null);
      this.notFound.set(false);
      this.error.set(null);
      const sub = this.api.post(slug).subscribe({
        next: (p) => {
          this.post.set(p);
          this.title.setTitle(pageTitle(p.title));
          this.meta.updateTag({ name: 'description', content: describe(p) });
        },
        error: (e) => {
          if (e instanceof HttpErrorResponse && e.status === 404) {
            this.notFound.set(true);
            this.title.setTitle(pageTitle('Nie znaleziono wpisu'));
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
