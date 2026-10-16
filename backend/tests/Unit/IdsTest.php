<?php
declare(strict_types=1);

namespace Tests\Unit;

use App\Http\ApiException;
use App\Support\Ids;
use PHPUnit\Framework\TestCase;

final class IdsTest extends TestCase
{
    public function testParsesValidId(): void
    {
        self::assertSame('0123456789abcdef01234567', (string) Ids::parse('0123456789abcdef01234567'));
    }

    public function testTrailingNewlineIsNotFound(): void
    {
        $this->expectException(ApiException::class);
        Ids::parse("0123456789abcdef01234567\n");
    }
}
