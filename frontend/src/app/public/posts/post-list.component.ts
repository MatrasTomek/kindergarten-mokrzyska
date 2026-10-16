import { Component, input, output } from '@angular/core';
import { Paginator, PaginatorState } from 'primeng/paginator';
import { Paged, Post } from '../../core/models';
import { PostCardComponent } from './post-card.component';

@Component({
  selector: 'app-post-list',
  imports: [PostCardComponent, Paginator],
  template: `
    @if (error()) {
      <p role="alert" class="error">{{ error() }}</p>
    } @else if (!data()) {
      <p aria-live="polite">Ładowanie…</p>
    } @else if (data()!.items.length === 0) {
      <p>Brak wpisów.</p>
    } @else {
      <ul class="grid">
        @for (p of data()!.items; track p.id) {
          <li><app-post-card [post]="p" /></li>
        }
      </ul>
      @if (data()!.pages > 1) {
        <p-paginator [first]="(data()!.page - 1) * 12" [rows]="12" [totalRecords]="data()!.total" (onPageChange)="changePage($event)" />
      }
    }
  `,
  styles: `
    .grid { list-style: none; padding: 0; display: grid; gap: 1.25rem; grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr)); }
    .error { color: #b91c1c; font-weight: 700; }
  `,
})
export class PostListComponent {
  readonly data = input<Paged<Post> | null>(null);
  readonly error = input<string | null>(null);
  readonly pageChange = output<number>();

  protected changePage(e: PaginatorState): void {
    this.pageChange.emit((e.page ?? 0) + 1);
  }
}
