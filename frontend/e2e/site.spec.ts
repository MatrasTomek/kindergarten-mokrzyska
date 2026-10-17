import { expect, test } from '@playwright/test';

test('home shows 10 tiles and every tile opens a page', async ({ page }) => {
  await page.goto('/');
  const tiles = page.getByRole('navigation', { name: 'Działy strony' }).getByRole('link');
  await expect(tiles).toHaveCount(10);
  for (const name of ['Dokumenty', 'Grupy', 'Z życia Przedszkola']) {
    await page.goto('/');
    await page.getByRole('link', { name }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
    // Po zmianie trasy fokus trafia do <main> (czytnik ekranu nie zostaje na usuniętym kafelku / <body>).
    await expect(page.locator('main#main')).toBeFocused();
  }
});

test('accessibility toolbar persists settings', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Wysoki kontrast' }).click();
  await page.getByRole('button', { name: 'Powiększ tekst' }).click();
  await expect(page.locator('html')).toHaveClass(/a11y-contrast/);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/a11y-contrast/);
  await expect(page.locator('html')).toHaveClass(/a11y-font-1/);
  await expect(page.getByRole('button', { name: 'Wysoki kontrast' })).toHaveAttribute('aria-pressed', 'true');
  // Ponowne kliknięcie wyłącza tryb.
  await page.getByRole('button', { name: 'Wysoki kontrast' }).click();
  await expect(page.locator('html')).not.toHaveClass(/a11y-contrast/);
  await expect(page.getByRole('button', { name: 'Wysoki kontrast' })).toHaveAttribute('aria-pressed', 'false');
});

test('seasonal theme from API is applied', async ({ page, request }) => {
  const theme = await (await request.get('/api/theme')).json();
  await page.goto('/');
  const vars = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'];
  const expected = Object.fromEntries([...vars.map((k) => [`--app-primary-${k}`, theme.palette[k]]), ['--app-accent', theme.palette.accent], ['--app-text', theme.palette.text]]);
  await expect
    .poll(() =>
      page.evaluate((names) => {
        const s = getComputedStyle(document.documentElement);
        return Object.fromEntries(names.map((n) => [n, s.getPropertyValue(n).trim().toLowerCase()]));
      }, Object.keys(expected)),
    )
    .toEqual(Object.fromEntries(Object.entries(expected).map(([k, v]) => [k, String(v).toLowerCase()])));
});
