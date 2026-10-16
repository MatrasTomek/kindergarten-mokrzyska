import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ssrApiInterceptor } from './ssr-api.interceptor';

describe('ssrApiInterceptor', () => {
  function setup(platform: 'server' | 'browser') {
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: platform }, provideHttpClient(withInterceptors([ssrApiInterceptor])), provideHttpClientTesting()],
    });
    return { http: TestBed.inject(HttpClient), ctrl: TestBed.inject(HttpTestingController) };
  }

  it('skips API calls during prerender', () => {
    const { http, ctrl } = setup('server');
    let completed = false;
    http.get('/api/posts').subscribe({ complete: () => (completed = true) });
    ctrl.expectNone('/api/posts');
    expect(completed).toBe(true);
  });

  it('passes through in the browser', () => {
    const { http, ctrl } = setup('browser');
    http.get('/api/posts').subscribe();
    ctrl.expectOne('/api/posts').flush({});
  });
});
