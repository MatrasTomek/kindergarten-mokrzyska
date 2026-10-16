// Użycie (z katalogu repo): node scripts/package.mjs
// Wymaga: Node ^20.19 || ^22.12 || >=24, zainstalowanych zależności frontu (cd frontend && npm ci), Dockera (composer).
// Wynik: deploy/ — przeciągnij ZAWARTOŚĆ do katalogu nowej strony na serwerze (FileZilla). Szczegóły: docs/deploy.md
import { execSync } from 'node:child_process';
import { chmodSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { printResults, verifyPackage } from './verify-package.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'deploy');
const tpl = (name) => readFileSync(join(root, 'scripts/templates', name), 'utf8');
const run = (cmd, cwd = root) => execSync(cmd, { cwd, stdio: 'inherit' });
// Pliki z repo bywają 0600 (np. ACL Windows na zamontowanym dysku) — serwer WWW nie mógłby ich czytać.
// EPERM pomijamy: vendor/ tworzony przez composera w kontenerze (root na Linuksie) i tak ma 0644/0755.
const chmodSafe = (path, mode) => {
  try {
    chmodSync(path, mode);
  } catch (e) {
    if (e.code !== 'EPERM') throw e;
  }
};
const normalizeModes = (dir) => {
  chmodSafe(dir, 0o755);
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) normalizeModes(join(dir, e.name));
    else chmodSafe(join(dir, e.name), 0o644);
  }
};
const fail = (msg) => {
  console.error(`\nBŁĄD: ${msg}`);
  process.exit(1);
};

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

console.log('1/5 Build frontu');
// Bez npx: node_modules/.bin nie zawsze istnieje (np. na zamontowanych dyskach); ten sam CLI z node_modules.
run('node node_modules/@angular/cli/bin/ng.js build', join(root, 'frontend'));
const browser = join(root, 'frontend/dist/frontend/browser');
// Fallback SPA MUSI być index.csr.html — index.html to prerenderowana strona główna (znaczniki hydratacji).
const fallback = 'index.csr.html';
if (!existsSync(join(browser, fallback))) fail(`brak ${fallback} w buildzie — sprawdź outputMode/prerender w angular.json`);
cpSync(browser, out, { recursive: true });
writeFileSync(join(out, '.htaccess'), tpl('root.htaccess').replaceAll('__FALLBACK__', fallback));
writeFileSync(join(out, '.ovhconfig'), tpl('.ovhconfig'));

console.log('2/5 Backend');
const api = join(out, 'api');
mkdirSync(api);
for (const p of ['src', 'bin', 'composer.json', 'composer.lock']) cpSync(join(root, 'backend', p), join(api, p), { recursive: true });
cpSync(join(root, 'backend/public/index.php'), join(api, 'index.php'));
cpSync(join(root, 'backend/.env.example'), join(api, '.env.example'));
writeFileSync(join(api, '.htaccess'), tpl('api.htaccess'));
writeFileSync(join(api, '.user.ini'), tpl('api.user.ini'));

console.log('3/5 Composer --no-dev (w kontenerze, katalog repo zamontowany jako /app)');
// W kontenerze (root), bo na Linuksie vendor/ należy do roota i Node nie mógłby go przyciąć ani później usunąć:
// - testy i dokumentacja paczek (np. mongodb/mongodb/tests ~5 MB) nie są ładowane przez autoloader — mniej do wgrania przez FTP,
// - na Linuksie/macOS oddajemy vendor/ użytkownikowi, który uruchomił skrypt (na Windows nie trzeba).
const owner = process.getuid ? ` && chown -R ${process.getuid()}:${process.getgid()} vendor` : '';
const composerCmd =
  'composer install --no-dev --optimize-autoloader --no-interaction' +
  ' && find vendor -mindepth 3 -maxdepth 3 -type d \\( -name tests -o -name Tests -o -name docs \\) -prune -exec rm -rf {} +' +
  owner;
run(`docker compose run --rm --no-deps -w /app/deploy/api php sh -c "${composerCmd}"`);
const autoload = readFileSync(join(api, 'vendor/composer/autoload_static.php'), 'utf8');
if (/\/(tests|Tests|docs)\//.test(autoload)) fail('autoloader odwołuje się do przyciętego katalogu tests/docs — wyłącz przycinanie vendor/.');

console.log('4/5 uploads/');
mkdirSync(join(out, 'uploads'));
writeFileSync(join(out, 'uploads/.htaccess'), tpl('uploads.htaccess'));

normalizeModes(out);

console.log('5/5 Smoke check paczki');
if (!printResults(verifyPackage(out))) fail('paczka niekompletna lub zawiera plik .env — NIE wgrywaj jej.');

console.log(`\nGotowe: ${out}\nFallback SPA: ${fallback}\nNIE nadpisuj na serwerze: api/.env oraz zawartości uploads/.`);
