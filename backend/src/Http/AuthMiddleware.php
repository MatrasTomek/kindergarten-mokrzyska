<?php
declare(strict_types=1);

namespace App\Http;

use App\Auth\JwtService;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

final class AuthMiddleware implements MiddlewareInterface
{
    public function __construct(private readonly JwtService $jwt)
    {
    }

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        if (!preg_match('/^Bearer\s+(\S+)\z/', $request->getHeaderLine('Authorization'), $m)) {
            throw ApiException::unauthorized();
        }
        $claims = $this->jwt->verify($m[1], 'access');
        return $handler->handle($request->withAttribute('auth', new AuthUser($claims['sub'], (string) ($claims['role'] ?? ''))));
    }
}
