import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Section, SECTIONS } from '../core/sections';
import { Crumb, PageHeaderComponent } from './page-header.component';

describe('PageHeaderComponent', () => {
  function render(section: Section, heading: string, crumbs?: Crumb[]): HTMLElement {
    TestBed.configureTestingModule({ imports: [PageHeaderComponent], providers: [provideRouter([])] });
    const f = TestBed.createComponent(PageHeaderComponent);
    f.componentRef.setInput('section', section);
    f.componentRef.setInput('heading', heading);
    if (crumbs) f.componentRef.setInput('crumbs', crumbs);
    f.detectChanges();
    return f.nativeElement;
  }

  it('renders the heading, section tag and section photo', () => {
    const el = render(SECTIONS.rekrutacja, 'Rekrutacja');
    expect(el.querySelector('h1')!.textContent!.trim()).toBe('Rekrutacja');
    expect(el.querySelector('.tag')!.textContent!.trim()).toBe('Zapisy');
    const img = el.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('/images/headers/2-960.webp');
    expect(img.getAttribute('srcset')).toBe('/images/headers/2-480.webp 480w, /images/headers/2-960.webp 960w');
    expect(img.getAttribute('alt')).toBe('');
  });

  it('colours the header with the section colour', () => {
    const header = render(SECTIONS.rekrutacja, 'Rekrutacja').querySelector('header') as HTMLElement;
    expect(header.style.getPropertyValue('--section')).toBe('#1864ab');
  });

  it('has no photo and no tag for the neutral section', () => {
    const el = render(SECTIONS.neutral, 'Nie znaleziono strony');
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelector('.tag')).toBeNull();
  });

  it('renders a breadcrumb starting at Start, last item is the current page without a link', () => {
    const el = render(SECTIONS.grupy, 'Pingwinki', [{ label: 'Grupy', link: '/grupy' }, { label: 'Pingwinki' }]);
    const nav = el.querySelector('nav[aria-label="Ścieżka"]')!;
    const items = [...nav.querySelectorAll('li')];
    expect(items.map((li) => li.textContent!.trim())).toEqual(['Start', 'Grupy', 'Pingwinki']);
    expect(items[0].querySelector('a')!.getAttribute('href')).toBe('/');
    expect(items[1].querySelector('a')!.getAttribute('href')).toBe('/grupy');
    expect(items[2].querySelector('a')).toBeNull();
    expect(items[2].getAttribute('aria-current')).toBe('page');
  });

  it('has no breadcrumb without crumbs', () => {
    expect(render(SECTIONS.neutral, 'Nie znaleziono strony').querySelector('nav')).toBeNull();
  });
});
