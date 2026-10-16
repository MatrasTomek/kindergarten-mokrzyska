<?php
declare(strict_types=1);

namespace App;

use App\Http\Json;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\App;

final class Routes
{
    public static function register(App $app, Services $s): void
    {
        $app->get('/api/health', fn (Request $q, Response $r) => Json::write($r, ['status' => 'ok']));
    }
}
