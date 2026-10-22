<?php
declare(strict_types=1);

namespace App\Http;

use App\Auth\JwtService;
use App\Auth\UserRepository;
use App\Support\Ids;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

/**
 * Token dostępu + stan konta z bazy przy każdym żądaniu: dezaktywacja, zmiana roli i zmiana hasła
 * działają od razu, a nie dopiero po wygaśnięciu tokenu (rola z tokenu jest ignorowana).
 */
final class AuthMiddleware implements MiddlewareInterface
{
    public function __construct(private readonly JwtService $jwt, private readonly UserRepository $users)
    {
    }

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        if (!preg_match('/^Bearer\s+(\S+)\z/', $request->getHeaderLine('Authorization'), $m)) {
            throw ApiException::unauthorized();
        }
        $claims = $this->jwt->verify($m[1], 'access');
        $user = $this->users->findById(Ids::parse($claims['sub']));
        if ($user === null || !$user['active'] || JwtService::issuedBeforePasswordChange($claims, $user)) {
            throw ApiException::unauthorized();
        }
        return $handler->handle($request->withAttribute('auth', new AuthUser($claims['sub'], (string) $user['role'])));
    }
}
