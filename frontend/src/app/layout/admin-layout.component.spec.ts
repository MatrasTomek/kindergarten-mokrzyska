import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { AuthService } from '../core/auth/auth.service';
import { AdminLayoutComponent } from './admin-layout.component';

describe('AdminLayoutComponent', () => {
  const logout = vi.fn(() => Promise.resolve());

  function render(isAdmin: boolean) {
    logout.mockClear();
    TestBed.configureTestingModule({
      imports: [AdminLayoutComponent],
      providers: [
        provideRouter([]), providePrimeNG(),
        { provide: AuthService, useValue: { isAdmin: signal(isAdmin), user: signal({ name: 'Ola' }), logout } },
      ],
    });
    const f = TestBed.createComponent(AdminLayoutComponent);
    f.detectChanges();
    return f.nativeElement as HTMLElement;
  }

  it('skip link focuses main', () => {
    const el = render(true);
    const main = el.querySelector('main#main') as HTMLElement;
    expect(main.getAttribute('tabindex')).toBe('-1');
    document.body.appendChild(el);
    (el.querySelector('.skip-link') as HTMLAnchorElement).click();
    expect(document.activeElement).toBe(main);
    el.remove();
  });

  it('admin sees 5 menu items', () => {
    expect(render(true).querySelectorAll('nav a').length).toBe(5);
  });

  it('user sees only Wpisy', () => {
    const links = render(false).querySelectorAll('nav a');
    expect(links.length).toBe(1);
    expect(links[0].textContent).toContain('Wpisy');
  });

  const logoutButton = (el: HTMLElement) =>
    [...el.querySelectorAll('header button')].find((b) => b.textContent?.includes('Wyloguj')) as HTMLButtonElement;

  it('logout leaves the page first (unsaved-changes guard), then calls auth.logout', async () => {
    const el = render(true);
    const nav = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    logoutButton(el).click();
    await new Promise((r) => setTimeout(r));
    expect(nav).toHaveBeenCalledWith(['/admin/logowanie']);
    expect(logout).toHaveBeenCalled();
    expect(nav.mock.invocationCallOrder[0]).toBeLessThan(logout.mock.invocationCallOrder[0]);
  });

  it('stays logged in when the user chooses „Zostań” in the unsaved-changes dialog', async () => {
    const el = render(true);
    const nav = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(false);
    logoutButton(el).click();
    await new Promise((r) => setTimeout(r));
    expect(nav).toHaveBeenCalledWith(['/admin/logowanie']);
    expect(logout).not.toHaveBeenCalled();
  });

  it('includes the accessibility toolbar, so settings carried over from the public site can be changed', () => {
    const el = render(true);
    const bar = el.querySelector('app-a11y-toolbar');
    expect(bar).not.toBeNull();
    expect(bar!.querySelector('[data-test=contrast]')).not.toBeNull();
  });
});
