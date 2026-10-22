import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Theme } from '../../core/models';
import { SECTIONS, TILE_ORDER } from '../../core/sections';
import { ThemeService } from '../../theme/theme.service';
import { HomePage } from './home.page';

describe('HomePage', () => {
  function render(theme: Partial<Theme> | null): HTMLElement {
    TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [provideRouter([]), { provide: ThemeService, useValue: { current: signal(theme) } }],
    });
    const f = TestBed.createComponent(HomePage);
    f.detectChanges();
    return f.nativeElement;
  }

  it('renders 10 tiles in the required order', () => {
    const el = render(null);
    const links = [...el.querySelectorAll('nav a')] as HTMLAnchorElement[];
    expect(links.map((a) => a.textContent!.trim())).toEqual([
      'Aktualności', 'Grupy', 'Dla Rodziców', 'Specjaliści', 'Dokumenty', 'Rekrutacja', 'RODO', 'Kontakt', 'O nas', 'Z życia Przedszkola',
    ]);
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/aktualnosci', '/grupy', '/dla-rodzicow', '/specjalisci', '/dokumenty', '/rekrutacja', '/rodo', '/kontakt', '/o-nas', '/z-zycia-przedszkola',
    ]);
    expect(el.querySelector('h1')!.textContent).toBe('Publiczne Przedszkole Parafialne w Mokrzyskach pw. Błogosławionej Karoliny Kózka');
  });

  it('keeps the site name as a heading for screen readers only, outside the banner', () => {
    const h1 = render(null).querySelector('h1')!;
    expect(h1.classList).toContain('sr-only');
    expect(h1.closest('app-banner-slider')).toBeNull();
  });

  it('paints every tile in its section colour', () => {
    const links = [...render(null).querySelectorAll('nav a')] as HTMLAnchorElement[];
    expect(links.map((a) => a.style.getPropertyValue('--section'))).toEqual(TILE_ORDER.map((k) => SECTIONS[k].color));
  });

  it('shows no text on the banner, even with an active theme', () => {
    expect(render({ name: 'Mikołajki' }).querySelector('app-banner-slider')!.textContent!.trim()).toBe('');
  });
});
