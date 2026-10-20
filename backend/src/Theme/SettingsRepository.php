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

    public function decorKey(): ?string
    {
        $key = ($this->col->findOne(['_id' => 'site']) ?? [])['decorKey'] ?? null;
        return is_string($key) ? $key : null;
    }

    public function saveDecorKey(?string $key): void
    {
        $this->col->updateOne(['_id' => 'site'], ['$set' => ['decorKey' => $key]], ['upsert' => true]);
    }
}
