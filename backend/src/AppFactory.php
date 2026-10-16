<?php
declare(strict_types=1);

namespace App;

use App\Http\JsonErrorHandler;
use App\Support\Clock;
use Slim\App;
use Slim\Factory\AppFactory as SlimAppFactory;

final class AppFactory
{
    public static function create(Config $config, Database $db, Clock $clock): App
    {
        $app = SlimAppFactory::create();
        $services = new Services($config, $db, $clock);
        $app->addBodyParsingMiddleware();
        $app->addRoutingMiddleware();
        Routes::register($app, $services);
        $errors = $app->addErrorMiddleware(!$config->isProd(), true, false);
        $errors->setDefaultErrorHandler(new JsonErrorHandler($app->getResponseFactory(), !$config->isProd()));
        return $app;
    }
}
