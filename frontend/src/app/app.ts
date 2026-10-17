import { DOCUMENT } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { focusMainOnNavigation } from './core/focus-main-on-navigation';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class App {
  constructor() {
    inject(DOCUMENT).documentElement.lang = 'pl';
    focusMainOnNavigation();
  }
}
