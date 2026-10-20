import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Palette, Theme } from '../core/models';
import { SEASON_CACHE_KEY } from './banner-season';
import { PaletteApplier } from './palette-applier';
import { THEME_CACHE_KEY, TODAY, ThemeService } from './theme.service';

describe('ThemeService', () => {
  let applied: Palette[];
  let http: HttpTestingController;
  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-season');
    applied = [];
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PaletteApplier, useValue: { apply: (p: Palette) => applied.push(p) } },
        { provide: TODAY, useValue: () => new Date('2026-01-10T12:00:00+01:00') },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(ThemeService);
  });

  it('applies theme from API', async () => {
    const promise = service.load();
    const theme = { id: 'x', key: 'special-mikolajki', name: 'Mikołajki', type: 'special', seasonStart: null, palette: { '500': '#ff0000' } } as unknown as Theme;
    http.expectOne('/api/theme').flush(theme);
    await promise;
    expect(service.current()?.key).toBe('special-mikolajki');
    expect(applied).toEqual([theme.palette]);
  });

  it('falls back to local season when API fails', async () => {
    const promise = service.load();
    http.expectOne('/api/theme').flush('err', { status: 500, statusText: 'Server Error' });
    await promise;
    expect(service.current()?.key).toBe('winter');
    expect(applied[0]['700']).toBe('#1d4ed8');
  });

  it('caches the API palette for the pre-paint script in index.html', async () => {
    const promise = service.load();
    const theme = { id: 'x', key: 'special-mikolajki', name: 'Mikołajki', type: 'special', seasonStart: null, palette: { '500': '#ff0000' } } as unknown as Theme;
    http.expectOne('/api/theme').flush(theme);
    await promise;
    expect(JSON.parse(localStorage.getItem(THEME_CACHE_KEY)!)).toEqual(theme.palette);
  });

  it('does not cache the local fallback', async () => {
    const promise = service.load();
    http.expectOne('/api/theme').flush('err', { status: 500, statusText: 'Server Error' });
    await promise;
    expect(localStorage.getItem(THEME_CACHE_KEY)).toBeNull();
  });

  it('still applies the API theme when storage throws (Safari private mode)', async () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceeded'); });
    const promise = service.load();
    http.expectOne('/api/theme').flush({ key: 'autumn', palette: { '500': '#ef4444' } });
    await promise;
    expect(service.current()?.key).toBe('autumn');
    expect(applied).toEqual([{ '500': '#ef4444' }]);
    spy.mockRestore();
  });

  it('marks <html> with the banner season of a season theme and remembers it for pre-paint', async () => {
    const promise = service.load();
    http.expectOne('/api/theme').flush({ id: 'w', key: 'winter', name: 'Zima', type: 'season', seasonStart: '12-21', palette: { '500': '#3b82f6' } });
    await promise;
    expect(document.documentElement.dataset['season']).toBe('winter');
    expect(localStorage.getItem(SEASON_CACHE_KEY)).toBe('winter');
  });

  it('uses the date season for a special theme and forgets the remembered season', async () => {
    localStorage.setItem(SEASON_CACHE_KEY, 'summer');
    const promise = service.load();
    http.expectOne('/api/theme').flush({ id: 'x', key: 'special-mikolajki', name: 'Mikołajki', type: 'special', seasonStart: null, palette: { '500': '#ff0000' } });
    await promise;
    expect(document.documentElement.dataset['season']).toBe('winter');
    expect(localStorage.getItem(SEASON_CACHE_KEY)).toBeNull();
  });

  it('marks <html> with the date season when the API fails', async () => {
    const promise = service.load();
    http.expectOne('/api/theme').flush('err', { status: 500, statusText: 'Server Error' });
    await promise;
    expect(document.documentElement.dataset['season']).toBe('winter');
  });
});
