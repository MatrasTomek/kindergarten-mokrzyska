import { DOCUMENT } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { A11yToolbarComponent } from '../a11y/a11y-toolbar.component';
import { DecorLayerComponent } from './decor-layer.component';
import { SITE_NAME } from '../core/config';
import { TODAY } from '../theme/theme.service';

@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, RouterLink, A11yToolbarComponent, DecorLayerComponent],
  template: `
    <app-decor-layer />
    <a class="skip-link" href="#main" (click)="skipToMain($event)">Przejdź do treści</a>
    <app-a11y-toolbar />
    <header class="site-header">
      <a routerLink="/" class="brand">
        <img src="logo.jpg" alt="" width="96" height="96" />
        <span class="brand-name">{{ siteName }}</span>
      </a>
    </header>
    <main id="main" tabindex="-1"><router-outlet /></main>
    <footer class="site-footer site-footer--dark">
      <nav aria-label="Stopka">
        <a routerLink="/deklaracja-dostepnosci">Deklaracja dostępności</a>
        <a routerLink="/rodo">RODO</a>
        <a routerLink="/kontakt">Kontakt</a>
      </nav>
      <p>© {{ year }} {{ siteName }}</p>
      <a style="color: grey; " href="https://nd-soft.pl/" target="_blank" rel="noopener noreferrer"
        >Projekt i wykonanie NDSOFT</a
      >
    </footer>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      position: relative;
    }
    /* Treść zawsze nad ilustracjami motywu świątecznego. */
    .site-header,
    main,
    .site-footer {
      position: relative;
      z-index: 1;
    }
    .site-header {
      max-width: 72rem;
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
      padding: 1rem;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 1rem;
      text-decoration: none;
      color: var(--app-text);
    }
    .brand img {
      width: min(4.5rem, 20vw);
      height: auto;
      aspect-ratio: 1;
      object-fit: contain;
      flex: none;
    }
    .brand-name {
      font-family: var(--font-head);
      font-size: clamp(1.25rem, 3vw, 2rem);
      font-weight: 800;
      line-height: 1.2;
      min-width: 0;
      overflow-wrap: break-word;
    }
    main {
      flex: 1;
      outline: none;
    }
    .site-footer {
      padding: 2rem 1rem;
      text-align: center;
    }
    .site-footer--dark {
      background: var(--app-primary-900);
      color: #fff;
    }
    .site-footer nav {
      display: flex;
      gap: 1.5rem;
      justify-content: center;
      flex-wrap: wrap;
      font-weight: 700;
    }
    .site-footer a {
      color: inherit;
    }
    .site-footer a:focus-visible {
      outline-color: #fff;
    }
    .site-footer p {
      margin: 1rem 0 0;
      opacity: 0.9;
    }
  `,
})
export class PublicLayoutComponent {
  protected readonly siteName = SITE_NAME;
  /** Liczony przy starcie w przeglądarce (nadpisuje rok zamrożony w prerenderowanym HTML). */
  protected readonly year = inject(TODAY)().getFullYear();
  private readonly doc = inject(DOCUMENT);

  /** href="#main" z <base href="/"> nawigowałby na stronę główną — przenosimy fokus ręcznie. */
  protected skipToMain(event: Event): void {
    event.preventDefault();
    this.doc.getElementById('main')?.focus();
  }
}
