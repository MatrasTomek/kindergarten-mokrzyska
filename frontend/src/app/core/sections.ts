import { Post } from './models';

export type SectionKey = 'aktualnosci' | 'grupy' | 'dla-rodzicow' | 'specjalisci' | 'dokumenty' | 'rekrutacja'
  | 'rodo' | 'kontakt' | 'o-nas' | 'z-zycia-przedszkola' | 'deklaracja-dostepnosci' | 'neutral';

/** Dział serwisu: stały kolor (biały tekst ≥ 4.5:1), etykieta i zdjęcie nagłówka (`/images/headers/<photo>-<w>.webp`). */
export interface Section { key: SectionKey; title: string; path: string; color: string; tag: string; icon: string; photo: string | null }

export const NEUTRAL_COLOR = '#475569';

const section = (key: SectionKey, title: string, color: string, tag: string, icon: string, photo: string | null): Section =>
  ({ key, title, path: key === 'neutral' ? '/' : `/${key}`, color, tag, icon, photo });

export const SECTIONS: Record<SectionKey, Section> = {
  aktualnosci: section('aktualnosci', 'Aktualności', '#c92a2a', 'Nowości', 'pi-megaphone', '3'),
  grupy: section('grupy', 'Grupy', '#c2410c', 'Dzieci', 'pi-users', '6'),
  'dla-rodzicow': section('dla-rodzicow', 'Dla Rodziców', '#a16207', 'Informacje', 'pi-heart', '11'),
  specjalisci: section('specjalisci', 'Specjaliści', '#2f7d32', 'Kadra', 'pi-briefcase', '8'),
  dokumenty: section('dokumenty', 'Dokumenty', '#0b7285', 'Do pobrania', 'pi-file-pdf', '5'),
  rekrutacja: section('rekrutacja', 'Rekrutacja', '#1864ab', 'Zapisy', 'pi-user-plus', '2'),
  rodo: section('rodo', 'RODO', '#6741d9', 'Prywatność', 'pi-shield', '7'),
  kontakt: section('kontakt', 'Kontakt', '#c2255c', 'Adres', 'pi-phone', '9'),
  'o-nas': section('o-nas', 'O nas', '#5c7a0a', 'Historia', 'pi-home', '10'),
  'z-zycia-przedszkola': section('z-zycia-przedszkola', 'Z życia Przedszkola', '#9c36b5', 'Galeria', 'pi-images', '12'),
  'deklaracja-dostepnosci': section('deklaracja-dostepnosci', 'Deklaracja dostępności', NEUTRAL_COLOR, 'Dostępność', 'pi-eye', '4'),
  neutral: section('neutral', '', NEUTRAL_COLOR, '', 'pi-info-circle', null),
};

/** Kolejność kafelków na stronie głównej. */
export const TILE_ORDER: readonly SectionKey[] = [
  'aktualnosci', 'grupy', 'dla-rodzicow', 'specjalisci', 'dokumenty', 'rekrutacja', 'rodo', 'kontakt', 'o-nas', 'z-zycia-przedszkola',
];

/** Dział wpisu wynika z danych: news → Aktualności, inaczej grupa → Grupy, inaczej Z życia Przedszkola. */
export function postSection(post: Pick<Post, 'targets'>): 'aktualnosci' | 'grupy' | 'z-zycia-przedszkola' {
  if (post.targets.news) return 'aktualnosci';
  return post.targets.groupIds.length ? 'grupy' : 'z-zycia-przedszkola';
}

/** Kolor kafla grupy: kolejne kolory działów, cyklicznie. */
export function groupColor(index: number): string {
  return SECTIONS[TILE_ORDER[index % TILE_ORDER.length]].color;
}
