import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { Theme, usePreset } from '@primeuix/themes';
import { AppPreset } from './app-preset';
import { DEFAULT_THEMES } from './default-themes';
import { PaletteApplier } from './palette-applier';

describe('PaletteApplier', () => {
  it('maps the palette to CSS variables and the PrimeNG primary palette (no mocks)', () => {
    usePreset(AppPreset);
    const applier = TestBed.inject(PaletteApplier);
    const style = TestBed.inject(DOCUMENT).documentElement.style;
    const winter = DEFAULT_THEMES.find((t) => t.key === 'winter')!.palette;

    applier.apply(winter);

    for (const k of ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'] as const) {
      expect(style.getPropertyValue(`--app-primary-${k}`)).toBe(winter[k]);
    }
    expect(style.getPropertyValue('--app-accent')).toBe('#1d4ed8');
    expect(style.getPropertyValue('--app-text')).toBe('#1e3a8a');

    const primary = (Theme.getPreset() as { semantic: { primary: Record<string, string> } }).semantic.primary;
    expect(primary['50']).toBe('#eff6ff');
    expect(primary['700']).toBe('#1d4ed8');
    expect(primary['900']).toBe('#1e3a8a');
    expect(primary['950']).toBe('#1e3a8a');
  });
});
