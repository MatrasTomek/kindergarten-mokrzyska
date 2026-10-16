import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicApi } from '../../core/api/public-api';
import { apiErrorMessage } from '../../core/api-error';
import { Group } from '../../core/models';

@Component({
  selector: 'app-groups-page',
  imports: [RouterLink],
  template: `
    <div class="page">
      <h1>Grupy</h1>
      @if (error()) {
        <p role="alert">{{ error() }}</p>
      } @else if (!groups()) {
        <p aria-live="polite">Ładowanie…</p>
      } @else {
        <ul class="groups">
          @for (g of groups(); track g.id) {
            <li><a [routerLink]="['/grupy', g.slug]"><i class="pi pi-users" aria-hidden="true"></i> {{ g.name }}</a></li>
          }
        </ul>
      }
    </div>
  `,
  styles: `
    .groups { list-style: none; padding: 0; display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr)); }
    a { display: flex; gap: .75rem; align-items: center; padding: 1.25rem; border-radius: 1rem; background: var(--app-primary-100); color: var(--app-text); font-weight: 700; font-size: 1.25rem; text-decoration: none; border: 2px solid var(--app-primary-300); }
    a:hover, a:focus-visible { background: var(--app-primary-200); }
  `,
})
export class GroupsPage {
  protected readonly groups = signal<Group[] | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    inject(PublicApi).groups().subscribe({
      next: (g) => this.groups.set(g),
      error: (e) => this.error.set(apiErrorMessage(e)),
    });
  }
}
