<?php
declare(strict_types=1);

namespace App;

final class Config
{
    public function __construct(
        public readonly string $env,
        public readonly string $mongoUri,
        public readonly string $mongoDb,
        public readonly string $jwtSecret,
        public readonly string $uploadDir,
    ) {
    }

    /** @param array<string,mixed> $env */
    public static function fromEnv(array $env): self
    {
        foreach (['MONGO_URI', 'MONGO_DB', 'JWT_SECRET', 'UPLOAD_DIR'] as $key) {
            if (empty($env[$key])) {
                throw new \RuntimeException("Brak zmiennej konfiguracyjnej $key");
            }
        }
        if (strlen((string) $env['JWT_SECRET']) < 32) {
            throw new \RuntimeException('JWT_SECRET musi mieć co najmniej 32 znaki');
        }
        return new self(
            (string) ($env['APP_ENV'] ?? 'prod'),
            (string) $env['MONGO_URI'],
            (string) $env['MONGO_DB'],
            (string) $env['JWT_SECRET'],
            rtrim((string) $env['UPLOAD_DIR'], '/'),
        );
    }

    public function isProd(): bool
    {
        return $this->env === 'prod';
    }
}
