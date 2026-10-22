<?php
declare(strict_types=1);

namespace App;

use Dotenv\Dotenv;

/** Skąd czytać konfigurację (`.env`) dla index.php i bin/cleanup-uploads.php. */
final class EnvFile
{
    /**
     * Plik poza katalogiem WWW: `<folder strony>.env` obok folderu strony, np. dla /home/login/przedszkole/api
     * → /home/login/przedszkole.env. Serwer WWW go nie serwuje, więc ochrona nie zależy od reguł .htaccess.
     */
    public static function outsideWebRoot(string $root): string
    {
        $site = dirname($root);
        return dirname($site) . '/' . basename($site) . '.env';
    }

    /** Najpierw plik poza WWW (jeśli jest), inaczej `.env` w $root (api/.env; dev: backend/.env). */
    public static function load(string $root): void
    {
        $outside = self::outsideWebRoot($root);
        // @: open_basedir może zabraniać zaglądania poza folder strony — wtedy zostaje api/.env
        if (@is_file($outside)) {
            Dotenv::createImmutable(dirname($outside), basename($outside))->load();
            return;
        }
        Dotenv::createImmutable($root)->safeLoad(); // safeLoad: brak .env nie jest błędem (zmienne z `docker run -e`)
    }
}
