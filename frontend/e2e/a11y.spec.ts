import AxeBuilder from '@axe-core/playwright';
import { expect, Page, test } from '@playwright/test';
import { ADMIN, adminToken, login, makeImage } from './fixtures';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
let postSlug = '';
const postTitle = `Audyt dostępności ${Date.now()}`;

/** Strona wyrenderowała właściwą treść (nie stronę błędu / „Ładowanie…”), dopiero wtedy audyt. */
async function expectRendered(page: Page, h1: string | RegExp): Promise<void> {
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(h1);
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('Ładowanie…')).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('main')).not.toBeEmpty();
}

async function audit(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  return results.violations.map((v) => `${v.id}: ${v.nodes.length} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`);
}

// Wpis ze zdjęciem (galeria) do audytu strony szczegółów.
test.beforeAll(async ({ browser, request }) => {
  const page = await browser.newPage();
  const jpeg = await makeImage(page, 1200, 800, 'image/jpeg');
  const thumb = await makeImage(page, 400, 267, 'image/jpeg');
  await page.close();
  const headers = { Authorization: `Bearer ${await adminToken(request)}` };
  const up = await request.post('/api/admin/uploads/image', {
    headers,
    multipart: {
      image: { name: 'a.jpg', mimeType: 'image/jpeg', buffer: jpeg },
      thumb: { name: 'a_thumb.jpg', mimeType: 'image/jpeg', buffer: thumb },
      context: 'posts',
    },
  });
  expect(up.status()).toBe(201);
  const img = await up.json();
  const res = await request.post('/api/admin/posts', {
    headers,
    data: {
      title: postTitle,
      excerpt: 'Wpis do audytu',
      body: '<h2>Nagłówek</h2><p>Treść z <a href="https://example.com">linkiem</a>.</p>',
      images: [{ ...img, alt: 'Dzieci w parku' }],
      targets: { news: true, groupIds: [] },
      status: 'published',
    },
  });
  expect(res.status()).toBe(201);
  postSlug = (await res.json()).slug;
});

const PAGES: [string, string | RegExp][] = [
  ['/', /^Publiczne Przedszkole Parafialne w Mokrzyskach/],
  ['/z-zycia-przedszkola', 'Z życia Przedszkola'],
  ['/aktualnosci', 'Aktualności'],
  ['/grupy', 'Grupy'],
  ['/grupy/pingwinki', 'Pingwinki'],
  ['/dokumenty', 'Dokumenty'],
  ['/deklaracja-dostepnosci', 'Deklaracja dostępności'],
  ['/admin/logowanie', 'Panel administracyjny'],
];

for (const [path, h1] of PAGES) {
  test(`no WCAG A/AA violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    await expectRendered(page, h1);
    expect(await audit(page)).toEqual([]);
  });
}

test('no WCAG A/AA violations on a post detail page', async ({ page }) => {
  await page.goto(`/wpis/${postSlug}`);
  await expectRendered(page, postTitle);
  await expect(page.locator('.gallery img')).toHaveCount(1);
  expect(await audit(page)).toEqual([]);
});

test('no WCAG A/AA violations in the post editor', async ({ page }) => {
  await login(page, ADMIN);
  await page.goto('/admin/wpisy/nowy');
  await expectRendered(page, 'Nowy wpis');
  await expect(page.getByLabel('Tytuł *')).toBeVisible();
  expect(await audit(page)).toEqual([]);
});

test('no violations in high-contrast mode', async ({ page }) => {
  await page.goto('/');
  await expectRendered(page, /^Publiczne Przedszkole Parafialne w Mokrzyskach/);
  await page.getByRole('button', { name: 'Wysoki kontrast' }).click();
  await expect(page.locator('html')).toHaveClass(/a11y-contrast/);
  expect(await audit(page)).toEqual([]);
});
