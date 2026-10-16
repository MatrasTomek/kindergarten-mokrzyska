import { TestBed } from '@angular/core/testing';
import { HttpEventType, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { providePrimeNG } from 'primeng/config';
import { AdminApi } from '../../core/api/admin-api';
import { PostImage } from '../../core/models';
import { ImageResizer } from './image-resizer.service';
import { ImageUploaderComponent } from './image-uploader.component';
import { UnsupportedImageError } from './image-resize';
import { zdjeciaForm } from './image-uploader.component';

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('ImageUploaderComponent', () => {
  function setup(existing: PostImage[] = [], defaultAlt?: string) {
    TestBed.configureTestingModule({
      imports: [ImageUploaderComponent],
      providers: [
        providePrimeNG(),
        {
          provide: ImageResizer,
          useValue: {
            resize: async (f: File) => {
              if (f.name.endsWith('.heic')) throw new UnsupportedImageError();
              if (f.name === 'bad.jpg') throw new Error('Nie udało się przetworzyć zdjęcia. Spróbuj ponownie.');
              return { image: new Blob(['i'], { type: 'image/webp' }), thumb: new Blob(['t'], { type: 'image/webp' }) };
            },
          },
        },
        {
          provide: AdminApi,
          useValue: {
            uploadImage: () => of(
              { type: HttpEventType.UploadProgress, loaded: 5, total: 10 },
              new HttpResponse({ body: { file: 'posts/2026/10/x.webp', thumb: 'posts/2026/10/x_thumb.webp', w: 10, h: 5 } }),
            ),
          },
        },
      ],
    });
    const f = TestBed.createComponent(ImageUploaderComponent);
    f.componentRef.setInput('images', existing);
    f.componentRef.setInput('context', 'posts');
    if (defaultAlt !== undefined) f.componentRef.setInput('defaultAlt', defaultAlt);
    f.detectChanges();
    return f;
  }
  const saved = (n: number): PostImage[] =>
    Array.from({ length: n }, (_, i) => ({ file: `posts/${i}.webp`, thumb: `posts/${i}_t.webp`, w: 1, h: 1, alt: '' }));

  it('uploads selected files and appends them to images', async () => {
    const f = setup();
    f.componentInstance.addFiles([new File(['a'], 'a.jpg', { type: 'image/jpeg' })]);
    await flush(); await flush();
    f.detectChanges();
    expect(f.componentInstance.images()).toEqual([{ file: 'posts/2026/10/x.webp', thumb: 'posts/2026/10/x_thumb.webp', w: 10, h: 5, alt: '' }]);
    expect(f.nativeElement.querySelector('img').getAttribute('src')).toBe('/uploads/posts/2026/10/x_thumb.webp');
  });

  it('defaults alt of new photos to the provided post title', async () => {
    const f = setup([], 'Wycieczka do zoo');
    f.componentInstance.addFiles([new File(['a'], 'a.jpg', { type: 'image/jpeg' })]);
    await flush(); await flush();
    expect(f.componentInstance.images()[0].alt).toBe('Wycieczka do zoo');
  });

  it('shows HEIC error while other files succeed; retry is not offered for unsupported format', async () => {
    const f = setup();
    f.componentInstance.addFiles([new File(['a'], 'a.heic'), new File(['b'], 'b.jpg', { type: 'image/jpeg' })]);
    await flush(); await flush();
    f.detectChanges();
    expect(f.componentInstance.images()).toHaveLength(1);
    expect(f.nativeElement.querySelector('[role=alert]').textContent).toContain('HEIC');
    expect(f.nativeElement.textContent).toContain('błąd');
    expect(f.nativeElement.querySelector('[data-test=retry]')).toBeNull();
    expect(f.nativeElement.querySelector('[data-test=remove-failed]')).not.toBeNull();
  });

  it('rejects files above the 30 limit with a message', () => {
    const f = setup(saved(29));
    f.componentInstance.addFiles([new File(['a'], 'a.jpg'), new File(['b'], 'b.jpg')]);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Pominięto 1 zdjęcie — limit to 30');
  });

  it('counts saved images against the limit (28 saved, 5 added -> 2 queued)', () => {
    const f = setup(saved(28));
    f.componentInstance.addFiles(Array.from({ length: 5 }, (_, i) => new File(['a'], `f${i}.jpg`)));
    f.detectChanges();
    expect(f.componentInstance.queue.items()).toHaveLength(2);
    expect(f.nativeElement.textContent).toContain('Pominięto 3 zdjęcia — limit to 30');
  });

  it('moves images with the keyboard-accessible buttons', () => {
    const f = setup(saved(2));
    const buttons = f.nativeElement.querySelectorAll('.grid li')[0].querySelectorAll('button');
    const right = [...buttons].find((b: HTMLButtonElement) => b.getAttribute('aria-label') === 'Przesuń zdjęcie 1 w prawo') as HTMLButtonElement;
    right.click();
    expect(f.componentInstance.images().map((i) => i.file)).toEqual(['posts/1.webp', 'posts/0.webp']);
  });

  it('uses correct Polish plural forms', () => {
    expect([1, 2, 3, 5, 12, 14, 22, 25].map(zdjeciaForm)).toEqual(['zdjęcie', 'zdjęcia', 'zdjęcia', 'zdjęć', 'zdjęć', 'zdjęć', 'zdjęcia', 'zdjęć']);
  });

  it('keeps the status live region permanently in the DOM', () => {
    const f = setup();
    const region = f.nativeElement.querySelector('[role=status]');
    expect(region).not.toBeNull();
    expect(region.textContent.trim()).toBe('');
    f.componentInstance.addFiles(Array.from({ length: 31 }, (_, i) => new File(['a'], `f${i}.jpg`)));
    f.detectChanges();
    expect(f.nativeElement.querySelector('[role=status]')).toBe(region);
    expect(region.textContent).toContain('Pominięto 1 zdjęcie');
  });

  it('has a dedicated drag handle button per photo', () => {
    const f = setup(saved(2));
    expect(f.nativeElement.querySelectorAll('.grid li [cdkDragHandle], .grid li .handle')).toHaveLength(2);
    const h = f.nativeElement.querySelector('.grid li .handle');
    expect(h.tagName).toBe('SPAN'); // not a tab stop: keyboard reorder uses the arrow buttons
    expect(h.getAttribute('aria-hidden')).toBe('true');
  });

  it('hides retry when no free slot remains', async () => {
    const f = setup(saved(29));
    f.componentInstance.addFiles([new File(['a'], 'bad.jpg')]);
    await flush(); await flush();
    f.detectChanges();
    expect(f.nativeElement.querySelector('[data-test=retry]')).not.toBeNull();
    f.componentInstance.addFiles([new File(['b'], 'ok.jpg', { type: 'image/jpeg' })]);
    await flush(); await flush();
    f.detectChanges();
    expect(f.componentInstance.images()).toHaveLength(30);
    expect(f.nativeElement.querySelector('[data-test=retry]')).toBeNull();
  });
});
