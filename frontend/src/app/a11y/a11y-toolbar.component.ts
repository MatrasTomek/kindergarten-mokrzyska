import { DOCUMENT } from '@angular/common';
import { afterNextRender, Component, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { A11yService } from './a11y.service';
import { SpeechService } from './speech.service';

@Component({
  selector: 'app-a11y-toolbar',
  imports: [RouterLink],
  template: `
    <div
      #bar
      class="bar"
      [class.collapsed]="collapsed()"
      role="region"
      aria-label="Ułatwienia dostępu"
      (keydown.escape)="close()"
    >
      <a #start routerLink="/">Start</a>
      <!-- Gdy narzędzia nie mieszczą się w jednej linii, widać tylko „Start” i ten przycisk; inaczej jest ukryty. -->
      <button
        #toggle
        type="button"
        class="menu-toggle"
        data-test="menu-toggle"
        aria-label="Menu ułatwień dostępu"
        aria-controls="a11y-tools"
        [attr.aria-expanded]="open()"
        (click)="open.set(!open())"
      >
        <i class="pi" [class.pi-bars]="!open()" [class.pi-times]="open()" aria-hidden="true"></i>
      </button>
      <div #tools id="a11y-tools" class="tools" [class.open]="open()">
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
        <a routerLink="/deklaracja-dostepnosci" (click)="open.set(false)">Deklaracja dostępności</a>
      </div>
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
    .tools {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
      justify-content: flex-end;
    }
    .menu-toggle {
      display: none;
      font-size: 1.125rem;
      padding: 0.25rem 0.5rem;
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
    /* Narzędzia nie mieszczą się w jednej linii → chowają się pod przyciskiem menu (reguły po bazowych, by je nadpisać). */
    .bar.collapsed {
      justify-content: space-between;
    }
    .bar.collapsed .menu-toggle {
      display: inline-flex;
    }
    .bar.collapsed .tools {
      display: none;
      flex-basis: 100%;
      flex-direction: column;
      align-items: stretch;
      padding-bottom: 0.25rem;
    }
    .bar.collapsed .tools.open {
      display: flex;
    }
    .bar.collapsed .group > button {
      flex: 1;
      justify-content: center;
    }
    /* Pomiar (na chwilę, bez odmalowania): wszystko rozłożone w jednym wierszu, bez zawijania i ściskania. */
    .bar.measuring {
      flex-wrap: nowrap;
      justify-content: flex-start;
    }
    .bar.measuring .menu-toggle {
      display: none;
    }
    .bar.measuring .tools,
    .bar.measuring .tools.open {
      display: flex;
      flex-wrap: nowrap;
      flex-direction: row;
      flex-basis: auto;
      align-items: center;
    }
    .bar.measuring *,
    .bar.measuring .group > button {
      flex: none;
      white-space: nowrap;
    }
  `,
})
export class A11yToolbarComponent {
  protected readonly a11y = inject(A11yService);
  protected readonly speech = inject(SpeechService);
  private readonly doc = inject(DOCUMENT);
  private readonly toggleButton = viewChild.required<ElementRef<HTMLButtonElement>>('toggle');
  private readonly bar = viewChild.required<ElementRef<HTMLElement>>('bar');
  private readonly start = viewChild.required<ElementRef<HTMLElement>>('start');
  private readonly tools = viewChild.required<ElementRef<HTMLElement>>('tools');
  protected readonly open = signal(false);
  protected readonly collapsed = signal(false);

  constructor() {
    // Szerokość paska (okno, zoom) i szerokość treści („Start” rośnie z A+/czytelną czcionką, narzędzia ze zmianą
    // etykiety) — każda zmiana może przesądzić, czy wszystko mieści się w jednej linii.
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.fit());
    afterNextRender(() => {
      this.fit();
      for (const el of [this.bar(), this.start(), this.tools()]) observer?.observe(el.nativeElement);
    });
    inject(DestroyRef).onDestroy(() => observer?.disconnect());
  }

  protected close(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.toggleButton().nativeElement.focus();
  }

  /** Zwija pasek do menu, gdy jego elementy nie mieszczą się w jednej linii. */
  private fit(): void {
    const bar = this.bar().nativeElement;
    if (!bar.getBoundingClientRect().width) return; // bez układu (ukryty, środowisko testowe) nie ma czego mierzyć
    bar.classList.add('measuring');
    const last = this.tools().nativeElement.lastElementChild!.getBoundingClientRect().right;
    const fits = last <= bar.getBoundingClientRect().right - parseFloat(getComputedStyle(bar).paddingRight);
    bar.classList.remove('measuring');
    // Klasę ustawiamy też od razu (nie dopiero przy następnym przebiegu detekcji zmian), żeby nie mignął zawinięty pasek.
    bar.classList.toggle('collapsed', !fits);
    this.collapsed.set(!fits);
    if (fits) this.open.set(false);
  }

  protected toggleSpeech(): void {
    if (this.speech.speaking()) this.speech.stop();
    else this.read();
  }

  private read(): void {
    const selected = (this.doc.defaultView?.getSelection()?.toString() ?? '').trim();
    this.speech.speak(selected || (this.doc.getElementById('main')?.innerText ?? ''));
  }
}
