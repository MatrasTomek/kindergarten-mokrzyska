import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { ContentPageComponent } from './content.page';
import { formatSize } from './format-size';

describe('formatSize', () => {
  it('formats KB and MB in Polish', () => {
    expect(formatSize(100)).toBe('1 KB');
    expect(formatSize(250 * 1024)).toBe('250 KB');
    expect(formatSize(2.5 * 1024 * 1024)).toBe('2,5 MB');
  });
});

describe('ContentPageComponent', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [ContentPageComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), providePrimeNG()],
    });
    const f = TestBed.createComponent(ContentPageComponent);
    f.componentRef.setInput('page', 'dokumenty');
    f.componentRef.setInput('heading', 'Dokumenty');
    f.detectChanges();
    TestBed.tick();
    return { f, http: TestBed.inject(HttpTestingController) };
  }

  it('renders items with PDF links', () => {
    const { f, http } = setup();
    http.expectOne('/api/content/dokumenty').flush([{
      id: '1', page: 'dokumenty', title: 'Statut', body: '<p>Aktualny statut</p>', order: 1, status: 'published', updatedAt: '',
      images: [], attachments: [{ file: 'docs/x.pdf', name: 'Statut.pdf', size: 204800 }],
    }]);
    f.detectChanges();
    const el: HTMLElement = f.nativeElement;
    expect(el.querySelector('h1')!.textContent).toBe('Dokumenty');
    expect(el.querySelector('h2')!.textContent).toBe('Statut');
    const link = el.querySelector('a[href="/uploads/docs/x.pdf"]')!;
    expect(link.textContent).toContain('Statut.pdf');
    expect(link.textContent).toContain('otwiera się w nowej karcie');
    expect(el.textContent).toContain('PDF, 200 KB');
  });

  it('shows placeholder when page is empty', () => {
    const { f, http } = setup();
    http.expectOne('/api/content/dokumenty').flush([]);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Treść w przygotowaniu.');
  });

  it('shows an alert and error title on API failure', () => {
    const { f, http } = setup();
    http.expectOne('/api/content/dokumenty').flush({ error: 'x' }, { status: 500, statusText: 'Err' });
    f.detectChanges();
    expect(f.nativeElement.querySelector('[role="alert"]')).toBeTruthy();
    expect(TestBed.inject(Title).getTitle()).toContain('Błąd');
  });

  it('reloads when the page input changes', () => {
    const { f, http } = setup();
    http.expectOne('/api/content/dokumenty').flush([]);
    f.componentRef.setInput('page', 'rodo');
    f.componentRef.setInput('heading', 'RODO');
    f.detectChanges();
    TestBed.tick();
    http.expectOne('/api/content/rodo').flush([]);
    f.detectChanges();
    expect(f.nativeElement.querySelector('h1').textContent).toBe('RODO');
  });
});
