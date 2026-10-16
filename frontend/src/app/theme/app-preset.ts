import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import { SHADES } from './default-themes';

/**
 * Paleta primary PrimeNG wskazuje na zmienne --app-primary-*, które ustawia skrypt pre-paint w index.html
 * (pora roku / zapamiętany motyw) — widżety w prerenderowanym HTML nie są w kolorze Aura (emerald) do startu ThemeService.
 */
const APP_PRIMARY = { ...Object.fromEntries(SHADES.map((k) => [k, `var(--app-primary-${k})`])), 950: 'var(--app-primary-900)' };

/** Przyciski i akcenty na odcieniu 700 — kontrast z białym tekstem ≥ 4.5:1 dla wszystkich palet sezonowych. */
export const AppPreset = definePreset(Aura, {
  semantic: {
    primary: APP_PRIMARY,
    colorScheme: {
      light: {
        primary: {
          color: '{primary.700}',
          contrastColor: '#ffffff',
          hoverColor: '{primary.800}',
          activeColor: '{primary.900}',
        },
        highlight: {
          background: '{primary.100}',
          focusBackground: '{primary.200}',
          color: '{primary.900}',
          focusColor: '{primary.900}',
        },
      },
    },
  },
});
