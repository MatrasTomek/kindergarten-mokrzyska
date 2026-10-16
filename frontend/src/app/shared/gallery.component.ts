import { Component, computed, effect, input, signal } from '@angular/core';
import { Galleria } from 'primeng/galleria';
import { uploadUrl } from '../core/config';
import { PostImage } from '../core/models';

@Component({
  selector: 'app-gallery',
  imports: [Galleria],
  template: `
    @if (images().length) {
      <ul class="gallery">
        @for (img of images(); track img.file; let i = $index) {
          <li>
            <button type="button" (click)="open(i)" [attr.aria-label]="'Powiększ zdjęcie ' + (i + 1) + (img.alt ? ': ' + img.alt : '')">
              <img [src]="url(img.thumb)" [alt]="img.alt" loading="lazy" width="400" [attr.height]="img.w ? round(400 * img.h / img.w) : null" />
            </button>
          </li>
        }
      </ul>
      <p-galleria [value]="images()" [(visible)]="visible" [(activeIndex)]="active" [fullScreen]="true"
                  [showItemNavigators]="true" [showThumbnails]="false" [circular]="true" [containerStyle]="{ 'max-width': '90vw' }" [pt]="pt()">
        <ng-template #item let-img>
          <img [src]="url(img.file)" [alt]="img.alt" style="max-width: 100%; max-height: 85vh; display: block" />
        </ng-template>
      </p-galleria>
    }
  `,
  host: { '(document:keydown)': 'onKey($event)' },
  styles: `
    .gallery { list-style: none; padding: 0; display: grid; gap: .5rem; grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr)); }
    .gallery button { padding: 0; border: 0; background: none; cursor: zoom-in; width: 100%; }
    .gallery img { width: 100%; height: 10rem; object-fit: cover; border-radius: .5rem; display: block; }
  `,
})
export class GalleryComponent {
  readonly images = input.required<PostImage[]>();
  /** Nazwa dostępna dla okna powiększenia, np. „Galeria zdjęć: Bal”. */
  readonly label = input('Galeria zdjęć');
  protected readonly pt = computed(() => ({
    mask: { 'aria-label': this.label() },
    prevButton: { 'aria-label': 'Poprzednie zdjęcie' },
    nextButton: { 'aria-label': 'Następne zdjęcie' },
  }));
  private opener: HTMLElement | null = null;
  private wasVisible = false;

  constructor() {
    effect(() => {
      const v = this.visible();
      if (this.wasVisible && !v) this.opener?.focus();
      this.wasVisible = v;
    });
  }

  protected onKey(e: KeyboardEvent): void {
    if (!this.visible()) return;
    const n = this.images().length;
    if (e.key === 'Escape') this.visible.set(false);
    else if (e.key === 'ArrowRight') this.active.set((this.active() + 1) % n);
    else if (e.key === 'ArrowLeft') this.active.set((this.active() - 1 + n) % n);
  }
  protected readonly visible = signal(false);
  protected readonly active = signal(0);
  protected readonly url = uploadUrl;
  protected readonly round = Math.round;

  protected open(i: number): void {
    this.opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.active.set(i);
    this.visible.set(true);
  }
}
