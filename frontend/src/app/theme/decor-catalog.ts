import { DecorKey } from '../core/models';

/** Wbudowany motyw świąteczny: same ilustracje (pliki w public/decor/<key>/), paleta strony bez zmian. */
export interface DecorTheme { key: DecorKey; name: string; images: string[] }

const files = (key: DecorKey, ...names: string[]): string[] => names.map((n) => `decor/${key}/${n}.svg`);

/** Kolejność i klucze jak w backendzie (DecorThemes::KEYS). */
export const DECOR_THEMES: readonly DecorTheme[] = [
  { key: 'christmas', name: 'Boże Narodzenie', images: files('christmas', 'angel', 'bauble', 'manger', 'star', 'tree', 'wafer') },
  { key: 'epiphany', name: 'Trzech Króli', images: files('epiphany', 'camel', 'casket', 'comet', 'crown', 'kmb') },
  { key: 'easter', name: 'Wielkanoc', images: files('easter', 'basket', 'chick', 'cross', 'egg', 'lamb', 'palm') },
  { key: 'pentecost', name: 'Zesłanie Ducha Świętego', images: files('pentecost', 'branch', 'dove', 'flames', 'rays') },
  { key: 'corpus-christi', name: 'Boże Ciało', images: files('corpus-christi', 'birch', 'monstrance', 'petals', 'wheat-grapes') },
  { key: 'all-saints', name: 'Wszystkich Świętych', images: files('all-saints', 'angel', 'candle', 'chrysanthemum', 'leaf') },
  { key: 'st-nicholas', name: 'Mikołajki', images: files('st-nicholas', 'candy-cane', 'gift', 'sack', 'santa', 'snowflake') },
  { key: 'childrens-day', name: 'Dzień Dziecka', images: files('childrens-day', 'ball', 'balloons', 'kite', 'rainbow', 'sun', 'teddy') },
];

export function decorTheme(key: string | null | undefined): DecorTheme | null {
  return DECOR_THEMES.find((t) => t.key === key) ?? null;
}
