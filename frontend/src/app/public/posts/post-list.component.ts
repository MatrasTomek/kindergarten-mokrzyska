import { afterNextRender, Component, effect, ElementRef, inject, Injector, input, output, viewChild } from '@angular/core';
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
      <!-- Przy zmianie strony poprzednie wpisy i paginator zostają (fokus nie ginie); po wczytaniu fokus na liście. -->
      <ul #list class="grid" tabindex="-1" [attr.aria-label]="'Wpisy — strona ' + data()!.page + ' z ' + data()!.pages" [attr.aria-busy]="loading() || null">
        @for (p of data()!.items; track p.id) {
          <li><app-post-card [post]="p" /></li>
        }
      </ul>
      @if (data()!.pages > 1) {
        <p-paginator [first]="(data()!.page - 1) * 12" [rows]="12" [totalRecords]="data()!.total" (onPageChange)="changePage($event)" />
      }
      <p class="loading" role="status">@if (loading()) {Ładowanie…}</p>
    }
  `,
  styles: `
    .grid { list-style: none; padding: 0; display: grid; gap: 1.25rem; grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr)); outline: none; }
    .grid[aria-busy='true'] { opacity: .6; }
    .error { color: #b91c1c; font-weight: 700; }
    .loading { text-align: center; min-height: 1.6em; margin: .5rem 0 0; }
  `,
})
export class PostListComponent {
  readonly data = input<Paged<Post> | null>(null);
  readonly error = input<string | null>(null);
  /** Wczytywanie kolejnej strony: dotychczasowe `data` zostaje widoczne. */
  readonly loading = input(false);
  readonly pageChange = output<number>();
  private readonly list = viewChild<ElementRef<HTMLElement>>('list');
  /** Fokus na liście po wczytaniu strony wybranej w paginatorze (nie przy pierwszym wczytaniu). */
  private focusAfterLoad = false;

  constructor() {
    const injector = inject(Injector);
    effect(() => {
      const ready = !!this.data() && !this.loading();
      if (this.error()) this.focusAfterLoad = false;
      if (!ready || !this.focusAfterLoad) return;
      this.focusAfterLoad = false;
      afterNextRender(() => this.list()?.nativeElement.focus(), { injector });
    });
  }

  protected changePage(e: PaginatorState): void {
    this.focusAfterLoad = true;
    this.pageChange.emit((e.page ?? 0) + 1);
  }
}
