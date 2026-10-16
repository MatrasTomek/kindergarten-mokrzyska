import { Component, effect, inject, input, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { PublicApi } from '../../core/api/public-api';
import { apiErrorMessage } from '../../core/api-error';
import { pageTitle, uploadUrl } from '../../core/config';
import { ContentPageSlug } from '../../core/content-pages';
import { ContentItem } from '../../core/models';
import { GalleryComponent } from '../../shared/gallery.component';
import { formatSize } from './format-size';

@Component({
  selector: 'app-content-page',
  imports: [GalleryComponent],
  template: `
    <div class="page">
      <h1>{{ heading() }}</h1>
      @if (error()) {
        <p role="alert">{{ error() }}</p>
      } @else if (!items()) {
        <p aria-live="polite">Ładowanie…</p>
      } @else if (items()!.length === 0) {
        <p>Treść w przygotowaniu.</p>
      } @else {
        @for (item of items(); track item.id) {
          <section>
            <h2>{{ item.title }}</h2>
            <div class="rich" [innerHTML]="item.body"></div>
            @if (item.attachments.length) {
              <ul class="attachments">
                @for (a of item.attachments; track a.file) {
                  <li>
                    <i class="pi pi-file-pdf" aria-hidden="true"></i>
                    <a [href]="url(a.file)" target="_blank" rel="noopener">{{ a.name }}<span class="sr-only"> (otwiera się w nowej karcie)</span></a>
                    <span class="meta">(PDF, {{ size(a.size) }})</span>
                  </li>
                }
              </ul>
            }
            <app-gallery [images]="item.images" [label]="'Galeria zdjęć: ' + item.title" />
          </section>
        }
      }
    </div>
  `,
  styles: `
    section { margin-bottom: 2.5rem; }
    .attachments { list-style: none; padding: 0; }
    .attachments li { display: flex; gap: .5rem; align-items: baseline; padding: .375rem 0; }
    .attachments i { color: var(--app-accent); }
    .meta { color: #4b5563; font-size: .875rem; }
  `,
})
export class ContentPageComponent {
  private readonly api = inject(PublicApi);
  private readonly title = inject(Title);
  readonly page = input.required<ContentPageSlug>();
  readonly heading = input.required<string>();
  protected readonly items = signal<ContentItem[] | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly url = uploadUrl;
  protected readonly size = formatSize;

  constructor() {
    effect((onCleanup) => {
      const heading = this.heading();
      this.items.set(null);
      this.error.set(null);
      this.title.setTitle(pageTitle(heading));
      const sub = this.api.content(this.page()).subscribe({
        next: (i) => this.items.set(i),
        error: (e) => {
          this.error.set(apiErrorMessage(e));
          this.title.setTitle(pageTitle('Błąd'));
        },
      });
      onCleanup(() => sub.unsubscribe());
    });
  }
}
