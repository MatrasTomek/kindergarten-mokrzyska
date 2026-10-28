<?php
declare(strict_types=1);

namespace Tests\Integration;

use Tests\ApiTestCase;

final class SeoTest extends ApiTestCase
{
    private string $token;

    protected function setUp(): void
    {
        parent::setUp();
        $this->token = $this->token('admin');
    }

    /** @param array<string,mixed> $fields */
    private function post(string $title, array $fields = []): array
    {
        $this->clock->advance('+1 minute');
        return $this->json($this->request('POST', '/api/admin/posts', $fields + [
            'title' => $title, 'excerpt' => '', 'body' => '', 'images' => [],
            'targets' => ['news' => true, 'groupIds' => []], 'status' => 'published',
        ], $this->token));
    }

    private function group(string $name, string $description = ''): array
    {
        return $this->json($this->request('POST', '/api/admin/groups', ['name' => $name, 'description' => $description], $this->token));
    }

    public function testSitemapListsStaticPagesPublishedPostsAndGroups(): void
    {
        $this->post('Bal jesienny');
        $this->post('Szkic', ['status' => 'draft']);
        $this->group('Pingwinki');

        $res = $this->request('GET', '/sitemap.xml');
        self::assertSame(200, $res->getStatusCode());
        self::assertStringStartsWith('application/xml', $res->getHeaderLine('Content-Type'));
        $xml = new \SimpleXMLElement((string) $res->getBody());
        $locs = [];
        foreach ($xml->url as $url) {
            $locs[(string) $url->loc] = (string) $url->lastmod;
        }
        foreach (['/', '/aktualnosci', '/z-zycia-przedszkola', '/grupy', '/kontakt', '/deklaracja-dostepnosci', '/wpis/bal-jesienny', '/grupy/pingwinki'] as $path) {
            self::assertArrayHasKey('https://przedszkolemokrzyska.pl' . $path, $locs, $path);
        }
        self::assertArrayNotHasKey('https://przedszkolemokrzyska.pl/wpis/szkic', $locs);
        self::assertStringStartsWith('2026-10-15T12:01:00', $locs['https://przedszkolemokrzyska.pl/wpis/bal-jesienny']);
    }

    public function testPostPageHasMetaTagsForCrawlersAndLinkPreviews(): void
    {
        $this->post('Bal "u" <Pingwinków>', ['excerpt' => 'Zabawa & tańce']);

        $res = $this->request('GET', '/wpis/bal-u-pingwinkow');
        self::assertSame(200, $res->getStatusCode());
        self::assertSame('text/html; charset=utf-8', $res->getHeaderLine('Content-Type'));
        self::assertSame('no-cache', $res->getHeaderLine('Cache-Control'));
        $html = (string) $res->getBody();
        self::assertStringContainsString('<title>Bal &quot;u&quot; &lt;Pingwinków&gt; – Przedszkole Parafialne w Mokrzyskach</title>', $html);
        self::assertStringContainsString('<meta name="description" content="Zabawa &amp; tańce">', $html);
        self::assertStringContainsString('<meta property="og:type" content="article">', $html);
        self::assertStringContainsString('<meta property="og:url" content="https://przedszkolemokrzyska.pl/wpis/bal-u-pingwinkow">', $html);
        self::assertStringContainsString('<meta property="og:image" content="https://przedszkolemokrzyska.pl/logo.jpg">', $html);
        self::assertStringContainsString('<link rel="canonical" href="https://przedszkolemokrzyska.pl/wpis/bal-u-pingwinkow">', $html);
        self::assertStringNotContainsString('noindex', $html);
        self::assertStringContainsString('<app-root></app-root>', $html);
    }

    public function testPostDescriptionFallsBackToShortenedBodyText(): void
    {
        $this->post('Długi', ['body' => '<p>' . str_repeat('słowo ', 40) . '</p><p>&nbsp;koniec</p>']);

        $html = (string) $this->request('GET', '/wpis/dlugi')->getBody();
        self::assertMatchesRegularExpression('/<meta name="description" content="(słowo ){26}s…">/u', $html);
    }

    public function testMissingOrDraftPostIs404AndNoindex(): void
    {
        $this->post('Szkic', ['status' => 'draft']);

        foreach (['/wpis/szkic', '/wpis/nie-ma'] as $path) {
            $res = $this->request('GET', $path);
            self::assertSame(404, $res->getStatusCode(), $path);
            $html = (string) $res->getBody();
            self::assertStringContainsString('<meta name="robots" content="noindex">', $html);
            self::assertStringContainsString('<app-root></app-root>', $html, 'aplikacja i tak startuje i pokazuje komunikat');
        }
    }

    public function testGroupPageUsesOwnOrDefaultDescription(): void
    {
        $this->group('Pingwinki');
        $this->group('Ananaski', 'Grupa 3-latków');

        $html = (string) $this->request('GET', '/grupy/pingwinki')->getBody();
        self::assertStringContainsString('<title>Pingwinki – Przedszkole Parafialne w Mokrzyskach</title>', $html);
        self::assertStringContainsString(
            '<meta name="description" content="Grupa Pingwinki w Przedszkolu Parafialnym w Mokrzyskach – wpisy i zdjęcia z życia grupy.">',
            $html
        );
        self::assertStringContainsString('<meta name="description" content="Grupa 3-latków">', (string) $this->request('GET', '/grupy/ananaski')->getBody());
        self::assertSame(404, $this->request('GET', '/grupy/nie-ma')->getStatusCode());
    }
}
