<?php
declare(strict_types=1);

namespace App;

use App\Auth\AuthController;
use App\Auth\JwtService;
use App\Auth\LoginRateLimiter;
use App\Auth\SessionRepository;
use App\Auth\UserController;
use App\Auth\UserRepository;
use App\Auth\UserService;
use App\Content\ContentController;
use App\Content\ContentRepository;
use App\Content\ContentService;
use App\Group\GroupController;
use App\Group\GroupRepository;
use App\Group\GroupService;
use App\Post\PostAdminController;
use App\Post\PostPublicController;
use App\Post\PostRepository;
use App\Post\PostService;
use App\Support\Clock;
use App\Support\HtmlSanitizer;
use App\Theme\SettingsRepository;
use App\Theme\ThemeController;
use App\Theme\ThemeRepository;
use App\Theme\ThemeResolver;
use App\Theme\ThemeService;
use App\Upload\UploadController;
use App\Upload\UploadService;

/** Ręczne składanie zależności. Kolejne taski dopisują pola i ich konstrukcję. */
final class Services
{
    public readonly ThemeRepository $themes;
    public readonly SettingsRepository $settings;
    public readonly ThemeResolver $themeResolver;
    public readonly ThemeController $themeController;
    public readonly UserRepository $users;
    public readonly SessionRepository $sessions;
    public readonly UserController $userController;
    public readonly JwtService $jwt;
    public readonly AuthController $authController;
    public readonly UploadService $uploads;
    public readonly UploadController $uploadController;
    public readonly GroupRepository $groups;
    public readonly GroupController $groupController;
    public readonly HtmlSanitizer $sanitizer;
    public readonly PostRepository $posts;
    public readonly PostAdminController $postAdminController;
    public readonly PostPublicController $postPublicController;
    public readonly ContentController $contentController;

    public function __construct(
        public readonly Config $config,
        public readonly Database $db,
        public readonly Clock $clock,
    ) {
        $this->themes = new ThemeRepository($db);
        $this->settings = new SettingsRepository($db);
        $this->themeResolver = new ThemeResolver($this->themes, $this->settings, $clock);
        $this->themeController = new ThemeController(
            $this->themeResolver,
            $this->themes,
            new ThemeService($this->themes, $this->settings)
        );
        $this->users = new UserRepository($db);
        $this->sessions = new SessionRepository($db);
        $this->userController = new UserController($this->users, new UserService($this->users, $this->sessions, $clock));
        $this->jwt = new JwtService($config, $clock);
        $this->authController = new AuthController($this->users, $this->sessions, $this->jwt, new LoginRateLimiter($db, $clock), $clock);
        $this->uploads = new UploadService($config, $clock);
        $this->uploadController = new UploadController($this->uploads);
        $this->groups = new GroupRepository($db);
        $this->groupController = new GroupController($this->groups, new GroupService($this->groups, $db));
        $this->sanitizer = new HtmlSanitizer();
        $this->posts = new PostRepository($db);
        $this->postAdminController = new PostAdminController(
            $this->posts,
            new PostService($this->posts, $this->groups, $this->sanitizer, $this->uploads, $clock)
        );
        $this->postPublicController = new PostPublicController($this->posts, $this->groups);
        $contentItems = new ContentRepository($db);
        $this->contentController = new ContentController(
            $contentItems,
            new ContentService($contentItems, $this->posts, $this->sanitizer, $this->uploads, $clock)
        );
    }
}
