import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, inject, PLATFORM_ID, signal } from '@angular/core';
import { bannerSeason, SeasonKey } from '../../theme/banner-season';
import { TODAY } from '../../theme/theme.service';

export const SLIDE_ORDER: readonly SeasonKey[] = ['spring', 'summer', 'autumn', 'winter'];
export const SLIDE_INTERVAL_MS = 6000;

const NAMES: Record<SeasonKey, string> = { spring: 'Wiosna', summer: 'Lato', autumn: 'Jesień', winter: 'Zima' };
const img = (s: SeasonKey, w: number): string => `url(/images/start/${s}-${w}.webp)`;

/**
 * Pokaz slajdów banera strony głównej: 4 ilustracje budynku, start od pory roku z html[data-season] (pre-paint),
 * zmiana co 6 s. Bez automatu przy pauzie, kursorze/fokusie w środku i prefers-reduced-motion (WCAG 2.2.2).
 * Przed zdarzeniem `load` pobierany jest tylko obrazek startowy; przed bootstrapem (prerender) slajd wybiera CSS.
 */
@Component({
  selector: 'app-banner-slider',
  host: {
    '[class.is-ready]': 'ready',
    '(mouseenter)': 'hold("hover", true)',
    '(mouseleave)': 'hold("hover", false)',
    '(focusin)': 'hold("focus", true)',
    '(focusout)': 'hold("focus", false)',
  },
  template: `
    <div class="slides" [class.is-ready]="ready" aria-hidden="true">
      @for (s of slides; track s; let i = $index) {
        <div
          class="slide slide--{{ s }}"
          [class.is-active]="i === index()"
          [class.is-deferred]="deferred(i)"
          [style.--img-768]="img(s, 768)"
          [style.--img-1280]="img(s, 1280)"
          [style.--img-1920]="img(s, 1920)"
        ></div>
      }
    </div>
    <div class="overlay"><ng-content /></div>
    <div class="controls" role="group" aria-label="Pokaz zdjęć przedszkola">
      <button type="button" class="ctl" aria-label="Poprzedni obraz" (click)="prev()"><i class="pi pi-chevron-left" aria-hidden="true"></i></button>
      @for (s of slides; track s; let i = $index) {
        <button
          type="button"
          class="dot"
          [attr.aria-label]="'Obraz ' + (i + 1) + ' z ' + slides.length + ': ' + names[s]"
          [attr.aria-current]="i === index() ? 'true' : null"
          (click)="go(i)"
        ></button>
      }
      <button type="button" class="ctl" aria-label="Następny obraz" (click)="next()"><i class="pi pi-chevron-right" aria-hidden="true"></i></button>
      <button type="button" class="ctl" [attr.aria-label]="paused() ? 'Wznów pokaz slajdów' : 'Wstrzymaj pokaz slajdów'" (click)="togglePause()">
        <i class="pi" [class.pi-play]="paused()" [class.pi-pause]="!paused()" aria-hidden="true"></i>
      </button>
    </div>
  `,
  styles: `
    :host { position: relative; display: block; overflow: hidden; height: clamp(16rem, 42vw, 30rem); background: #e5e7eb; }
    .slide {
      position: absolute; inset: 0; opacity: 0; transition: opacity .8s ease;
      background: var(--img-768) center / cover no-repeat;
    }
    @media (min-width: 48rem) { .slide { background-image: var(--img-1280); } }
    @media (min-width: 90rem) { .slide { background-image: var(--img-1920); } }
    .slide.is-deferred { background-image: none; }
    .slides.is-ready .slide.is-active { opacity: 1; }
    /* Przed bootstrapem (prerendrowany HTML) slajd startowy wybiera atrybut z pre-paint; bez JS — lato. */
    :host-context(html[data-season='spring']) .slides:not(.is-ready) .slide--spring,
    :host-context(html[data-season='summer']) .slides:not(.is-ready) .slide--summer,
    :host-context(html[data-season='autumn']) .slides:not(.is-ready) .slide--autumn,
    :host-context(html[data-season='winter']) .slides:not(.is-ready) .slide--winter,
    :host-context(html:not([data-season])) .slides:not(.is-ready) .slide--summer {
      opacity: 1; background-image: var(--img-768);
    }
    @media (min-width: 48rem) {
      :host-context(html[data-season='spring']) .slides:not(.is-ready) .slide--spring,
      :host-context(html[data-season='summer']) .slides:not(.is-ready) .slide--summer,
      :host-context(html[data-season='autumn']) .slides:not(.is-ready) .slide--autumn,
      :host-context(html[data-season='winter']) .slides:not(.is-ready) .slide--winter,
      :host-context(html:not([data-season])) .slides:not(.is-ready) .slide--summer { background-image: var(--img-1280); }
    }
    @media (min-width: 90rem) {
      :host-context(html[data-season='spring']) .slides:not(.is-ready) .slide--spring,
      :host-context(html[data-season='summer']) .slides:not(.is-ready) .slide--summer,
      :host-context(html[data-season='autumn']) .slides:not(.is-ready) .slide--autumn,
      :host-context(html[data-season='winter']) .slides:not(.is-ready) .slide--winter,
      :host-context(html:not([data-season])) .slides:not(.is-ready) .slide--summer { background-image: var(--img-1920); }
    }
    .overlay { position: absolute; inset: 0; }
    .controls {
      position: absolute; right: 1rem; bottom: 1rem; display: flex; align-items: center; gap: .25rem;
      padding: .25rem; border-radius: 999px; background: rgba(0, 0, 0, .45);
    }
    button { border: 0; cursor: pointer; display: grid; place-items: center; }
    .ctl { width: 2.75rem; height: 2.75rem; border-radius: 50%; background: transparent; color: #fff; font-size: 1rem; }
    .ctl:hover { background: rgba(255, 255, 255, .2); }
    .dot { width: 1.75rem; height: 2.75rem; background: transparent; padding: 0; }
    .dot::before { content: ''; width: .625rem; height: .625rem; border-radius: 50%; background: rgba(255, 255, 255, .55); }
    .dot[aria-current='true']::before { background: #fff; transform: scale(1.3); }
    button:focus-visible { outline: 3px solid #fff; outline-offset: -3px; }
    @media (max-width: 30rem) { .controls { right: .5rem; bottom: .5rem; } .dot { width: 1.25rem; } }
    @media (prefers-reduced-motion: reduce) { .slide { transition: none; } }
  `,
})
export class BannerSliderComponent {
  private readonly doc = inject(DOCUMENT);
  private readonly today = inject(TODAY);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly slides = SLIDE_ORDER;
  protected readonly names = NAMES;
  protected readonly img = img;
  /** Klasa is-ready: od teraz aktywny slajd wybiera komponent, nie CSS z html[data-season]. */
  protected readonly ready = this.browser;

