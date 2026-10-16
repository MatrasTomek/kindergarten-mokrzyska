import { encodeWithFallback, resizeImage, targetSize, UnsupportedImageError } from './image-resize';

describe('targetSize', () => {
  it('scales the longer side down and keeps aspect', () => {
    expect(targetSize(4000, 3000, 1920)).toEqual({ w: 1920, h: 1440 });
    expect(targetSize(3000, 4000, 400)).toEqual({ w: 300, h: 400 });
  });
  it('never upscales', () => {
    expect(targetSize(800, 600, 1920)).toEqual({ w: 800, h: 600 });
  });
});

describe('encodeWithFallback', () => {
  it('uses webp when supported', async () => {
    const blob = await encodeWithFallback(async (type) => new Blob(['x'], { type }), 0.8);
    expect(blob.type).toBe('image/webp');
  });
  it('falls back to jpeg when browser returns png for webp (Safari)', async () => {
    const calls: string[] = [];
    const blob = await encodeWithFallback(async (type) => {
      calls.push(type);
      return new Blob(['x'], { type: type === 'image/webp' ? 'image/png' : type });
    }, 0.8);
    expect(calls).toEqual(['image/webp', 'image/jpeg']);
    expect(blob.type).toBe('image/jpeg');
  });
});

describe('resizeImage', () => {
  const ops: string[] = [];
  const bitmap = { width: 4000, height: 3000, close: vi.fn() };

  class FakeOffscreen {
    constructor(public width: number, public height: number) {}
    getContext() {
      return {
        imageSmoothingQuality: '',
        fillStyle: '',
        fillRect: () => ops.push('fillRect'),
        drawImage: () => ops.push('drawImage'),
      };
    }
    async convertToBlob({ type }: { type: string }) {
      return new Blob(['x'], { type: type === 'image/webp' ? 'image/png' : type });
    }
  }

  beforeEach(() => {
    ops.length = 0;
    vi.stubGlobal('HTMLCanvasElement', undefined);
    vi.stubGlobal('OffscreenCanvas', FakeOffscreen);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('encodes through convertToBlob without needing HTMLCanvasElement (worker scope)', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap));
    const res = await resizeImage(new Blob(['x']));
    expect(res.image.type).toBe('image/jpeg');
    expect(res.thumb.type).toBe('image/jpeg');
  });

  it('fills the canvas white before drawing so JPEG fallback has no black transparency', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap));
    await resizeImage(new Blob(['x']));
    expect(ops.slice(0, 2)).toEqual(['fillRect', 'drawImage']);
  });

  it('retries createImageBitmap without options when the option is rejected with TypeError', async () => {
    const cib = vi.fn().mockImplementation(async (_f: Blob, opts?: unknown) => {
      if (opts) throw new TypeError('bad option');
      return bitmap;
    });
    vi.stubGlobal('createImageBitmap', cib);
    await expect(resizeImage(new Blob(['x']))).resolves.toBeDefined();
    expect(cib).toHaveBeenCalledTimes(2);
  });

  it('maps a decode failure (non-TypeError) to UnsupportedImageError', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new DOMException('x', 'InvalidStateError')));
    await expect(resizeImage(new Blob(['x']))).rejects.toBeInstanceOf(UnsupportedImageError);
  });
});
