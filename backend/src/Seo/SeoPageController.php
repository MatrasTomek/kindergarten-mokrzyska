<?php
declare(strict_types=1);

namespace App\Seo;

use App\Group\GroupRepository;
use App\Post\PostRepository;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * /wpis/{slug} i /grupy/{slug} (renderowane w przeglądarce): powłoka aplikacji z meta tagami wpisu/grupy.
 * Na serwerze /.htaccess kieruje te adresy do api/index.php; treść i tak rysuje Angular.
 */
final class SeoPageController
{
    /** Gdy index.csr.html nie istnieje (dev, testy) — sama powłoka, żeby trasy działały wszędzie tak samo. */
    private const FALLBACK_SHELL = "<!doctype html>\n<html lang=\"pl\">\n<head>\n  <meta charset=\"utf-8\">\n  <title></title>\n"
        . "  <base href=\"/\">\n</head>\n<body><app-root></app-root></body>\n</html>\n";

    public function __construct(
        private readonly PostRepository $posts,
        private readonly GroupRepository $groups,
        private readonly string $shellPath,
    ) {
    }

    /** @param array{slug:string} $args */
    public function post(Request $req, Response $res, array $args): Response
    {
        $path = '/wpis/' . rawurlencode($args['slug']);
        $post = $this->find(fn () => $this->posts->findPublishedBySlug($args['slug']));
        if ($post === false) {
            return $this->page($res, new SeoHead(Site::SHORT_NAME, $path));
        }
        if ($post === null) {
            return $this->page($res, new SeoHead(Site::pageTitle('Nie znaleziono wpisu'), $path, noindex: true), 404);
        }
        $excerpt = trim((string) ($post['excerpt'] ?? ''));
        $image = $post['images'][0]['file'] ?? null;
        return $this->page($res, new SeoHead(
            Site::pageTitle((string) $post['title']),
            $path,
            SeoHead::shorten($excerpt !== '' ? $excerpt : (string) ($post['body'] ?? '')),
            is_string($image) ? '/uploads/' . $image : '',
            'article',
        ));
    }

    /** @param array{slug:string} $args */
    public function group(Request $req, Response $res, array $args): Response
    {
        $path = '/grupy/' . rawurlencode($args['slug']);
        $group = $this->find(fn () => $this->groups->findBySlug($args['slug']));
        if ($group === false) {
            return $this->page($res, new SeoHead(Site::SHORT_NAME, $path));
        }
        if ($group === null) {
            return $this->page($res, new SeoHead(Site::pageTitle('Nie ma takiej grupy'), $path, noindex: true), 404);
        }
        $name = (string) $group['name'];
        return $this->page($res, new SeoHead(Site::pageTitle($name), $path, Site::groupDescription($name, (string) ($group['description'] ?? ''))));
    }

    /**
     * Awaria bazy nie może zablokować strony: wtedy powłoka bez meta wpisu (false), a błąd pokaże Angular.
     * @param callable(): (array<string,mixed>|null) $lookup
     * @return array<string,mixed>|null|false
     */
    private function find(callable $lookup): array|null|false
    {
        try {
            return $lookup();
        } catch (\Throwable $e) {
            error_log('SEO: ' . $e->getMessage());
            return false;
        }
    }

    private function page(Response $res, SeoHead $head, int $status = 200): Response
    {
        $shell = is_file($this->shellPath) ? (string) file_get_contents($this->shellPath) : self::FALLBACK_SHELL;
        $res->getBody()->write(SeoHead::inject($shell, $head));
        return $res
            ->withHeader('Content-Type', 'text/html; charset=utf-8')
            ->withHeader('Cache-Control', 'no-cache')
            ->withStatus($status);
    }
}
