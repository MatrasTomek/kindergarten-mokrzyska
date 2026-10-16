<?php
declare(strict_types=1);

namespace App\Theme;

use App\Database;
use MongoDB\BSON\ObjectId;
use MongoDB\Collection;

final class SettingsRepository
{
    private Collection $col;

    public function __construct(Database $db)
    {
        $this->col = $db->collection('settings');
    }

    /** @return array{themeMode: string, manualThemeId: ?ObjectId} */
    public function get(): array
    {
        $doc = $this->col->findOne(['_id' => 'site']) ?? [];
        return [
            'themeMode' => $doc['themeMode'] ?? 'auto',
            'manualThemeId' => $doc['manualThemeId'] ?? null,
        ];
    }

    public function save(string $mode, ?ObjectId $manualThemeId): void
    {
        $this->col->updateOne(
            ['_id' => 'site'],
            ['$set' => ['themeMode' => $mode, 'manualThemeId' => $manualThemeId]],
            ['upsert' => true]
        );
    }
}
