import { TestBed } from '@angular/core/testing';
import { Component, input, model, output } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { Dialog } from 'primeng/dialog';
import { ContentItem, PostImage } from '../core/models';
import { ImageUploaderComponent } from '../shared/images/image-uploader.component';
import { RichTextComponent } from '../shared/rich-text.component';
import { ContentAdminPage } from './content-admin.page';

@Component({ selector: 'app-rich-text', template: '' })
class RichTextStub { value = model(''); label = input(''); }
@Component({ selector: 'app-image-uploader', template: '' })
class UploaderStub {
  images = model<PostImage[]>([]); context = input(''); max = input(30); defaultAlt = input('');
  busyChange = output<boolean>();
}

type Page = {
  selectPage: (p: string) => void; openNew: () => void; openEdit: (i: ContentItem) => void; uploadPdf: (f: File) => void;
  draft: { title: string; body: string; images: PostImage[]; attachments: unknown[] }; save: () => void; remove: (i: ContentItem) => void;
  requestClose: () => void; confirmLeave: () => Promise<boolean>; dialog: () => boolean;
};

const ITEM: ContentItem = {
  id: 'c1', page: 'dla-rodzicow', title: 'Opłaty', body: '<p>Stary <b>tekst</b></p>', attachments: [{ file: 'docs/x.pdf', name: 'x.pdf', size: 2048 }],
  images: [{ file: 'content/a.webp', thumb: 'content/a_t.webp', w: 10, h: 10, alt: '' }], order: 3, status: 'draft', updatedAt: '2026-01-01',
};

function setup(items: ContentItem[] = []) {
  TestBed.configureTestingModule({
    imports: [ContentAdminPage],
    providers: [provideHttpClient(), provideHttpClientTesting(), providePrimeNG(), MessageService, ConfirmationService],
  }).overrideComponent(ContentAdminPage, {
    remove: { imports: [RichTextComponent, ImageUploaderComponent] },
    add: { imports: [RichTextStub, UploaderStub] },
  });
  const f = TestBed.createComponent(ContentAdminPage);
  f.detectChanges();
  const http = TestBed.inject(HttpTestingController);
  http.expectOne('/api/admin/content?page=dla-rodzicow').flush(items);
  f.detectChanges();
  return { f, http, page: f.componentInstance as unknown as Page, confirm: TestBed.inject(ConfirmationService) };
}

