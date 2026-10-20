import { APIRequestContext, expect, Page, test } from '@playwright/test';
import { DECOR_THEMES } from '../src/app/theme/decor-catalog';
import { adminToken, login } from './fixtures';

async function setDecor(request: APIRequestContext, decorKey: string | null): Promise<void> {
  const res = await request.put('/api/admin/decor', { headers: { Authorization: `Bearer ${await adminToken(request)}` }, data: { decorKey } });
  expect(res.status()).toBe(200);
}

/** Ilustracje (po przeliczeniu układu) i ich ewentualne kolizje z treścią strony. */
async function decorState(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(400); // debounce przeliczenia po doczytaniu treści
  return page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll<HTMLImageElement>('.decor img'));
    // Treść = to, co faktycznie widać: obrazy i elementy z tłem lub ramką (cały prostokąt) oraz linie własnego tekstu.
    const paintsBox = (el: Element) => {
      if (/^(IMG|PICTURE|VIDEO|SVG|CANVAS|IFRAME)$/i.test(el.tagName)) return true;
      const cs = getComputedStyle(el);
      return cs.backgroundImage !== 'none' || !/^(transparent|rgba\(.*,\s*0\))$/.test(cs.backgroundColor)
        || parseFloat(cs.borderTopWidth) > 0 || parseFloat(cs.borderBottomWidth) > 0;
    };
    const range = document.createRange();
    const content = Array.from(document.querySelectorAll('main *, .site-header *, footer *'))
      .filter((el) => !el.closest('.decor'))
      .flatMap((el) => {
        const name = el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : '');
        if (paintsBox(el)) return [{ el: name, r: el.getBoundingClientRect() }];
        return Array.from(el.childNodes)
          .filter((n) => n.nodeType === Node.TEXT_NODE && !!n.textContent?.trim())
          .flatMap((n) => { range.selectNodeContents(n); return Array.from(range.getClientRects()).map((r) => ({ el: `${name} "${n.textContent!.trim().slice(0, 20)}"`, r })); });
      })
      .filter(({ r }) => r.width > 0 && r.height > 0);
    const hit = (a: DOMRect, b: DOMRect) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    const collisions = imgs.flatMap((img) => content.filter((c) => hit(img.getBoundingClientRect(), c.r)).map((c) => `${img.getAttribute('src')} × ${c.el}`));
    const doc = document.documentElement;
    return {
      count: imgs.length,
      alts: imgs.map((i) => i.getAttribute('alt')),
      collisions,
      hScroll: doc.scrollWidth > doc.clientWidth,
      outside: imgs.filter((i) => i.getBoundingClientRect().bottom + scrollY > doc.scrollHeight).length,
    };
  });
}

test.describe('holiday decor', () => {
  test.beforeEach(async ({ request }) => setDecor(request, 'easter'));
  test.afterAll(async ({ request }) => setDecor(request, null));

  test('wide screen: 4–6 decorative images in the margins, never on content', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const path of ['/', '/aktualnosci', '/kontakt']) {
      await page.goto(path);
      const s = await decorState(page);
      expect.soft(s.collisions, path).toEqual([]);
      expect.soft(s.hScroll, path).toBe(false);
      expect.soft(s.outside, path).toBe(0);
      expect.soft(s.alts.every((a) => a === ''), path).toBe(true);
    }
    await page.goto('/aktualnosci');
    const s = await decorState(page);
    expect(s.count).toBeGreaterThanOrEqual(4);
    expect(s.count).toBeLessThanOrEqual(6);
    await expect(page.locator('.decor')).toHaveAttribute('aria-hidden', 'true');
  });

  test('phone: at most 3 images, never on content, no horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ['/', '/aktualnosci', '/kontakt']) {
      await page.goto(path);
      const s = await decorState(page);
      expect.soft(s.count, path).toBeLessThanOrEqual(3);
      expect.soft(s.collisions, path).toEqual([]);
      expect.soft(s.hScroll, path).toBe(false);
    }
  });

  test('phone: short pages get decorations next to the content', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ['/aktualnosci', '/kontakt']) {
      await page.goto(path);
      const s = await decorState(page);
      expect.soft(s.count, path).toBeGreaterThanOrEqual(2);
      expect.soft(s.collisions, path).toEqual([]);
    }
  });

  test('reduced motion: images stand still', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/aktualnosci');
    await decorState(page);
    const running = await page.locator('.decor img').evaluateAll((imgs) => imgs.reduce((n, i) => n + i.getAnimations().length, 0));
    expect(await page.locator('.decor img').count()).toBeGreaterThan(0);
    expect(running).toBe(0);
  });

  test('resizing from desktop to phone re-lays out without touching content', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/aktualnosci');
    await decorState(page);
    await page.setViewportSize({ width: 390, height: 844 });
    const s = await decorState(page);
    expect(s.count).toBeLessThanOrEqual(3);
    expect(s.collisions).toEqual([]);
  });

  test('150% text on desktop keeps images off the content', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/aktualnosci');
    await page.getByRole('button', { name: 'Powiększ tekst' }).click();
    await expect(page.locator('html')).toHaveClass(/a11y-font-1/);
    await page.getByRole('button', { name: 'Powiększ tekst' }).click();
    await expect(page.locator('html')).toHaveClass(/a11y-font-2/);
    const s = await decorState(page);
    expect(s.collisions).toEqual([]);
    expect(s.hScroll).toBe(false);
  });

  test('client-side navigation reshuffles and stays inside the document', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await decorState(page);
    await page.getByRole('link', { name: 'Kontakt' }).first().click();
    await page.waitForURL('**/kontakt');
    const s = await decorState(page);
    expect(s.outside).toBe(0);
    expect(s.collisions).toEqual([]);
  });

  test('images stay put while the home banner changes slides', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await decorState(page);
    const snap = () => page.locator('.decor img').evaluateAll((imgs) => imgs.map((i) => `${i.getAttribute('src')}@${(i as HTMLElement).style.left},${(i as HTMLElement).style.top}`));
    const before = await snap();
    expect(before.length).toBeGreaterThan(0);
    await page.waitForTimeout(13_000); // dwie zmiany slajdu (co 6 s)
    expect(await snap()).toEqual(before);
  });

  test('no decor in the admin panel', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await login(page, { email: 'admin@e2e.pl', password: 'admin-e2e-haslo' });
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.decor img')).toHaveCount(0);
  });

  test('nothing is rendered when decor is off', async ({ page, request }) => {
    await setDecor(request, null);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/aktualnosci');
    await decorState(page);
    await expect(page.locator('.decor img')).toHaveCount(0);
  });

  test('every catalogue image is served', async ({ request }) => {
    for (const t of DECOR_THEMES) {
      for (const src of t.images) {
        const res = await request.get('/' + src);
        expect.soft(res.status(), src).toBe(200);
        expect.soft(res.headers()['content-type'] ?? '', src).toContain('svg');
      }
    }
  });
});
