import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PublicApi } from './public-api';

describe('PublicApi', () => {
  let api: PublicApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(PublicApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('builds post list query', () => {
    api.posts({ news: true, page: 2 }).subscribe();
    http.expectOne('/api/posts?page=2&news=1').flush({ items: [], page: 2, pages: 2, total: 13 });

    api.posts({ group: 'pingwinki' }).subscribe();
    http.expectOne('/api/posts?page=1&group=pingwinki').flush({ items: [], page: 1, pages: 1, total: 0 });
  });

  it('encodes slugs and content pages', () => {
    api.post('bal przebierańców').subscribe();
    http.expectOne('/api/posts/bal%20przebiera%C5%84c%C3%B3w').flush({});
    api.content('dokumenty').subscribe();
    http.expectOne('/api/content/dokumenty').flush([]);
  });
});
