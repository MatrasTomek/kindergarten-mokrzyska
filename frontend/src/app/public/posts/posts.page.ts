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
      <app-post-list [data]="data()" [error]="error()" (pageChange)="page.set($event)" />
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

  constructor() {
    effect((onCleanup) => {
      const news = this.mode() === 'news';
      const page = this.page();
      this.data.set(null);
      this.error.set(null);
      const sub = this.api.posts({ news, page }).subscribe({
        next: (d) => this.data.set(d),
        error: (e) => this.error.set(apiErrorMessage(e)),
      });
      onCleanup(() => sub.unsubscribe());
    });
  }
}
