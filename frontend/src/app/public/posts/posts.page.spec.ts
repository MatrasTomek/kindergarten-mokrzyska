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

  it('keeps the current page visible while the next one loads, then focuses the list', async () => {
    const { f, http } = setup('news');
    document.body.appendChild(f.nativeElement);
    const page1 = Array.from({ length: 12 }, (_, i) => post(i + 1));
    http.expectOne('/api/posts?page=1&news=1').flush({ items: page1, page: 1, pages: 2, total: 13 });
    f.detectChanges();
    const el: HTMLElement = f.nativeElement;
    (el.querySelector('.p-paginator-next') as HTMLButtonElement).click();
    f.detectChanges();
    TestBed.tick();
    const req = http.expectOne('/api/posts?page=2&news=1');
    f.detectChanges();
    // Poprzednie wpisy i paginator zostają; postęp tylko w regionie statusu.
    expect(el.querySelectorAll('article')).toHaveLength(12);
    expect(el.querySelector('p-paginator')).not.toBeNull();
    expect(el.querySelector('[role=status]')!.textContent).toContain('Ładowanie…');
    expect(el.querySelector('ul.grid')!.getAttribute('aria-busy')).toBe('true');
    req.flush({ items: [post(13)], page: 2, pages: 2, total: 13 });
    f.detectChanges();
    await f.whenStable();
    const list = el.querySelector('ul.grid') as HTMLElement;
    expect(el.querySelectorAll('article')).toHaveLength(1);
    expect(list.hasAttribute('aria-busy')).toBe(false);
    expect(el.querySelector('[role=status]')!.textContent!.trim()).toBe('');
    expect(list.getAttribute('tabindex')).toBe('-1');
    expect(list.getAttribute('aria-label')).toBe('Wpisy — strona 2 z 2');
    expect(document.activeElement).toBe(list);
    el.remove();
  });

  it('does not move focus when the first page loads', async () => {
    const { f, http } = setup('news');
    document.body.appendChild(f.nativeElement);
    (document.activeElement as HTMLElement | null)?.blur();
    http.expectOne('/api/posts?page=1&news=1').flush({ items: [post(1)], page: 1, pages: 1, total: 1 });
    f.detectChanges();
    await f.whenStable();
    expect(document.activeElement).toBe(document.body);
    f.nativeElement.remove();
  });
});
