<?php
declare(strict_types=1);

namespace Tests\Unit;

use App\Theme\DecorThemes;
use PHPUnit\Framework\TestCase;

final class DecorThemesTest extends TestCase
{
    public function testKeysAreTheEightHolidays(): void
    {
        self::assertSame(
            ['christmas', 'epiphany', 'easter', 'pentecost', 'corpus-christi', 'all-saints', 'st-nicholas', 'childrens-day'],
            DecorThemes::KEYS
        );
    }

    public function testIsKnown(): void
    {
        self::assertTrue(DecorThemes::isKnown('easter'));
        self::assertFalse(DecorThemes::isKnown('halloween'));
    }
}
