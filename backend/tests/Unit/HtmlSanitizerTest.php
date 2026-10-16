<?php
declare(strict_types=1);

namespace Tests\Unit;

use App\Support\HtmlSanitizer;
use PHPUnit\Framework\TestCase;

final class HtmlSanitizerTest extends TestCase
{
    public function testKeepsAllowedTags(): void
    {
        $html = '<h2>Tytuł</h2><p><strong>a</strong> <em>b</em> <u>c</u> <s>d</s></p><ul><li>x</li></ul><a href="https://example.com">l</a>';
        self::assertSame($html, (new HtmlSanitizer())->clean($html));
    }

    public function testRemovesScriptsAndHandlers(): void
    {
        $out = (new HtmlSanitizer())->clean('<p onclick="alert(1)">a</p><script>alert(1)</script><img src=x onerror=alert(1)>');
        self::assertSame('<p>a</p>', $out);
    }

    public function testRemovesJavascriptLinks(): void
    {
        $out = (new HtmlSanitizer())->clean('<a href="javascript:alert(1)">x</a>');
        self::assertStringNotContainsString('javascript', $out);
    }
}
