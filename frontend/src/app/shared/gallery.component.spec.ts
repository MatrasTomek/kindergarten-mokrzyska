import { TestBed } from '@angular/core/testing';
import { providePrimeNG } from 'primeng/config';
import { PL_TRANSLATION } from '../core/primeng-pl';
import { PostImage } from '../core/models';
import { GalleryComponent } from './gallery.component';

const images: PostImage[] = [
  { file: 'posts/a.webp', thumb: 'posts/a_thumb.webp', w: 4, h: 3, alt: 'Dzieci' },
  { file: 'posts/b.webp', thumb: 'posts/b_thumb.webp', w: 4, h: 3, alt: 'Bal' },
];

describe('GalleryComponent', () => {
  async function setup(label?: string) {
    TestBed.configureTestingModule({
      imports: [GalleryComponent],
      providers: [providePrimeNG({ translation: PL_TRANSLATION })],
    });
    const f = TestBed.createComponent(GalleryComponent);
    f.componentRef.setInput('images', images);
    if (label) f.componentRef.setInput('label', label);
    f.detectChanges();
    const buttons = () => [...(f.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('ul.gallery button')];
    const settle = async () => { f.detectChanges(); await f.whenStable(); f.detectChanges(); };
    return { f, buttons, settle };
  }
  const key = (k: string) => document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));

  it('opens lightbox, Escape closes it and focus returns to the opener', async () => {
    const { buttons, settle } = await setup();
    const opener = buttons()[1];
    opener.focus();
    opener.click();
    await settle();
    expect(document.querySelector('[aria-modal=true]')).not.toBeNull();
    (document.activeElement as HTMLElement).blur();
    expect(document.activeElement).not.toBe(opener);
    key('Escape');
    await settle();
    expect(document.activeElement).toBe(opener);
  });

  it('gives the dialog and its buttons Polish accessible names', async () => {
    const { buttons, settle } = await setup('Galeria zdjęć: Bal');
    buttons()[0].click();
    await settle();
    const dlg = document.querySelector('[aria-modal=true]')!;
    expect(dlg.getAttribute('aria-label')).toBe('Galeria zdjęć: Bal');
    expect(dlg.querySelector('button[aria-label=Zamknij]')).not.toBeNull();
    expect(dlg.querySelector('button[aria-label="Poprzednie zdjęcie"]')).not.toBeNull();
    expect(dlg.querySelector('button[aria-label="Następne zdjęcie"]')).not.toBeNull();
  });

  it('defaults dialog name and arrows change the shown image', async () => {
    const { buttons, settle } = await setup();
    buttons()[0].click();
    await settle();
    const dlg = document.querySelector('[aria-modal=true]')!;
    expect(dlg.getAttribute('aria-label')).toBe('Galeria zdjęć');
    key('ArrowRight');
    await settle();
    expect(dlg.querySelector('img')!.getAttribute('alt')).toBe('Bal');
    key('ArrowLeft');
    await settle();
    expect(dlg.querySelector('img')!.getAttribute('alt')).toBe('Dzieci');
  });
});
