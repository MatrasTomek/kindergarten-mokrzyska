import { APIRequestContext, Page } from '@playwright/test';

export const ADMIN = { email: 'admin@e2e.pl', password: 'admin-e2e-haslo' };
export const TEACHER = { email: 'nauczyciel@e2e.pl', password: 'nauczyciel-haslo-1' };

/** Generuje w przeglądarce obraz w danym formacie (np. duży PNG, który musi zostać zmniejszony do 1920 px). */
export async function makeImage(page: Page, width: number, height: number, type: 'image/png' | 'image/jpeg'): Promise<Buffer> {
  const b64 = await page.evaluate(
    async ([w, h, t]) => {
      const canvas = new OffscreenCanvas(w, h);
      const ctx = canvas.getContext('2d')!;
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#f59e0b');
      grad.addColorStop(1, '#1d4ed8');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      const bytes = new Uint8Array(await (await canvas.convertToBlob({ type: t, quality: 0.8 })).arrayBuffer());
      let s = '';
      for (const b of bytes) s += String.fromCharCode(b);
      return btoa(s);
    },
    [width, height, type] as const,
  );
  return Buffer.from(b64, 'base64');
}

export async function login(page: Page, who: { email: string; password: string }): Promise<void> {
  await page.goto('/admin/logowanie');
  await page.getByLabel('E-mail').fill(who.email);
  await page.locator('#password').fill(who.password);
  await page.getByRole('button', { name: 'Zaloguj' }).click();
  await page.waitForURL('**/admin/wpisy');
}

export async function adminToken(request: APIRequestContext): Promise<string> {
  const res = await request.post('/api/auth/login', { data: ADMIN });
  return (await res.json()).accessToken;
}

export async function ensureTeacher(request: APIRequestContext): Promise<void> {
  const token = await adminToken(request);
  await request.post('/api/admin/users', {
    headers: { Authorization: `Bearer ${token}` },
    data: { ...TEACHER, name: 'Pani Nauczycielka', role: 'user' },
  }); // 400 przy powtórnym uruchomieniu (konto już istnieje) jest OK
}
