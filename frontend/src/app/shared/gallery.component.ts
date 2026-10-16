import { Component, input, signal } from '@angular/core';
import { Galleria } from 'primeng/galleria';
import { PrimeTemplate } from 'primeng/api';
import { uploadUrl } from '../core/config';
import { PostImage } from '../core/models';

@Component({
  selector: 'app-gallery',
  imports: [Galleria, PrimeTemplate],
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
                  [showItemNavigators]="true" [showThumbnails]="false" [circular]="true" [containerStyle]="{ 'max-width': '90vw' }">
        <ng-template pTemplate="item" let-img>
          <img [src]="url(img.file)" [alt]="img.alt" style="max-width: 100%; max-height: 85vh; display: block" />
        </ng-template>
      </p-galleria>
    }
  `,
  styles: `
    .gallery { list-style: none; padding: 0; display: grid; gap: .5rem; grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr)); }
    .gallery button { padding: 0; border: 0; background: none; cursor: zoom-in; width: 100%; }
    .gallery img { width: 100%; height: 10rem; object-fit: cover; border-radius: .5rem; display: block; }
  `,
})
export class GalleryComponent {
  readonly images = input.required<PostImage[]>();
  protected readonly visible = signal(false);
  protected readonly active = signal(0);
  protected readonly url = uploadUrl;
  protected readonly round = Math.round;

  protected open(i: number): void {
    this.active.set(i);
    this.visible.set(true);
  }
}
