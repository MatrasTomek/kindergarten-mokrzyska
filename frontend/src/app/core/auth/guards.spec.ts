import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, provideRouter, RouterStateSnapshot, UrlTree } from '@angular/router';
import { adminGuard, authGuard } from './guards';
import { AuthService } from './auth.service';

describe('guards', () => {
  const route = {} as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;

  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] }));

  it('authGuard restores session via refresh cookie', async () => {
    const result = TestBed.runInInjectionContext(() => authGuard(route, state)) as Promise<boolean | UrlTree>;
    TestBed.inject(HttpTestingController).expectOne('/api/auth/refresh').flush({ accessToken: 't', user: { id: '1', email: 'a', name: 'A', role: 'user' } });
    expect(await result).toBe(true);
  });

  it('authGuard redirects to login without session', async () => {
    const result = TestBed.runInInjectionContext(() => authGuard(route, state)) as Promise<boolean | UrlTree>;
    TestBed.inject(HttpTestingController).expectOne('/api/auth/refresh').flush(null, { status: 401, statusText: 'x' });
    expect(String(await result)).toBe('/admin/logowanie');
  });

  it('adminGuard sends user role to posts', async () => {
    const auth = TestBed.inject(AuthService);
    const p = auth.login('a', 'b');
    TestBed.inject(HttpTestingController).expectOne('/api/auth/login').flush({ accessToken: 't', user: { id: '1', email: 'a', name: 'A', role: 'user' } });
    await p;
    expect(String(TestBed.runInInjectionContext(() => adminGuard(route, state)))).toBe('/admin/wpisy');
  });
});
