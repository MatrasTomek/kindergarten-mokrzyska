<?php
declare(strict_types=1);

namespace App\Group;

final class GroupPresenter
{
    /**
     * @param array<string,mixed> $doc
     * @return array{id:string,name:string,slug:string,order:int,description:string}
     */
    public static function toArray(array $doc): array
    {
        return [
            'id' => (string) $doc['_id'],
            'name' => $doc['name'],
            'slug' => $doc['slug'],
            'order' => (int) ($doc['order'] ?? 0),
            'description' => $doc['description'] ?? '',
        ];
    }
}
