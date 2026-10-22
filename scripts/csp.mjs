// Content-Security-Policy dla /.htaccess. Angularowe `security.autoCsp` nie działa z prerenderem (SSR), więc
// hashe skryptów inline (prepaint, kontrakt zdarzeń, bootstrap jsaction) i handlera `onload` z inline'owania
// krytycznego CSS liczymy z gotowych plików HTML paczki. Każda zmiana takiego skryptu zmienia hash —
// dlatego robi to scripts/package.mjs przy każdej budowie, a verify-package.mjs sprawdza zgodność.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Parser HTML zamienia CRLF/CR na LF przed liczeniem hasha przez przeglądarkę.
const sha256 = (text) => `'sha256-${createHash('sha256').update(text.replace(/\r\n?/g, '\n'), 'utf8').digest('base64')}'`;

const decodeAttr = (value) =>
  value.replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/** Pliki HTML frontu (bez api/ i uploads/). */
function htmlFiles(dir) {
  if (!existsSync(dir)) return [];
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!['api', 'uploads'].includes(entry.name)) files.push(...htmlFiles(path));
    } else if (entry.name.endsWith('.html')) files.push(path);
  }
  return files;
}

/** Hashe wykonywalnych skryptów inline i atrybutów on*="…" we wszystkich plikach HTML paczki. */
export function inlineHashes(dir) {
  const scripts = new Set();
  const handlers = new Set();
  for (const file of htmlFiles(dir)) {
    const html = readFileSync(file, 'utf8');
    for (const [, attrs, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      // src: plik z 'self'; JSON (ng-state) nie jest wykonywany, więc CSP go nie blokuje
      if (/\ssrc\s*=/i.test(attrs) || /\stype\s*=\s*["']?application\/(ld\+)?json/i.test(attrs)) continue;
      scripts.add(sha256(body));
    }
    for (const [, value] of html.matchAll(/\son[a-z]+\s*=\s*"([^"]*)"/gi)) handlers.add(sha256(decodeAttr(value)));
  }
  return { scripts: [...scripts].sort(), handlers: [...handlers].sort() };
}

/**
 * style-src 'unsafe-inline': PrimeNG i Quill wstawiają style w locie (nie da się ich zahashować).
 * img-src data:/blob: — podglądy zdjęć w panelu. frame-ancestors 'none' = ochrona przed clickjackingiem.
 */
export function contentSecurityPolicy({ scripts, handlers }) {
  const scriptSrc = ["'self'", ...(handlers.length ? ["'unsafe-hashes'"] : []), ...scripts, ...handlers];
  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

/** Wartość nagłówka CSP z /.htaccess (`Header always set Content-Security-Policy "…"`) albo null. */
export function cspFromHtaccess(text) {
  return text.match(/^\s*Header always set Content-Security-Policy "([^"]*)"\s*$/m)?.[1] ?? null;
}
