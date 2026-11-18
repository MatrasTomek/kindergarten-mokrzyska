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
    /** Zgadywanie hasła do jednego konta. */
    private const EMAIL_LIMIT = 5;
    /**
     * Wiele kont z jednego adresu. Wyraźnie wyżej niż EMAIL_LIMIT: cały personel przedszkola wychodzi
     * do internetu przez jeden router (jedno publiczne IP), więc kilka pomyłek różnych osób
     * nie może blokować logowania wszystkim pozostałym.
     */
    private const IP_LIMIT = 60;
    private const WINDOW_SECONDS = 900;
    private Collection $col;

    public function __construct(Database $db, private readonly Clock $clock)
    {
        $this->col = $db->collection('login_attempts');
    }

    public function tooManyAttempts(string $ip, string $email): bool
    {
        $since = new UTCDateTime(($this->clock->now()->getTimestamp() - self::WINDOW_SECONDS) * 1000);
        foreach (["ip:$ip" => self::IP_LIMIT, "email:$email" => self::EMAIL_LIMIT] as $key => $limit) {
            if ($this->col->countDocuments(['key' => $key, 'createdAt' => ['$gte' => $since]]) >= $limit) {
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
