import { FetchBackend, HttpBackend } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { config } from './app.config.server';

describe('server config', () => {
  it('uses the fetch backend on the server (XHR is browser-only)', () => {
    TestBed.configureTestingModule({ providers: config.providers });
    expect(TestBed.inject(HttpBackend)).toBeInstanceOf(FetchBackend);
  });
});
