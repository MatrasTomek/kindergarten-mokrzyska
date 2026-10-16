import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { AuthService } from '../core/auth/auth.service';
import { PostsAdminPage } from './posts-admin.page';

const page = {
  items: [{ id: 'p1', title: 'Bal', slug: 'bal', excerpt: '', body: '', images: [], targets: { news: false, groupIds: [] },
    status: 'draft', publishedAt: null, createdBy: '1', updatedBy: '1', createdAt: '2026-10-15T12:00:00+02:00', updatedAt: '2026-10-15T12:00:00+02:00' }],
  page: 1, pages: 1, total: 1,
};

describe('PostsAdminPage', () => {
  function render(isAdmin: boolean) {
    TestBed.configureTestingModule({
      imports: [PostsAdminPage],
      providers: [
        provideRouter([]), provideHttpClient(), provideHttpClientTesting(), providePrimeNG(),
        MessageService, ConfirmationService,
        { provide: AuthService, useValue: { isAdmin: signal(isAdmin) } },
      ],
    });
    const f = TestBed.createComponent(PostsAdminPage);
    f.detectChanges();
    TestBed.inject(HttpTestingController).expectOne('/api/admin/posts?page=1').flush(page);
    f.detectChanges();
    return f.nativeElement as HTMLElement;
  }

  it('admin sees delete', () => {
    const el = render(true);
    expect(el.textContent).toContain('Bal');
    expect(el.textContent).toContain('Szkic');
    expect(el.querySelector('[data-test=delete]')).not.toBeNull();
    expect(el.querySelector('a[href="/admin/wpisy/p1"]')).not.toBeNull();
  });

  it('user does not see delete', () => {
    expect(render(false).querySelector('[data-test=delete]')).toBeNull();
  });

  describe('loading and deleting', () => {
    function setup(first: unknown = page) {
      TestBed.configureTestingModule({
        imports: [PostsAdminPage],
        providers: [
          provideRouter([]), provideHttpClient(), provideHttpClientTesting(), providePrimeNG(),
          MessageService, ConfirmationService,
          { provide: AuthService, useValue: { isAdmin: signal(true) } },
        ],
      });
      const f = TestBed.createComponent(PostsAdminPage);
      const http = TestBed.inject(HttpTestingController);
      const confirm = TestBed.inject(ConfirmationService);
      f.detectChanges();
      if (first) http.expectOne('/api/admin/posts?page=1').flush(first);
      f.detectChanges();
      return { f, el: f.nativeElement as HTMLElement, http, confirm };
    }
    const click = (el: HTMLElement, sel: string) => (el.querySelector(sel) as HTMLElement).click();

    it('shows error with retry on load failure', () => {
      const { f, el, http } = setup(null);
      http.expectOne('/api/admin/posts?page=1').flush({}, { status: 500, statusText: 'x' });
      f.detectChanges();
      expect(el.querySelector('[role=alert]')!.textContent).toContain('Wystąpił błąd');
      expect(el.textContent).not.toContain('Ładowanie');
      click(el, '[data-test=retry] button, button[data-test=retry]');
      http.expectOne('/api/admin/posts?page=1').flush(page);
      f.detectChanges();
      expect(el.textContent).toContain('Bal');
      expect(el.querySelector('[role=alert]')).toBeNull();
    });

    it('confirm then DELETE then reload; cancel does nothing', () => {
      const { f, el, http, confirm } = setup();
      const spy = vi.spyOn(confirm, 'confirm');
      click(el, '[data-test=delete] button, button[data-test=delete]');
      const cfg = spy.mock.calls[0][0];
      http.expectNone('/api/admin/posts/p1');
      cfg.reject?.();
      http.expectNone('/api/admin/posts/p1');
      cfg.accept!();
      http.expectOne({ method: 'DELETE', url: '/api/admin/posts/p1' }).flush(null);
      http.expectOne('/api/admin/posts?page=1').flush({ ...page, items: [] });
      f.detectChanges();
      expect(el.textContent).toContain('Brak wpisów');
    });

    it('deleting last item on last page loads previous page', () => {
      const p2 = { ...page, page: 2, pages: 2, total: 21 };
      const { f, el, http, confirm } = setup({ ...page, pages: 2, total: 21 });
      const spy = vi.spyOn(confirm, 'confirm');
      // go to page 2
      (f.componentInstance as any).load(2);
      http.expectOne('/api/admin/posts?page=2').flush(p2);
      f.detectChanges();
      click(el, '[data-test=delete] button, button[data-test=delete]');
      spy.mock.calls[0][0].accept!();
      http.expectOne({ method: 'DELETE', url: '/api/admin/posts/p1' }).flush(null);
      http.expectOne('/api/admin/posts?page=2').flush({ ...p2, items: [], total: 20, pages: 1 });
      http.expectOne('/api/admin/posts?page=1').flush(page);
      f.detectChanges();
      expect(el.textContent).toContain('Bal');
    });

    it('ignores stale responses', () => {
      const { f, el, http } = setup();
      const inst = f.componentInstance as any;
      inst.load(2);
      inst.load(3);
      const reqs = [http.expectOne('/api/admin/posts?page=2'), http.expectOne('/api/admin/posts?page=3')];
      reqs[1].flush({ ...page, page: 3, pages: 3, items: [{ ...page.items[0], title: 'Trzecia' }] });
      f.detectChanges();
      expect(el.textContent).toContain('Trzecia');
    });
  });
});
