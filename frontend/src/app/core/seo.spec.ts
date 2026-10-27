import { DOCUMENT } from '@angular/common';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { DEFAULT_DESCRIPTION, DEFAULT_IMAGE, Seo, seoOnNavigation, SITE_URL } from './seo';

@Component({ template: '' })
class Blank {}

@Component({ template: '' })
class Host {
  constructor() {
    seoOnNavigation();
  }
}

const head = () => TestBed.inject(DOCUMENT).head;
const meta = (attr: string, key: string) => head().querySelector(`meta[${attr}="${key}"]`)?.getAttribute('content') ?? null;
const canonical = () => head().querySelectorAll('link[rel="canonical"]');

describe('Seo', () => {
  afterEach(() => head().querySelectorAll('meta[name], meta[property], link[rel="canonical"]').forEach((e) => e.remove()));

  it('sets description, canonical and Open Graph tags', () => {
    TestBed.inject(Seo).set({ title: 'Wpis – X', description: 'Opis', path: '/wpis/a', image: '/uploads/a.webp', type: 'article' });

    expect(meta('name', 'description')).toBe('Opis');
    expect(meta('property', 'og:title')).toBe('Wpis – X');
    expect(meta('property', 'og:description')).toBe('Opis');
    expect(meta('property', 'og:type')).toBe('article');
    expect(meta('property', 'og:url')).toBe(`${SITE_URL}/wpis/a`);
    expect(meta('property', 'og:image')).toBe(`${SITE_URL}/uploads/a.webp`);
    expect(meta('property', 'og:locale')).toBe('pl_PL');
    expect(meta('name', 'twitter:card')).toBe('summary');
    expect(canonical()[0].getAttribute('href')).toBe(`${SITE_URL}/wpis/a`);
    expect(meta('name', 'robots')).toBeNull();
  });

  it('falls back to the default description and image; reuses the canonical link', () => {
    const seo = TestBed.inject(Seo);
    seo.set({ title: 'A', path: '/' });
    seo.set({ title: 'B', path: '/kontakt' });

    expect(meta('name', 'description')).toBe(DEFAULT_DESCRIPTION);
    expect(meta('property', 'og:image')).toBe(DEFAULT_IMAGE);
    expect(meta('property', 'og:type')).toBe('website');
    expect(canonical().length).toBe(1);
    expect(canonical()[0].getAttribute('href')).toBe(`${SITE_URL}/kontakt`);
  });

  it('noindex adds the robots tag, and the next page removes it', () => {
    const seo = TestBed.inject(Seo);
    seo.set({ title: 'A', path: '/x', noindex: true });
    expect(meta('name', 'robots')).toBe('noindex');
    seo.set({ title: 'B', path: '/' });
    expect(meta('name', 'robots')).toBeNull();
  });
});

describe('seoOnNavigation', () => {
  afterEach(() => head().querySelectorAll('meta[name], meta[property], link[rel="canonical"]').forEach((e) => e.remove()));

  function setup() {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'kontakt', component: Blank, title: 'Kontakt – X', data: { description: 'Opis kontaktu' } },
          { path: 'admin', data: { noindex: true }, children: [{ path: 'logowanie', component: Blank, title: 'Logowanie' }] },
          { path: 'wpis/:slug', component: Blank, data: { seo: 'manual' } },
        ]),
      ],
    });
    TestBed.createComponent(Host);
    return TestBed.inject(Router);
  }

  it('applies the route title, description and canonical path (without query and fragment)', async () => {
    const router = setup();
    await router.navigateByUrl('/kontakt?a=1#mapa');

    expect(meta('property', 'og:title')).toBe('Kontakt – X');
    expect(meta('name', 'description')).toBe('Opis kontaktu');
    expect(canonical()[0].getAttribute('href')).toBe(`${SITE_URL}/kontakt`);
  });

  it('inherits noindex from a parent route', async () => {
    const router = setup();
    await router.navigateByUrl('/admin/logowanie');
    expect(meta('name', 'robots')).toBe('noindex');
  });

  it('leaves manual routes to the page component', async () => {
    const router = setup();
    await router.navigateByUrl('/kontakt');
    await router.navigateByUrl('/wpis/abc');
    expect(meta('name', 'description')).toBe('Opis kontaktu');
  });
});