describe('ContentAdminPage', () => {
  it('uploads a PDF and saves item with attachment for selected page', () => {
    const { http, page } = setup();
    page.selectPage('dokumenty');
    http.expectOne('/api/admin/content?page=dokumenty').flush([]);
    page.openNew();
    page.draft.title = 'Statut';
    page.uploadPdf(new File(['%PDF'], 'Statut.pdf', { type: 'application/pdf' }));
    http.expectOne('/api/admin/uploads/pdf').flush({ file: 'docs/a.pdf', name: 'Statut.pdf', size: 4 });
    page.save();

    const req = http.expectOne((r) => r.method === 'POST' && r.url === '/api/admin/content');
    expect(req.request.body).toEqual({
      page: 'dokumenty', title: 'Statut', body: '', attachments: [{ file: 'docs/a.pdf', name: 'Statut.pdf', size: 4 }],
      images: [], order: 1, status: 'published',
    });
  });

  it('shows stored body of an edited item in the editor and saves it unchanged (PF-1)', () => {
    const { f, http, page } = setup([ITEM]);
    page.openEdit(ITEM);
    f.detectChanges();
    const rt = f.debugElement.query(By.directive(RichTextStub)).componentInstance as RichTextStub;
    expect(rt.value()).toBe('<p>Stary <b>tekst</b></p>');
    page.save();
    const req = http.expectOne((r) => r.method === 'PUT' && r.url === '/api/admin/content/c1');
    expect(req.request.body.body).toBe('<p>Stary <b>tekst</b></p>');
    expect(req.request.body.attachments).toEqual(ITEM.attachments);
    expect(req.request.body.status).toBe('draft');
    expect(req.request.body.order).toBe(3);
  });

  it('fills empty image alt with the title and passes it as defaultAlt with content context', () => {
    const { f, http, page } = setup([ITEM]);
    page.openEdit(ITEM);
    f.detectChanges();
    const up = f.debugElement.query(By.directive(UploaderStub)).componentInstance as UploaderStub;
    expect(up.context()).toBe('content');
    expect(up.defaultAlt()).toBe('Opłaty');
    page.save();
    const req = http.expectOne((r) => r.method === 'PUT');
    expect(req.request.body.images[0].alt).toBe('Opłaty');
  });

  it('rejects PDFs over 10 MB without uploading', () => {
    const { f, http, page } = setup();
    page.openNew();
    page.uploadPdf(new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'Duzy.pdf', { type: 'application/pdf' }));
    http.expectNone('/api/admin/uploads/pdf');
    f.detectChanges();
    expect(f.nativeElement.querySelector('[data-test=pdf-error]').textContent).toContain('10 MB');
  });

  it('shows the backend message when PDF upload fails', () => {
    const { f, http, page } = setup();
    page.openNew();
    page.uploadPdf(new File(['%PDF'], 'a.pdf', { type: 'application/pdf' }));
    http.expectOne('/api/admin/uploads/pdf').flush({ error: { message: 'Plik jest za duży.' } }, { status: 413, statusText: 'x' });
    f.detectChanges();
    expect(f.nativeElement.querySelector('[data-test=pdf-error]').textContent).toContain('Plik jest za duży.');
  });

  it('shows attachment name and size', () => {
    const { f, page } = setup([ITEM]);
    page.openEdit(ITEM);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('x.pdf (2 KB)');
  });

  it('disables save while the image uploader is busy', () => {
    const { f, page } = setup();
    page.openNew();
    page.draft.title = 'T';
    f.detectChanges();
    const btn = () => f.nativeElement.querySelector('[data-test=save] button') as HTMLButtonElement;
    expect(btn().disabled).toBe(false);
    (f.debugElement.query(By.directive(UploaderStub)).componentInstance as UploaderStub).busyChange.emit(true);
    f.detectChanges();
    expect(btn().disabled).toBe(true);
  });

  it('shows backend save error in the dialog, keeps it open and does not double submit', () => {
    const { f, http, page } = setup();
    page.openNew();
    page.draft.title = 'T';
    page.save();
    page.save();
    http.expectOne((r) => r.method === 'POST').flush({ error: { message: 'Zdjęcie wygasło — dodaj je ponownie.' } }, { status: 400, statusText: 'x' });
    f.detectChanges();
    expect(page.dialog()).toBe(true);
    expect(f.nativeElement.querySelector('[data-test=save-error]').textContent).toContain('Zdjęcie wygasło');
    page.save();
    http.expectOne((r) => r.method === 'POST');
  });

  it('closes dialog and reloads after successful save', () => {
    const { http, page } = setup();
    page.openNew();
    page.draft.title = 'T';
    page.save();
    http.expectOne((r) => r.method === 'POST').flush({ ...ITEM, page: 'dla-rodzicow' });
    expect(page.dialog()).toBe(false);
    http.expectOne('/api/admin/content?page=dla-rodzicow').flush([]);
  });

  it('asks before closing a dirty dialog and closes a clean one at once', () => {
    const { page, confirm } = setup();
    const spy = vi.spyOn(confirm, 'confirm');
    page.openNew();
    page.requestClose();
    expect(spy).not.toHaveBeenCalled();
    expect(page.dialog()).toBe(false);

    page.openNew();
    page.draft.title = 'Zmiana';
    page.requestClose();
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0].message).toContain('Masz niezapisane zmiany');
    expect(page.dialog()).toBe(true);
    spy.mock.calls[0][0].accept?.();
    expect(page.dialog()).toBe(false);
  });

  it('protects route leave only when the dialog holds unsaved changes', async () => {
    const { page, confirm } = setup();
    expect(await page.confirmLeave()).toBe(true);
    page.openNew();
    expect(await page.confirmLeave()).toBe(true);
    page.draft.title = 'x';
    const spy = vi.spyOn(confirm, 'confirm').mockImplementation((c) => { c.reject?.(); return confirm; });
    expect(await page.confirmLeave()).toBe(false);
    expect(spy).toHaveBeenCalled();
  });

  it('shows load error with alert and retries', () => {
    TestBed.configureTestingModule({
      imports: [ContentAdminPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), providePrimeNG(), MessageService, ConfirmationService],
    });
    const f = TestBed.createComponent(ContentAdminPage);
    f.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/admin/content?page=dla-rodzicow').flush({ error: { message: 'Błąd serwera' } }, { status: 500, statusText: 'x' });
    f.detectChanges();
    expect(f.nativeElement.querySelector('[role=alert]').textContent).toContain('Błąd serwera');
    (f.nativeElement.querySelector('[data-test=retry] button') as HTMLButtonElement).click();
    http.expectOne('/api/admin/content?page=dla-rodzicow').flush([ITEM]);
    f.detectChanges();
    expect(f.nativeElement.querySelector('[role=alert]')).toBeNull();
    expect(f.nativeElement.textContent).toContain('Opłaty');
  });

  it('ignores a stale list response after switching pages', () => {
    TestBed.configureTestingModule({
      imports: [ContentAdminPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), providePrimeNG(), MessageService, ConfirmationService],
    });
    const f = TestBed.createComponent(ContentAdminPage);
    f.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    const first = http.expectOne('/api/admin/content?page=dla-rodzicow');
    (f.componentInstance as unknown as Page).selectPage('rodo');
    http.expectOne('/api/admin/content?page=rodo').flush([]);
    first.flush([ITEM]);
    f.detectChanges();
    expect(f.nativeElement.textContent).not.toContain('Opłaty');
  });

  it('confirms deletion in Polish and deletes', () => {
    const { http, page, confirm } = setup([ITEM]);
    const spy = vi.spyOn(confirm, 'confirm');
    page.remove(ITEM);
    const c = spy.mock.calls[0][0];
    expect(c.header).toBe('Usunąć element?');
    expect(c.acceptLabel).toBe('Usuń');
    c.accept?.();
    http.expectOne((r) => r.method === 'DELETE' && r.url === '/api/admin/content/c1').flush(null, { status: 204, statusText: 'x' });
    http.expectOne('/api/admin/content?page=dla-rodzicow').flush([]);
  });
  it('drops a late PDF response that belongs to a previously closed draft', () => {
    const { http, page } = setup([ITEM]);
    page.openNew();
    page.draft.title = 'A';
    page.uploadPdf(new File(['%PDF'], 'late.pdf', { type: 'application/pdf' }));
    const late = http.expectOne('/api/admin/uploads/pdf');
    page.openEdit(ITEM);
    late.flush({ file: 'docs/late.pdf', name: 'late.pdf', size: 4 });
    expect(page.draft.attachments).toEqual(ITEM.attachments);
  });

  it('does not close silently while a PDF is uploading, and a new draft starts not busy', () => {
    const { f, http, page, confirm } = setup([ITEM]);
    const spy = vi.spyOn(confirm, 'confirm');
    page.openNew();
    page.uploadPdf(new File(['%PDF'], 'a.pdf', { type: 'application/pdf' }));
    page.requestClose();
    expect(spy).toHaveBeenCalledOnce();
    expect(page.dialog()).toBe(true);
    spy.mock.calls[0][0].accept?.();
    page.openEdit(ITEM);
    page.draft.title = 'Opłaty';
    f.detectChanges();
    expect((f.nativeElement.querySelector('[data-test=save] button') as HTMLButtonElement).disabled).toBe(false);
    http.expectOne('/api/admin/uploads/pdf');
  });

  it('cancels beforeunload only when the open dialog is dirty', () => {
    const { page } = setup();
    const ev = () => { const e = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented; };
    expect(ev()).toBe(false);
    page.openNew();
    expect(ev()).toBe(false);
    page.draft.title = 'x';
    expect(ev()).toBe(true);
  });

  it('protects Esc/X: the dialog visibleChange(false) asks when dirty', () => {
    const { f, page, confirm } = setup();
    const spy = vi.spyOn(confirm, 'confirm');
    page.openNew();
    page.draft.title = 'x';
    f.detectChanges();
    f.debugElement.query(By.directive(Dialog)).triggerEventHandler("visibleChange", false);
    expect(spy).toHaveBeenCalledOnce();
    expect(page.dialog()).toBe(true);
  });

  it('disables "Nowy element" until the list has loaded', () => {
    TestBed.configureTestingModule({
      imports: [ContentAdminPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), providePrimeNG(), MessageService, ConfirmationService],
    });
    const f = TestBed.createComponent(ContentAdminPage);
    f.detectChanges();
    const btn = () => f.nativeElement.querySelector('[data-test=new] button') as HTMLButtonElement;
    expect(btn().disabled).toBe(true);
    TestBed.inject(HttpTestingController).expectOne('/api/admin/content?page=dla-rodzicow').flush([]);
    f.detectChanges();
    expect(btn().disabled).toBe(false);
  });

  it('lists attachments as links to /uploads in a new tab', () => {
    const { f } = setup([ITEM]);
    const a = f.nativeElement.querySelector('table a') as HTMLAnchorElement;
    expect(a.getAttribute('href')).toBe('/uploads/docs/x.pdf');
    expect(a.target).toBe('_blank');
    expect(a.textContent).toContain('x.pdf');
    expect(a.textContent).toContain('(otwiera się w nowej karcie)');
  });
});
