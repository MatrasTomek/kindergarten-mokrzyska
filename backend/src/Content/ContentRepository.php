<?php
declare(strict_types=1);

namespace App\Content;

use App\Database;
use MongoDB\BSON\ObjectId;
use MongoDB\Collection;

final class ContentRepository
{
    private Collection $col;

    public function __construct(Database $db)
    {
        $this->col = $db->collection('content_items');
    }

    /** @return list<array<string,mixed>> */
    public function byPage(string $page, bool $publishedOnly): array
    {
        $filter = ['page' => $page] + ($publishedOnly ? ['status' => 'published'] : []);
        return $this->col->find($filter, ['sort' => ['order' => 1, 'createdAt' => 1]])->toArray();
    }

    /** @return array<string,mixed>|null */
    public function findById(ObjectId $id): ?array
    {
        return $this->col->findOne(['_id' => $id]);
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

    /**
     * Czy któryś z plików jest już użyty w innym elemencie (poza $exclude).
     * @param list<string> $paths
     */
    public function filesUsedByOther(array $paths, ?ObjectId $exclude): bool
    {
        $filter = ['$or' => [
            ['attachments.file' => ['$in' => $paths]],
            ['images.file' => ['$in' => $paths]],
            ['images.thumb' => ['$in' => $paths]],
        ]];
        if ($exclude !== null) {
            $filter['_id'] = ['$ne' => $exclude];
        }
        return $this->col->countDocuments($filter) > 0;
    }

    public function delete(ObjectId $id): void
    {
        $this->col->deleteOne(['_id' => $id]);
    }
}
