<?php
declare(strict_types=1);

namespace App;

use App\Support\Clock;

/** Ręczne składanie zależności. Kolejne taski dopisują pola i ich konstrukcję. */
final class Services
{
    public function __construct(
        public readonly Config $config,
        public readonly Database $db,
        public readonly Clock $clock,
    ) {
    }
}
