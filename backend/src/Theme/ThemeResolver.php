<?php
declare(strict_types=1);

namespace App\Theme;

use App\Support\Clock;

final class ThemeResolver
{
    public function __construct(
        private readonly ThemeRepository $themes,
        private readonly SettingsRepository $settings,
        private readonly Clock $clock,
    ) {
    }

    /** @return array<string,mixed> */
    public function active(): array
    {
        $settings = $this->settings->get();
        if ($settings['themeMode'] === 'manual' && $settings['manualThemeId'] !== null) {
            $manual = $this->themes->findById($settings['manualThemeId']);
            if ($manual !== null) {
                return $manual;
            }
        }
        $key = SeasonCalculator::seasonFor($this->clock->now(), $this->themes->seasonStarts());
        return $this->themes->findByKey($key) ?? DefaultThemes::byKey($key) ?? DefaultThemes::all()[0];
    }
}
