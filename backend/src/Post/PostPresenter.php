<?php
declare(strict_types=1);

namespace App\Post;

use App\Support\Dates;

final class PostPresenter
{
    /**
     * @param array<string,mixed> $doc
     * @return array<string,mixed>
     */
    public static function toArray(array $doc, bool $admin = false): array
    {
        $out = [
            'id' => (string) $doc['_id'],
            'title' => $doc['title'],
            'slug' => $doc['slug'],
            'excerpt' => $doc['excerpt'] ?? '',
            'body' => $doc['body'] ?? '',
            'images' => $doc['images'] ?? [],
            'targets' => [
                'news' => (bool) ($doc['targets']['news'] ?? false),
                'groupIds' => array_map('strval', $doc['targets']['groupIds'] ?? []),
            ],
            'status' => $doc['status'],
            'publishedAt' => Dates::toIso($doc['publishedAt'] ?? null),
        ];
        if ($admin) {
            $out += [
                'createdBy' => (string) $doc['createdBy'],
                'updatedBy' => (string) $doc['updatedBy'],
                'createdAt' => Dates::toIso($doc['createdAt']),
                'updatedAt' => Dates::toIso($doc['updatedAt']),
            ];
        }
        return $out;
    }

    /**
     * @param array{items: list<array<string,mixed>>, total: int} $result
     * @return array{items: list<array<string,mixed>>, page:int, pages:int, total:int}
     */
    public static function paged(array $result, int $page, int $perPage, bool $admin): array
    {
        return [
            'items' => array_map(fn (array $d) => self::toArray($d, $admin), $result['items']),
            'page' => $page,
            'pages' => max(1, (int) ceil($result['total'] / $perPage)),
            'total' => $result['total'],
        ];
    }
}
