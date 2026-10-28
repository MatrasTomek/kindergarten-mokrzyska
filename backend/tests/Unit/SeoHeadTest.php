<?php
declare(strict_types=1);

namespace Tests\Unit;

use App\Seo\SeoHead;
use PHPUnit\Framework\TestCase;

final class SeoHeadTest extends TestCase
{
    private const SHELL = "<!doctype html><html lang=\"pl\"><head>\n  <meta charset=\"utf-8\">\n  <title>Przedszkole</title>\n"
        . "  <base href=\"/\">\n  <script type=\"application/ld+json\">{}</script>\n</head><body><app-root></app-root></body></html>";

    public function testReplacesTitleAndAddsTagsKeepingTheRestOfTheShell(): void
    {
        $html = SeoHead::inject(self::SHELL, new SeoHead('Wpis', '/wpis/a', 'Opis', '/uploads/a.webp', 'article'));

        self::assertSame(1, substr_count($html, '<title>'));
        self::assertStringContainsString('<title>Wpis</title>', $html);
        self::assertStringContainsString('<meta property="og:image" content="https://przedszkolemokrzyska.pl/uploads/a.webp">', $html);
        self::assertStringContainsString('<base href="/">', $html);
        self::assertStringContainsString('<script type="application/ld+json">{}</script>', $html);
        self::assertStringEndsWith('<app-root></app-root></body></html>', $html);
    }

    public function testDollarSignsAndBackslashesInContentAreNotTreatedAsRegexReferences(): void
    {
        $html = SeoHead::inject(self::SHELL, new SeoHead('Cena $1 \\0', '/'));
        self::assertStringContainsString('<title>Cena $1 \\0</title>', $html);
    }

    public function testShellWithoutTitleGetsTagsBeforeHeadEnd(): void
    {
        $html = SeoHead::inject('<html><head></head><body></body></html>', new SeoHead('T', '/'));
        self::assertStringContainsString('<title>T</title>', $html);
        self::assertLessThan(strpos($html, '</head>'), strpos($html, '<title>'));
    }

    public function testShorten(): void
    {
        self::assertSame('krótki', SeoHead::shorten("  krótki \n"));
        self::assertSame(str_repeat('a', 157) . '…', SeoHead::shorten(str_repeat('a', 200)));
        self::assertSame('Ala ma kota', SeoHead::shorten('<p>Ala&nbsp;ma</p><p>kota</p>'));
    }
}
