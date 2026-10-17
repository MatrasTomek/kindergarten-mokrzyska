import { HttpErrorResponse } from '@angular/common/http';
import { Component, effect, inject, input, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { PublicApi } from '../../core/api/public-api';
import { apiErrorMessage } from '../../core/api-error';
import { pageTitle, SITE_SHORT_NAME } from '../../core/config';
import { Group, Paged, Post } from '../../core/models';
import { PostListComponent } from '../posts/post-list.component';

const is404 = (e: unknown): boolean => e instanceof HttpErrorResponse && e.status === 404;

@Component({
  selector: 'app-group-detail-page',
  imports: [RouterLink, PostListComponent],
  template: `
    <div class="page">
      @if (notFound()) {
        <h1>Nie ma takiej grupy</h1>
        <p><a routerLink="/grupy">Zobacz wszystkie grupy</a></p>
      } @else {
        <h1>{{ group()?.name ?? 'Grupa' }}</h1>
        @if (group()?.description) { <p>{{ group()!.description }}</p> }
        <app-post-list [data]="posts()" [error]="error()" [loading]="postsLoading()" (pageChange)="page.set($event)" />
        <p><a routerLink="/grupy">← Wszystkie grupy</a></p>
      }
    </div>
  `,
})
export class GroupDetailPage {
  private readonly api = inject(PublicApi);
  private readonly title = inject(Title);
  readonly slug = input.required<string>();
  protected readonly page = signal(1);
  protected readonly group = signal<Group | null>(null);
  protected readonly posts = signal<Paged<Post> | null>(null);
  protected readonly notFound = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly postsLoading = signal(false);
  /** Grupa, której wpisy są teraz w `posts` — przy zmianie strony tej samej grupy nie czyścimy listy. */
  private postsSlug: string | null = null;

  constructor() {
    effect((onCleanup) => {
      const slug = this.slug();
      this.group.set(null);
      this.notFound.set(false);
      this.error.set(null);
      this.page.set(1);
      this.title.setTitle(SITE_SHORT_NAME);
      const sub = this.api.group(slug).subscribe({
        next: (g) => {
          this.group.set(g);
          this.title.setTitle(pageTitle(g.name));
        },
        error: (e) => {
          if (is404(e)) {
            this.notFound.set(true);
            this.title.setTitle(pageTitle('Nie ma takiej grupy'));
          } else {
            this.error.set(apiErrorMessage(e));
            this.title.setTitle(pageTitle('Błąd'));
          }
        },
      });
      onCleanup(() => sub.unsubscribe());
    });
    effect((onCleanup) => {
      const slug = this.slug();
      const page = this.page();
      if (slug !== this.postsSlug) this.posts.set(null);
      this.postsSlug = slug;
      this.postsLoading.set(true);
      const sub = this.api.posts({ group: slug, page }).subscribe({
        next: (p) => {
          this.posts.set(p);
          this.postsLoading.set(false);
        },
        error: (e) => {
          if (!is404(e)) this.error.set(apiErrorMessage(e));
          this.postsLoading.set(false);
        },
      });
      onCleanup(() => sub.unsubscribe());
    });
  }
}
