<?php
declare(strict_types=1);

namespace App\Http;

use App\Auth\JwtService;
use Psr\Http\Message\ResponseInterface;

final class RefreshCookie
{
    public const NAME = 'refresh_token';

    public static function set(ResponseInterface $res, string $token, int $maxAge = JwtService::REFRESH_TTL): ResponseInterface
    {
        return $res->withAddedHeader('Set-Cookie', sprintf(
            '%s=%s; Path=/api/auth; Max-Age=%d; HttpOnly; Secure; SameSite=Strict',
            self::NAME,
            $token,
            $maxAge
        ));
    }

    public static function clear(ResponseInterface $res): ResponseInterface
    {
        return $res->withAddedHeader('Set-Cookie', self::NAME . '=; Path=/api/auth; Max-Age=0; HttpOnly; Secure; SameSite=Strict');
    }
}
