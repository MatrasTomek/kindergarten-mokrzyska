<?php
declare(strict_types=1);

namespace App\Http;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

final class RoleMiddleware implements MiddlewareInterface
{
    public function __construct(private readonly string $role)
    {
    }

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        if (AuthUser::from($request)->role !== $this->role) {
            throw ApiException::forbidden();
        }
        return $handler->handle($request);
    }
}
