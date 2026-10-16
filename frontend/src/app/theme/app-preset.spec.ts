import { AppPreset } from './app-preset';
import { SHADES } from './default-themes';

describe('AppPreset', () => {
  it('takes primary from --app-primary-* so widgets match the pre-paint season colors (not Aura emerald) before ThemeService runs', () => {
    const primary = (AppPreset as { semantic: { primary: Record<string, string> } }).semantic.primary;
    expect(primary).toMatchObject({
      ...Object.fromEntries(SHADES.map((k) => [k, `var(--app-primary-${k})`])),
      950: 'var(--app-primary-900)',
    });
  });
});
