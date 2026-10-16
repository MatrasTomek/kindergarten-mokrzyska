<?php
declare(strict_types=1);

namespace App\Auth;

use App\Support\Dates;

final class UserPresenter
{
    /**
     * @param array<string,mixed> $doc
     * @return array<string,mixed>
     */
    public static function toArray(array $doc): array
    {
        return [
            'id' => (string) $doc['_id'],
            'email' => $doc['email'],
            'name' => $doc['name'],
            'role' => $doc['role'],
            'active' => (bool) $doc['active'],
            'createdAt' => Dates::toIso($doc['createdAt']),
        ];
    }
}
