export const CONTENT_PAGES = [
  { slug: 'dla-rodzicow', title: 'Dla Rodziców' },
  { slug: 'specjalisci', title: 'Specjaliści' },
  { slug: 'dokumenty', title: 'Dokumenty' },
  { slug: 'rekrutacja', title: 'Rekrutacja' },
  { slug: 'rodo', title: 'RODO' },
  { slug: 'kontakt', title: 'Kontakt' },
  { slug: 'o-nas', title: 'O nas' },
  { slug: 'deklaracja-dostepnosci', title: 'Deklaracja dostępności' },
] as const;

export type ContentPageSlug = (typeof CONTENT_PAGES)[number]['slug'];
