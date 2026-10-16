import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { PostDetailPage } from './post-detail.page';

describe('PostDetailPage', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [PostDetailPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), providePrimeNG()],
    });
    const f = TestBed.createComponent(PostDetailPage);
    f.componentRef.setInput('slug', 'bal');
    f.detectChanges();
    TestBed.tick();
    return { f, http: TestBed.inject(HttpTestingController) };
  }

  it('renders post and sets document title', () => {
    const { f, http } = setup();
    http.expectOne('/api/posts/bal').flush({
      id: '1', title: 'Bal', slug: 'bal', excerpt: '', body: '<p>Było super</p>', status: 'published',
      publishedAt: '2026-10-15T12:00:00+02:00', targets: { news: false, groupIds: [] }, images: [],
    });
    f.detectChanges();
    expect(f.nativeElement.querySelector('h1').textContent).toBe('Bal');
    expect(f.nativeElement.querySelector('.rich').innerHTML).toContain('Było super');
    expect(f.nativeElement.querySelector('time').getAttribute('datetime')).toBe('2026-10-15T12:00:00+02:00');
    expect(TestBed.inject(Title).getTitle()).toBe('Bal – Przedszkole Parafialne w Mokrzyskach');
  });

  it('shows not-found message on 404', () => {
    const { f, http } = setup();
    http.expectOne('/api/posts/bal').flush({ error: { code: 'NOT_FOUND', message: 'Nie znaleziono.' } }, { status: 404, statusText: 'Not Found' });
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Nie znaleziono wpisu');
  });
});
