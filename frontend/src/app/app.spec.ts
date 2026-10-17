import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { App } from './app';

@Component({ selector: 'app-test-layout', imports: [RouterOutlet], template: `<button id="outside">menu</button><main id="main" tabindex="-1"><router-outlet /></main>` })
class Layout {}
@Component({ selector: 'app-test-a', template: `<h1>A</h1>` })
class PageA {}
@Component({ selector: 'app-test-b', template: `<h1>B</h1>` })
class PageB {}

describe('App', () => {
  it('renders a router outlet', async () => {
    await TestBed.configureTestingModule({ imports: [App], providers: [provideRouter([])] }).compileComponents();
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('router-outlet')).not.toBeNull();
    expect(document.documentElement.lang).toBe('pl');
  });

  describe('focus after navigation', () => {
    async function setup() {
      TestBed.configureTestingModule({
        imports: [App],
        providers: [provideRouter([{ path: '', component: Layout, children: [{ path: 'a', component: PageA }, { path: 'b', component: PageB }] }])],
      });
      const fixture = TestBed.createComponent(App);
      document.body.appendChild(fixture.nativeElement);
      const router = TestBed.inject(Router);
      const go = async (url: string) => {
        await router.navigateByUrl(url);
        fixture.detectChanges();
        await fixture.whenStable();
      };
      const outside = () => fixture.nativeElement.querySelector('#outside') as HTMLButtonElement;
      return { fixture, go, outside, main: () => fixture.nativeElement.querySelector('#main') as HTMLElement };
    }

    afterEach(() => document.body.querySelectorAll('app-root, [ng-version]').forEach((e) => e.remove()));

    it('leaves focus alone on the first navigation (page load)', async () => {
      const { go, main } = await setup();
      (document.activeElement as HTMLElement | null)?.blur();
      await go('/a');
      expect(main()).not.toBeNull();
      expect(document.activeElement).toBe(document.body);
    });

    it('moves focus to #main after every later navigation', async () => {
      const { go, outside, main } = await setup();
      await go('/a');
      outside().focus();
      await go('/b');
      expect(document.activeElement).toBe(main());
      outside().focus();
      await go('/a');
      expect(document.activeElement).toBe(main());
    });

    it('does not steal focus for in-page fragment navigation', async () => {
      const { go, outside } = await setup();
      await go('/a');
      await go('/b');
      outside().focus();
      await go('/b#sekcja');
      expect(document.activeElement).toBe(outside());
    });
  });
});
