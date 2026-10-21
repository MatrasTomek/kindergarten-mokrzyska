import { DOCUMENT } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { A11yService } from './a11y.service';
import { SpeechService } from './speech.service';

@Component({
  selector: 'app-a11y-toolbar',
  imports: [RouterLink],
  template: `
    <div class="bar" role="region" aria-label="Ułatwienia dostępu">
      <a routerLink="/">Start</a>
      <div class="group" role="group" aria-label="Rozmiar tekstu">
        <button type="button" (click)="a11y.decreaseFont()" aria-label="A− Zmniejsz tekst">
          A−
        </button>
        <button type="button" (click)="a11y.resetFont()" aria-label="Domyślny rozmiar tekstu">
          A
        </button>
        <button type="button" (click)="a11y.increaseFont()" aria-label="A+ Powiększ tekst">
          A+
        </button>
      </div>
      <button
        type="button"
        data-test="contrast"
        [attr.aria-pressed]="a11y.state().contrast"
        (click)="a11y.toggle('contrast')"
      >
        @if (a11y.state().contrast) {
          <span class="check" aria-hidden="true">✓</span>
        }
        <i class="pi pi-eye" aria-hidden="true"></i> Wysoki kontrast
      </button>
      <button
        type="button"
        [attr.aria-pressed]="a11y.state().readableFont"
        (click)="a11y.toggle('readableFont')"
      >
        @if (a11y.state().readableFont) {
          <span class="check" aria-hidden="true">✓</span>
        }
        <i class="pi pi-book" aria-hidden="true"></i> Czytelna czcionka
      </button>
      <button
        type="button"
        [attr.aria-pressed]="a11y.state().grayscale"
        (click)="a11y.toggle('grayscale')"
      >
        @if (a11y.state().grayscale) {
          <span class="check" aria-hidden="true">✓</span>
        }
        <i class="pi pi-palette" aria-hidden="true"></i> Skala szarości
      </button>
      @if (speech.supported) {
        <button
          type="button"
          data-test="speak"
          [attr.aria-pressed]="speech.speaking()"
          (click)="toggleSpeech()"
        >
          <i
            class="pi"
            [class.pi-stop]="speech.speaking()"
            [class.pi-volume-up]="!speech.speaking()"
            aria-hidden="true"
          ></i>
          {{ speech.speaking() ? 'Zatrzymaj czytanie' : 'Czytaj na głos' }}
        </button>
      }
      <a routerLink="/deklaracja-dostepnosci">Deklaracja dostępności</a>
    </div>
  `,
  styles: `
    :host {
      position: sticky;
      top: 0;
      z-index: 1000;
      display: block;
      background: var(--app-primary-900);
    }
    /* Na telefonie (i przy powiększeniu przeglądarki — media query w rem/px reaguje na zoom) zawinięty pasek
       przyklejony u góry zasłaniałby dużą część ekranu, szczególnie przy tekście 125/150%: tam przewija się ze stroną. */
    @media (max-width: 48rem), (max-height: 30rem) {
      :host {
        position: static;
      }
    }
    .bar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
      justify-content: flex-end;
      max-width: 72rem;
      margin: 0 auto;
      padding: 0.375rem 1rem;
    }
    .group {
      display: flex;
      gap: 0.25rem;
    }
    button,
    a {
      font: inherit;
      font-size: 0.875rem;
      color: #fff;
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.6);
      border-radius: 0.375rem;
      padding: 0.25rem 0.625rem;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      gap: 0.375rem;
      align-items: center;
    }
    button[aria-pressed='true'] {
      background: #fff;
      color: var(--app-primary-900);
    }
    button:hover,
    a:hover {
      border-color: #fff;
    }
    button:focus-visible,
    a:focus-visible {
      outline: 3px solid #fff;
      outline-offset: 2px;
    }
  `,
})
export class A11yToolbarComponent {
  protected readonly a11y = inject(A11yService);
  protected readonly speech = inject(SpeechService);
  private readonly doc = inject(DOCUMENT);

  protected toggleSpeech(): void {
    if (this.speech.speaking()) this.speech.stop();
    else this.read();
  }

  private read(): void {
    const selected = (this.doc.defaultView?.getSelection()?.toString() ?? '').trim();
    this.speech.speak(selected || (this.doc.getElementById('main')?.innerText ?? ''));
  }
}
