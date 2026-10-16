<?php
declare(strict_types=1);

namespace App\Post;

use App\Database;
use MongoDB\BSON\ObjectId;
use MongoDB\Collection;

final class PostRepository
{
    private Collection $col;

    public function __construct(Database $db)
    {
        $this->col = $db->collection('posts');
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

    /** @return array<string,mixed>|null */
    public function findById(ObjectId $id): ?array
    {
        return $this->col->findOne(['_id' => $id]);
    }

    /** @return array<string,mixed>|null */
    public function findPublishedBySlug(string $slug): ?array
    {
        return $this->col->findOne(['slug' => $slug, 'status' => 'published']);
    }

    public function slugExists(string $slug): bool
    {
        return $this->col->countDocuments(['slug' => $slug]) > 0;
    }

    /** Czy któryś z plików jest już użyty w innym wpisie (poza $exclude). @param list<string> $paths */
    public function filesUsedByOther(array $paths, ?ObjectId $exclude): bool
    {
        $filter = ['$or' => [['images.file' => ['$in' => $paths]], ['images.thumb' => ['$in' => $paths]]]];
        if ($exclude !== null) {
            $filter['_id'] = ['$ne' => $exclude];
        }
        return $this->col->countDocuments($filter) > 0;
    }

    public function delete(ObjectId $id): void
    {
        $this->col->deleteOne(['_id' => $id]);
    }

    /**
     * @param array<string,mixed> $filter
     * @param array<string,int> $sort
     * @return array{items: list<array<string,mixed>>, total: int}
     */
    public function paginate(array $filter, array $sort, int $page, int $perPage): array
    {
        return [
            'items' => $this->col->find($filter, ['sort' => $sort, 'skip' => ($page - 1) * $perPage, 'limit' => $perPage])->toArray(),
            'total' => $this->col->countDocuments($filter),
        ];
    }
}
