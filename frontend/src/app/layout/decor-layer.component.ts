import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { afterNextRender, Component, DestroyRef, effect, ElementRef, inject, Injector, PLATFORM_ID, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { DecorItem, placeDecor } from '../theme/decor-placement';
import { DECOR_RANDOM, DECOR_ZONES } from '../theme/decor-zones';
import { ThemeService } from '../theme/theme.service';

const RELAYOUT_DEBOUNCE_MS = 150;

/** Ilustracje motywu świątecznego w wolnych miejscach układu publicznego — czysta ozdoba, niewidoczna dla czytników. */
@Component({
  selector: 'app-decor-layer',
  template: `
    @if (items().length) {
      <div class="decor" aria-hidden="true">
        @for (i of items(); track $index) {
          <img alt="" [src]="i.src" loading="lazy" decoding="async"
               [style.left.px]="i.x" [style.top.px]="i.y" [style.width.px]="i.size" [style.height.px]="i.size"
               [style.--decor-rotate]="i.rotate + 'deg'" [style.animation-delay.s]="i.delay" />
        }
      </div>
    }
  `,
  styles: `
    .decor { position: absolute; inset: 0 auto auto 0; width: 100%; height: 0; overflow: visible; pointer-events: none; z-index: 0; }
    img { position: absolute; display: block; user-select: none; transform: rotate(var(--decor-rotate));
          animation: decor-sway 6s ease-in-out infinite alternate; }
    @keyframes decor-sway {
      from { transform: rotate(calc(var(--decor-rotate) - 3deg)); }
      to { transform: rotate(calc(var(--decor-rotate) + 3deg)); }
    }
    /* Globalna reguła skraca tylko czas animacji — nieskończona animacja by wtedy drgała, więc ją wyłączamy. */
    @media (prefers-reduced-motion: reduce) { img { animation: none; } }
  `,
})
export class DecorLayerComponent {
  private readonly theme = inject(ThemeService);
  private readonly zones = inject(DECOR_ZONES);
  private readonly random = inject(DECOR_RANDOM);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly items = signal<DecorItem[]>([]);
  private timer: ReturnType<typeof setTimeout> | undefined;
  /** Ziarno losowania: nowe przy nawigacji i zmianie motywu; przeliczenia po zmianie rozmiaru/treści używają tego samego, więc nic nie skacze. */
  private seed = 0;

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    effect(() => {
      this.theme.decor();
      untracked(() => this.schedule(true));
    });
    inject(Router).events.pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed()).subscribe(() => this.schedule(true));
    const win = inject(DOCUMENT).defaultView!;
    const onResize = () => {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.layout(), RELAYOUT_DEBOUNCE_MS);
    };
    win.addEventListener('resize', onResize);
    // Treść podstrony doczytuje się po nawigacji i zmienia wysokość strony — liczymy wtedy miejsca od nowa.
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(onResize);
    // …a tekst może się pojawić bez zmiany wysokości (np. wiersz „Ładowanie…”); własnych zmian warstwy nie liczymy.
    const mutations = new MutationObserver((records) => {
      if (records.some((r) => !this.host.nativeElement.contains(r.target))) onResize();
    });
    afterNextRender(() => {
      observer?.observe(this.root());
      mutations.observe(this.root(), { childList: true, subtree: true, characterData: true });
    });
    inject(DestroyRef).onDestroy(() => {
      win.removeEventListener('resize', onResize);
      observer?.disconnect();
      mutations.disconnect();
      clearTimeout(this.timer);
    });
  }

  private schedule(reshuffle: boolean): void {
    if (reshuffle) this.seed = Math.floor(this.random() * 2 ** 32);
    afterNextRender(() => this.layout(), { injector: this.injector });
  }

  /** Układ publiczny (rodzic) — względem niego liczymy strefy i pozycjonujemy warstwę. */
  private root(): HTMLElement {
    return this.host.nativeElement.parentElement ?? this.host.nativeElement;
  }

  private layout(): void {
    const set = this.theme.decor();
    if (!set) {
      this.items.set([]);
      return;
    }
    const random = mulberry32(this.seed);
    const { zones, wide } = this.zones(this.root());
    const count = wide ? 4 + Math.floor(random() * 3) : 2 + Math.floor(random() * 2);
    const [minSize, maxSize] = wide ? [56, 88] : [36, 52];
    this.items.set(placeDecor(set.images, zones, { count, minSize, maxSize, random }));
  }
}

/** Mały deterministyczny generator: to samo ziarno → ten sam układ. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
