import { HttpEventType, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ImageResizer } from './image-resizer.service';
import { UploadQueue } from './upload-queue';
import { createUploadProcessor } from './upload-processor';

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('createUploadProcessor', () => {
  let http: HttpTestingController;
  let queue: UploadQueue;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(), provideHttpClientTesting(),
        { provide: ImageResizer, useValue: { resize: async () => ({ image: new Blob(['i'], { type: 'image/webp' }), thumb: new Blob(['t'], { type: 'image/webp' }) }) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    queue = new UploadQueue(TestBed.runInInjectionContext(() => createUploadProcessor('posts')));
  });

  it('feeds upload progress events into the queue item and resolves with the response', async () => {
    queue.add([new File(['x'], 'a.jpg', { type: 'image/jpeg' })], 30);
    await flush();
    const req = http.expectOne((r) => r.url.endsWith('/admin/uploads/image'));
    req.event({ type: HttpEventType.UploadProgress, loaded: 40, total: 100 });
    expect(queue.items()[0].progress).toBe(40);
    req.flush({ file: 'posts/a.webp', thumb: 'posts/a_thumb.webp', w: 1, h: 1 });
    await flush();
    expect(queue.items()[0].status).toBe('done');
    expect(queue.items()[0].result?.file).toBe('posts/a.webp');
  });

  it('surfaces the backend Polish message on an HTTP error', async () => {
    queue.add([new File(['x'], 'a.jpg', { type: 'image/jpeg' })], 30);
    await flush();
    http.expectOne((r) => r.url.endsWith('/admin/uploads/image'))
      .flush({ error: { message: 'Uszkodzony obraz.' } }, { status: 400, statusText: 'Bad Request' });
    await flush();
    expect(queue.items()[0].status).toBe('error');
    expect(queue.items()[0].error).toBe('Uszkodzony obraz.');
  });

  it('uses Polish text for non-HTTP errors', async () => {
    const q = new UploadQueue(TestBed.runInInjectionContext(() => createUploadProcessor('posts')));
    q.add([new File(['x'], 'a.jpg', { type: 'image/jpeg' })], 30);
    await flush();
    const req = http.expectOne((r) => r.url.endsWith('/admin/uploads/image'));
    req.event({ type: HttpEventType.Sent });
    req.error(new ProgressEvent('error'));
    await flush();
    expect(q.items()[0].error).toMatch(/połączenia|Wystąpił błąd/);
  });
});
