<?php
declare(strict_types=1);

namespace App\Theme;

use App\Http\ApiException;
use App\Http\Input;
use App\Support\Slugger;
use MongoDB\BSON\ObjectId;

final class ThemeService
{
    private const PALETTE_KEYS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', 'accent', 'text'];

    public function __construct(private readonly ThemeRepository $themes, private readonly SettingsRepository $settings)
    {
    }

    /**
     * @param array<string,mixed> $in
     * @return array<string,mixed>
     */
    public function create(array $in): array
    {
        $name = Input::string($in, 'name', 60);
        $doc = [
            'key' => Slugger::unique('special-' . Slugger::slugify($name), fn (string $k) => $this->themes->keyExists($k)),
            'name' => $name,
            'type' => 'special',
            'seasonStart' => null,
            'palette' => $this->palette($in['palette'] ?? null),
        ];
        $doc['_id'] = $this->themes->insert($doc);
        return $doc;
    }

    /**
     * @param array<string,mixed> $in
     * @return array<string,mixed>
     */
    public function update(ObjectId $id, array $in): array
    {
        $theme = $this->themes->findById($id) ?? throw ApiException::notFound();
        $set = ['name' => Input::string($in, 'name', 60), 'palette' => $this->palette($in['palette'] ?? null)];
        if ($theme['type'] === 'season') {
            $set['seasonStart'] = $this->seasonStart(Input::string($in, 'seasonStart', 5));
        }
        $this->themes->update($id, $set);
        return (array) $this->themes->findById($id);
    }

    public function delete(ObjectId $id): void
    {
        $theme = $this->themes->findById($id) ?? throw ApiException::notFound();
        if ($theme['type'] === 'season') {
            throw ApiException::validation('Nie można usunąć motywu sezonowego.');
        }
        $settings = $this->settings->get();
        if ($settings['manualThemeId'] !== null && (string) $settings['manualThemeId'] === (string) $id) {
            $this->settings->save('auto', null);
        }
        $this->themes->delete($id);
    }

    /** @return array{themeMode:string, manualThemeId:?string} */
    public function settings(): array
    {
        $s = $this->settings->get();
        return ['themeMode' => $s['themeMode'], 'manualThemeId' => $s['manualThemeId'] !== null ? (string) $s['manualThemeId'] : null];
    }

    /**
     * @param array<string,mixed> $in
     * @return array{themeMode:string, manualThemeId:?string}
     */
    public function saveSettings(array $in): array
    {
        $mode = Input::oneOf($in, 'themeMode', ['auto', 'manual']);
        $manualId = null;
        if ($mode === 'manual') {
            $raw = $in['manualThemeId'] ?? null;
            if (!is_string($raw) || !preg_match('/^[0-9a-f]{24}\z/', $raw) || $this->themes->findById(new ObjectId($raw)) === null) {
                throw ApiException::validation('Wybierz istniejący motyw.');
            }
            $manualId = new ObjectId($raw);
        }
        $this->settings->save($mode, $manualId);
        return $this->settings();
    }

    /** @return array<string,string> */
    private function palette(mixed $palette): array
    {
        if (!is_array($palette)) {
            throw ApiException::validation('Brak palety kolorów.');
        }
        $out = [];
        foreach (self::PALETTE_KEYS as $key) {
            $v = $palette[$key] ?? null;
            if (!is_string($v) || !preg_match('/^#[0-9a-fA-F]{6}\z/', $v)) {
                throw ApiException::validation("Kolor $key musi mieć format #rrggbb.");
            }
            $out[$key] = strtolower($v);
        }
        return $out;
    }

    private function seasonStart(string $md): string
    {
        if (!preg_match('/^(\d{2})-(\d{2})\z/', $md, $m) || !checkdate((int) $m[1], (int) $m[2], 2025)) {
            throw ApiException::validation('Data początku pory roku musi mieć format MM-DD.');
        }
        return $md;
    }
}
