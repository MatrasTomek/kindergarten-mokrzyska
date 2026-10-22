<?php
declare(strict_types=1);

namespace App\Auth;

use App\Database;
use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;
use MongoDB\Collection;

/**
 * Sesje logowania (jedna na logowanie). Token odświeżania niesie `sid` i `jti`; ważny jest tylko bieżący `jti`
 * sesji (rotacja przy każdym odświeżeniu). Usunięcie sesji = natychmiastowe unieważnienie tokenu odświeżania.
 * Bez indeksu TTL: wygasłe sesje sprząta login według Clock (TTL liczyłby prawdziwym czasem, nie zegarem aplikacji).
 */
final class SessionRepository
{
    private Collection $col;

    public function __construct(Database $db)
    {
        $this->col = $db->collection('sessions');
    }

    public function create(ObjectId $userId, string $jti, UTCDateTime $now, UTCDateTime $expiresAt): ObjectId
    {
        return $this->col->insertOne([
            'userId' => $userId,
            'jti' => $jti,
            'prevJti' => null,
            'rotatedAt' => null,
            'createdAt' => $now,
            'expiresAt' => $expiresAt,
        ])->getInsertedId();
    }

    /** @return array<string,mixed>|null */
    public function find(ObjectId $id): ?array
    {
        return $this->col->findOne(['_id' => $id]);
    }

    /** Atomowo: tylko gdy bieżący jti to `$jti` — z równoległych odświeżeń rotuje dokładnie jedno. */
    public function rotate(ObjectId $id, string $jti, string $newJti, UTCDateTime $now): bool
    {
        return $this->col->updateOne(
            ['_id' => $id, 'jti' => $jti],
            ['$set' => ['jti' => $newJti, 'prevJti' => $jti, 'rotatedAt' => $now]]
        )->getModifiedCount() === 1;
    }

    public function delete(ObjectId $id): void
    {
        $this->col->deleteOne(['_id' => $id]);
    }

    public function deleteForUser(ObjectId $userId): void
    {
        $this->col->deleteMany(['userId' => $userId]);
    }

    public function deleteExpired(UTCDateTime $now): void
    {
        $this->col->deleteMany(['expiresAt' => ['$lte' => $now]]);
    }
}
