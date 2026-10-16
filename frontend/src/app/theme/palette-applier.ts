import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { updatePrimaryPalette } from '@primeuix/themes';
import { Palette } from '../core/models';
import { SHADES } from './default-themes';

@Injectable({ providedIn: 'root' })
export class PaletteApplier {
  private readonly doc = inject(DOCUMENT);

  apply(p: Palette): void {
    updatePrimaryPalette({ ...Object.fromEntries(SHADES.map((k) => [k, p[k]])), 950: p['900'] });
    const style = this.doc.documentElement.style;
    for (const k of SHADES) style.setProperty(`--app-primary-${k}`, p[k]);
    style.setProperty('--app-accent', p.accent);
    style.setProperty('--app-text', p.text);
  }
}
