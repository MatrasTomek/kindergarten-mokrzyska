import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

const login = { accessToken: 'old', user: { id: '1', email: 'a@b.pl', name: 'A', role: 'admin' } };

describe('authInterceptor', () => {
  let http: HttpClient;
  let ctrl: HttpTestingController;
  let auth: AuthService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    const p = auth.login('a@b.pl', 'x');
    ctrl.expectOne('/api/auth/login').flush(login);
    await p;
  });

  it('adds bearer only to admin API', () => {
    http.get('/api/admin/me').subscribe();
    http.get('/api/posts').subscribe();
    expect(ctrl.expectOne('/api/admin/me').request.headers.get('Authorization')).toBe('Bearer old');
    expect(ctrl.expectOne('/api/posts').request.headers.has('Authorization')).toBe(false);
  });

  it('refreshes once for concurrent 401s and retries all', () => {
    const results: string[] = [];
    for (const i of [1, 2, 3]) http.get<string>(`/api/admin/x${i}`).subscribe((r) => results.push(r));
    for (const i of [1, 2, 3]) ctrl.expectOne(`/api/admin/x${i}`).flush(null, { status: 401, statusText: 'Unauthorized' });

    ctrl.expectOne('/api/auth/refresh').flush({ ...login, accessToken: 'new' });

    for (const i of [1, 2, 3]) {
      const retry = ctrl.expectOne(`/api/admin/x${i}`);
      expect(retry.request.headers.get('Authorization')).toBe('Bearer new');
      retry.flush(`ok${i}`);
    }
    expect(results.sort()).toEqual(['ok1', 'ok2', 'ok3']);
    ctrl.verify();
  });

  it('logs out and redirects when refresh fails', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    let failed = false;
    http.get('/api/admin/me').subscribe({ error: () => (failed = true) });
    ctrl.expectOne('/api/admin/me').flush(null, { status: 401, statusText: 'Unauthorized' });
    ctrl.expectOne('/api/auth/refresh').flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(failed).toBe(true);
    expect(auth.user()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/admin/logowanie']);
  });

  it('does not retry twice when the retried request is 401 again', () => {
    let failed = false;
    http.get('/api/admin/me').subscribe({ error: () => (failed = true) });
    ctrl.expectOne('/api/admin/me').flush(null, { status: 401, statusText: 'Unauthorized' });
    ctrl.expectOne('/api/auth/refresh').flush({ ...login, accessToken: 'new' });
    ctrl.expectOne('/api/admin/me').flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(failed).toBe(true);
    ctrl.verify();
  });
});
