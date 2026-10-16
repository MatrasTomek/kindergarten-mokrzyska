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

  it('logout calls auth.logout and navigates to login', async () => {
    const el = render(true);
    const nav = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    (el.querySelector('header button') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r));
    expect(logout).toHaveBeenCalled();
    expect(nav).toHaveBeenCalledWith(['/admin/logowanie']);
  });
});
