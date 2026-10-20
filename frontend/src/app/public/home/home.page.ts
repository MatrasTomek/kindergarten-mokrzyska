import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SITE_NAME } from '../../core/config';
import { TILES } from './tiles';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  template: `
    <div class="page">
      <h1 class="sr-only">{{ siteName }}</h1>
      <nav aria-label="Działy strony">
        <ul class="tiles">
          @for (tile of tiles; track tile.path) {
            <li>
              <a class="tile" [routerLink]="tile.path">
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
    .tiles { list-style: none; margin: 0; padding: 0; display: grid; gap: 1rem; grid-template-columns: 1fr; }
    @media (min-width: 37.5rem) { .tiles { grid-template-columns: repeat(2, 1fr); } }
    @media (min-width: 64rem) { .tiles { grid-template-columns: repeat(5, 1fr); } }
    .tile {
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .75rem;
      min-height: 9rem; padding: 1.25rem; border-radius: 1rem; text-align: center;
      background: var(--app-primary-100); color: var(--app-text); border: 2px solid var(--app-primary-300);
      font-weight: 700; font-size: 1.125rem; text-decoration: none; transition: transform .15s, background .15s;
    }
    .tile:hover, .tile:focus-visible { background: var(--app-primary-200); transform: translateY(-2px); }
    .tile i { font-size: 2.25rem; color: var(--app-accent); }
    @media (prefers-reduced-motion: reduce) {
      .tile { transition: none; }
      .tile:hover, .tile:focus-visible { transform: none; }
    }
  `,
})
export class HomePage {
  protected readonly siteName = SITE_NAME;
  protected readonly tiles = TILES;
}
