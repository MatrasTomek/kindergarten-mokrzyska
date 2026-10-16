<?php
declare(strict_types=1);

// dev (php -S): pliki statyczne, np. /uploads/..., serwuje wbudowany serwer
if (PHP_SAPI === 'cli-server' && is_file(__DIR__ . parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH))) {
    return false;
}

// dev: backend/public/index.php -> root = backend/; prod: /www/api/index.php -> root = /www/api/
$root = is_dir(__DIR__ . '/../src') ? dirname(__DIR__) : __DIR__;
require $root . '/vendor/autoload.php';

// Apache/CGI na OVH przekazuje nagłówek Authorization tylko jako REDIRECT_HTTP_AUTHORIZATION
if (empty($_SERVER['HTTP_AUTHORIZATION']) && !empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
    $_SERVER['HTTP_AUTHORIZATION'] = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
}

Dotenv\Dotenv::createImmutable($root)->safeLoad();
$config = App\Config::fromEnv($_ENV + $_SERVER); // $_SERVER: zmienne z `docker run -e` (Dotenv ich nie nadpisuje)
App\AppFactory::create($config, App\Database::connect($config), new App\Support\SystemClock())->run();
