// Smoke check paczki deploy/. Wywoływany na końcu scripts/package.mjs; samodzielnie:
//   node scripts/verify-package.mjs [katalog]   (domyślnie deploy/) — kod wyjścia 1, jeśli coś nie gra.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Trasy prerenderowane (app.routes.server.ts: '**' → Prerender); każda musi mieć <trasa>/index.html. */
export const PRERENDERED_ROUTES = [
  'aktualnosci',
  'deklaracja-dostepnosci',
  'dla-rodzicow',
  'dokumenty',
  'grupy',
  'kontakt',
  'o-nas',
  'rekrutacja',
  'rodo',
  'specjalisci',
  'z-zycia-przedszkola',
];

/** Trasy renderowane tylko w przeglądarce — nie mogą mieć prerenderowanego katalogu. */
const CLIENT_ONLY = ['admin', 'wpis'];

const read = (path) => (existsSync(path) ? readFileSync(path, 'utf8') : '');

/** `.env`, `.env.prod`, `.env.local`… — ale nie `.env.example` (szablon bez sekretów). */
const isEnvFile = (name) => name === '.env' || (name.startsWith('.env.') && name !== '.env.example');

/** Rzeczy, które nie mają czego szukać na serwerze (repo, narzędzia, testy — także przycięte z vendor/). */
const isForbidden = (name, isDir) =>
  isDir
    ? ['.git', 'node_modules', 'tests'].includes(name)
    : name === 'Dockerfile' || name === '.dockerignore' || /^(docker-)?compose(\.[\w-]+)?\.ya?ml$/.test(name);

/** Ścieżki (względne) spełniające `match(name, isDir)`; nie schodzi do dopasowanych katalogów. */
function findPaths(dir, match, base = dir) {
  if (!existsSync(dir)) return [];
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (match(entry.name, entry.isDirectory())) found.push(relative(base, path));
    else if (entry.isDirectory()) found.push(...findPaths(path, match, base));
  }
  return found;
}

/** api/.htaccess: odmowa po HTTP, przekazanie Authorization, wszystko przez index.php, blokada sekretów. */
function apiHtaccessOk(text) {
  return (
    /^RewriteCond %\{HTTPS\} !=on$/m.test(text) &&
    /^RewriteCond %\{HTTP:X-Forwarded-Proto\} !=https$/m.test(text) &&
    /^RewriteRule \^ - \[F\]$/m.test(text) &&
    /^RewriteRule \.\* - \[E=HTTP_AUTHORIZATION:%\{HTTP:Authorization\}\]$/m.test(text) &&
    /^RewriteRule \^ index\.php \[QSA,L\]$/m.test(text) &&
    /^<FilesMatch ".*\^\\\.env.*">$/m.test(text) &&
    // FilesMatch ".*" + Require all denied blokuje całe API (kontrola dostępu działa przed mod_rewrite)
    !/<FilesMatch "\.\*">/.test(text)
  );
}

/** uploads/.htaccess: domyślnie odmowa, dozwolone tylko jpg/webp/pdf, jawne typy MIME (nosniff!). */
function uploadsHtaccessOk(text) {
  return (
    /^Options -Indexes/m.test(text) &&
    /^Require all denied$/m.test(text) &&
    /^<FilesMatch "\(\?i\)\\\.\(jpe\?g\|webp\|pdf\)\$">$/m.test(text) &&
    /^\s*AddType image\/webp \.webp$/m.test(text) &&
    /^\s*AddType image\/jpeg \.jpg \.jpeg$/m.test(text) &&
    /^\s*AddType application\/pdf \.pdf$/m.test(text)
  );
}

/** @returns {{check: string, ok: boolean, detail?: string}[]} */
export function verifyPackage(dir) {
  const has = (p) => existsSync(join(dir, p));
  const results = [];
  const check = (name, ok, detail) => results.push(detail && !ok ? { check: name, ok, detail } : { check: name, ok });

  check('index.csr.html', has('index.csr.html'));
  check('index.html', has('index.html'));
  for (const route of PRERENDERED_ROUTES) check(`${route}/index.html`, has(`${route}/index.html`));
  for (const route of CLIENT_ONLY) check(`brak ${route}/`, !has(route));

  const htaccess = read(join(dir, '.htaccess'));
  check(
    '.htaccess: fallback SPA na /index.csr.html',
    /^\s*RewriteRule \^ \/index\.csr\.html \[L\]/m.test(htaccess) && !/RewriteRule \^ \/index\.html\b/.test(htaccess),
  );
  check('.ovhconfig: PHP 8.4', /^app\.engine\.version=8\.4\s*$/m.test(read(join(dir, '.ovhconfig'))));

  check('api/index.php', has('api/index.php'));
  check('api/vendor/autoload.php', has('api/vendor/autoload.php'));
  check('brak api/vendor/phpunit (composer --no-dev)', !has('api/vendor/phpunit'));
  check('api/.htaccess: tylko HTTPS, Authorization, front controller, blokada .env', apiHtaccessOk(read(join(dir, 'api/.htaccess'))));
  const userIni = read(join(dir, 'api/.user.ini'));
  check(
    'api/.user.ini: upload_max_filesize=12M, post_max_size=13M',
    /^upload_max_filesize=12M\s*$/m.test(userIni) && /^post_max_size=13M\s*$/m.test(userIni),
  );
  check('uploads/.htaccess: deny-all poza jpg/webp/pdf, typy MIME', uploadsHtaccessOk(read(join(dir, 'uploads/.htaccess'))));

  const envFiles = findPaths(dir, (name, isDir) => !isDir && isEnvFile(name));
  check('brak plików .env', envFiles.length === 0, `znaleziono: ${envFiles.join(', ')}`);
  const forbidden = findPaths(dir, isForbidden);
  check('brak .git, node_modules, plików Dockera, katalogów tests', forbidden.length === 0, `znaleziono: ${forbidden.join(', ')}`);
  return results;
}

export function printResults(results) {
  for (const r of results) console.log(`${r.ok ? 'OK  ' : 'BŁĄD'} ${r.check}${r.detail ? ` — ${r.detail}` : ''}`);
  const failed = results.filter((r) => !r.ok).length;
  console.log(failed ? `\nSmoke check: ${failed} błędów` : `\nSmoke check: wszystkie ${results.length} sprawdzeń OK`);
  return failed === 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'deploy'));
  console.log(`Smoke check: ${dir}`);
  process.exit(printResults(verifyPackage(dir)) ? 0 : 1);
}
