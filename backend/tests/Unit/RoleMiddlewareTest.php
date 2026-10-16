<?php
declare(strict_types=1);

namespace Tests\Unit;

use App\Http\ApiException;
use App\Http\AuthUser;
use App\Http\RoleMiddleware;
use PHPUnit\Framework\TestCase;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Factory\ResponseFactory;
use Slim\Psr7\Factory\ServerRequestFactory;

final class RoleMiddlewareTest extends TestCase
{
    private function handler(): RequestHandlerInterface
    {
        return new class implements RequestHandlerInterface {
            public function handle(ServerRequestInterface $request): ResponseInterface
            {
                return (new ResponseFactory())->createResponse(200);
            }
        };
    }

    public function testAdminPasses(): void
    {
        $req = (new ServerRequestFactory())->createServerRequest('GET', '/x')->withAttribute('auth', new AuthUser('1', 'admin'));
        self::assertSame(200, (new RoleMiddleware('admin'))->process($req, $this->handler())->getStatusCode());
    }

    public function testUserIsForbidden(): void
    {
        $req = (new ServerRequestFactory())->createServerRequest('GET', '/x')->withAttribute('auth', new AuthUser('1', 'user'));
        try {
            (new RoleMiddleware('admin'))->process($req, $this->handler());
            self::fail('Expected ApiException');
        } catch (ApiException $e) {
            self::assertSame(403, $e->status);
        }
    }
}
