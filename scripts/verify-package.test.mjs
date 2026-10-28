// Uruchom: node --test scripts/verify-package.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { contentSecurityPolicy, inlineHashes } from './csp.mjs';
import { PRERENDERED_ROUTES, verifyPackage } from './verify-package.mjs';

const ASSETS_404 = 'RewriteRule \\.(js|css|map|woff2?|png|jpe?g|webp|svg|ico|json)$ - [NC,R=404,L]';
const securityHeaders = (csp) =>
  `<IfModule mod_headers.c>\n  Header always set Content-Security-Policy "${csp}"\n` +
  '  Header always set Strict-Transport-Security "max-age=31536000"\n  Header always set X-Frame-Options "DENY"\n</IfModule>\n';
const WWW_REDIRECT = 'RewriteCond %{HTTP_HOST} ^www\\.(.+)$ [NC]\nRewriteRule ^ https://%1%{REQUEST_URI} [L,R=301]';
const SEO_ROUTES = 'RewriteRule ^(wpis|grupy)/[^/.]+$ api/index.php [L]\nRewriteRule ^sitemap\\.xml$ api/index.php [L]';
const ROOT_HTACCESS =
  `RewriteEngine On\n${WWW_REDIRECT}\n${SEO_ROUTES}\n` +
  `RewriteCond %{REQUEST_FILENAME} -f\nRewriteRule ^ - [L]\n${ASSETS_404}\nRewriteRule ^ /index.csr.html [L]\n` +
  securityHeaders(contentSecurityPolicy({ scripts: [], handlers: [] }));
const HEADERS_CHECK = '.htaccess: nagłówki bezpieczeństwa (CSP, HSTS, X-Frame-Options)';
const CSP_CHECK = '.htaccess: CSP obejmuje wszystkie skrypty inline z HTML';
const PREPAINT = '<script id="prepaint">\n  document.documentElement.dataset.x = "1";\n</script>';
const ONLOAD = `<link rel="stylesheet" href="styles.css" media="print" onload="this.media='all'">`;
const SEO_CHECK = '.htaccess: www → bez www (301); /wpis/*, /grupy/*, /sitemap.xml → api/index.php przed fallbackiem SPA';
const ASSETS_CHECK = '.htaccess: brakujące pliki statyczne (js, css, map, czcionki, obrazki, json) → 404, nie fallback SPA';
const API_HTACCESS = [
  'RewriteCond %{HTTPS} !=on',
  'RewriteCond %{HTTP:X-Forwarded-Proto} !=https',
  'RewriteRule ^ - [F]',
  'RewriteRule .* - [E=HTTP_AUTHORIZATION:%{HTTP:Authorization}]',
  'RewriteRule ^index\\.php$ - [L]',
  'RewriteRule ^ index.php [QSA,L]',
  '<FilesMatch "(\\.(php\\d?|phtml|phar)|^\\.env.*|^\\.user\\.ini|^composer\\.(json|lock))$">',
  '  Require all denied',
  '</FilesMatch>',
].join('\n');
const UPLOADS_HTACCESS = [
  'Options -Indexes',
  'AddType image/webp .webp',
  'AddType image/jpeg .jpg .jpeg',
  'AddType application/pdf .pdf',
  'Require all denied',
  '<FilesMatch "(?i)\\.(jpe?g|webp|pdf)$">',
  '  Require all granted',
  '</FilesMatch>',
].join('\n');

/** Minimalna poprawna paczka; `overrides`: ścieżka → treść (null = nie twórz). */
function makePackage(overrides = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'pkg-'));
  const files = {
    'index.html': '<app-root ngh="0"></app-root>',
    'index.csr.html': '<app-root></app-root>',
    '.htaccess': ROOT_HTACCESS,
    '.ovhconfig': 'app.engine=php\napp.engine.version=8.4\n',
    'api/index.php': '<?php',
    'api/vendor/autoload.php': '<?php',
    'api/.htaccess': API_HTACCESS,
    'api/.user.ini': 'upload_max_filesize=12M\npost_max_size=13M\n',
    'api/.env.example': 'APP_ENV=dev',
    'uploads/.htaccess': UPLOADS_HTACCESS,
    'robots.txt': 'User-agent: *\nSitemap: https://przedszkolemokrzyska.pl/sitemap.xml\n',
    ...Object.fromEntries(PRERENDERED_ROUTES.map((r) => [`${r}/index.html`, '<html></html>'])),
    ...overrides,
  };
  for (const [path, content] of Object.entries(files)) {
    if (content === null) continue;
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  return dir;
}

