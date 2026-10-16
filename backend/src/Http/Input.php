<?php
declare(strict_types=1);

namespace App\Http;

use Psr\Http\Message\ServerRequestInterface;

final class Input
{
    /** @return array<string,mixed> */
    public static function body(ServerRequestInterface $request): array
    {
        $body = $request->getParsedBody();
        if (!is_array($body)) {
            throw ApiException::validation('Nieprawidłowe dane wejściowe.');
        }
        return $body;
    }

    /** @param array<string,mixed> $d */
    public static function string(array $d, string $key, int $max, bool $required = true): string
    {
        $v = $d[$key] ?? '';
        if (!is_string($v)) {
            throw ApiException::validation("Pole $key musi być tekstem.");
        }
        $v = trim($v);
        if ($required && $v === '') {
            throw ApiException::validation("Pole $key jest wymagane.");
        }
        if (mb_strlen($v, 'UTF-8') > $max) {
            throw ApiException::validation("Pole $key może mieć maksymalnie $max znaków.");
        }
        return $v;
    }

    /** @param array<string,mixed> $d */
    public static function bool(array $d, string $key): bool
    {
        $v = $d[$key] ?? false;
        if (!is_bool($v)) {
            throw ApiException::validation("Pole $key musi mieć wartość true lub false.");
        }
        return $v;
    }

    /** @param array<string,mixed> $d */
    public static function int(array $d, string $key, int $default = 0): int
    {
        $v = $d[$key] ?? $default;
        if (!is_int($v)) {
            throw ApiException::validation("Pole $key musi być liczbą całkowitą.");
        }
        return $v;
    }

    /**
     * @param array<string,mixed> $d
     * @param list<string> $allowed
     */
    public static function oneOf(array $d, string $key, array $allowed): string
    {
        $v = $d[$key] ?? null;
        if (!is_string($v) || !in_array($v, $allowed, true)) {
            throw ApiException::validation("Pole $key ma niedozwoloną wartość.");
        }
        return $v;
    }

    /**
     * @param array<string,mixed> $d
     * @return list<mixed>
     */
    public static function list(array $d, string $key): array
    {
        $v = $d[$key] ?? [];
        if (!is_array($v) || !array_is_list($v)) {
            throw ApiException::validation("Pole $key musi być listą.");
        }
        return $v;
    }
}
