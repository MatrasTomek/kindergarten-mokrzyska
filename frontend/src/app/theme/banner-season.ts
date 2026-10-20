import { Theme } from '../core/models';
import { DEFAULT_THEMES, seasonFor } from './default-themes';

export type SeasonKey = 'spring' | 'summer' | 'autumn' | 'winter';

/** Pora roku banera ostatniego motywu sezonowego — czyta ją skrypt pre-paint w index.html (ta sama nazwa klucza tam). */
export const SEASON_CACHE_KEY = 'theme-season';

const SEASON_KEYS: readonly string[] = ['spring', 'summer', 'autumn', 'winter'] satisfies SeasonKey[];

/** Obrazek banera: klucz aktywnego motywu sezonowego, w każdym innym przypadku pora roku z daty. */
export function bannerSeason(theme: Pick<Theme, 'key' | 'type'> | null, date: Date): SeasonKey {
  if (theme?.type === 'season' && SEASON_KEYS.includes(theme.key)) return theme.key as SeasonKey;
  return seasonFor(date, Object.fromEntries(DEFAULT_THEMES.map((t) => [t.key, t.seasonStart!]))) as SeasonKey;
}
