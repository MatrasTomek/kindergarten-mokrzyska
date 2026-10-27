/** `description` → <meta name="description"> (SEO, podgląd linków). */
export const CONTENT_PAGES = [
  { slug: 'dla-rodzicow', title: 'Dla Rodziców',
    description: 'Informacje dla rodziców dzieci z Przedszkola Parafialnego w Mokrzyskach – podstawa programowa, ogłoszenia i materiały.' },
  { slug: 'specjalisci', title: 'Specjaliści',
    description: 'Specjaliści pracujący z dziećmi w Przedszkolu Parafialnym w Mokrzyskach.' },
  { slug: 'dokumenty', title: 'Dokumenty',
    description: 'Dokumenty Przedszkola Parafialnego w Mokrzyskach – statut, regulaminy i druki do pobrania.' },
  { slug: 'rekrutacja', title: 'Rekrutacja',
    description: 'Rekrutacja do Przedszkola Parafialnego w Mokrzyskach – zasady, terminy i potrzebne dokumenty.' },
  { slug: 'rodo', title: 'RODO',
    description: 'Informacje o ochronie danych osobowych (RODO) w Przedszkolu Parafialnym w Mokrzyskach.' },
  { slug: 'kontakt', title: 'Kontakt',
    description: 'Kontakt z Przedszkolem Parafialnym w Mokrzyskach – ul. Kościelna 13, 32-800 Mokrzyska, tel. 14 686 82 40.' },
  { slug: 'o-nas', title: 'O nas',
    description: 'O Przedszkolu Parafialnym pw. bł. Karoliny Kózka w Mokrzyskach – historia, misja i wychowanie w duchu pedagogiki chrześcijańskiej.' },
  { slug: 'deklaracja-dostepnosci', title: 'Deklaracja dostępności',
    description: 'Deklaracja dostępności strony internetowej Przedszkola Parafialnego w Mokrzyskach.' },
] as const;

export type ContentPageSlug = (typeof CONTENT_PAGES)[number]['slug'];
