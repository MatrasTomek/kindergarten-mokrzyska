<?php
declare(strict_types=1);

namespace Tests\Integration;

use App\Theme\DefaultThemes;
use MongoDB\BSON\ObjectId;
use Tests\ApiTestCase;

final class ThemeTest extends ApiTestCase
{
    private function seedThemes(): void
    {
        $this->db->collection('themes')->insertMany(DefaultThemes::all());
    }

    public function testAutoModeReturnsSeasonByDate(): void
    {
        $this->seedThemes();
        $res = $this->request('GET', '/api/theme'); // zegar: 15.10 → jesień
        self::assertSame(200, $res->getStatusCode());
        $theme = $this->json($res);
        self::assertSame('autumn', $theme['key']);
        self::assertSame('season', $theme['type']);
        self::assertSame('09-23', $theme['seasonStart']);
        self::assertMatchesRegularExpression('/^#[0-9a-f]{6}$/', $theme['palette']['500']);
        self::assertArrayHasKey('accent', $theme['palette']);
    }

    public function testManualModeReturnsChosenTheme(): void
    {
        $this->seedThemes();
        $id = $this->db->collection('themes')->insertOne([
            'key' => 'special-mikolajki', 'name' => 'Mikołajki', 'type' => 'special',
            'seasonStart' => null, 'palette' => DefaultThemes::all()[3]['palette'],
        ])->getInsertedId();
        $this->db->collection('settings')->insertOne(['_id' => 'site', 'themeMode' => 'manual', 'manualThemeId' => $id]);

        $theme = $this->json($this->request('GET', '/api/theme'));
        self::assertSame('special-mikolajki', $theme['key']);
        self::assertSame((string) $id, $theme['id']);
    }

    public function testManualModeWithMissingThemeFallsBackToSeason(): void
    {
        $this->seedThemes();
        $this->db->collection('settings')->insertOne(['_id' => 'site', 'themeMode' => 'manual', 'manualThemeId' => new ObjectId()]);
        self::assertSame('autumn', $this->json($this->request('GET', '/api/theme'))['key']);
    }

    public function testEmptyDatabaseReturnsBuiltInDefault(): void
    {
        $theme = $this->json($this->request('GET', '/api/theme'));
        self::assertSame('autumn', $theme['key']);
        self::assertNull($theme['id']);
    }
}
