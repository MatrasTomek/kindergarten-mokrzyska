import { FetchBackend, HttpBackend, HttpClient, HttpXhrBackend } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { appConfig } from './app.config';

describe('appConfig', () => {
  it('does not use the fetch backend (fetch emits no upload progress events)', () => {
    TestBed.configureTestingModule({ providers: appConfig.providers });
    expect(TestBed.inject(HttpBackend)).not.toBeInstanceOf(FetchBackend);
    expect(TestBed.inject(HttpBackend)).toBeInstanceOf(HttpXhrBackend);
  });

  it('skips API calls during prerender (no backend at build time)', () => {
    TestBed.configureTestingModule({ providers: [...appConfig.providers, { provide: PLATFORM_ID, useValue: 'server' }, provideHttpClientTesting()] });
    let completed = false;
    TestBed.inject(HttpClient).get('/api/groups').subscribe({ complete: () => (completed = true) });
    TestBed.inject(HttpTestingController).expectNone('/api/groups');
    expect(completed).toBe(true);
  });
});
