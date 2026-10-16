<?php
declare(strict_types=1);

namespace Tests\Integration;

use Tests\ApiTestCase;

final class PostPublicTest extends ApiTestCase
{
    private string $token;

    protected function setUp(): void
    {
        parent::setUp();
        $this->token = $this->token('admin');
    }

    /** @param list<string> $groupIds */
    private function post(string $title, bool $news = false, array $groupIds = [], string $status = 'published'): array
    {
        $this->clock->advance('+1 minute');
        return $this->json($this->request('POST', '/api/admin/posts', [
            'title' => $title, 'excerpt' => '', 'body' => '', 'images' => [],
            'targets' => ['news' => $news, 'groupIds' => $groupIds], 'status' => $status,
        ], $this->token));
    }

    public function testListShowsOnlyPublishedNewestFirstWithoutAdminFields(): void
    {
        $this->post('Stary');
        $this->post('Szkic', status: 'draft');
        $this->post('Nowy');

        $res = $this->json($this->request('GET', '/api/posts'));
        self::assertSame(['Nowy', 'Stary'], array_column($res['items'], 'title'));
        self::assertSame(2, $res['total']);
        self::assertArrayNotHasKey('createdBy', $res['items'][0]);
    }

    public function testNewsFilter(): void
    {
        $this->post('Zwykły');
        $this->post('Aktualność', news: true);
        self::assertSame(['Aktualność'], array_column($this->json($this->request('GET', '/api/posts?news=1'))['items'], 'title'));
    }

    public function testGroupFilter(): void
    {
        $g = $this->json($this->request('POST', '/api/admin/groups', ['name' => 'Tygryski'], $this->token));
        $this->post('Inny');
        $this->post('Tygryski w lesie', groupIds: [$g['id']]);

        self::assertSame(['Tygryski w lesie'], array_column($this->json($this->request('GET', '/api/posts?group=tygryski'))['items'], 'title'));
        self::assertSame(404, $this->request('GET', '/api/posts?group=nie-ma')->getStatusCode());
    }

    public function testPagination12PerPage(): void
    {
        for ($i = 1; $i <= 13; $i++) {
            $this->post("W$i");
        }
        $p1 = $this->json($this->request('GET', '/api/posts'));
        self::assertCount(12, $p1['items']);
        self::assertSame(2, $p1['pages']);
        self::assertSame(['W1'], array_column($this->json($this->request('GET', '/api/posts?page=2'))['items'], 'title'));
        self::assertSame([], $this->json($this->request('GET', '/api/posts?page=99'))['items']);
    }

    public function testDetailBySlugHidesDrafts(): void
    {
        $this->post('Widoczny');
        $this->post('Ukryty', status: 'draft');
        self::assertSame('Widoczny', $this->json($this->request('GET', '/api/posts/widoczny'))['title']);
        self::assertSame(404, $this->request('GET', '/api/posts/ukryty')->getStatusCode());
    }

    public function testPostsStayListedAfterTheirGroupIsDeleted(): void
    {
        $g = $this->json($this->request('POST', '/api/admin/groups', ['name' => 'Kangurki'], $this->token));
        $this->post('Kangurki na wycieczce', news: true, groupIds: [$g['id']]);
        $this->request('DELETE', "/api/admin/groups/{$g['id']}", token: $this->token);

        $res = $this->json($this->request('GET', '/api/posts?news=1'));
        self::assertSame(['Kangurki na wycieczce'], array_column($res['items'], 'title'));
        self::assertSame([], $res['items'][0]['targets']['groupIds']);
    }
}
