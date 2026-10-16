import { TestBed } from '@angular/core/testing';
import { ImageResizer } from './image-resizer.service';

class FakeWorker {
  static last: FakeWorker;
  onmessage: ((e: unknown) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  onmessageerror: ((e: unknown) => void) | null = null;
  terminated = false;
  constructor() { FakeWorker.last = this; }
  postMessage() { /* never answers */ }
  terminate() { this.terminated = true; }
}

describe('ImageResizer', () => {
  beforeEach(() => {
    vi.stubGlobal('Worker', FakeWorker);
    vi.stubGlobal('OffscreenCanvas', class {});
  });
  afterEach(() => vi.unstubAllGlobals());
  const file = () => new File(['x'], 'a.jpg');

  it('rejects all pending requests with a Polish message when the worker errors', async () => {
    const r = TestBed.inject(ImageResizer);
    const a = r.resize(file());
    const b = r.resize(file());
    FakeWorker.last.onerror!({});
    await expect(a).rejects.toThrow('Nie udało się przetworzyć zdjęcia');
    await expect(b).rejects.toThrow('Nie udało się przetworzyć zdjęcia');
    expect(FakeWorker.last.terminated).toBe(true);
  });

  it('rejects pending requests on destroy', async () => {
    const r = TestBed.inject(ImageResizer);
    const a = r.resize(file());
    r.ngOnDestroy();
    await expect(a).rejects.toThrow('Nie udało się przetworzyć zdjęcia');
  });

  it('falls back to the main thread after a worker failure', async () => {
    const r = TestBed.inject(ImageResizer);
    const first = r.resize(file());
    FakeWorker.last.onerror!({});
    await first.catch(() => undefined);
    const before = FakeWorker.last;
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new DOMException('x', 'InvalidStateError')));
    await expect(r.resize(file())).rejects.toThrow('Nieobsługiwany format');
    expect(FakeWorker.last).toBe(before);
  });
});
