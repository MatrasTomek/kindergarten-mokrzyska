<?php
declare(strict_types=1);

namespace Tests\Integration;

use App\Seed\Seeder;
use Tests\ApiTestCase;

final class DecorTest extends ApiTestCase
{
    private string $t;

    protected function setUp(): void
    {
        parent::setUp();
        (new Seeder($this->db, $this->clock))->run(null);
        $this->t = $this->token();
    }

    /** @param array<string,mixed> $body */
    private function put(array $body): \Psr\Http\Message\ResponseInterface
    {
        return $this->request('PUT', '/api/admin/decor', $body, $this->t);
    }

    public function testDefaultIsNull(): void
    {
        self::assertSame(['decorKey' => null], $this->json($this->request('GET', '/api/admin/decor', token: $this->t)));
        self::assertNull($this->json($this->request('GET', '/api/theme'))['decor']);
    }

    public function testSaveAndPublicTheme(): void
    {
        $res = $this->put(['decorKey' => 'easter']);
        self::assertSame(200, $res->getStatusCode());
        self::assertSame(['decorKey' => 'easter'], $this->json($res));
        $theme = $this->json($this->request('GET', '/api/theme'));
        self::assertSame('easter', $theme['decor']);
        self::assertSame('autumn', $theme['key']);
    }

    public function testClearWithNull(): void
    {
        $this->put(['decorKey' => 'easter']);
        self::assertSame(['decorKey' => null], $this->json($this->put(['decorKey' => null])));
        self::assertNull($this->json($this->request('GET', '/api/theme'))['decor']);
    }

    public function testUnknownKeyRejected(): void
    {
        self::assertSame(400, $this->put(['decorKey' => 'halloween'])->getStatusCode());
        self::assertSame(400, $this->put(['decorKey' => 5])->getStatusCode());
        self::assertSame(400, $this->put([])->getStatusCode());
    }

    public function testIndependentFromPalette(): void
    {
        $special = $this->json($this->request('POST', '/api/admin/themes', ['name' => 'Odpust', 'palette' => array_fill_keys(
            ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', 'accent', 'text'],
            '#aa0000'
        )], $this->t));
        $this->request('PUT', '/api/admin/settings', ['themeMode' => 'manual', 'manualThemeId' => $special['id']], $this->t);
        $this->put(['decorKey' => 'easter']);
        self::assertSame(
            ['themeMode' => 'manual', 'manualThemeId' => $special['id']],
            $this->json($this->request('GET', '/api/admin/settings', token: $this->t))
        );
        $this->request('PUT', '/api/admin/settings', ['themeMode' => 'auto'], $this->t);
        self::assertSame(['decorKey' => 'easter'], $this->json($this->request('GET', '/api/admin/decor', token: $this->t)));
    }

    public function testStaleKeyInDbIsNull(): void
    {
        $this->db->collection('settings')->updateOne(['_id' => 'site'], ['$set' => ['decorKey' => 'stary']], ['upsert' => true]);
        self::assertNull($this->json($this->request('GET', '/api/theme'))['decor']);
        self::assertSame(['decorKey' => null], $this->json($this->request('GET', '/api/admin/decor', token: $this->t)));
    }

    public function testRequiresAdmin(): void
    {
        self::assertSame(401, $this->request('GET', '/api/admin/decor')->getStatusCode());
        $userToken = $this->tokenFor($this->createUser('user'), 'user');
        self::assertSame(403, $this->request('PUT', '/api/admin/decor', ['decorKey' => 'easter'], $userToken)->getStatusCode());
    }
}
