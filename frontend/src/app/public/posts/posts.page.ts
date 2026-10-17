import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { PublicApi } from '../../core/api/public-api';
import { apiErrorMessage } from '../../core/api-error';
import { Paged, Post } from '../../core/models';
import { PostListComponent } from './post-list.component';

@Component({
  selector: 'app-posts-page',
  imports: [PostListComponent],
  template: `
    <div class="page">
      <h1>{{ heading() }}</h1>
      <app-post-list [data]="data()" [error]="error()" [loading]="loading()" (pageChange)="page.set($event)" />
    </div>
  `,
})
export class PostsPage {
  private readonly api = inject(PublicApi);
  readonly mode = input.required<'news' | 'life'>();
  protected readonly heading = computed(() => (this.mode() === 'news' ? 'Aktualności' : 'Z życia Przedszkola'));
  protected readonly page = signal(1);
  protected readonly data = signal<Paged<Post> | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly loading = signal(false);
  private shownMode: 'news' | 'life' | null = null;

  constructor() {
    effect((onCleanup) => {
      const news = this.mode() === 'news';
      const page = this.page();
      // Zmiana strony: poprzednie wpisy zostają widoczne do czasu wczytania kolejnych (PostListComponent).
      if (this.mode() !== this.shownMode) this.data.set(null);
      this.shownMode = this.mode();
      this.loading.set(true);
      this.error.set(null);
      const sub = this.api.posts({ news, page }).subscribe({
        next: (d) => {
          this.data.set(d);
          this.loading.set(false);
        },
        error: (e) => {
          this.error.set(apiErrorMessage(e));
          this.loading.set(false);
        },
      });
      onCleanup(() => sub.unsubscribe());
    });
  }
}
