export const SITE_NAME = 'Publiczne Przedszkole Parafialne w Mokrzyskach pw. Błogosławionej Karoliny Kózka';
/** Do <title> — pełna nazwa jest za długa na kartę przeglądarki. */
export const SITE_SHORT_NAME = 'Przedszkole Parafialne w Mokrzyskach';
export const API = '/api';
export const UPLOADS = '/uploads';
export const uploadUrl = (path: string): string => `${UPLOADS}/${path}`;
export const pageTitle = (title: string): string => `${title} – ${SITE_SHORT_NAME}`;
