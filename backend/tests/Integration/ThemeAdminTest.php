<?php
declare(strict_types=1);

namespace Tests\Integration;

use App\Seed\Seeder;
use Tests\ApiTestCase;

final class ThemeAdminTest extends ApiTestCase
{
    private string $t;

    protected function setUp(): void
    {
        parent::setUp();
        (new Seeder($this->db, $this->clock))->run(null);
        $this->t = $this->token();
    }

    /** @return array<string,string> */
    private function palette(string $hex = '#aa0000'): array
    {
        $p = [];
        foreach (['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', 'accent', 'text'] as $k) {
            $p[$k] = $hex;
        }
        return $p;
    }

    public function testCreateSpecialThemeAndActivateManually(): void
    {
        $res = $this->request('POST', '/api/admin/themes', ['name' => 'Mikołajki', 'palette' => $this->palette()], $this->t);
        self::assertSame(201, $res->getStatusCode());
        $theme = $this->json($res);
        self::assertSame(['special-mikolajki', 'special', null], [$theme['key'], $theme['type'], $theme['seasonStart']]);

        $s = $this->json($this->request('PUT', '/api/admin/settings', ['themeMode' => 'manual', 'manualThemeId' => $theme['id']], $this->t));
        self::assertSame(['themeMode' => 'manual', 'manualThemeId' => $theme['id']], $s);
        self::assertSame('special-mikolajki', $this->json($this->request('GET', '/api/theme'))['key']);
    }

    public function testListContainsSeasonsAndSpecial(): void
    {
        $this->request('POST', '/api/admin/themes', ['name' => 'Dzień Dziecka', 'palette' => $this->palette()], $this->t);
        $keys = array_column($this->json($this->request('GET', '/api/admin/themes', token: $this->t)), 'key');
        self::assertEqualsCanonicalizing(['spring', 'summer', 'autumn', 'winter', 'special-dzien-dziecka'], $keys);
    }

    public function testInvalidPaletteRejected(): void
    {
        $p = $this->palette();
        $p['500'] = 'red';
        self::assertSame(400, $this->request('POST', '/api/admin/themes', ['name' => 'X', 'palette' => $p], $this->t)->getStatusCode());
        unset($p['500']);
        self::assertSame(400, $this->request('POST', '/api/admin/themes', ['name' => 'X', 'palette' => $p], $this->t)->getStatusCode());
    }

    public function testSeasonStartChangeAffectsAutoTheme(): void
    {
        $spring = array_values(array_filter($this->json($this->request('GET', '/api/admin/themes', token: $this->t)), fn ($x) => $x['key'] === 'spring'))[0];
        $res = $this->request('PUT', "/api/admin/themes/{$spring['id']}", ['name' => 'Wiosna', 'palette' => $spring['palette'], 'seasonStart' => '03-25'], $this->t);
        self::assertSame('03-25', $this->json($res)['seasonStart']);

        $this->clock->set(new \DateTimeImmutable('2027-03-22 12:00', new \DateTimeZone('Europe/Warsaw')));
        self::assertSame('winter', $this->json($this->request('GET', '/api/theme'))['key']);

        $this->t = $this->token(); // poprzedni token wygasł po przesunięciu zegara
        self::assertSame(400, $this->request('PUT', "/api/admin/themes/{$spring['id']}", ['name' => 'Wiosna', 'palette' => $spring['palette'], 'seasonStart' => '02-30'], $this->t)->getStatusCode());
    }

    public function testCannotDeleteSeasonTheme(): void
    {
        $winter = array_values(array_filter($this->json($this->request('GET', '/api/admin/themes', token: $this->t)), fn ($x) => $x['key'] === 'winter'))[0];
        self::assertSame(400, $this->request('DELETE', "/api/admin/themes/{$winter['id']}", token: $this->t)->getStatusCode());
    }

    public function testDeletingActiveManualThemeSwitchesToAuto(): void
    {
        $theme = $this->json($this->request('POST', '/api/admin/themes', ['name' => 'Jasełka', 'palette' => $this->palette()], $this->t));
        $this->request('PUT', '/api/admin/settings', ['themeMode' => 'manual', 'manualThemeId' => $theme['id']], $this->t);

        self::assertSame(204, $this->request('DELETE', "/api/admin/themes/{$theme['id']}", token: $this->t)->getStatusCode());
        self::assertSame(['themeMode' => 'auto', 'manualThemeId' => null], $this->json($this->request('GET', '/api/admin/settings', token: $this->t)));
    }

