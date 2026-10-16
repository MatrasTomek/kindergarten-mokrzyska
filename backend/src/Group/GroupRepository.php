<?php
declare(strict_types=1);

namespace App\Group;

use App\Database;
use MongoDB\BSON\ObjectId;
use MongoDB\Collection;

final class GroupRepository
{
    private Collection $col;

    public function __construct(Database $db)
    {
        $this->col = $db->collection('groups');
    }

    /** @return list<array<string,mixed>> */
    public function all(): array
    {
        return $this->col->find([], ['sort' => ['order' => 1, 'name' => 1]])->toArray();
    }

    /** @return array<string,mixed>|null */
    public function findById(ObjectId $id): ?array
    {
        return $this->col->findOne(['_id' => $id]);
    }

    /** @return array<string,mixed>|null */
    public function findBySlug(string $slug): ?array
    {
        return $this->col->findOne(['slug' => $slug]);
    }

    public function slugExists(string $slug): bool
    {
        return $this->col->countDocuments(['slug' => $slug]) > 0;
    }

    /** @param list<ObjectId> $ids */
    public function countExisting(array $ids): int
    {
        return $ids === [] ? 0 : $this->col->countDocuments(['_id' => ['$in' => $ids]]);
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
