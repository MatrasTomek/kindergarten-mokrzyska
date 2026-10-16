<?php
declare(strict_types=1);

namespace App\Theme;

final class DefaultThemes
{
    /** @return list<array<string,mixed>> */
    public static function all(): array
    {
        return [
            self::season('spring', 'Wiosna', '03-21', ['#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d']),
            self::season('summer', 'Lato', '06-23', ['#fefce8', '#fef9c3', '#fef08a', '#fde047', '#facc15', '#eab308', '#ca8a04', '#a16207', '#854d0e', '#713f12']),
            self::season('autumn', 'Jesień', '09-23', ['#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d']),
            self::season('winter', 'Zima', '12-21', ['#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a']),
        ];
    }

    /** @return array<string,mixed>|null */
    public static function byKey(string $key): ?array
    {
        foreach (self::all() as $theme) {
            if ($theme['key'] === $key) {
                return $theme;
            }
        }
        return null;
    }

    /**
     * @param list<string> $shades 10 kolorów: 50,100,...,900
     * @return array<string,mixed>
     */
    private static function season(string $key, string $name, string $start, array $shades): array
    {
        $palette = array_combine(['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'], $shades);
        $palette['accent'] = $shades[7];
        $palette['text'] = $shades[9];
        return ['key' => $key, 'name' => $name, 'type' => 'season', 'seasonStart' => $start, 'palette' => $palette];
    }
}
