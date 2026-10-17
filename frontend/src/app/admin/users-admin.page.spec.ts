import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { AuthService } from '../core/auth/auth.service';
import { UsersAdminPage } from './users-admin.page';

type Page = {
  openNew: () => void;
  openEdit: (u: unknown) => void;
  remove: (u: unknown) => void;
  save: () => void;
  email: string; name: string; role: string; active: boolean; password: string;
};
const ME = { id: 'me', email: 'a@b.pl', name: 'Ja', role: 'admin', active: true, createdAt: '' };
const U2 = { id: 'u2', email: 'n@b.pl', name: 'Nauczycielka', role: 'user', active: true, createdAt: '' };

function setup(users: unknown[] = [ME, U2]) {
  TestBed.configureTestingModule({
    imports: [UsersAdminPage],
    providers: [
      provideHttpClient(), provideHttpClientTesting(), providePrimeNG(), MessageService, ConfirmationService,
      { provide: AuthService, useValue: { user: signal({ id: 'me', email: 'a@b.pl', name: 'Ja', role: 'admin' }) } },
    ],
  });
  const f = TestBed.createComponent(UsersAdminPage);
  f.detectChanges();
  const http = TestBed.inject(HttpTestingController);
  if (users) http.expectOne('/api/admin/users').flush(users);
  f.detectChanges();
  return { f, http, page: f.componentInstance as unknown as Page };
}

