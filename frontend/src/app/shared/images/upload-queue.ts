import { computed, signal } from '@angular/core';
import { UploadedImage } from '../../core/models';

export interface QueueItem {
  id: number;
  file: File;
  status: 'pending' | 'working' | 'done' | 'error';
  progress: number;
  result?: UploadedImage;
  error?: string;
}

type Processor = (file: File, onProgress: (pct: number) => void) => Promise<UploadedImage>;

export class UploadQueue {
  readonly items = signal<QueueItem[]>([]);
  readonly busy = computed(() => this.items().some((i) => i.status === 'pending' || i.status === 'working'));
  onDone: (item: QueueItem & { result: UploadedImage }) => void = () => undefined;
  private nextId = 1;
  private running = 0;

  constructor(private readonly process: Processor, private readonly concurrency = 3) {}

  add(files: File[], limit: number): { accepted: number; rejected: number } {
    const accepted = files.slice(0, Math.max(0, limit));
    this.items.update((list) => [
      ...list,
      ...accepted.map((file) => ({ id: this.nextId++, file, status: 'pending' as const, progress: 0 })),
    ]);
    this.pump();
    return { accepted: accepted.length, rejected: files.length - accepted.length };
  }

  retry(id: number): void {
    if (this.items().find((i) => i.id === id)?.status !== 'error') return;
    this.patch(id, { status: 'pending', progress: 0, error: undefined });
    this.pump();
  }

  remove(id: number): void {
    this.items.update((list) => list.filter((i) => i.id !== id || i.status === 'working'));
  }

  private pump(): void {
    while (this.running < this.concurrency) {
      const next = this.items().find((i) => i.status === 'pending');
      if (!next) return;
      this.running++;
      this.patch(next.id, { status: 'working' });
      this.process(next.file, (progress) => this.patch(next.id, { progress }))
        .then((result) => {
          this.patch(next.id, { status: 'done', progress: 100, result });
          try {
            this.onDone({ ...this.items().find((i) => i.id === next.id)!, result });
          } catch (e) {
            console.error(e);
          }
        })
        .catch((e: unknown) => this.patch(next.id, { status: 'error', error: e instanceof Error ? e.message : 'Nie udało się wysłać zdjęcia.' }))
        .finally(() => {
          this.running--;
          this.pump();
        });
    }
  }

  private patch(id: number, changes: Partial<QueueItem>): void {
    this.items.update((list) => list.map((i) => (i.id === id ? { ...i, ...changes } : i)));
  }
}
