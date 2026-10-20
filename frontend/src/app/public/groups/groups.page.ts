import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PublicApi } from '../../core/api/public-api';
import { apiErrorMessage } from '../../core/api-error';
import { Group } from '../../core/models';
import { groupColor, SECTIONS } from '../../core/sections';
import { PageHeaderComponent } from '../../shared/page-header.component';

@Component({
  selector: 'app-groups-page',
  imports: [RouterLink, PageHeaderComponent],
  template: `
    <app-page-header [section]="section" heading="Grupy" [crumbs]="[{ label: 'Grupy' }]" />
    <div class="page">
      @if (error()) {
        <p role="alert">{{ error() }}</p>
      } @else if (!groups()) {
        <p aria-live="polite">Ładowanie…</p>
      } @else {
        <ul class="groups">
          @for (g of groups(); track g.id; let i = $index) {
            <li><a [routerLink]="['/grupy', g.slug]" [style.--section]="color(i)"><i class="pi pi-users" aria-hidden="true"></i> {{ g.name }}</a></li>
          }
        </ul>
      }
    </div>
  `,
  styles: `
    .groups { list-style: none; padding: 0; display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr)); }
    a {
      display: flex; gap: .75rem; align-items: center; min-height: 5rem; box-sizing: border-box; padding: 1.25rem; border-radius: var(--radius-lg);
      background: var(--section); color: #fff; font-family: var(--font-head); font-weight: 800; font-size: 1.25rem; text-decoration: none;
      box-shadow: 0 2px 6px rgba(0, 0, 0, .12); transition: transform .15s, box-shadow .15s;
    }
    a:hover, a:focus-visible { transform: translateY(-3px); box-shadow: 0 10px 22px rgba(0, 0, 0, .18); }
    a:focus-visible { outline: 3px solid #1d4ed8; outline-offset: 3px; }
    @media (prefers-reduced-motion: reduce) { a { transition: none; } a:hover, a:focus-visible { transform: none; } }
  `,
})
export class GroupsPage {
  protected readonly section = SECTIONS.grupy;
  protected readonly color = groupColor;
  protected readonly groups = signal<Group[] | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    inject(PublicApi).groups().subscribe({
      next: (g) => this.groups.set(g),
      error: (e) => this.error.set(apiErrorMessage(e)),
    });
  }
}
