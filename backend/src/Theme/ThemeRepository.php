<?php
declare(strict_types=1);

namespace App\Theme;

use App\Database;
use MongoDB\BSON\ObjectId;
use MongoDB\Collection;

final class ThemeRepository
{
    private Collection $col;

    public function __construct(Database $db)
    {
        $this->col = $db->collection('themes');
    }

    /** @return list<array<string,mixed>> */
    public function all(): array
    {
        return $this->col->find([], ['sort' => ['type' => 1, 'seasonStart' => 1, 'name' => 1]])->toArray();
    }

    /** @return array<string,mixed>|null */
    public function findById(ObjectId $id): ?array
    {
        return $this->col->findOne(['_id' => $id]);
    }

    /** @return array<string,mixed>|null */
    public function findByKey(string $key): ?array
    {
        return $this->col->findOne(['key' => $key]);
    }

    public function keyExists(string $key): bool
    {
        return $this->col->countDocuments(['key' => $key]) > 0;
    }

    /** @return array<string,string> key => 'MM-DD' */
    public function seasonStarts(): array
    {
        $starts = [];
        foreach ($this->col->find(['type' => 'season']) as $doc) {
            $starts[$doc['key']] = $doc['seasonStart'];
        }
        if ($starts === []) {
            foreach (DefaultThemes::all() as $doc) {
                $starts[$doc['key']] = $doc['seasonStart'];
            }
        }
        return $starts;
    }

    /** @param array<string,mixed> $doc */
    public function insert(array $doc): ObjectId
    {
        return $this->col->insertOne($doc)->getInsertedId();
    }

    /** @param array<string,mixed> $set */
    public function update(ObjectId $id, array $set): void
    {
        $this->col->updateOne(['_id' => $id], ['$set' => $set]);
    }

    public function delete(ObjectId $id): void
    {
        $this->col->deleteOne(['_id' => $id]);
    }
}
