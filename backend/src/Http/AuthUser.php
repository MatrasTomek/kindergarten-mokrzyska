<?php
declare(strict_types=1);

namespace App\Http;

final class AuthUser
{
    public function __construct(public readonly string $id, public readonly string $role)
    {
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public static function from(\Psr\Http\Message\ServerRequestInterface $req): self
    {
        $auth = $req->getAttribute('auth');
        if (!$auth instanceof self) {
            throw ApiException::unauthorized();
        }
        return $auth;
    }
}
