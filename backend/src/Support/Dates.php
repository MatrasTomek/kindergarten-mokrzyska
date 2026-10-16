<?php
declare(strict_types=1);

namespace App\Support;

use MongoDB\BSON\UTCDateTime;

final class Dates
{
    public static function now(Clock $clock): UTCDateTime
    {
        return new UTCDateTime($clock->now());
    }

    public static function toIso(?UTCDateTime $date): ?string
    {
        return $date?->toDateTime()->setTimezone(new \DateTimeZone('Europe/Warsaw'))->format(DATE_ATOM);
    }
}
