<?php
declare(strict_types=1);

namespace App\Seo;

use App\Group\GroupRepository;
use App\Post\PostRepository;
use App\Support\Dates;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/** /sitemap.xml: strony stałe, opublikowane wpisy (z datą ostatniej zmiany) i grupy. */
final class SitemapController
{
    public function __construct(private readonly PostRepository $posts, private readonly GroupRepository $groups)
    {
    }

    public function sitemap(Request $req, Response $res): Response
    {
        $urls = array_map(fn (string $p) => [$p, null], Site::staticPaths());
        foreach ($this->posts->publishedForSitemap() as $post) {
            $urls[] = ['/wpis/' . rawurlencode((string) $post['slug']), Dates::toIso($post['updatedAt'] ?? $post['publishedAt'] ?? null)];
        }
        foreach ($this->groups->all() as $group) {
            $urls[] = ['/grupy/' . rawurlencode((string) $group['slug']), null];
        }

        $xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n";
        foreach ($urls as [$path, $lastmod]) {
            $xml .= '  <url><loc>' . htmlspecialchars(Site::URL . $path, ENT_XML1 | ENT_QUOTES, 'UTF-8') . '</loc>'
                . ($lastmod !== null ? "<lastmod>$lastmod</lastmod>" : '') . "</url>\n";
        }
        $res->getBody()->write($xml . "</urlset>\n");
        return $res->withHeader('Content-Type', 'application/xml; charset=utf-8');
    }
}
