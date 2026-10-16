import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/** Przyciski i akcenty na odcieniu 700 — kontrast z białym tekstem ≥ 4.5:1 dla wszystkich palet sezonowych. */
export const AppPreset = definePreset(Aura, {
  semantic: {
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
