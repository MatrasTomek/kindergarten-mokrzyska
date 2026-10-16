<?php
declare(strict_types=1);

namespace App\Content;

use App\Support\Dates;

final class ContentPresenter
{
    /**
     * @param array<string,mixed> $doc
     * @return array<string,mixed>
     */
    public static function toArray(array $doc): array
    {
        return [
            'id' => (string) $doc['_id'],
            'page' => $doc['page'],
            'title' => $doc['title'],
            'body' => $doc['body'],
            'attachments' => $doc['attachments'] ?? [],
            'images' => $doc['images'] ?? [],
            'order' => (int) $doc['order'],
            'status' => $doc['status'],
            'updatedAt' => Dates::toIso($doc['updatedAt']),
        ];
    }
}
