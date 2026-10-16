<?php
declare(strict_types=1);

namespace App;

use MongoDB\Client;
use MongoDB\Collection;

final class Database
{
    private function __construct(private readonly \MongoDB\Database $db)
    {
    }

    public static function connect(Config $config): self
    {
        $client = new Client($config->mongoUri, [], [
            'typeMap' => ['root' => 'array', 'document' => 'array', 'array' => 'array'],
        ]);
        return new self($client->selectDatabase($config->mongoDb));
    }

    public function collection(string $name): Collection
    {
        return $this->db->selectCollection($name);
    }

    public function drop(): void
    {
        $this->db->drop();
    }

    public function ensureIndexes(): void
    {
        $this->collection('users')->createIndex(['email' => 1], ['unique' => true]);
        $this->collection('groups')->createIndex(['slug' => 1], ['unique' => true]);
        $this->collection('posts')->createIndex(['slug' => 1], ['unique' => true]);
        $this->collection('posts')->createIndex(['status' => 1, 'publishedAt' => -1]);
        $this->collection('posts')->createIndex(['targets.groupIds' => 1]);
        $this->collection('content_items')->createIndex(['page' => 1, 'order' => 1]);
        $this->collection('themes')->createIndex(['key' => 1], ['unique' => true]);
        $this->collection('login_attempts')->createIndex(['createdAt' => 1], ['expireAfterSeconds' => 900]);
        $this->collection('login_attempts')->createIndex(['key' => 1]);
    }
}
