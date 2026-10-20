import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SECTIONS } from '../core/sections';
import { PageHeaderComponent } from '../shared/page-header.component';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink, PageHeaderComponent],
  template: `
    <app-page-header [section]="section" heading="Nie znaleziono strony" />
    <div class="page">
      <p>Strona, której szukasz, nie istnieje lub została przeniesiona.</p>
      <p><a routerLink="/">Wróć na stronę główną</a></p>
    </div>
  `,
})
export class NotFoundPage {
  protected readonly section = SECTIONS.neutral;
}
