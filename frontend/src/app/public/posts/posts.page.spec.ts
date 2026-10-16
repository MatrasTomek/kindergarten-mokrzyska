import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { Post } from '../../core/models';
import { PostsPage } from './posts.page';

const post = (i: number): Post => ({
  id: `${i}`, title: `Wpis ${i}`, slug: `wpis-${i}`, excerpt: 'Zajawka', body: '', status: 'published',
  publishedAt: '2026-10-15T12:00:00+02:00', targets: { news: true, groupIds: [] },
  images: [{ file: 'posts/a.webp', thumb: 'posts/a_thumb.webp', w: 4, h: 3, alt: 'Dzieci' }],
});

describe('PostsPage', () => {
  function setup(mode: 'news' | 'life') {
    TestBed.configureTestingModule({
      imports: [PostsPage],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), providePrimeNG()],
    });
    const f = TestBed.createComponent(PostsPage);
    f.componentRef.setInput('mode', mode);
    f.detectChanges();
    TestBed.tick();
    return { f, http: TestBed.inject(HttpTestingController) };
  }

  it('loads news with news=1 and renders cards', () => {
    const { f, http } = setup('news');
    http.expectOne('/api/posts?page=1&news=1').flush({ items: [post(1), post(2)], page: 1, pages: 1, total: 2 });
    f.detectChanges();
    const el: HTMLElement = f.nativeElement;
    expect(el.querySelector('h1')!.textContent).toBe('Aktualności');
    expect([...el.querySelectorAll('article h2 a')].map((a) => a.getAttribute('href'))).toEqual(['/wpis/wpis-1', '/wpis/wpis-2']);
    expect(el.querySelector('article img')!.getAttribute('src')).toBe('/uploads/posts/a_thumb.webp');
  });

  it('shows empty state and errors', () => {
    const { f, http } = setup('life');
    http.expectOne('/api/posts?page=1').flush({ items: [], page: 1, pages: 1, total: 0 });
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Brak wpisów.');
  });

  it('shows error message from API', () => {
    const { f, http } = setup('life');
    http.expectOne('/api/posts?page=1').flush('x', { status: 0, statusText: 'offline' });
    f.detectChanges();
    expect(f.nativeElement.querySelector('[role=alert]').textContent).toContain('Brak połączenia');
  });
});
