<?php
declare(strict_types=1);

namespace App\Theme;

final class SeasonCalculator
{
    /** @param array<string,string> $starts key => 'MM-DD' */
    public static function seasonFor(\DateTimeImmutable $date, array $starts): string
    {
        $md = $date->setTimezone(new \DateTimeZone('Europe/Warsaw'))->format('m-d');
        asort($starts, SORT_STRING);
        // przed pierwszym progiem roku trwa pora z najpóźniejszym progiem (zima)
        $current = (string) array_key_last($starts);
        foreach ($starts as $key => $start) {
            if ($md >= $start) {
                $current = (string) $key;
            }
        }
        return $current;
    }
}
