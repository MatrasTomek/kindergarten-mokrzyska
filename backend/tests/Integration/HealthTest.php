<?php
declare(strict_types=1);

namespace Tests\Integration;

use Tests\ApiTestCase;

final class HealthTest extends ApiTestCase
{
    public function testHealthReturnsOk(): void
    {
        $res = $this->request('GET', '/api/health');
        self::assertSame(200, $res->getStatusCode());
        self::assertSame(['status' => 'ok'], $this->json($res));
    }

    public function testUnknownRouteReturnsJson404(): void
    {
        $res = $this->request('GET', '/api/nie-ma');
        self::assertSame(404, $res->getStatusCode());
        self::assertSame('NOT_FOUND', $this->json($res)['error']['code']);
    }

    public function testConfigRejectsShortJwtSecret(): void
    {
        $this->expectException(\RuntimeException::class);
        \App\Config::fromEnv(['MONGO_URI' => 'x', 'MONGO_DB' => 'x', 'JWT_SECRET' => 'short', 'UPLOAD_DIR' => '/tmp']);
    }
}
