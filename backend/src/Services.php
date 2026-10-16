<?php
declare(strict_types=1);

namespace App;

use App\Support\Clock;
use App\Theme\SettingsRepository;
use App\Theme\ThemeController;
use App\Theme\ThemeRepository;
use App\Theme\ThemeResolver;

/** Ręczne składanie zależności. Kolejne taski dopisują pola i ich konstrukcję. */
final class Services
{
    public readonly ThemeRepository $themes;
    public readonly SettingsRepository $settings;
    public readonly ThemeResolver $themeResolver;
    public readonly ThemeController $themeController;

    public function __construct(
        public readonly Config $config,
        public readonly Database $db,
        public readonly Clock $clock,
    ) {
        $this->themes = new ThemeRepository($db);
        $this->settings = new SettingsRepository($db);
        $this->themeResolver = new ThemeResolver($this->themes, $this->settings, $clock);
        $this->themeController = new ThemeController($this->themeResolver);
    }
}
