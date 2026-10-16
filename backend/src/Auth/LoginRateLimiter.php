<?php
declare(strict_types=1);

namespace App\Auth;

use App\Database;
use App\Support\Clock;
use App\Support\Dates;
use MongoDB\BSON\UTCDateTime;
use MongoDB\Collection;

final class LoginRateLimiter
{
    private const LIMIT = 5;
    private const WINDOW_SECONDS = 900;
    private Collection $col;

    public function __construct(Database $db, private readonly Clock $clock)
    {
        $this->col = $db->collection('login_attempts');
    }

    public function tooManyAttempts(string $ip, string $email): bool
    {
        $since = new UTCDateTime(($this->clock->now()->getTimestamp() - self::WINDOW_SECONDS) * 1000);
        foreach (["ip:$ip", "email:$email"] as $key) {
            if ($this->col->countDocuments(['key' => $key, 'createdAt' => ['$gte' => $since]]) >= self::LIMIT) {
                return true;
            }
        }
        return false;
    }

    public function recordFailure(string $ip, string $email): void
    {
        $now = Dates::now($this->clock);
        $this->col->insertMany([['key' => "ip:$ip", 'createdAt' => $now], ['key' => "email:$email", 'createdAt' => $now]]);
    }

    public function clear(string $email): void
    {
        $this->col->deleteMany(['key' => "email:$email"]);
    }
}