    public function testSettingsValidation(): void
    {
        self::assertSame(400, $this->request('PUT', '/api/admin/settings', ['themeMode' => 'manual', 'manualThemeId' => '0123456789abcdef01234567'], $this->t)->getStatusCode());
        self::assertSame(400, $this->request('PUT', '/api/admin/settings', ['themeMode' => 'party'], $this->t)->getStatusCode());
        self::assertSame(['themeMode' => 'auto', 'manualThemeId' => null], $this->json($this->request('PUT', '/api/admin/settings', ['themeMode' => 'auto'], $this->t)));
    }

    public function testUserForbidden(): void
    {
        self::assertSame(403, $this->request('GET', '/api/admin/themes', token: $this->token('user'))->getStatusCode());
        self::assertSame(403, $this->request('PUT', '/api/admin/settings', ['themeMode' => 'auto'], $this->token('user'))->getStatusCode());
    }

    /** @return array<string,mixed> */
    private function themeByKey(string $key): array
    {
        return array_values(array_filter($this->json($this->request('GET', '/api/admin/themes', token: $this->t)), fn ($x) => $x['key'] === $key))[0];
    }

    /** @return list<array{string}> */
    public static function badSeasonStarts(): array
    {
        return [['13-01'], ['02-30'], ['3-21'], ['02-29'], ['00-10'], ['03-32'], ['2025-03'], ['abc'], ['']];
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('badSeasonStarts')]
    public function testInvalidSeasonStartRejected(string $value): void
    {
        $spring = $this->themeByKey('spring');
        $res = $this->request('PUT', "/api/admin/themes/{$spring['id']}", ['name' => 'Wiosna', 'palette' => $spring['palette'], 'seasonStart' => $value], $this->t);
        self::assertSame(400, $res->getStatusCode());
        self::assertSame('03-21', $this->themeByKey('spring')['seasonStart']);
    }

    public function testMissingSeasonStartForSeasonRejected(): void
    {
        $spring = $this->themeByKey('spring');
        self::assertSame(400, $this->request('PUT', "/api/admin/themes/{$spring['id']}", ['name' => 'Wiosna', 'palette' => $spring['palette']], $this->t)->getStatusCode());
    }

    public function testInvalidAccentAndTextRejected(): void
    {
        foreach (['accent' => '#12345', 'text' => 'black'] as $k => $v) {
            $p = $this->palette();
            $p[$k] = $v;
            self::assertSame(400, $this->request('POST', '/api/admin/themes', ['name' => 'X', 'palette' => $p], $this->t)->getStatusCode(), $k);
        }
        self::assertSame(400, $this->request('POST', '/api/admin/themes', ['name' => 'X', 'palette' => 'nope'], $this->t)->getStatusCode());
    }

    public function testSpecialThemeUpdateIgnoresSeasonStart(): void
    {
        $theme = $this->json($this->request('POST', '/api/admin/themes', ['name' => 'Bal', 'palette' => $this->palette()], $this->t));
        $res = $this->request('PUT', "/api/admin/themes/{$theme['id']}", ['name' => 'Bal 2', 'palette' => $this->palette('#00ff00'), 'seasonStart' => '05-05'], $this->t);
        $out = $this->json($res);
        self::assertSame([200, 'Bal 2', null, 'special-bal'], [$res->getStatusCode(), $out['name'], $out['seasonStart'], $out['key']]);
    }

    public function testDuplicateNameGetsUniqueKey(): void
    {
        $this->request('POST', '/api/admin/themes', ['name' => 'Bal', 'palette' => $this->palette()], $this->t);
        $b = $this->json($this->request('POST', '/api/admin/themes', ['name' => 'Bal', 'palette' => $this->palette()], $this->t));
        self::assertSame('special-bal-2', $b['key']);
    }

