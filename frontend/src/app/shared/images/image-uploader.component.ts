import { Component, DestroyRef, effect, inject, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { Button } from 'primeng/button';
import { ProgressBar } from 'primeng/progressbar';
import { uploadUrl } from '../../core/config';
import { PostImage, UploadedImage } from '../../core/models';
import { UnsupportedImageError } from './image-resize';
import { createUploadProcessor } from './upload-processor';
import { UploadQueue } from './upload-queue';

/** Polska odmiana: 1 zdjęcie, 2-4 zdjęcia (poza 12-14), reszta zdjęć. */
export function zdjeciaForm(n: number): string {
  if (n === 1) return 'zdjęcie';
  const last = n % 10, tens = n % 100;
  return last >= 2 && last <= 4 && !(tens >= 12 && tens <= 14) ? 'zdjęcia' : 'zdjęć';
}

@Component({
  selector: 'app-image-uploader',
  imports: [FormsModule, CdkDropList, CdkDrag, CdkDragHandle, Button, ProgressBar],
  template: `
    <div class="drop" [class.over]="dragOver()" (dragover)="$event.preventDefault(); dragOver.set(true)" (dragleave)="dragOver.set(false)" (drop)="onDrop($event)">
      <p>Przeciągnij zdjęcia tutaj albo</p>
      <label class="p-button">
        Wybierz zdjęcia
        <input type="file" accept="image/*" multiple class="sr-only" (change)="onPick($event)" />
      </label>
      <p class="hint">{{ images().length }} / {{ max() }} zdjęć. Zdjęcia są automatycznie zmniejszane przed wysłaniem.</p>
      <p class="warn" role="status">@if (skipped()) {Pominięto {{ skipped() }} {{ zdjeciaForm(skipped()) }} — limit to {{ max() }} na wpis.}</p>
    </div>

    @if (queue.items().length) {
      <ul class="queue" aria-label="Wysyłane zdjęcia">
        @for (item of queue.items(); track item.id) {
          @if (item.status !== 'done') {
            <li>
              <span class="name">{{ item.file.name }}</span>
              @if (item.status === 'error') {
                <span class="status">błąd</span>
                <span class="error" role="alert">{{ item.error }}</span>
                @if (canRetry(item.file) && freeSlots() > 0) {
                  <p-button data-test="retry" label="Ponów" size="small" [text]="true" (onClick)="queue.retry(item.id)" />
                }
                <p-button data-test="remove-failed" label="Usuń" size="small" [text]="true" severity="secondary" (onClick)="queue.remove(item.id)" />
              } @else {
                <p-progressbar [value]="item.progress" [showValue]="false" [style]="{ height: '.5rem', width: '10rem' }" [attr.aria-label]="'Postęp ' + item.file.name" />
              }
            </li>
          }
        }
      </ul>
    }

    <ul class="grid" cdkDropList cdkDropListOrientation="mixed" (cdkDropListDropped)="reorder($event)" aria-label="Zdjęcia wpisu (przeciągnij, aby zmienić kolejność)">
      @for (img of images(); track img.file; let i = $index) {
        <li cdkDrag>
          <span class="handle" cdkDragHandle aria-hidden="true"><i class="pi pi-arrows-alt"></i></span>
          <img [src]="url(img.thumb)" [alt]="img.alt" />
          <label>
            <span class="sr-only">Opis zdjęcia {{ i + 1 }}</span>
            <input type="text" placeholder="Opis zdjęcia (dla niewidomych)" [ngModel]="img.alt" (ngModelChange)="setAlt(i, $event)" maxlength="300" />
          </label>
          <div class="actions">
            <p-button icon="pi pi-arrow-left" [text]="true" size="small" [disabled]="i === 0" [ariaLabel]="'Przesuń zdjęcie ' + (i + 1) + ' w lewo'" (onClick)="move(i, i - 1)" />
            <p-button icon="pi pi-arrow-right" [text]="true" size="small" [disabled]="i === images().length - 1" [ariaLabel]="'Przesuń zdjęcie ' + (i + 1) + ' w prawo'" (onClick)="move(i, i + 1)" />
            <p-button icon="pi pi-trash" [text]="true" size="small" severity="danger" [ariaLabel]="'Usuń zdjęcie ' + (i + 1)" (onClick)="removeImage(i)" />
          </div>
        </li>
      }
    </ul>
  `,
  styles: `
    .drop { border: 2px dashed var(--app-primary-300); border-radius: 1rem; padding: 1.5rem; text-align: center; }
    .drop.over { background: var(--app-primary-50); }
    .hint { font-size: .875rem; color: #4b5563; }
    .warn { color: #92400e; font-weight: 600; }
    .queue { list-style: none; padding: 0; }
    .queue li { display: flex; gap: .75rem; align-items: center; padding: .25rem 0; }
    .status { font-weight: 700; color: #b91c1c; }
    .error { color: #b91c1c; }
    .grid { list-style: none; padding: 0; display: grid; gap: .75rem; grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr)); }
    .grid li { border: 1px solid #e5e7eb; border-radius: .5rem; padding: .5rem; background: #fff; }
    .handle { cursor: move; display: inline-block; padding: .25rem; }
    .p-button:has(input:focus-visible) { outline: 3px solid #1d4ed8; outline-offset: 2px; }
    .grid img { width: 100%; height: 8rem; object-fit: cover; border-radius: .25rem; }
    .grid input { width: 100%; box-sizing: border-box; margin-top: .25rem; }
    .actions { display: flex; justify-content: space-between; }
  `,
})
export class ImageUploaderComponent {
  readonly images = model.required<PostImage[]>();
  readonly context = input.required<'posts' | 'content'>();
  readonly max = input(30);
  /** Domyślny opis (alt) nowo dodanych zdjęć, np. tytuł wpisu. */
  readonly defaultAlt = input('');
  readonly busyChange = output<boolean>();
  protected readonly dragOver = signal(false);
  protected readonly skipped = signal(0);
  protected readonly url = uploadUrl;
  protected readonly zdjeciaForm = zdjeciaForm;

  private readonly processors = { posts: createUploadProcessor('posts'), content: createUploadProcessor('content') };
  /** Pliki odrzucone jako nieobsługiwany format: ponowienie nie ma sensu. */
  private readonly unsupported = new WeakSet<File>();
  /** Zdjęcie z kolejki (ścieżka pliku) → pozycja w kolejce (id rośnie w kolejności wybrania). */
  private readonly queuePosition = new Map<string, number>();

  readonly queue = new UploadQueue(async (file, onProgress): Promise<UploadedImage> => {
    try {
      return await this.processors[this.context()](file, onProgress);
    } catch (e) {
      if (e instanceof UnsupportedImageError) this.unsupported.add(file);
      throw e;
    }
  });

  constructor() {
    this.queue.onDone = (item) => this.insertInSelectionOrder(item.id, { ...item.result, alt: this.defaultAlt() });
    effect(() => this.busyChange.emit(this.queue.busy()));
    inject(DestroyRef).onDestroy(() => (this.queue.onDone = () => undefined));
  }

  /**
   * Wysyłki kończą się w dowolnej kolejności (3 naraz, różne rozmiary); zdjęcie trafia przed pierwsze zdjęcie
   * z kolejki wybrane później od niego — kolejność zostaje taka, jak przy wyborze. Zdjęcia zapisane wcześniej zostają na miejscu.
   */
  private insertInSelectionOrder(position: number, img: PostImage): void {
    this.queuePosition.set(img.file, position);
    this.images.update((list) => {
      const at = list.findIndex((other) => (this.queuePosition.get(other.file) ?? -1) > position);
      return at === -1 ? [...list, img] : [...list.slice(0, at), img, ...list.slice(at)];
    });
  }

  protected canRetry(file: File): boolean {
    return !this.unsupported.has(file);
  }

  /** Wolne miejsca: limit − zapisane − aktywne w kolejce (błędne nie zajmują miejsca). */
  protected freeSlots(): number {
    const active = this.queue.items().filter((i) => i.status !== 'done' && i.status !== 'error').length;
    return this.max() - this.images().length - active;
  }

  addFiles(files: File[]): void {
    const { rejected } = this.queue.add(files, this.freeSlots());
    this.skipped.set(rejected);
  }

  protected onPick(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.addFiles([...(input.files ?? [])]);
    input.value = '';
  }

  protected onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragOver.set(false);
    this.addFiles([...(e.dataTransfer?.files ?? [])].filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name)));
  }

  protected setAlt(i: number, alt: string): void {
    this.images.update((list) => list.map((img, idx) => (idx === i ? { ...img, alt } : img)));
  }

  protected move(from: number, to: number): void {
    this.images.update((list) => {
      const copy = [...list];
      moveItemInArray(copy, from, to);
      return copy;
    });
  }

  protected reorder(e: CdkDragDrop<PostImage[]>): void {
    this.move(e.previousIndex, e.currentIndex);
  }

  protected removeImage(i: number): void {
    this.images.update((list) => list.filter((_, idx) => idx !== i));
  }
}