  private readonly start = this.browser ? this.startIndex() : -1;
  private readonly _index = signal(Math.max(this.start, 0));
  readonly index = this._index.asReadonly();
  private readonly _paused = signal(false);
  readonly paused = this._paused.asReadonly();
  private readonly loaded = signal(this.browser && this.doc.readyState === 'complete');
  private readonly holds = { hover: false, focus: false };
  private timer: ReturnType<typeof setTimeout> | undefined;
  protected readonly deferred = (i: number): boolean => !this.loaded() && i !== this.start;

  constructor() {
    if (!this.browser) return;
    const win = this.doc.defaultView;
    const onLoad = (): void => this.loaded.set(true);
    if (!this.loaded()) win?.addEventListener('load', onLoad, { once: true });
    this.schedule();
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.timer);
      win?.removeEventListener('load', onLoad);
    });
  }

  next(): void {
    this.go((this.index() + 1) % SLIDE_ORDER.length);
  }

  prev(): void {
    this.go((this.index() + SLIDE_ORDER.length - 1) % SLIDE_ORDER.length);
  }

  go(i: number): void {
    this._index.set(i);
    this.schedule();
  }

  togglePause(): void {
    this._paused.update((p) => !p);
    this.schedule();
  }

  protected hold(reason: 'hover' | 'focus', on: boolean): void {
    this.holds[reason] = on;
    this.schedule();
  }

  /** Odlicza od nowa do następnego slajdu, o ile automat może teraz działać. */
  private schedule(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    if (!this.browser || this._paused() || this.holds.hover || this.holds.focus || this.reducedMotion()) return;
    this.timer = setTimeout(() => this.next(), SLIDE_INTERVAL_MS);
  }

  private reducedMotion(): boolean {
    const mq = this.doc.defaultView?.matchMedia;
    return typeof mq === 'function' && mq.call(this.doc.defaultView, '(prefers-reduced-motion: reduce)').matches;
  }

  private startIndex(): number {
    const s = this.doc.documentElement.dataset['season'] as SeasonKey | undefined;
    const i = s ? SLIDE_ORDER.indexOf(s) : -1;
    return i >= 0 ? i : SLIDE_ORDER.indexOf(bannerSeason(null, this.today()));
  }
}
