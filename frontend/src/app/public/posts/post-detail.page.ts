import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, effect, inject, input, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { PublicApi } from '../../core/api/public-api';
import { apiErrorMessage } from '../../core/api-error';
import { pageTitle } from '../../core/config';
import { Post } from '../../core/models';
import { GalleryComponent } from '../../shared/gallery.component';

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
          <app-gallery [images]="p.images" />
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
  readonly slug = input.required<string>();
  protected readonly post = signal<Post | null>(null);
  protected readonly notFound = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    effect((onCleanup) => {
      const slug = this.slug();
      this.post.set(null);
      this.notFound.set(false);
      this.error.set(null);
      const sub = this.api.post(slug).subscribe({
        next: (p) => {
          this.post.set(p);
          this.title.setTitle(pageTitle(p.title));
        },
        error: (e) => (e instanceof HttpErrorResponse && e.status === 404 ? this.notFound.set(true) : this.error.set(apiErrorMessage(e))),
      });
      onCleanup(() => sub.unsubscribe());
    });
  }
}
