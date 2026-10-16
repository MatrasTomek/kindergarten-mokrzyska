<?php
declare(strict_types=1);

namespace App\Http;

final class ApiException extends \RuntimeException
{
    public function __construct(
        public readonly int $status,
        public readonly string $errorCode,
        string $message,
    ) {
        parent::__construct($message);
    }

    public static function validation(string $message): self
    {
        return new self(400, 'VALIDATION', $message);
    }

    public static function notFound(string $message = 'Nie znaleziono.'): self
    {
        return new self(404, 'NOT_FOUND', $message);
    }

    public static function forbidden(): self
    {
        return new self(403, 'FORBIDDEN', 'Brak uprawnień.');
    }

    public static function unauthorized(): self
    {
        return new self(401, 'UNAUTHORIZED', 'Wymagane logowanie.');
    }
}
