<?php
declare(strict_types=1);

namespace App;

use App\Http\AuthMiddleware;
use App\Http\Json;
use App\Http\RoleMiddleware;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\App;
use Slim\Routing\RouteCollectorProxy;

final class Routes
{
    public static function register(App $app, Services $s): void
    {
        $app->get('/api/health', fn (Request $q, Response $r) => Json::write($r, ['status' => 'ok']));

        $app->group('/api/auth', function (RouteCollectorProxy $g) use ($s) {
            $g->post('/login', [$s->authController, 'login']);
            $g->post('/refresh', [$s->authController, 'refresh']);
            $g->post('/logout', [$s->authController, 'logout']);
        });

        self::publicRoutes($app, $s);

        $app->group('/api/admin', function (RouteCollectorProxy $g) use ($s) {
            self::staffRoutes($g, $s);
            $g->group('', function (RouteCollectorProxy $a) use ($s) {
                self::adminRoutes($a, $s);
            })->add(new RoleMiddleware('admin'));
        })->add(new AuthMiddleware($s->jwt));
    }

    /** Trasy publiczne (bez logowania). */
    private static function publicRoutes(App $app, Services $s): void
    {
        $app->get('/api/theme', [$s->themeController, 'active']);
        $app->get('/api/posts', [$s->postPublicController, 'list']);
        $app->get('/api/posts/{slug}', [$s->postPublicController, 'show']);
        $app->get('/api/groups', [$s->groupController, 'list']);
        $app->get('/api/groups/{slug}', [$s->groupController, 'show']);
        $app->get('/api/content/{page}', [$s->contentController, 'publicList']);
    }

    /** Trasy dla ról admin i user (prefiks /api/admin). */
    private static function staffRoutes(RouteCollectorProxy $g, Services $s): void
    {
        $g->get('/me', [$s->authController, 'me']);
        $g->post('/uploads/image', [$s->uploadController, 'image']);
        $g->get('/posts', [$s->postAdminController, 'list']);
        $g->post('/posts', [$s->postAdminController, 'create']);
        $g->get('/posts/{id}', [$s->postAdminController, 'show']);
        $g->put('/posts/{id}', [$s->postAdminController, 'update']);
    }

    /** Trasy tylko dla admina (prefiks /api/admin). */
    private static function adminRoutes(RouteCollectorProxy $a, Services $s): void
    {
        $a->delete('/posts/{id}', [$s->postAdminController, 'delete']);
        $a->post('/uploads/pdf', [$s->uploadController, 'pdf']);
        $a->get('/groups', [$s->groupController, 'list']);
        $a->post('/groups', [$s->groupController, 'create']);
        $a->put('/groups/{id}', [$s->groupController, 'update']);
        $a->delete('/groups/{id}', [$s->groupController, 'delete']);
        $a->get('/content', [$s->contentController, 'adminList']);
        $a->post('/content', [$s->contentController, 'create']);
        $a->get('/content/{id}', [$s->contentController, 'show']);
        $a->put('/content/{id}', [$s->contentController, 'update']);
        $a->delete('/content/{id}', [$s->contentController, 'delete']);
        $a->get('/themes', [$s->themeController, 'list']);
        $a->post('/themes', [$s->themeController, 'create']);
        $a->put('/themes/{id}', [$s->themeController, 'update']);
        $a->delete('/themes/{id}', [$s->themeController, 'delete']);
        $a->get('/users', [$s->userController, 'list']);
        $a->post('/users', [$s->userController, 'create']);
        $a->put('/users/{id}', [$s->userController, 'update']);
        $a->delete('/users/{id}', [$s->userController, 'delete']);
        $a->get('/settings', [$s->themeController, 'getSettings']);
        $a->put('/settings', [$s->themeController, 'putSettings']);
    }
}