function failuresFor(overrides) {
  const dir = makePackage(overrides);
  try {
    return verifyPackage(dir).filter((r) => !r.ok).map((r) => r.check);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('kompletna paczka przechodzi wszystkie sprawdzenia', () => {
  assert.deepEqual(failuresFor({}), []);
});

test('lista prerenderowanych tras zawiera kluczowe strony', () => {
  for (const r of ['aktualnosci', 'grupy', 'kontakt', 'o-nas']) assert.ok(PRERENDERED_ROUTES.includes(r), r);
});

const API_CHECK = 'api/.htaccess: tylko HTTPS, Authorization, front controller, blokada .env';
const UPLOADS_CHECK = 'uploads/.htaccess: deny-all poza jpg/webp/pdf, typy MIME';
const FORBIDDEN_CHECK = 'brak .git, node_modules, plików Dockera, katalogów tests';

const cases = [
  ['brak index.csr.html', { 'index.csr.html': null }, 'index.csr.html'],
  ['brak prerenderowanego index.html', { 'index.html': null }, 'index.html'],
  ['brak prerenderu trasy', { 'aktualnosci/index.html': null }, 'aktualnosci/index.html'],
  ['prerender panelu admina', { 'admin/index.html': '<html>' }, 'brak admin/'],
  ['prerender trasy wpisu', { 'wpis/x/index.html': '<html>' }, 'brak wpis/'],
  ['fallback na index.html', { '.htaccess': ROOT_HTACCESS.replace('/index.csr.html', '/index.html') }, '.htaccess: fallback SPA na /index.csr.html'],
  ['brak .htaccess', { '.htaccess': null }, '.htaccess: fallback SPA na /index.csr.html', ASSETS_CHECK, SEO_CHECK, HEADERS_CHECK],
  ['brak przekierowania z www', { '.htaccess': ROOT_HTACCESS.replace(`${WWW_REDIRECT}\n`, '') }, SEO_CHECK],
  ['wpisy nie trafiają do PHP', { '.htaccess': ROOT_HTACCESS.replace(/^RewriteRule \^\(wpis.*$/m, '') }, SEO_CHECK],
  ['wzorzec wpisów łapie grupy/index.html (pętla po przepisaniu /grupy)', { '.htaccess': ROOT_HTACCESS.replace('[^/.]+', '[^/]+') }, SEO_CHECK],
  ['brak sitemap.xml', { '.htaccess': ROOT_HTACCESS.replace(/^RewriteRule \^sitemap.*$/m, '') }, SEO_CHECK],
  ['reguły SEO po fallbacku SPA (nigdy nie zadziałają)', { '.htaccess': ROOT_HTACCESS.replace(`${SEO_ROUTES}\n`, '') + `${SEO_ROUTES}\n` }, SEO_CHECK],
  ['brak robots.txt', { 'robots.txt': null }, 'robots.txt ze wskazaniem sitemap.xml'],
  ['brak HSTS', { '.htaccess': ROOT_HTACCESS.replace(/^.*Strict-Transport-Security.*$/m, '') }, HEADERS_CHECK],
  ['brak X-Frame-Options', { '.htaccess': ROOT_HTACCESS.replace(/^.*X-Frame-Options.*$/m, '') }, HEADERS_CHECK],
  ['CSP bez frame-ancestors', { '.htaccess': ROOT_HTACCESS.replace("; frame-ancestors 'none'", '') }, HEADERS_CHECK],
  ['CSP z unsafe-inline w script-src', { '.htaccess': ROOT_HTACCESS.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'") }, HEADERS_CHECK],
  ['skrypt inline bez hasha w CSP', { 'index.html': PREPAINT }, CSP_CHECK],
  ['handler onload bez hasha w CSP', { 'kontakt/index.html': ONLOAD }, CSP_CHECK],
  ['brak reguły 404 dla plików statycznych', { '.htaccess': ROOT_HTACCESS.replace(`${ASSETS_404}\n`, '') }, ASSETS_CHECK],
  ['reguła 404 bez .map', { '.htaccess': ROOT_HTACCESS.replace('|map', '') }, ASSETS_CHECK],
  ['reguła 404 po fallbacku SPA (nigdy nie zadziała)', { '.htaccess': ROOT_HTACCESS.replace(`${ASSETS_404}\n`, '') + `${ASSETS_404}\n` }, ASSETS_CHECK],
  ['.ovhconfig z PHP 7.4', { '.ovhconfig': 'app.engine.version=7.4\n' }, '.ovhconfig: PHP 8.4'],
  ['brak api/index.php', { 'api/index.php': null }, 'api/index.php'],
  ['brak vendor', { 'api/vendor/autoload.php': null }, 'api/vendor/autoload.php'],
  ['phpunit w vendor', { 'api/vendor/phpunit/phpunit/x.php': '<?php' }, 'brak api/vendor/phpunit (composer --no-dev)'],
  ['brak api/.htaccess', { 'api/.htaccess': null }, API_CHECK],
  ['api/.htaccess bez blokady HTTP', { 'api/.htaccess': API_HTACCESS.replace('RewriteRule ^ - [F]', '') }, API_CHECK],
  ['api/.htaccess bez Authorization', { 'api/.htaccess': API_HTACCESS.replace(/^.*E=HTTP_AUTHORIZATION.*$/m, '') }, API_CHECK],
  ['api/.htaccess bez blokady .env', { 'api/.htaccess': API_HTACCESS.replace('|^\\.env.*', '') }, API_CHECK],
  ['api/.htaccess z FilesMatch ".*" (blokuje całe API)', { 'api/.htaccess': `${API_HTACCESS}\n<FilesMatch ".*">\n  Require all denied\n</FilesMatch>` }, API_CHECK],
  ['brak api/.user.ini', { 'api/.user.ini': null }, 'api/.user.ini: upload_max_filesize=12M, post_max_size=13M'],
  ['złe limity w .user.ini', { 'api/.user.ini': 'upload_max_filesize=2M\npost_max_size=13M\n' }, 'api/.user.ini: upload_max_filesize=12M, post_max_size=13M'],
  ['brak uploads/.htaccess', { 'uploads/.htaccess': null }, UPLOADS_CHECK],
  ['uploads bez deny-all', { 'uploads/.htaccess': UPLOADS_HTACCESS.replace(/^Require all denied$/m, '') }, UPLOADS_CHECK],
  ['uploads bez typu webp', { 'uploads/.htaccess': UPLOADS_HTACCESS.replace('AddType image/webp .webp', '') }, UPLOADS_CHECK],
  ['uploads z szerszą allowlistą', { 'uploads/.htaccess': UPLOADS_HTACCESS.replace('jpe?g|webp|pdf', 'jpe?g|webp|pdf|php') }, UPLOADS_CHECK],
  ['katalog .git', { '.git/HEAD': 'ref' }, FORBIDDEN_CHECK],
  ['node_modules', { 'node_modules/x/index.js': '' }, FORBIDDEN_CHECK],
  ['Dockerfile w api', { 'api/docker/Dockerfile': 'FROM php' }, FORBIDDEN_CHECK],
  ['docker-compose.yml', { 'docker-compose.yml': 'services:' }, FORBIDDEN_CHECK],
  ['testy backendu', { 'api/tests/FooTest.php': '<?php' }, FORBIDDEN_CHECK],
  ['testy w vendor (nieprzycięte)', { 'api/vendor/mongodb/mongodb/tests/x.php': '<?php' }, FORBIDDEN_CHECK],
  ['api/.env w paczce', { 'api/.env': 'JWT_SECRET=x' }, 'brak plików .env'],
  ['zagnieżdżony .env.prod', { 'api/src/.env.prod': 'x' }, 'brak plików .env'],
  ['.env w katalogu głównym', { '.env': 'x' }, 'brak plików .env'],
];

for (const [name, overrides, ...expected] of cases) {
  test(`wykrywa: ${name}`, () => {
    assert.deepEqual(failuresFor(overrides), expected);
  });
}

test('CSP z hashami z HTML paczki przechodzi; JSON i skrypty z src nie wymagają hasha', () => {
  const html = `${PREPAINT}\n${ONLOAD}\n<script src="main.js" type="module"></script>\n<script id="ng-state" type="application/json">{"a":1}</script>`;
  const dir = makePackage({ 'index.html': html, 'index.csr.html': html.replaceAll('\n', '\r\n') });
  try {
    const hashes = inlineHashes(dir);
    // CRLF i LF dają ten sam hash (przeglądarka normalizuje końce linii)
    assert.equal(hashes.scripts.length, 1);
    assert.equal(hashes.handlers.length, 1);
    const csp = contentSecurityPolicy(hashes);
    assert.match(csp, /script-src 'self' 'unsafe-hashes' 'sha256-/);
    writeFileSync(join(dir, '.htaccess'), ROOT_HTACCESS.replace(/Content-Security-Policy "[^"]*"/, `Content-Security-Policy "${csp}"`));
    assert.deepEqual(verifyPackage(dir).filter((r) => !r.ok), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('nieistniejący katalog paczki = wszystko niezaliczone, bez wyjątku', () => {
  const results = verifyPackage(join(tmpdir(), 'nie-ma-takiego-katalogu-pkg'));
  assert.ok(results.length > 0);
  assert.ok(results.some((r) => !r.ok));
});
