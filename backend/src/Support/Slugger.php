<?php
declare(strict_types=1);

namespace App\Support;

final class Slugger
{
    private const MAP = ['ą' => 'a', 'ć' => 'c', 'ę' => 'e', 'ł' => 'l', 'ń' => 'n', 'ó' => 'o', 'ś' => 's', 'ź' => 'z', 'ż' => 'z'];

    public static function slugify(string $text): string
    {
        $s = strtr(mb_strtolower(trim($text), 'UTF-8'), self::MAP);
        $s = (string) preg_replace('/[^a-z0-9]+/', '-', $s);
        $s = trim(substr(trim($s, '-'), 0, 80), '-');
        return $s === '' ? 'wpis' : $s;
    }

    /** @param callable(string): bool $exists */
    public static function unique(string $base, callable $exists): string
    {
        $slug = $base;
        for ($i = 2; $exists($slug); $i++) {
            $slug = "$base-$i";
        }
        return $slug;
    }
}
