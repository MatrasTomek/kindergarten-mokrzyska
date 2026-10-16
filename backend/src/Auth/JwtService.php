<?php
declare(strict_types=1);

namespace App\Auth;

use App\Config;
use App\Http\ApiException;
use App\Support\Clock;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

final class JwtService
{
    public const ACCESS_TTL = 3600;
    public const REFRESH_TTL = 14 * 86400;

    public function __construct(private readonly Config $config, private readonly Clock $clock)
    {
    }

    public function issueAccess(string $userId, string $role): string
    {
        $now = $this->clock->now()->getTimestamp();
        return JWT::encode(['sub' => $userId, 'role' => $role, 'typ' => 'access', 'iat' => $now, 'exp' => $now + self::ACCESS_TTL], $this->config->jwtSecret, 'HS256');
    }

    public function issueRefresh(string $userId): string
    {
        $now = $this->clock->now()->getTimestamp();
        return JWT::encode(['sub' => $userId, 'typ' => 'refresh', 'iat' => $now, 'exp' => $now + self::REFRESH_TTL], $this->config->jwtSecret, 'HS256');
    }

    /** @return array<string,mixed> */
    public function verify(string $token, string $type): array
    {
        JWT::$timestamp = $this->clock->now()->getTimestamp();
        try {
            $claims = (array) JWT::decode($token, new Key($this->config->jwtSecret, 'HS256'));
        } catch (\Throwable) {
            throw ApiException::unauthorized();
        } finally {
            JWT::$timestamp = null;
        }
        if (($claims['typ'] ?? '') !== $type || !is_string($claims['sub'] ?? null)) {
            throw ApiException::unauthorized();
        }
        return $claims;
    }
}
