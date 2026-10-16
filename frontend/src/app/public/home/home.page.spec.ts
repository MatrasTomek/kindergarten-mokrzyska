import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HomePage } from './home.page';

describe('HomePage', () => {
  it('renders 10 tiles in the required order', () => {
    TestBed.configureTestingModule({ imports: [HomePage], providers: [provideRouter([])] });
    const f = TestBed.createComponent(HomePage);
    f.detectChanges();
    const links = [...f.nativeElement.querySelectorAll('nav a')] as HTMLAnchorElement[];
    expect(links.map((a) => a.textContent!.trim())).toEqual([
      'Aktualności', 'Grupy', 'Dla Rodziców', 'Specjaliści', 'Dokumenty', 'Rekrutacja', 'RODO', 'Kontakt', 'O nas', 'Z życia Przedszkola',
    ]);
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/aktualnosci', '/grupy', '/dla-rodzicow', '/specjalisci', '/dokumenty', '/rekrutacja', '/rodo', '/kontakt', '/o-nas', '/z-zycia-przedszkola',
    ]);
    expect(f.nativeElement.querySelector('h1').textContent).toBe('Publiczne Przedszkole Parafialne w Mokrzyskach pw. Błogosławionej Karoliny Kózka');
  });
});
