import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TODAY } from '../../theme/theme.service';
import { BannerSliderComponent, SLIDE_INTERVAL_MS } from './banner-slider.component';

@Component({ imports: [BannerSliderComponent], template: `<app-banner-slider><h1>Nazwa</h1></app-banner-slider>` })
class HostComponent {}

describe('BannerSliderComponent', () => {
  const html = document.documentElement;
  let reducedMotion: boolean;
  let f: ComponentFixture<HostComponent>;
  let el: HTMLElement;

  function create(): void {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: TODAY, useValue: () => new Date('2026-07-01T12:00:00+02:00') }],
    });
    f = TestBed.createComponent(HostComponent);
    f.detectChanges();
    el = f.nativeElement;
  }

  const active = (): string => [...el.querySelector('.slide.is-active')!.classList].find((c) => c.startsWith('slide--'))!.slice(7);
  const button = (label: string): HTMLButtonElement =>
    [...el.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === label)!;
  const host = (): HTMLElement => el.querySelector('app-banner-slider')!;
  function tick(ms: number): void {
    vi.advanceTimersByTime(ms);
    f.detectChanges();
  }
  function click(label: string): void {
    button(label).click();
    f.detectChanges();
  }

  beforeEach(() => {
    vi.useFakeTimers();
    reducedMotion = false;
    window.matchMedia = ((q: string) => ({ matches: reducedMotion && q.includes('reduce'), media: q })) as unknown as typeof window.matchMedia;
    html.dataset['season'] = 'autumn';
  });

  afterEach(() => {
    vi.useRealTimers();
    html.removeAttribute('data-season');
    delete (window as { matchMedia?: unknown }).matchMedia;
  });

  it('starts at the season from html[data-season] and projects the overlay', () => {
    create();
    expect(active()).toBe('autumn');
    expect(button('Obraz 3 z 4: Jesień').getAttribute('aria-current')).toBe('true');
    expect(button('Obraz 1 z 4: Wiosna').hasAttribute('aria-current')).toBe(false);
    expect(host().querySelector('h1')!.textContent).toBe('Nazwa');
  });

  it('advances every 6 s and wraps', () => {
    create();
    expect(SLIDE_INTERVAL_MS).toBe(6000);
    tick(6000);
    expect(active()).toBe('winter');
    tick(6000);
    expect(active()).toBe('spring');
  });

  it('next/prev/dot buttons switch slides', () => {
    create();
    click('Następny obraz');
    expect(active()).toBe('winter');
    click('Poprzedni obraz');
    expect(active()).toBe('autumn');
    click('Obraz 1 z 4: Wiosna');
    expect(active()).toBe('spring');
  });

  it('manual switch restarts the countdown', () => {
    create();
    tick(5000);
    click('Następny obraz');
    tick(5000);
    expect(active()).toBe('winter');
    tick(1000);
    expect(active()).toBe('spring');
  });

  it('pause button stops the show and toggles its label', () => {
    create();
    click('Wstrzymaj pokaz slajdów');
    expect(button('Wznów pokaz slajdów')).toBeTruthy();
    tick(12000);
    expect(active()).toBe('autumn');
    click('Wznów pokaz slajdów');
    expect(button('Wstrzymaj pokaz slajdów')).toBeTruthy();
    tick(6000);
    expect(active()).toBe('winter');
  });

  it('hover pauses the show until the pointer leaves', () => {
    create();
    host().dispatchEvent(new Event('mouseenter'));
    tick(12000);
    expect(active()).toBe('autumn');
    host().dispatchEvent(new Event('mouseleave'));
    tick(6000);
    expect(active()).toBe('winter');
  });

  it('focus inside pauses the show until it leaves', () => {
    create();
    button('Następny obraz').dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    tick(12000);
    expect(active()).toBe('autumn');
    button('Następny obraz').dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    tick(6000);
    expect(active()).toBe('winter');
  });

  it('hover leave does not resume a show paused with the button', () => {
    create();
    click('Wstrzymaj pokaz slajdów');
    host().dispatchEvent(new Event('mouseenter'));
    host().dispatchEvent(new Event('mouseleave'));
    tick(12000);
    expect(active()).toBe('autumn');
  });

  it('does not auto-advance with prefers-reduced-motion', () => {
    reducedMotion = true;
    create();
    tick(12000);
    expect(active()).toBe('autumn');
    click('Następny obraz');
    expect(active()).toBe('winter');
  });

  it('defers the other images until window load', () => {
    Object.defineProperty(document, 'readyState', { value: 'loading', configurable: true });
    try {
      create();
      expect([...el.querySelectorAll('.slide.is-deferred')].length).toBe(3);
      expect(el.querySelector('.slide--autumn')!.classList).not.toContain('is-deferred');
      window.dispatchEvent(new Event('load'));
      f.detectChanges();
      expect(el.querySelectorAll('.slide.is-deferred').length).toBe(0);
    } finally {
      delete (document as { readyState?: unknown }).readyState;
    }
  });

  it('falls back to the date season without data-season', () => {
    html.removeAttribute('data-season');
    create();
    expect(active()).toBe('summer');
  });

  it('marks the host ready after start, so CSS stops using html[data-season]', () => {
    create();
    expect(host().classList).toContain('is-ready');
  });

  it('stops the timer on destroy', () => {
    create();
    f.destroy();
    expect(vi.getTimerCount()).toBe(0);
  });
});
