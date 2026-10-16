import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
});
