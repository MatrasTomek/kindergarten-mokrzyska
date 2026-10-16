import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TODAY } from '../theme/theme.service';
import { PublicLayoutComponent } from './public-layout.component';

describe('PublicLayoutComponent', () => {
  it('has skip link that focuses main without navigation', () => {
    TestBed.configureTestingModule({ imports: [PublicLayoutComponent], providers: [provideRouter([])] });
    const f = TestBed.createComponent(PublicLayoutComponent);
    f.detectChanges();
    const el: HTMLElement = f.nativeElement;
    const main = el.querySelector('main#main') as HTMLElement;
    expect(main.getAttribute('tabindex')).toBe('-1');
    document.body.appendChild(el);
    (el.querySelector('.skip-link') as HTMLAnchorElement).click();
    expect(document.activeElement).toBe(main);
    expect(el.querySelector('header img')!.getAttribute('alt')).toBe('');
    expect(el.querySelector('footer a[href="/deklaracja-dostepnosci"]')).not.toBeNull();
    el.remove();
  });

  it('takes the footer year from the runtime clock, so the browser replaces the year frozen in prerendered HTML', () => {
    TestBed.configureTestingModule({
      imports: [PublicLayoutComponent],
      providers: [provideRouter([]), { provide: TODAY, useValue: () => new Date('2031-06-15T12:00:00Z') }],
    });
    const f = TestBed.createComponent(PublicLayoutComponent);
    f.detectChanges();
    expect(f.nativeElement.querySelector('footer p').textContent).toContain('© 2031 ');
  });
});