    public function testManualThemeIdMalformedOrMissingRejected(): void
    {
        foreach (['xyz', '0123456789ABCDEF01234567', '123', 123, null] as $bad) {
            self::assertSame(400, $this->request('PUT', '/api/admin/settings', ['themeMode' => 'manual', 'manualThemeId' => $bad], $this->t)->getStatusCode());
        }
        self::assertSame(400, $this->request('PUT', '/api/admin/settings', ['themeMode' => 'manual'], $this->t)->getStatusCode());
        self::assertSame(400, $this->request('PUT', '/api/admin/settings', [], $this->t)->getStatusCode());
        self::assertSame(['themeMode' => 'auto', 'manualThemeId' => null], $this->json($this->request('GET', '/api/admin/settings', token: $this->t)));
    }

    public function testThemeStillResolvesAfterDeletingActiveManualTheme(): void
    {
        $theme = $this->json($this->request('POST', '/api/admin/themes', ['name' => 'Jasełka', 'palette' => $this->palette()], $this->t));
        $this->request('PUT', '/api/admin/settings', ['themeMode' => 'manual', 'manualThemeId' => $theme['id']], $this->t);
        $this->request('DELETE', "/api/admin/themes/{$theme['id']}", token: $this->t);
        $this->clock->set(new \DateTimeImmutable('2027-01-10 12:00', new \DateTimeZone('Europe/Warsaw')));
        $res = $this->request('GET', '/api/theme');
        self::assertSame([200, 'winter'], [$res->getStatusCode(), $this->json($res)['key']]);
    }

    public function testThemeStillResolvesAfterRejectedSeasonDelete(): void
    {
        $winter = $this->themeByKey('winter');
        self::assertSame(400, $this->request('DELETE', "/api/admin/themes/{$winter['id']}", token: $this->t)->getStatusCode());
        $this->clock->set(new \DateTimeImmutable('2027-01-10 12:00', new \DateTimeZone('Europe/Warsaw')));
        self::assertSame('winter', $this->json($this->request('GET', '/api/theme'))['key']);
    }

    public function testUnknownOrMalformedThemeIdIs404(): void
    {
        self::assertSame(404, $this->request('DELETE', '/api/admin/themes/0123456789abcdef01234567', token: $this->t)->getStatusCode());
        self::assertSame(404, $this->request('PUT', '/api/admin/themes/xyz', ['name' => 'A', 'palette' => $this->palette()], $this->t)->getStatusCode());
    }

    public function testUserForbiddenOnWrites(): void
    {
        $u = $this->token('user');
        $spring = $this->themeByKey('spring');
        self::assertSame(403, $this->request('POST', '/api/admin/themes', ['name' => 'X', 'palette' => $this->palette()], $u)->getStatusCode());
        self::assertSame(403, $this->request('PUT', "/api/admin/themes/{$spring['id']}", ['name' => 'X', 'palette' => $this->palette(), 'seasonStart' => '03-21'], $u)->getStatusCode());
        self::assertSame(403, $this->request('DELETE', "/api/admin/themes/{$spring['id']}", token: $u)->getStatusCode());
        self::assertSame(403, $this->request('GET', '/api/admin/settings', token: $u)->getStatusCode());
    }

    public function testAnonymousUnauthorized(): void
    {
        self::assertSame(401, $this->request('GET', '/api/admin/themes')->getStatusCode());
        self::assertSame(401, $this->request('PUT', '/api/admin/settings', ['themeMode' => 'auto'])->getStatusCode());
    }

    public function testTrailingNewlineRejectedEverywhere(): void
    {
        $p = $this->palette();
        $p['500'] = "#aa0000\n";
        self::assertSame(400, $this->request('POST', '/api/admin/themes', ['name' => 'X', 'palette' => $p], $this->t)->getStatusCode());

        $theme = $this->json($this->request('POST', '/api/admin/themes', ['name' => 'Nl', 'palette' => $this->palette()], $this->t));
        self::assertSame(400, $this->request('PUT', '/api/admin/settings', ['themeMode' => 'manual', 'manualThemeId' => $theme['id'] . "\n"], $this->t)->getStatusCode());

        $spring = $this->themeByKey('spring');
        // Input::string() trims, so the stored value never carries the newline.
        $res = $this->request('PUT', "/api/admin/themes/{$spring['id']}", ['name' => 'Wiosna', 'palette' => $spring['palette'], 'seasonStart' => "03-21\n"], $this->t);
        self::assertSame('03-21', $this->json($res)['seasonStart']);
    }
}
