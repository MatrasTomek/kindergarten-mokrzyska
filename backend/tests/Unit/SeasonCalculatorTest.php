<?php
declare(strict_types=1);

namespace Tests\Unit;

use App\Theme\SeasonCalculator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class SeasonCalculatorTest extends TestCase
{
    private const STARTS = ['spring' => '03-21', 'summer' => '06-23', 'autumn' => '09-23', 'winter' => '12-21'];

    /** @return iterable<array{string,string}> */
    public static function dates(): iterable
    {
        yield ['2026-01-01 10:00', 'winter'];
        yield ['2026-03-20 23:59', 'winter'];
        yield ['2026-03-21 00:00', 'spring'];
        yield ['2026-06-22 12:00', 'spring'];
        yield ['2026-06-23 00:00', 'summer'];
        yield ['2026-09-22 12:00', 'summer'];
        yield ['2026-09-23 00:00', 'autumn'];
        yield ['2026-12-20 23:59', 'autumn'];
        yield ['2026-12-21 00:00', 'winter'];
        yield ['2026-12-31 23:59', 'winter'];
    }

    #[DataProvider('dates')]
    public function testSeasonForWarsawDate(string $date, string $expected): void
    {
        $d = new \DateTimeImmutable($date, new \DateTimeZone('Europe/Warsaw'));
        self::assertSame($expected, SeasonCalculator::seasonFor($d, self::STARTS));
    }

    public function testUtcDateIsConvertedToWarsaw(): void
    {
        // 20.03 23:30 UTC = 21.03 00:30 w Warszawie
        $d = new \DateTimeImmutable('2026-03-20 23:30:00', new \DateTimeZone('UTC'));
        self::assertSame('spring', SeasonCalculator::seasonFor($d, self::STARTS));
    }

    public function testCustomStarts(): void
    {
        $starts = self::STARTS;
        $starts['spring'] = '03-25';
        $d = new \DateTimeImmutable('2026-03-22 12:00', new \DateTimeZone('Europe/Warsaw'));
        self::assertSame('winter', SeasonCalculator::seasonFor($d, $starts));
    }
}
