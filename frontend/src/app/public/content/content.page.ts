import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { PublicApi } from '../../core/api/public-api';
import { apiErrorMessage } from '../../core/api-error';
import { pageTitle, uploadUrl } from '../../core/config';
import { ContentPageSlug } from '../../core/content-pages';
import { ContentItem } from '../../core/models';
import { GalleryComponent } from '../../shared/gallery.component';
import { formatSize } from './format-size';
import { PageHeaderComponent } from '../../shared/page-header.component';
import { SECTIONS } from '../../core/sections';

@Component({
  selector: 'app-content-page',
  imports: [GalleryComponent, PageHeaderComponent],
  template: `
    <app-page-header [section]="section()" [heading]="heading()" [crumbs]="[{ label: heading() }]" />
    <div class="page" [style.--section]="section().color">
      @if (error()) {
        <p role="alert">{{ error() }}</p>
      } @else if (!view()) {
        <p aria-live="polite">Ładowanie…</p>
      } @else if (view()!.length === 0) {
        <p>Treść w przygotowaniu.</p>
      } @else {
        @for (item of view(); track item.id) {
          <section>
            <h2>{{ item.title }}</h2>
            <div class="rich" [innerHTML]="item.body"></div>
            @if (item.files.length) {
              <ul class="attachments">
                @for (a of item.files; track a.file) {
                  <li>
                    <i class="pi pi-file-pdf" aria-hidden="true"></i>
                    <a [href]="a.href" target="_blank" rel="noopener">{{ a.name }}<span class="sr-only"> (otwiera się w nowej karcie)</span></a>
                    <span class="meta">(PDF, {{ a.sizeLabel }})</span>
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
    section + section { border-top: 2px solid #f3f4f6; padding-top: 2rem; }
    .attachments { list-style: none; padding: 0; display: grid; gap: .75rem; grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr)); }
    .attachments li {
      display: flex; gap: .75rem; align-items: center; padding: .875rem 1rem; flex-wrap: wrap;
      border-radius: var(--radius); background: #fff; box-shadow: 0 1px 4px rgba(0, 0, 0, .1); border-left: .375rem solid var(--section);
    }
    .attachments i { color: var(--section); font-size: 1.5rem; }
    .attachments a { font-weight: 700; color: var(--app-fg); }
    .meta { color: #4b5563; font-size: .875rem; }
  `,
})
export class ContentPageComponent {
  private readonly api = inject(PublicApi);
  private readonly title = inject(Title);
  readonly page = input.required<ContentPageSlug>();
  readonly heading = input.required<string>();
  protected readonly section = computed(() => SECTIONS[this.page()]);
  private readonly items = signal<ContentItem[] | null>(null);
  /** Adresy i rozmiary załączników liczone raz po wczytaniu, nie przy każdym przebiegu wykrywania zmian. */
  protected readonly view = computed(
    () =>
      this.items()?.map((item) => ({
        ...item,
        files: item.attachments.map((a) => ({ ...a, href: uploadUrl(a.file), sizeLabel: formatSize(a.size) })),
      })) ?? null,
  );
  protected readonly error = signal<string | null>(null);

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
