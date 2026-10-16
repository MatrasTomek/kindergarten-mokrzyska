import { DOCUMENT } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { Toast } from 'primeng/toast';
import { AuthService } from '../core/auth/auth.service';

@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Button, Toast, ConfirmDialog],
  providers: [MessageService, ConfirmationService],
  template: `
    <a class="skip-link" href="#main" (click)="skipToMain($event)">Przejdź do treści</a>
    <header class="top">
      <a routerLink="/" class="home">← Strona</a>
      <strong>Panel administracyjny</strong>
      <span class="spacer"></span>
      <span>{{ auth.user()?.name }}</span>
      <p-button label="Wyloguj" severity="secondary" size="small" (onClick)="logout()" />
    </header>
    <div class="body">
      <nav aria-label="Menu panelu">
        <a routerLink="/admin/wpisy" routerLinkActive="active">Wpisy</a>
        @if (auth.isAdmin()) {
          <a routerLink="/admin/grupy" routerLinkActive="active">Grupy</a>
          <a routerLink="/admin/tresci" routerLinkActive="active">Treści podstron</a>
          <a routerLink="/admin/motywy" routerLinkActive="active">Motywy</a>
          <a routerLink="/admin/uzytkownicy" routerLinkActive="active">Użytkownicy</a>
        }
      </nav>
      <main id="main" tabindex="-1"><router-outlet /></main>
    </div>
    <p-toast />
    <p-confirmdialog />
  `,
  styles: `
    .top { display: flex; gap: 1rem; align-items: center; padding: .75rem 1rem; background: var(--app-primary-900); color: #fff; }
    .top a { color: #fff; }
    .spacer { flex: 1; }
    .body { display: grid; grid-template-columns: 14rem 1fr; min-height: calc(100vh - 3.5rem); }
    nav { display: flex; flex-direction: column; gap: .25rem; padding: 1rem; background: var(--app-primary-50); }
    nav a { padding: .5rem .75rem; border-radius: .5rem; color: var(--app-text); text-decoration: none; }
    nav a.active { background: var(--app-primary-200); font-weight: 700; }
    main { padding: 1.5rem; min-width: 0; outline: none; }
    @media (max-width: 48rem) { .body { grid-template-columns: 1fr; } nav { flex-direction: row; flex-wrap: wrap; } }
  `,
})
export class AdminLayoutComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly doc = inject(DOCUMENT);

  /** href="#main" z <base href="/"> nawigowałby na stronę główną — przenosimy fokus ręcznie. */
  protected skipToMain(event: Event): void {
    event.preventDefault();
    this.doc.getElementById('main')?.focus();
  }

  protected async logout(): Promise<void> {
    await this.auth.logout().catch(() => undefined);
    await this.router.navigate(['/admin/logowanie']);
  }
}
