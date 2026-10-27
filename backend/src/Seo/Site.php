<?php
declare(strict_types=1);

namespace App\Seo;

use App\Content\ContentPages;

/** Stałe strony publicznej — te same co we froncie (core/config.ts, core/seo.ts). */
final class Site
{
    public const URL = 'https://przedszkolemokrzyska.pl';
    public const SHORT_NAME = 'Przedszkole Parafialne w Mokrzyskach';
    public const DEFAULT_DESCRIPTION =
        'Publiczne Przedszkole Parafialne pw. bł. Karoliny Kózka w Mokrzyskach – aktualności, grupy, rekrutacja, dokumenty i kontakt.';
    public const DEFAULT_IMAGE = self::URL . '/logo.jpg';

    public static function pageTitle(string $title): string
    {
        return $title . ' – ' . self::SHORT_NAME;
    }

    /** Ścieżki stron prerenderowanych (app.routes.ts) — do sitemap.xml. @return list<string> */
    public static function staticPaths(): array
    {
        return ['/', '/aktualnosci', '/z-zycia-przedszkola', '/grupy', ...array_map(fn (string $p) => "/$p", ContentPages::ALL)];
    }

    /** Opis grupy bez własnego opisu — jak groupDescription() we froncie. */
    public static function groupDescription(string $name, string $description): string
    {
        return trim($description) !== '' ? trim($description) : "Grupa $name w Przedszkolu Parafialnym w Mokrzyskach – wpisy i zdjęcia z życia grupy.";
    }
}
