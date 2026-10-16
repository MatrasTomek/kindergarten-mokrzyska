import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';
import { DEFAULT_THEMES } from '../theme/default-themes';
import { ThemeService } from '../theme/theme.service';
import { ThemesAdminPage } from './themes-admin.page';

const special = { id: 't9', key: 'special-mikolajki', name: 'Mikołajki', type: 'special', seasonStart: null, palette: DEFAULT_THEMES[3].palette };
const all = () => [...DEFAULT_THEMES.map((t, i) => ({ ...t, id: `s${i}` })), special];

type Page = {
  settings: { themeMode: string; manualThemeId: string | null };
  saveSettings: () => void;
  openNew: () => void;
  openEdit: (t: unknown) => void;
  draftName: string;
  draftStart: string;
  setColor: (k: string, v: string) => void;
  saveTheme: () => void;
  preview: () => void;
  remove: (t: unknown) => void;
  load: () => void;
  startError: () => string | null;
};

function setup(themeService?: object) {
  TestBed.configureTestingModule({
    imports: [ThemesAdminPage],
    providers: [
      provideHttpClient(), provideHttpClientTesting(), providePrimeNG(), MessageService, ConfirmationService,
      ...(themeService ? [{ provide: ThemeService, useValue: themeService }] : []),
    ],
  });
  const f = TestBed.createComponent(ThemesAdminPage);
  f.detectChanges();
  const http = TestBed.inject(HttpTestingController);
  return { f, http, page: f.componentInstance as unknown as Page };
}

function flushInitial(http: HttpTestingController) {
  http.expectOne('/api/admin/themes').flush(all());
  http.expectOne('/api/admin/settings').flush({ themeMode: 'auto', manualThemeId: null });
}

describe('ThemesAdminPage', () => {
  it('saves manual theme selection', () => {
    const { http, page } = setup();
    flushInitial(http);
    page.settings = { themeMode: 'manual', manualThemeId: 't9' };
    page.saveSettings();
    const req = http.expectOne((r) => r.method === 'PUT' && r.url === '/api/admin/settings');
    expect(req.request.body).toEqual({ themeMode: 'manual', manualThemeId: 't9' });
  });

  it('shows alert with retry when themes fail to load', () => {
    const { f, http, page } = setup();
    http.expectOne('/api/admin/themes').flush({ error: { message: 'Błąd serwera' } }, { status: 500, statusText: 'x' });
    f.detectChanges();
    expect(f.nativeElement.querySelector('[role=alert]')).toBeTruthy();
    f.nativeElement.querySelector('[data-test=retry] button').click();
    http.expectOne('/api/admin/themes').flush(all());
    const live = http.match('/api/admin/settings').filter((r) => !r.cancelled);
    expect(live.length).toBe(1);
    live[0].flush({ themeMode: 'auto', manualThemeId: null });
    f.detectChanges();
    expect(f.nativeElement.querySelector('[role=alert]')).toBeNull();
    expect(f.nativeElement.textContent).toContain('Mikołajki');
  });

  it('offers delete only for special themes; h1 is focusable', () => {
    const { f, http } = setup();
    flushInitial(http);
    f.detectChanges();
    const labels = Array.from(f.nativeElement.querySelectorAll('button')).map((b) => (b as HTMLElement).getAttribute('aria-label'));
    expect(labels).toContain('Usuń Mikołajki');
    expect(labels).not.toContain('Usuń Wiosna');
    expect(f.nativeElement.querySelector('h1').getAttribute('tabindex')).toBe('-1');
  });

  it('creates a special theme with chosen colours', () => {
    const { http, page } = setup();
    flushInitial(http);
    page.openNew();
    page.draftName = '  Dzień Babci ';
    page.setColor('700', '#112233');
    page.saveTheme();
    page.saveTheme(); // guard: no second request
    const req = http.expectOne((r) => r.method === 'POST' && r.url === '/api/admin/themes');
    expect(req.request.body.name).toBe('Dzień Babci');
    expect(req.request.body.palette['700']).toBe('#112233');
    expect(req.request.body.seasonStart).toBeUndefined();
  });

  it('rejects impossible season start dates before sending', () => {
    const { http, page } = setup();
    flushInitial(http);
    page.openEdit({ ...all()[0] });
    for (const bad of ['02-30', '13-01', '3-21', '']) {
      page.draftStart = bad;
      expect(page.startError()).toBeTruthy();
      page.saveTheme();
    }
    http.expectNone((r) => r.method === 'PUT');
    page.draftStart = '03-21';
    expect(page.startError()).toBeNull();
    page.saveTheme();
    const req = http.expectOne((r) => r.method === 'PUT' && r.url === '/api/admin/themes/s0');
    expect(req.request.body.seasonStart).toBe('03-21');
  });

  it('shows contrast warnings for a light button colour', () => {
    const { f, http, page } = setup();
    flushInitial(http);
    page.openNew();
    page.setColor('700', '#facc15');
    f.detectChanges();
    expect(document.body.textContent).toContain('Przyciski');
  });

  it('previews and restores the active theme on leaving the page', () => {
    const ts = { apply: vi.fn(), load: vi.fn().mockResolvedValue(undefined) };
    const { f, http, page } = setup(ts);
    flushInitial(http);
    page.openNew();
    page.preview();
    expect(ts.apply).toHaveBeenCalledTimes(1);
    f.destroy();
    expect(ts.load).toHaveBeenCalledTimes(1);
  });

  it('does not reload theme on leave when no preview was used', () => {
    const ts = { apply: vi.fn(), load: vi.fn().mockResolvedValue(undefined) };
    const { f, http } = setup(ts);
    flushInitial(http);
    f.destroy();
    expect(ts.load).not.toHaveBeenCalled();
  });

  it('after deleting a theme reloads list, settings and applied theme', () => {
    const ts = { apply: vi.fn(), load: vi.fn().mockResolvedValue(undefined) };
    const { http, page } = setup(ts);
    flushInitial(http);
    const confirm = TestBed.inject(ConfirmationService);
    let accept: () => void = () => undefined;
    confirm.requireConfirmation$.subscribe((c) => (accept = c!.accept!));
    page.remove(special);
    accept();
    http.expectOne((r) => r.method === 'DELETE' && r.url === '/api/admin/themes/t9').flush(null);
    http.expectOne('/api/admin/themes').flush(all().slice(0, 4));
    http.expectOne('/api/admin/settings').flush({ themeMode: 'auto', manualThemeId: null });
    expect(ts.load).toHaveBeenCalled();
  });
});
