import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, OnDestroy, PLATFORM_ID } from '@angular/core';
import { resizeImage } from './image-resize';

type Result = { image: Blob; thumb: Blob };
type Reply = { id: number; ok: true; image: Blob; thumb: Blob } | { id: number; ok: false; error: string };

@Injectable({ providedIn: 'root' })
export class ImageResizer implements OnDestroy {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private worker: Worker | null = null;
  private workerFailed = false;
  private seq = 0;
  private readonly pending = new Map<number, { resolve: (r: Result) => void; reject: (e: Error) => void }>();

  resize(file: File): Promise<Result> {
    const worker = this.getWorker();
    if (!worker) return resizeImage(file);
    const id = ++this.seq;
    return new Promise<Result>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      worker.postMessage({ id, file });
    });
  }

  ngOnDestroy(): void {
    this.dropWorker();
  }

  /** Kończy workera i odrzuca wszystkie oczekujące żądania, żeby kolejka nie zawisła. */
  private dropWorker(): void {
    this.worker?.terminate();
    this.worker = null;
    const waiting = [...this.pending.values()];
    this.pending.clear();
    for (const p of waiting) p.reject(new Error('Nie udało się przetworzyć zdjęcia. Spróbuj ponownie.'));
  }

  private getWorker(): Worker | null {
    if (this.worker) return this.worker;
    if (this.workerFailed || !this.browser || typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') return null;
    this.worker = new Worker(new URL('./image-resize.worker', import.meta.url), { type: 'module' });
    const fail = () => {
      this.workerFailed = true;
      this.dropWorker();
    };
    this.worker.onerror = fail;
    this.worker.onmessageerror = fail;
    this.worker.onmessage = ({ data }: MessageEvent<Reply>) => {
      const p = this.pending.get(data.id);
      if (!p) return;
      this.pending.delete(data.id);
      if (data.ok) p.resolve({ image: data.image, thumb: data.thumb });
      else p.reject(new Error(data.error));
    };
    return this.worker;
  }
}
