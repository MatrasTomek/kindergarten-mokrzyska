import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { A11yToolbarComponent } from './a11y-toolbar.component';
import { SpeechService } from './speech.service';

describe('A11yToolbarComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  function render(supported: boolean) {
    TestBed.configureTestingModule({
      imports: [A11yToolbarComponent],
      providers: [provideRouter([]), { provide: SpeechService, useValue: { supported, speaking: () => false, speak: vi.fn(), stop: vi.fn() } }],
    });
    const f = TestBed.createComponent(A11yToolbarComponent);
    f.detectChanges();
    return f;
  }

  it('exposes pressed state and declaration link', () => {
    const f = render(true);
    const contrast: HTMLButtonElement = f.nativeElement.querySelector('[data-test=contrast]');
    expect(contrast.getAttribute('aria-pressed')).toBe('false');
    contrast.click();
    f.detectChanges();
    expect(contrast.getAttribute('aria-pressed')).toBe('true');
    expect(f.nativeElement.querySelector('a[href="/deklaracja-dostepnosci"]')).not.toBeNull();
    expect(f.nativeElement.querySelector('[data-test=speak]')).not.toBeNull();
  });

  it('font buttons with an aria-label include their visible text in the accessible name (WCAG 2.5.3)', () => {
    const buttons: HTMLButtonElement[] = Array.from(render(true).nativeElement.querySelectorAll('button[aria-label]'));
    const multiChar = buttons.filter((b) => (b.textContent ?? '').trim().length > 1);
    expect(multiChar.map((b) => b.getAttribute('aria-label'))).toEqual(['A− Zmniejsz tekst', 'A+ Powiększ tekst']);
  });

  it('hides read-aloud when unsupported', () => {
    expect(render(false).nativeElement.querySelector('[data-test=speak]')).toBeNull();
  });
  it('keeps one persistent speak button that toggles to stop', () => {
    const speaking = signal(false);
    const speech = { supported: true, speaking, speak: vi.fn(() => speaking.set(true)), stop: vi.fn(() => speaking.set(false)) };
    TestBed.configureTestingModule({
      imports: [A11yToolbarComponent],
      providers: [provideRouter([]), { provide: SpeechService, useValue: speech }],
    });
    const f = TestBed.createComponent(A11yToolbarComponent);
    f.detectChanges();
    document.body.appendChild(f.nativeElement);
    const btn: HTMLButtonElement = f.nativeElement.querySelector('[data-test=speak]');
    btn.focus();
    btn.click();
    f.detectChanges();
    expect(f.nativeElement.querySelector('[data-test=speak]')).toBe(btn);
    expect(document.activeElement).toBe(btn);
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    btn.click();
    f.detectChanges();
    expect(speech.stop).toHaveBeenCalled();
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    f.nativeElement.remove();
  });

  it('renders a non-color cue on pressed toggles', () => {
    const f = render(true);
    const contrast: HTMLButtonElement = f.nativeElement.querySelector('[data-test=contrast]');
    expect(contrast.querySelector('.check')).toBeNull();
    contrast.click();
    f.detectChanges();
    const check = contrast.querySelector('.check')!;
    expect(check.textContent).toContain('✓');
    expect(check.getAttribute('aria-hidden')).toBe('true');
  });

  it('is sticky only on roomy viewports: static below 48rem width or 30rem height (phones, browser zoom)', () => {
    const f = render(true);
    const host = [...(f.nativeElement as HTMLElement).attributes].find((a) => a.name.startsWith('_nghost'))!.name;
    const rules = [...document.styleSheets].flatMap((s) => [...s.cssRules]);
    const base = rules.find((r): r is CSSStyleRule => r instanceof CSSStyleRule && r.selectorText === `[${host}]`)!;
    expect(base.style.position).toBe('sticky');
    const media = rules.find((r): r is CSSMediaRule => r instanceof CSSMediaRule && [...r.cssRules].some((c) => (c as CSSStyleRule).selectorText === `[${host}]`))!;
    expect(media.media.mediaText.replace(/\s+/g, '')).toBe('(max-width:48rem),(max-height:30rem)');
    expect(([...media.cssRules][0] as CSSStyleRule).style.position).toBe('static');
  });
});
