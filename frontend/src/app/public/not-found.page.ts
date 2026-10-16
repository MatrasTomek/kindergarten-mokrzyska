import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  template: `
    <div class="page">
      <h1>Nie znaleziono strony</h1>
      <p>Strona, której szukasz, nie istnieje lub została przeniesiona.</p>
      <p><a routerLink="/">Wróć na stronę główną</a></p>
    </div>
  `,
})
export class NotFoundPage {}
