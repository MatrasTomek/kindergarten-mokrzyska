import { Section, SECTIONS, TILE_ORDER } from '../../core/sections';

export const TILES: readonly Section[] = TILE_ORDER.map((k) => SECTIONS[k]);
