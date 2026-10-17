import { expect, test } from '@playwright/test';
import { ADMIN, adminToken, ensureTeacher, login, makeImage, TEACHER } from './fixtures';

test('admin logs in through the form and sees the admin-only sections', async ({ page }) => {
  await login(page, ADMIN);
  const nav = page.getByRole('navigation');
  for (const name of ['Wpisy', 'Grupy', 'Treści podstron', 'Motywy', 'Użytkownicy']) {
    await expect(nav.getByRole('link', { name, exact: true })).toBeVisible();
  }
  await expect(page.getByRole('heading', { level: 1, name: 'Wpisy' })).toBeVisible();
});

test('teacher publishes a post with 3 photos to news and a group', async ({ page, request, browser }) => {
  await ensureTeacher(request);
  // Duży PNG (2400×1600): przeglądarka musi go zmniejszyć do 1920 px i przekodować do WebP (lub JPEG).
  const bigPng = await makeImage(page, 2400, 1600, 'image/png');
  await login(page, TEACHER);
  await expect(page.getByRole('link', { name: 'Grupy' })).toHaveCount(0);

  await page.getByRole('link', { name: '+ Nowy wpis' }).click();
  const title = `Jesienny spacer ${Date.now()}`;
  await page.getByLabel('Tytuł *').fill(title);
  await page.getByLabel('Zajawka').fill('Byliśmy w parku');
  await page.locator('#news').check();
  // MultiSelect: combobox to ukryte (dostępne) pole — otwieramy klawiaturą, jak użytkownik czytnika ekranu.
  await page.getByRole('combobox', { name: 'Pokaż w grupach' }).focus();
  await page.keyboard.press('ArrowDown');
  await page.getByRole('option', { name: 'Pingwinki' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('option', { name: 'Pingwinki' })).toBeHidden();
  await expect(page.locator('#groups').locator('xpath=ancestor::p-multiselect')).toContainText('Pingwinki');

  await page.locator('input[type=file][accept="image/*"]').setInputFiles(
    [1, 2, 3].map((i) => ({ name: `zdjecie-${i}.png`, mimeType: 'image/png', buffer: bigPng })),
  );
  await expect(page.locator('ul.grid img')).toHaveCount(3, { timeout: 30_000 });
  await page.getByRole('button', { name: 'Zapisz' }).click();
  await page.waitForURL('**/admin/wpisy');

  // Wiersz wpisu jest widoczny, ale nauczyciel nie ma przycisku „Usuń”.
  const row = page.getByRole('row', { name: new RegExp(title) });
  await expect(row).toBeVisible();
  await expect(row.getByRole('button', { name: /Usuń/ })).toHaveCount(0);
  // To samo w edytorze: formularz załadowany, brak „Usuń wpis”.
  await row.getByRole('link', { name: title }).click();
  await expect(page.getByLabel('Tytuł *')).toHaveValue(title);
  await expect(page.getByRole('button', { name: 'Usuń wpis' })).toHaveCount(0);

  // Zapisane pliki: WebP/JPEG, dłuższy bok ≤ 1920 px (oryginał 2400 px).
  const token = await adminToken(request);
  const list = await (await request.get('/api/admin/posts', { headers: { Authorization: `Bearer ${token}` } })).json();
  const saved = list.items.find((p: { title: string }) => p.title === title);
  expect(saved.images).toHaveLength(3);
  for (const img of saved.images) {
    expect(img.file).toMatch(/\.(webp|jpg)$/);
    expect(Math.max(img.w, img.h)).toBeLessThanOrEqual(1920);
    expect(img).toMatchObject({ w: 1920, h: 1280, alt: title });
    const res = await request.get(`/uploads/${img.file}`);
    expect(res.ok()).toBe(true);
    expect(res.headers()['content-type']).toMatch(/^image\/(webp|jpeg)/);
  }

  for (const path of ['/z-zycia-przedszkola', '/aktualnosci', '/grupy/pingwinki']) {
    await page.goto(path);
    await expect(page.getByRole('link', { name: title })).toBeVisible();
  }
  await page.getByRole('link', { name: title }).click();
  await expect(page.locator('.gallery img')).toHaveCount(3);
  await expect(page.locator('.gallery img').first()).toHaveAttribute('alt', title);

  // Kontrola: administrator widzi „Usuń” przy tym samym wpisie (te same lokatory potrafią znaleźć przycisk).
  const adminPage = await browser.newPage();
  await login(adminPage, ADMIN);
  const adminRow = adminPage.getByRole('row', { name: new RegExp(title) });
  await expect(adminRow.getByRole('button', { name: /Usuń/ })).toHaveCount(1);
  await adminRow.getByRole('link', { name: title }).click();
  await expect(adminPage.getByLabel('Tytuł *')).toHaveValue(title);
  await expect(adminPage.getByRole('button', { name: 'Usuń wpis' })).toHaveCount(1);
  await adminPage.close();
});

test('opening an existing post and leaving without changes does not ask about unsaved changes', async ({ page, request }) => {
  const token = await adminToken(request);
  const title = `Wpis z formatowaniem ${Date.now()}`;
  const created = await request.post('/api/admin/posts', {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      title,
      excerpt: '',
      body: '<h2>Nagłówek</h2><p>Akapit z <strong>pogrubieniem</strong> i <a href="https://example.com">linkiem</a>.</p><ul><li>pierwszy</li><li>drugi</li></ul>',
      images: [],
      targets: { news: false, groupIds: [] },
      status: 'published',
    },
  });
  expect(created.status()).toBe(201);
  const post = await created.json();

  await login(page, ADMIN);
  await page.goto(`/admin/wpisy/${post.id}`);
  await expect(page.getByLabel('Tytuł *')).toHaveValue(title);
  await expect(page.locator('.ql-editor')).toContainText('pogrubieniem');
  await page.getByRole('link', { name: 'Anuluj' }).click();
  await page.waitForURL('**/admin/wpisy');
  await expect(page.getByText('Niezapisane zmiany')).toHaveCount(0);

  // Kontrola: po zmianie pytanie się pojawia (test potrafi wykryć monit).
  await page.goto(`/admin/wpisy/${post.id}`);
  await expect(page.getByLabel('Tytuł *')).toHaveValue(title);
  await page.getByLabel('Tytuł *').fill(`${title} (zmieniony)`);
  await page.getByRole('link', { name: 'Anuluj' }).click();
  await expect(page.getByRole('alertdialog', { name: 'Niezapisane zmiany' })).toBeVisible();
  await page.getByRole('button', { name: 'Zostań' }).click();

  // Wylogowanie też pyta, a „Zostań” zostawia sesję (zapis nadal działa).
  await page.getByRole('button', { name: 'Wyloguj' }).click();
  await expect(page.getByRole('alertdialog', { name: 'Niezapisane zmiany' })).toBeVisible();
  await page.getByRole('button', { name: 'Zostań' }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/wpisy/${post.id}$`));
  await page.getByRole('button', { name: 'Zapisz' }).click();
  await page.waitForURL('**/admin/wpisy');
  await expect(page.getByRole('row', { name: new RegExp(`${title} \\(zmieniony\\)`) })).toBeVisible();
});

test('deleting a group: cancel returns focus to the button, confirm moves focus to the heading', async ({ page, request }) => {
  const token = await adminToken(request);
  const name = `Grupa testowa ${Date.now()}`;
  const res = await request.post('/api/admin/groups', { headers: { Authorization: `Bearer ${token}` }, data: { name, order: 99, description: '' } });
  expect(res.status()).toBe(201);

  await login(page, ADMIN);
  await page.goto('/admin/grupy');
  const del = page.getByRole('button', { name: `Usuń ${name}` });
  const dialog = page.getByRole('alertdialog', { name: 'Usunąć grupę?' });
  // Użytkownik klawiatury: Enter na przycisku, dialog przejmuje fokus (gotowy), Enter na „Anuluj”.
  await del.focus();
  await page.keyboard.press('Enter');
  await expect(dialog.getByRole('button', { name: 'Anuluj' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
  await expect(del).toBeFocused();

  // Szybkie anulowanie myszą w trakcie animacji otwierania (PrimeNG odbiera wtedy fokus) — fokus i tak wraca na przycisk.
  await del.click();
  await dialog.getByRole('button', { name: 'Anuluj' }).click();
  await expect(dialog).toBeHidden();
  await expect(del).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(dialog.getByRole('button', { name: 'Anuluj' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Usuń' }).click();
  await expect(page.getByRole('cell', { name })).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1, name: 'Grupy' })).toBeFocused();
});
