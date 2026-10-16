<?php
declare(strict_types=1);

namespace App\Theme;

final class ThemePresenter
{
    /**
     * @param array<string,mixed> $doc
     * @return array<string,mixed>
     */
    public static function toArray(array $doc): array
    {
        $palette = [];
        foreach ($doc['palette'] as $k => $v) {
            $palette[(string) $k] = $v;
        }
        return [
            'id' => isset($doc['_id']) ? (string) $doc['_id'] : null,
            'key' => $doc['key'],
            'name' => $doc['name'],
            'type' => $doc['type'],
            'palette' => (object) $palette,
            'seasonStart' => $doc['seasonStart'] ?? null,
        ];
    }
}
