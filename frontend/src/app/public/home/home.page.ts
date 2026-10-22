import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SITE_NAME } from '../../core/config';
import { BannerSliderComponent } from './banner-slider.component';
import { TILES } from './tiles';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, BannerSliderComponent],
  template: `
    <!-- Baner jest samą ilustracją; nagłówek strony zostaje dla czytników ekranu. -->
    <h1 class="sr-only">{{ siteName }}</h1>
    <app-banner-slider />
    <div class="page">
      <nav aria-label="Działy strony">
        <ul class="tiles">
          @for (tile of tiles; track tile.path) {
            <li>
              <a class="tile" [routerLink]="tile.path" [style.--section]="tile.color">
                <i class="pi {{ tile.icon }}" aria-hidden="true"></i>
                <span>{{ tile.title }}</span>
              </a>
            </li>
          }
        </ul>
      </nav>
    </div>
  `,
  styles: `
    .page {
      padding-top: 2rem;
    }
    .tiles {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    @media (max-width: 22rem) {
      .tiles {
        grid-template-columns: 1fr;
      }
    }
    /* Powiększony tekst (125/150%) na telefonie: jedna kolumna, żeby słowa nie wystawały poza kafel. */
    @media (max-width: 37.5rem) {
      :host-context(html.a11y-font-1) .tiles,
      :host-context(html.a11y-font-2) .tiles {
        grid-template-columns: 1fr;
      }
    }
    @media (min-width: 64rem) {
      .tiles {
        grid-template-columns: repeat(5, minmax(0, 1fr));
      }
    }
    .tile {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      min-height: 9rem;
      height: 100%;
      box-sizing: border-box;
      padding: 1.25rem 0.75rem;
      border-radius: var(--radius-lg);
      text-align: center;
      background: var(--section);
      color: #fff;
      font-family: var(--font-head);
      font-weight: 800;
      font-size: 1.125rem;
      text-decoration: none;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
      transition:
        transform 0.15s,
        box-shadow 0.15s;
      overflow-wrap: break-word;
    }
    .tile:hover,
    .tile:focus-visible {
      transform: translateY(-3px);
      box-shadow: 0 10px 22px rgba(0, 0, 0, 0.18);
    }
    .tile:focus-visible {
      outline: 3px solid #1d4ed8;
      outline-offset: 3px;
    }
    .tile i {
      font-size: 2.25rem;
    }
    @media (prefers-reduced-motion: reduce) {
      .tile {
        transition: none;
      }
      .tile:hover,
      .tile:focus-visible {
        transform: none;
      }
    }
  `,
})
export class HomePage {
  protected readonly siteName = SITE_NAME;
  protected readonly tiles = TILES;
}
