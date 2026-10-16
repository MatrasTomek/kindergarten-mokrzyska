<?php
declare(strict_types=1);

namespace Tests\Unit;

use App\Support\Slugger;
use PHPUnit\Framework\TestCase;

final class SluggerTest extends TestCase
{
    public function testPolishCharacters(): void
    {
        self::assertSame('bal-przebierancow', Slugger::slugify('Bal przebierańców'));
        self::assertSame('zolta-zaba-swieto-lata', Slugger::slugify('  ŻÓŁTA żaba: Święto Lata!  '));
    }

    public function testEmptyFallsBackToWpis(): void
    {
        self::assertSame('wpis', Slugger::slugify('!!!'));
    }

    public function testMaxLength80(): void
    {
        self::assertLessThanOrEqual(80, strlen(Slugger::slugify(str_repeat('abc ', 50))));
        self::assertStringEndsNotWith('-', Slugger::slugify(str_repeat('abc ', 50)));
    }

    public function testUniqueAppendsCounter(): void
    {
        $taken = ['bal', 'bal-2'];
        self::assertSame('bal-3', Slugger::unique('bal', fn (string $s) => in_array($s, $taken, true)));
        self::assertSame('nowy', Slugger::unique('nowy', fn (string $s) => false));
    }
}
