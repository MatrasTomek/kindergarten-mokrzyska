import { UploadedImage } from '../../core/models';
import { UploadQueue } from './upload-queue';

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
const file = (name: string) => new File(['x'], name, { type: 'image/jpeg' });
const result = (n: string): UploadedImage => ({ file: `posts/${n}.webp`, thumb: `posts/${n}_thumb.webp`, w: 1, h: 1 });
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('UploadQueue', () => {
  it('runs at most 3 at once and reports done items', async () => {
    const jobs = new Map<string, ReturnType<typeof deferred<UploadedImage>>>();
    let running = 0;
    let maxRunning = 0;
    const q = new UploadQueue(async (f) => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      const d = deferred<UploadedImage>();
      jobs.set(f.name, d);
      try { return await d.promise; } finally { running--; }
    });
    const done: string[] = [];
    q.onDone = (item) => done.push(item.result.file);

    q.add(['a', 'b', 'c', 'd', 'e'].map(file), 30);
    await flush();
    expect(jobs.size).toBe(3);
    expect(q.busy()).toBe(true);

    for (const n of ['a', 'b', 'c', 'd', 'e']) {
      await flush();
      jobs.get(n)!.resolve(result(n));
    }
    await flush();
    await flush();
    expect(maxRunning).toBe(3);
    expect(done).toEqual(['posts/a.webp', 'posts/b.webp', 'posts/c.webp', 'posts/d.webp', 'posts/e.webp']);
    expect(q.busy()).toBe(false);
  });

  it('marks failed item as error without stopping others, and retries it', async () => {
    let failHeic = true;
    const q = new UploadQueue(async (f) => {
      if (f.name.endsWith('.heic') && failHeic) throw new Error('Nieobsługiwany format zdjęcia');
      return result(f.name);
    });
    q.add([file('a.jpg'), file('b.heic'), file('c.jpg')], 30);
    await flush(); await flush();

    expect(q.items().map((i) => i.status)).toEqual(['done', 'error', 'done']);
    expect(q.items()[1].error).toBe('Nieobsługiwany format zdjęcia');

    failHeic = false;
    q.retry(q.items()[1].id);
    await flush(); await flush();
    expect(q.items()[1].status).toBe('done');
  });

  it('respects the limit of remaining slots', () => {
    const q = new UploadQueue(() => new Promise(() => undefined));
    expect(q.add(Array.from({ length: 5 }, (_, i) => file(`${i}.jpg`)), 3)).toEqual({ accepted: 3, rejected: 2 });
    expect(q.items()).toHaveLength(3);
  });

  it('retry ignores items that are not in error state', async () => {
    let calls = 0;
    const q = new UploadQueue(async (f) => { calls++; return result(f.name); });
    q.add([file('a.jpg')], 30);
    await flush(); await flush();
    q.retry(q.items()[0].id);
    await flush(); await flush();
    expect(calls).toBe(1);
  });

  it('keeps an uploaded item done when onDone throws', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const q = new UploadQueue(async (f) => result(f.name));
    q.onDone = () => { throw new Error('boom'); };
    q.add([file('a.jpg')], 30);
    await flush(); await flush();
    expect(q.items()[0].status).toBe('done');
    expect(log).toHaveBeenCalledTimes(1);
    log.mockRestore();
  });
});
