import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Section } from '../core/sections';

/** Ogniwo ścieżki; ostatnie bez `link` = bieżąca strona. */
export interface Crumb { label: string; link?: string }

/** Nagłówek podstrony: pas w kolorze działu (etykieta + h1), zdjęcie działu obok, pod spodem ścieżka „Start › …”. */
@Component({
  selector: 'app-page-header',
  imports: [RouterLink],
  template: `
    <header class="page-hero" [style.--section]="section().color" [class.no-photo]="!section().photo">
      <div class="text">
        @if (section().tag) {
          <span class="tag tag--light">{{ section().tag }}</span>
        }
        <h1>{{ heading() }}</h1>
      </div>
      @if (photo(); as p) {
        <img
          [src]="p.src"
          [attr.srcset]="p.srcset"
          sizes="(min-width: 48rem) 45vw, 100vw"
          alt=""
          width="960"
          height="540"
          decoding="async"
        />
      }
    </header>
    @if (crumbs().length) {
      <nav class="crumbs" aria-label="Ścieżka">
        <ol>
          <li><a routerLink="/">Start</a></li>
          @for (c of crumbs(); track $index; let last = $last) {
            <li [attr.aria-current]="last ? 'page' : null">
              @if (c.link && !last) {
                <a [routerLink]="c.link">{{ c.label }}</a>
              } @else {
                {{ c.label }}
              }
            </li>
          }
        </ol>
      </nav>
    }
  `,
  styles: `
    :host { display: block; }
    .page-hero { display: grid; grid-template-columns: 55fr 45fr; min-height: clamp(9rem, 18vw, 14rem); background: var(--section); }
    .page-hero.no-photo { grid-template-columns: 1fr; }
    .text {
      display: flex; flex-direction: column; justify-content: center; align-items: flex-start; gap: .5rem;
      padding: 1.5rem 1.5rem 1.5rem max(1rem, calc((100vw - 70rem) / 2)); box-sizing: border-box; min-width: 0;
    }
    h1 { margin: 0; color: #fff; font-size: clamp(1.75rem, 4vw, 2.75rem); overflow-wrap: anywhere; }
    img { width: 100%; height: 100%; min-height: 100%; object-fit: cover; display: block; }
    @media (max-width: 48rem) {
      .page-hero { grid-template-columns: 1fr; }
      img { order: -1; height: 6rem; min-height: 0; }
    }
    .crumbs { max-width: 72rem; margin: 0 auto; padding: .75rem 1rem 0; box-sizing: border-box; font-size: .9375rem; }
    ol { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: .25rem .5rem; color: #4b5563; }
    li { overflow-wrap: anywhere; }
    li + li::before { content: '›'; margin-right: .5rem; color: #6b7280; }
    li[aria-current='page'] { color: var(--app-fg); font-weight: 700; }
    .crumbs a { color: var(--app-text); }
    :host-context(html.a11y-contrast) .text { padding-top: 1rem; padding-bottom: 1rem; }
  `,
})
export class PageHeaderComponent {
  readonly section = input.required<Section>();
  readonly heading = input.required<string>();
  /** Bez „Start” — komponent dodaje go sam. Pusta lista = bez ścieżki. */
  readonly crumbs = input<Crumb[]>([]);

  protected readonly photo = computed(() => {
    const p = this.section().photo;
    if (!p) return null;
    const url = (w: number): string => `/images/headers/${p}-${w}.webp`;
    return { src: url(960), srcset: `${url(480)} 480w, ${url(960)} 960w` };
  });
}
