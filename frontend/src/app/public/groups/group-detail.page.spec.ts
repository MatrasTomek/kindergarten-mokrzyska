import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { GroupDetailPage } from './group-detail.page';
import { GroupsPage } from './groups.page';
import { groupColor } from '../../core/sections';

describe('Groups pages', () => {
  beforeEach(() => TestBed.configureTestingModule({
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), providePrimeNG()],
  }));

  it('lists groups as links', () => {
    const f = TestBed.createComponent(GroupsPage);
    f.detectChanges();
    TestBed.inject(HttpTestingController).expectOne('/api/groups').flush([
      { id: '1', name: 'Pingwinki', slug: 'pingwinki', order: 1, description: '' },
    ]);
    f.detectChanges();
    expect(f.nativeElement.querySelector('a[href="/grupy/pingwinki"]').textContent).toContain('Pingwinki');
  });

  it('paints each group tile in the next tile colour', () => {
    const f = TestBed.createComponent(GroupsPage);
    f.detectChanges();
    TestBed.inject(HttpTestingController).expectOne('/api/groups').flush([
      { id: '1', name: 'Ananaski', slug: 'ananaski', order: 1, description: '' },
      { id: '2', name: 'Pingwinki', slug: 'pingwinki', order: 2, description: '' },
    ]);
    f.detectChanges();
    const links = [...f.nativeElement.querySelectorAll('.groups a')] as HTMLElement[];
    expect(links.map((a) => a.style.getPropertyValue('--section'))).toEqual([groupColor(0), groupColor(1)]);
    expect(f.nativeElement.querySelector('app-page-header h1').textContent).toBe('Grupy');
  });

  it('loads group and its posts', () => {
    const f = TestBed.createComponent(GroupDetailPage);
    f.componentRef.setInput('slug', 'pingwinki');
    f.detectChanges();
    TestBed.tick();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/groups/pingwinki').flush({ id: '1', name: 'Pingwinki', slug: 'pingwinki', order: 1, description: 'Grupa 3-latków' });
    http.expectOne('/api/posts?page=1&group=pingwinki').flush({ items: [], page: 1, pages: 1, total: 0 });
    f.detectChanges();
    expect(f.nativeElement.querySelector('h1').textContent).toBe('Pingwinki');
    expect([...f.nativeElement.querySelectorAll('nav[aria-label="Ścieżka"] li')].map((li: Element) => li.textContent!.trim())).toEqual(['Start', 'Grupy', 'Pingwinki']);
    expect(f.nativeElement.textContent).toContain('Grupa 3-latków');
    expect(TestBed.inject(Title).getTitle()).toBe('Pingwinki – Przedszkole Parafialne w Mokrzyskach');
  });

  it('shows a not-found state with its own title for an unknown group', () => {
    const f = TestBed.createComponent(GroupDetailPage);
    f.componentRef.setInput('slug', 'nie-ma');
    f.detectChanges();
    TestBed.tick();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/groups/nie-ma').flush({}, { status: 404, statusText: 'Not Found' });
    http.expectOne('/api/posts?page=1&group=nie-ma').flush({}, { status: 404, statusText: 'Not Found' });
    f.detectChanges();
    expect(f.nativeElement.querySelector('h1').textContent).toBe('Nie ma takiej grupy');
    expect(f.nativeElement.querySelector('a[href="/grupy"]')).not.toBeNull();
    expect(TestBed.inject(Title).getTitle()).toBe('Nie ma takiej grupy – Przedszkole Parafialne w Mokrzyskach');
  });

  it('resets state when the slug changes', () => {
    const f = TestBed.createComponent(GroupDetailPage);
    f.componentRef.setInput('slug', 'nie-ma');
    f.detectChanges();
    TestBed.tick();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/groups/nie-ma').flush({}, { status: 404, statusText: 'Not Found' });
    http.expectOne('/api/posts?page=1&group=nie-ma').flush({}, { status: 404, statusText: 'Not Found' });
    f.componentRef.setInput('slug', 'pingwinki');
    f.detectChanges();
    TestBed.tick();
    http.expectOne('/api/groups/pingwinki').flush({ id: '1', name: 'Pingwinki', slug: 'pingwinki', order: 1, description: '' });
    http.expectOne('/api/posts?page=1&group=pingwinki').flush({ items: [], page: 1, pages: 1, total: 0 });
    f.detectChanges();
    expect(f.nativeElement.querySelector('h1').textContent).toBe('Pingwinki');
  });

  it('keeps the posts of the group visible while the next page loads', () => {
    const f = TestBed.createComponent(GroupDetailPage);
    f.componentRef.setInput('slug', 'pingwinki');
    f.detectChanges();
    TestBed.tick();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/groups/pingwinki').flush({ id: '1', name: 'Pingwinki', slug: 'pingwinki', order: 1, description: '' });
    const items = Array.from({ length: 12 }, (_, i) => ({
      id: `${i}`, title: `Wpis ${i}`, slug: `wpis-${i}`, excerpt: '', body: '', status: 'published',
      publishedAt: null, targets: { news: false, groupIds: ['1'] }, images: [],
    }));
    http.expectOne('/api/posts?page=1&group=pingwinki').flush({ items, page: 1, pages: 2, total: 13 });
    f.detectChanges();
    (f.nativeElement.querySelector('.p-paginator-next') as HTMLButtonElement).click();
    f.detectChanges();
    TestBed.tick();
    http.expectOne('/api/posts?page=2&group=pingwinki');
    f.detectChanges();
    expect(f.nativeElement.querySelectorAll('article')).toHaveLength(12);
    expect(f.nativeElement.querySelector('[role=status]').textContent).toContain('Ładowanie…');
  });
});
