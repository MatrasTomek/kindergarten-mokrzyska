import { DOCUMENT } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { A11yToolbarComponent } from '../a11y/a11y-toolbar.component';
import { SITE_NAME } from '../core/config';

@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet, RouterLink, A11yToolbarComponent],
  template: `
    <a class="skip-link" href="#main" (click)="skipToMain($event)">Przejdź do treści</a>
    <app-a11y-toolbar />
    <header class="site-header">
      <a routerLink="/" class="brand">
        <img src="logo.jpg" alt="" width="96" height="96" />
        <span class="brand-name">{{ siteName }}</span>
      </a>
    </header>
    <main id="main" tabindex="-1"><router-outlet /></main>
    <footer class="site-footer">
      <nav aria-label="Stopka">
        <a routerLink="/deklaracja-dostepnosci">Deklaracja dostępności</a>
        <a routerLink="/rodo">RODO</a>
        <a routerLink="/kontakt">Kontakt</a>
      </nav>
      <p>© {{ year }} {{ siteName }}</p>
    </footer>
  `,
  styles: `
    :host { display: flex; flex-direction: column; min-height: 100vh; }
    .site-header { max-width: 72rem; margin: 0 auto; width: 100%; box-sizing: border-box; padding: 1rem; }
    .brand { display: flex; align-items: center; gap: 1rem; text-decoration: none; color: var(--app-text); }
    .brand img { width: 4.5rem; height: 4.5rem; object-fit: contain; }
    .brand-name { font-size: clamp(1.25rem, 3vw, 2rem); font-weight: 700; line-height: 1.2; }
    main { flex: 1; outline: none; }
    .site-footer { background: var(--app-primary-50); border-top: 2px solid var(--app-primary-200); padding: 1.5rem 1rem; text-align: center; }
    .site-footer nav { display: flex; gap: 1.5rem; justify-content: center; flex-wrap: wrap; }
    .site-footer a { color: var(--app-text); }
  `,
})
export class PublicLayoutComponent {
  protected readonly siteName = SITE_NAME;
  protected readonly year = new Date().getFullYear();
  private readonly doc = inject(DOCUMENT);

  /** href="#main" z <base href="/"> nawigowałby na stronę główną — przenosimy fokus ręcznie. */
  protected skipToMain(event: Event): void {
    event.preventDefault();
    this.doc.getElementById('main')?.focus();
  }
}
