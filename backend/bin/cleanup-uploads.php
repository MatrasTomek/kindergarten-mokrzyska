<?php
declare(strict_types=1);

// Cron OVH (raz na dobę): php api/bin/cleanup-uploads.php   |   test: --dry-run
$root = dirname(__DIR__);
require $root . '/vendor/autoload.php';
Dotenv\Dotenv::createImmutable($root)->safeLoad(); // safeLoad: brak .env nie jest błędem (zmienne z `docker run -e`)

$config = App\Config::fromEnv($_ENV + $_SERVER); // $_SERVER: zmienne z `docker run -e` (Dotenv ich nie nadpisuje)
$cleaner = new App\Upload\UploadCleaner(App\Database::connect($config), $config, new App\Support\SystemClock());
$dry = in_array('--dry-run', $argv, true);
try {
    $removed = $cleaner->run($dry, in_array('--force', $argv, true));
} catch (RuntimeException $e) {
    fwrite(STDERR, $e->getMessage() . "\n");
    exit(1);
}
echo count($removed) . ' plików ' . ($dry ? 'do usunięcia (dry-run)' : 'usunięto') . "\n" . implode("\n", $removed) . "\n";
if ($cleaner->failed() !== []) {
    fwrite(STDERR, "Nie udało się usunąć:\n" . implode("\n", $cleaner->failed()) . "\n");
    exit(1);
}
