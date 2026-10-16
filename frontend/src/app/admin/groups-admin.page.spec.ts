import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { GroupsAdminPage } from './groups-admin.page';

type Page = {
  openNew: () => void;
  openEdit: (g: unknown) => void;
  draft: { name: string; order: number; description: string };
  save: () => void;
  remove: (g: unknown) => void;
};
const G = { id: 'g5', name: 'Żabki', slug: 'zabki', order: 5, description: 'Opis' };

function setup() {
  TestBed.configureTestingModule({
    imports: [GroupsAdminPage],
    providers: [provideHttpClient(), provideHttpClientTesting(), providePrimeNG(), MessageService, ConfirmationService],
  });
  const f = TestBed.createComponent(GroupsAdminPage);
  f.detectChanges();
  const http = TestBed.inject(HttpTestingController);
  return { f, http, page: f.componentInstance as unknown as Page };
}

describe('GroupsAdminPage', () => {
  it('creates a group and reloads list', () => {
    const { f, http, page } = setup();
    http.expectOne('/api/admin/groups').flush([]);
    page.openNew();
    page.draft.name = 'Żabki';
    page.draft.order = 5;
    page.save();

    const req = http.expectOne((r) => r.method === 'POST' && r.url === '/api/admin/groups');
    expect(req.request.body).toEqual({ name: 'Żabki', order: 5, description: '' });
    req.flush({ ...G, description: '' });
    http.expectOne('/api/admin/groups').flush([{ ...G, description: '' }]);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Żabki');
  });

  it('does not submit twice while saving', () => {
    const { http, page } = setup();
    http.expectOne('/api/admin/groups').flush([]);
    page.openNew();
    page.draft.name = 'A';
    page.save();
    page.save();
    http.expectOne((r) => r.method === 'POST');
  });

  it('PUT sends all fields on edit', () => {
    const { http, page } = setup();
    http.expectOne('/api/admin/groups').flush([G]);
    page.openEdit(G);
    page.draft.name = 'Żabki 2';
    page.save();
    const req = http.expectOne((r) => r.method === 'PUT' && r.url === '/api/admin/groups/g5');
    expect(req.request.body).toEqual({ name: 'Żabki 2', order: 5, description: 'Opis' });
  });

  it('shows load error with alert and retries', () => {
    const { f, http } = setup();
    http.expectOne('/api/admin/groups').flush({ error: { message: 'Błąd serwera' } }, { status: 500, statusText: 'x' });
    f.detectChanges();
    expect(f.nativeElement.querySelector('[role=alert]')).toBeTruthy();
    const btn = f.nativeElement.querySelector('[data-test=retry] button') as HTMLButtonElement;
    expect(f.nativeElement.querySelector('[role=alert]').textContent).toContain('Błąd serwera');
    expect(btn.textContent).toContain('Spróbuj ponownie');
    btn.click();
    http.expectOne('/api/admin/groups').flush([G]);
    f.detectChanges();
    expect(f.nativeElement.querySelector('[role=alert]')).toBeNull();
    expect(f.nativeElement.textContent).toContain('Żabki');
  });

  it('keeps dialog open and re-enables save after a save error', () => {
    const { f, http, page } = setup();
    const add = vi.spyOn(TestBed.inject(MessageService), 'add');
    http.expectOne('/api/admin/groups').flush([]);
    page.openNew();
    page.draft.name = 'A';
    page.save();
    http.expectOne((r) => r.method === 'POST').flush({ error: { message: 'Nazwa jest wymagana' } }, { status: 400, statusText: 'Bad' });
    f.detectChanges();
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error', summary: 'Nazwa jest wymagana' }));
    expect(document.querySelector('form[data-test=group-form]')).toBeTruthy();
    page.save();
    http.expectOne((r) => r.method === 'POST');
  });

  it('confirm text says posts are kept and delete reloads', () => {
    const { http, page } = setup();
    const confirm = TestBed.inject(ConfirmationService);
    const spy = vi.spyOn(confirm, 'confirm');
    http.expectOne('/api/admin/groups').flush([G]);
    page.remove(G);
    const opts = spy.mock.lastCall![0];
    expect(opts.message).toContain('Wpisy pozostaną');
    opts.accept!();
    http.expectOne((r) => r.method === 'DELETE' && r.url === '/api/admin/groups/g5').flush(null, { status: 204, statusText: 'No Content' });
    http.expectOne('/api/admin/groups').flush([]);
  });

  it('labels every field', () => {
    const { f, http, page } = setup();
    http.expectOne('/api/admin/groups').flush([]);
    page.openNew();
    f.detectChanges();
    const text = document.body.textContent ?? '';
    for (const l of ['Nazwa', 'Kolejność', 'Opis']) expect(text).toContain(l);
    expect(document.querySelector('label[for=group-name]')).toBeTruthy();
    expect(document.querySelector('label[for=group-order]')).toBeTruthy();
    expect(document.querySelector('label[for=group-desc]')).toBeTruthy();
  });

  it('after delete success focus goes to the stable heading, not body', () => {
    const { f, http, page } = setup();
    document.body.appendChild(f.nativeElement);
    const confirm = TestBed.inject(ConfirmationService);
    const spy = vi.spyOn(confirm, 'confirm');
    http.expectOne('/api/admin/groups').flush([G]);
    f.detectChanges();
    const opener = f.nativeElement.querySelector('button[aria-label="Usuń Żabki"]') as HTMLButtonElement;
    opener.focus();
    page.remove(G);
    spy.mock.lastCall![0].accept!();
    http.expectOne((r) => r.method === 'DELETE').flush(null, { status: 204, statusText: 'No Content' });
    http.expectOne('/api/admin/groups').flush([]);
    f.detectChanges();
    expect(document.activeElement).toBe(f.nativeElement.querySelector('h1'));
    f.nativeElement.remove();
  });

  it('after cancelling delete focus returns to the opener', () => {
    const { f, http, page } = setup();
    document.body.appendChild(f.nativeElement);
    const spy = vi.spyOn(TestBed.inject(ConfirmationService), 'confirm');
    http.expectOne('/api/admin/groups').flush([G]);
    f.detectChanges();
    const opener = f.nativeElement.querySelector('button[aria-label="Usuń Żabki"]') as HTMLButtonElement;
    opener.focus();
    page.remove(G);
    (document.activeElement as HTMLElement).blur();
    spy.mock.lastCall![0].reject!();
    expect(document.activeElement).toBe(opener);
    f.nativeElement.remove();
  });

  it('Enter (form submit) saves once; blank name disables Zapisz and is not sent', () => {
    const { f, http, page } = setup();
    http.expectOne('/api/admin/groups').flush([]);
    page.openNew();
    page.draft.name = '   ';
    f.detectChanges();
    const save = Array.from(document.querySelectorAll('form[data-test=group-form] button')).find((b) => b.textContent?.includes('Zapisz')) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    const form = document.querySelector('form[data-test=group-form]') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    http.expectNone((r) => r.method === 'POST');
    page.draft.name = '  Żabki ';
    form.dispatchEvent(new Event('submit'));
    form.dispatchEvent(new Event('submit'));
    const req = http.expectOne((r) => r.method === 'POST');
    expect(req.request.body.name).toBe('Żabki');
  });
});
