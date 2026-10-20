<?php
declare(strict_types=1);

namespace App\Theme;

/** Wbudowane motywy świąteczne (same grafiki, bez palety). Ilustracje i nazwy są we frontendzie. */
final class DecorThemes
{
    public const KEYS = ['christmas', 'epiphany', 'easter', 'pentecost', 'corpus-christi', 'all-saints', 'st-nicholas', 'childrens-day'];

    public static function isKnown(string $key): bool
    {
        return in_array($key, self::KEYS, true);
    }
}
