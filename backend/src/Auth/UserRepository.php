<?php
declare(strict_types=1);

namespace App\Auth;

use App\Database;
use MongoDB\BSON\ObjectId;
use MongoDB\Collection;

final class UserRepository
{
    private Collection $col;

    public function __construct(Database $db)
    {
        $this->col = $db->collection('users');
    }

    /** @return array<string,mixed>|null */
    public function findByEmail(string $email): ?array
    {
        return $this->col->findOne(['email' => mb_strtolower(trim($email))]);
    }

    /** @return array<string,mixed>|null */
    public function findById(ObjectId $id): ?array
    {
        return $this->col->findOne(['_id' => $id]);
    }

    /** @return list<array<string,mixed>> */
    public function all(): array
    {
        return $this->col->find([], ['sort' => ['name' => 1]])->toArray();
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
