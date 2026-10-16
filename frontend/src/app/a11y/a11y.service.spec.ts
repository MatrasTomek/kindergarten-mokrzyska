import { TestBed } from '@angular/core/testing';
import { A11yService } from './a11y.service';

describe('A11yService', () => {
  const html = document.documentElement;

  beforeEach(() => {
    localStorage.clear();
    html.className = '';
  });

  function create(): A11yService {
    TestBed.resetTestingModule();
    const s = TestBed.inject(A11yService);
    TestBed.tick();
    return s;
  }

  it('applies classes and persists', () => {
    const s = create();
    s.increaseFont();
    s.increaseFont();
    s.increaseFont(); // maks. 2
    s.toggle('contrast');
    TestBed.tick();
    expect(html.classList.contains('a11y-font-2')).toBe(true);
    expect(html.classList.contains('a11y-font-1')).toBe(false);
    expect(html.classList.contains('a11y-contrast')).toBe(true);
    expect(JSON.parse(localStorage.getItem('a11y')!)).toEqual({ fontScale: 2, contrast: true, readableFont: false, grayscale: false });
  });

  it('restores state from storage', () => {
    localStorage.setItem('a11y', JSON.stringify({ fontScale: 1, contrast: false, readableFont: true, grayscale: true }));
    const s = create();
    expect(s.state().fontScale).toBe(1);
    expect(html.classList.contains('a11y-readable')).toBe(true);
    expect(html.classList.contains('a11y-grayscale')).toBe(true);
  });

  it('falls back to defaults for corrupted or foreign storage', () => {
    localStorage.setItem('a11y', '{nie-json');
    expect(create().state()).toEqual({ fontScale: 0, contrast: false, readableFont: false, grayscale: false });

    localStorage.setItem('a11y', JSON.stringify({ fontScale: 7, contrast: 'tak' }));
    expect(create().state()).toEqual({ fontScale: 0, contrast: false, readableFont: false, grayscale: false });
  });

  it('keeps working when storage throws (Safari private mode)', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceeded'); });
    const s = create();
    s.toggle('grayscale');
    TestBed.tick();
    expect(html.classList.contains('a11y-grayscale')).toBe(true);
    spy.mockRestore();
  });
});
