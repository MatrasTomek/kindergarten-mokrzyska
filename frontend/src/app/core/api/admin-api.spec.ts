import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminApi } from './admin-api';

describe('AdminApi', () => {
  it('sends image, thumb and context as multipart with extensions from blob type', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const api = TestBed.inject(AdminApi);
    const http = TestBed.inject(HttpTestingController);

    api.uploadImage(new Blob(['a'], { type: 'image/webp' }), new Blob(['b'], { type: 'image/jpeg' }), 'posts').subscribe();

    const req = http.expectOne('/api/admin/uploads/image');
    const body = req.request.body as FormData;
    expect(req.request.method).toBe('POST');
    expect((body.get('image') as File).name).toBe('image.webp');
    expect((body.get('thumb') as File).name).toBe('thumb.jpg');
    expect(body.get('context')).toBe('posts');
    expect(req.request.reportProgress).toBe(true);
    http.verify();
  });
});
