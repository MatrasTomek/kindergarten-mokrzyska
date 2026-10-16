<?php
declare(strict_types=1);

namespace Tests\Unit;

use App\Http\ApiException;
use App\Http\Input;
use PHPUnit\Framework\TestCase;

final class InputTest extends TestCase
{
    public function testStringTrimsAndValidates(): void
    {
        self::assertSame('abc', Input::string(['t' => '  abc '], 't', 10));
        self::assertSame('', Input::string([], 't', 10, false));
    }

    public function testStringRequired(): void
    {
        $this->expectException(ApiException::class);
        Input::string(['t' => '   '], 't', 10);
    }

    public function testStringTooLongCountsMultibyte(): void
    {
        self::assertSame('ąąą', Input::string(['t' => 'ąąą'], 't', 3));
        $this->expectException(ApiException::class);
        Input::string(['t' => 'ąąąą'], 't', 3);
    }

    public function testOneOf(): void
    {
        self::assertSame('draft', Input::oneOf(['s' => 'draft'], 's', ['draft', 'published']));
        $this->expectException(ApiException::class);
        Input::oneOf(['s' => 'x'], 's', ['draft', 'published']);
    }

    public function testBoolRejectsStrings(): void
    {
        $this->expectException(ApiException::class);
        Input::bool(['b' => 'true'], 'b');
    }
}