describe('UsersAdminPage', () => {
  it('does not allow deleting yourself', () => {
    const { f } = setup();
    const buttons = f.nativeElement.querySelectorAll('[data-test=delete] button');
    expect(buttons[0].disabled).toBe(true);
    expect(buttons[1].disabled).toBe(false);
    expect(f.nativeElement.textContent).toContain('Użytkownik — tylko wpisy');
    expect(f.nativeElement.textContent).not.toContain('Z życia');
  });

  it('shows load error with alert and retries', () => {
    TestBed.configureTestingModule({
      imports: [UsersAdminPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), providePrimeNG(), MessageService, ConfirmationService,
        { provide: AuthService, useValue: { user: signal({ id: 'me' }) } }],
    });
    const f = TestBed.createComponent(UsersAdminPage);
    f.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/admin/users').flush({ error: { message: 'Błąd serwera' } }, { status: 500, statusText: 'x' });
    f.detectChanges();
    expect(f.nativeElement.querySelector('[role=alert]').textContent).toContain('Błąd serwera');
    (f.nativeElement.querySelector('[data-test=retry] button') as HTMLButtonElement).click();
    http.expectOne('/api/admin/users').flush([U2]);
    f.detectChanges();
    expect(f.nativeElement.querySelector('[role=alert]')).toBeNull();
    expect(f.nativeElement.textContent).toContain('Nauczycielka');
  });

  it('creates a user with email, name, role and password', () => {
    const { http, page } = setup([]);
    page.openNew();
    Object.assign(page, { email: 'x@y.pl', name: 'Anna', role: 'user', password: '1234567890' });
    page.save();
    page.save();
    const req = http.expectOne((r) => r.method === 'POST' && r.url === '/api/admin/users');
    expect(req.request.body).toEqual({ email: 'x@y.pl', name: 'Anna', role: 'user', password: '1234567890' });
  });

  it('update always sends active (false too) and omits empty password', () => {
    const { http, page } = setup();
    page.openEdit(U2);
    page.active = false;
    page.save();
    const req = http.expectOne((r) => r.method === 'PUT' && r.url === '/api/admin/users/u2');
    expect(req.request.body).toEqual({ name: 'Nauczycielka', role: 'user', active: false });
  });

  it('update sends password when provided', () => {
    const { http, page } = setup();
    page.openEdit(U2);
    page.password = 'nowehaslo123';
    page.save();
    const req = http.expectOne((r) => r.method === 'PUT');
    expect(req.request.body).toEqual({ name: 'Nauczycielka', role: 'user', active: true, password: 'nowehaslo123' });
  });

  it('refuses a too short password on create and on edit', () => {
    const { http, page } = setup();
    page.openNew();
    Object.assign(page, { email: 'x@y.pl', name: 'Anna', password: '123' });
    page.save();
    page.openEdit(U2);
    page.password = '123';
    page.save();
    http.expectNone((r) => r.method === 'POST' || r.method === 'PUT');
  });

  it('shows backend message on save error and keeps dialog open and re-enabled', () => {
    const { f, http, page } = setup();
    const add = vi.spyOn(TestBed.inject(MessageService), 'add');
    page.openNew();
    Object.assign(page, { email: 'n@b.pl', name: 'Anna', password: '1234567890' });
    page.save();
    http.expectOne((r) => r.method === 'POST').flush({ error: { message: 'Ten e-mail jest już zajęty' } }, { status: 400, statusText: 'Bad' });
    f.detectChanges();
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error', summary: 'Ten e-mail jest już zajęty' }));
    expect(document.querySelector('form[data-test=user-form]')).toBeTruthy();
    page.save();
    http.expectOne((r) => r.method === 'POST');
  });

  it('labels fields, password hint and autocomplete', () => {
    const { f } = setup();
    (f.nativeElement.querySelector('.head button') as HTMLButtonElement).click();
    f.detectChanges();
    for (const id of ['u-email', 'u-name', 'u-role', 'u-pass']) expect(document.querySelector(`label[for=${id}]`)).toBeTruthy();
    const pass = document.querySelector('#u-pass') as HTMLInputElement;
    expect(pass.type).toBe('password');
    expect(pass.getAttribute('autocomplete')).toBe('new-password');
    expect(document.body.textContent).toContain('min. 10 znaków');
    expect(document.body.textContent).not.toContain('Zmiana hasła wyloguje');
  });

  it('edit dialog hints that a password change logs the user out elsewhere', () => {
    const { f } = setup();
    (f.nativeElement.querySelector('button[aria-label="Edytuj Nauczycielka"]') as HTMLButtonElement).click();
    f.detectChanges();
    expect(document.body.textContent).toContain('Zmiana hasła wyloguje tego użytkownika na innych urządzeniach.');
    expect(document.querySelector('#u-pass')?.getAttribute('aria-describedby')).toBe('u-pass-hint');
  });

  it('own account: role and active controls are disabled in edit dialog', () => {
    const { f } = setup();
    (f.nativeElement.querySelector('button[aria-label="Edytuj Ja"]') as HTMLButtonElement).click();
    f.detectChanges();
    expect((document.querySelector('#u-active') as HTMLInputElement).disabled).toBe(true);
    expect(document.querySelector('p-select[inputid=u-role]')?.className ?? '').toContain('p-disabled');
  });

  it('delete confirm names the email, and success focuses heading', () => {
    const { f, http, page } = setup();
    document.body.appendChild(f.nativeElement);
    const spy = vi.spyOn(TestBed.inject(ConfirmationService), 'confirm');
    f.nativeElement.querySelector('button[aria-label="Usuń Nauczycielka"]').focus();
    page.remove(U2);
    const opts = spy.mock.lastCall![0];
    expect(opts.message).toContain('n@b.pl');
    opts.accept!();
    http.expectOne((r) => r.method === 'DELETE' && r.url === '/api/admin/users/u2').flush(null, { status: 204, statusText: 'No Content' });
    http.expectOne('/api/admin/users').flush([ME]);
    f.detectChanges();
    expect(document.activeElement).toBe(f.nativeElement.querySelector('h1'));
    f.nativeElement.remove();
  });

  it('cancelling delete restores focus to opener', () => {
    const { f, page } = setup();
    document.body.appendChild(f.nativeElement);
    const spy = vi.spyOn(TestBed.inject(ConfirmationService), 'confirm');
    const opener = f.nativeElement.querySelector('button[aria-label="Usuń Nauczycielka"]') as HTMLButtonElement;
    opener.focus();
    page.remove(U2);
    (document.activeElement as HTMLElement).blur();
    spy.mock.lastCall![0].reject!();
    expect(document.activeElement).toBe(opener);
    f.nativeElement.remove();
  });

  async function openDialog(f: any, label: string) {
    (f.nativeElement.querySelector(label) as HTMLButtonElement).click();
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
  }
  function type(f: any, sel: string, value: string, blur = true) {
    const el = document.querySelector(sel) as HTMLInputElement;
    el.value = value;
    el.dispatchEvent(new Event('input'));
    if (blur) el.dispatchEvent(new Event('blur'));
    f.detectChanges();
    f.detectChanges();
  }
  const saveBtn = () => Array.from(document.querySelectorAll('form[data-test=user-form] button')).find((b) => b.textContent?.includes('Zapisz')) as HTMLButtonElement;

  it('invalid email shows an inline message and blocks saving', async () => {
    const { f, http } = setup();
    await openDialog(f, '.head button');
    type(f, '#u-name', 'Anna');
    type(f, '#u-pass', '1234567890');
    type(f, '#u-email', 'abc');
    expect(saveBtn().disabled).toBe(true);
    const msg = document.querySelector('#u-email-error') as HTMLElement;
    expect(msg.textContent).toContain('Podaj poprawny adres e-mail');
    expect(document.querySelector('#u-email')?.getAttribute('aria-describedby')).toContain('u-email-error');
    expect(document.querySelector('#u-email')?.getAttribute('maxlength')).toBe('254');
    (document.querySelector('form[data-test=user-form]') as HTMLFormElement).dispatchEvent(new Event('submit'));
    http.expectNone((r) => r.method === 'POST');
    type(f, '#u-email', 'a@b.pl');
    expect(document.querySelector('#u-email-error')).toBeNull();
    expect(saveBtn().disabled).toBe(false);
  });

  it('empty name and short password show messages once touched', async () => {
    const { f } = setup();
    await openDialog(f, '.head button');
    expect(document.querySelector('#u-name-error')).toBeNull();
    type(f, '#u-name', '   ');
    expect(document.querySelector('#u-name-error')?.textContent).toContain('Podaj imię i nazwisko');
    type(f, '#u-pass', '123');
    expect(document.querySelector('#u-pass-error')?.textContent).toContain('co najmniej 10 znaków');
    expect(document.querySelector('#u-pass')?.getAttribute('aria-describedby')).toContain('u-pass-error');
    expect(document.querySelector('#u-pass-error')?.getAttribute('role')).toBe('alert');
    expect(saveBtn().disabled).toBe(true);
  });

  it('edit: empty password is fine, short non-empty password is an error', async () => {
    const { f } = setup();
    await openDialog(f, 'button[aria-label="Edytuj Nauczycielka"]');
    type(f, '#u-pass', '');
    expect(document.querySelector('#u-pass-error')).toBeNull();
    type(f, '#u-pass', 'abc');
    expect(document.querySelector('#u-pass-error')).toBeTruthy();
  });

  it('own account gets a own-password hint; others keep the generic one', async () => {
    const { f } = setup();
    await openDialog(f, 'button[aria-label="Edytuj Ja"]');
    expect(document.body.textContent).toContain('Zmiana Twojego hasła wyloguje Cię na innych urządzeniach i po wygaśnięciu sesji.');
    expect(document.body.textContent).not.toContain('wyloguje tego użytkownika');
  });

  it('password toggle button has aria-pressed and switches input type', async () => {
    const { f } = setup();
    await openDialog(f, '.head button');
    const btn = document.querySelector('[data-test=toggle-pass]') as HTMLButtonElement;
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    expect(btn.textContent).toContain('Pokaż hasło');
    btn.click();
    f.detectChanges();
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    expect((document.querySelector('#u-pass') as HTMLInputElement).type).toBe('text');
  });

  it('disabled own-row delete explains why via title', () => {
    const { f } = setup();
    expect(f.nativeElement.querySelector('button[aria-label="Usuń Ja"]').closest('p-button').getAttribute('title')).toContain('własnego konta');
  });

  it('password is cleared when the dialog hides; Anuluj disabled while saving', async () => {
    const { f, http, page } = setup();
    await openDialog(f, 'button[aria-label="Edytuj Nauczycielka"]');
    type(f, '#u-pass', 'nowehaslo123');
    saveBtnClick(f);
    const cancel = Array.from(document.querySelectorAll('form[data-test=user-form] button')).find((b) => b.textContent?.includes('Anuluj')) as HTMLButtonElement;
    expect(cancel.disabled).toBe(true);
    http.expectOne((r) => r.method === 'PUT').flush(U2);
    http.expectOne('/api/admin/users').flush([ME, U2]);
    (page as any).onHide();
    expect(page.password).toBe('');
  });

  it('failed delete restores focus to the opener', () => {
    const { f, http, page } = setup();
    document.body.appendChild(f.nativeElement);
    const spy = vi.spyOn(TestBed.inject(ConfirmationService), 'confirm');
    const opener = f.nativeElement.querySelector('button[aria-label="Usuń Nauczycielka"]') as HTMLButtonElement;
    opener.focus();
    page.remove(U2);
    spy.mock.lastCall![0].accept!();
    http.expectOne((r) => r.method === 'DELETE').flush({ error: { message: 'Nie można' } }, { status: 400, statusText: 'Bad' });
    expect(document.activeElement).toBe(opener);
    f.nativeElement.remove();
  });

  function saveBtnClick(f: any) {
    (document.querySelector('form[data-test=user-form]') as HTMLFormElement).dispatchEvent(new Event('submit'));
    f.detectChanges();
  }
});
