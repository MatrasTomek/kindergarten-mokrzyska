<?php
declare(strict_types=1);

// Użycie: php bin/seed.php --admin-email=x@y.pl --admin-password=... --admin-name="Imię Nazwisko" [--env-file=.env.prod] [--fresh]
// Na OVH bez SSH: uruchom lokalnie z plikiem env wskazującym na produkcyjną bazę Atlas.
// --fresh kasuje całą bazę przed seedem — TYLKO dla baz testowych (E2E). Odmawia przy APP_ENV=prod.

$root = dirname(__DIR__);
require $root . '/vendor/autoload.php';

$opts = getopt('', ['admin-email:', 'admin-password:', 'admin-name:', 'env-file:', 'fresh']);
$envFile = $opts['env-file'] ?? '.env';
Dotenv\Dotenv::createImmutable($root, $envFile)->load();

$config = App\Config::fromEnv($_ENV + $_SERVER); // $_SERVER: zmienne z `docker run -e` (Dotenv ich nie nadpisuje)
$db = App\Database::connect($config);
if (isset($opts['fresh'])) {
    if ($config->isProd()) {
        fwrite(STDERR, "--fresh jest zablokowane dla APP_ENV=prod\n");
        exit(1);
    }
    $db->drop();
}
$db->ensureIndexes();

$admin = isset($opts['admin-email'], $opts['admin-password'])
    ? ['email' => $opts['admin-email'], 'password' => $opts['admin-password'], 'name' => $opts['admin-name'] ?? 'Administrator']
    : null;

$result = (new App\Seed\Seeder($db, new App\Support\SystemClock()))->run($admin);
echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), PHP_EOL;
