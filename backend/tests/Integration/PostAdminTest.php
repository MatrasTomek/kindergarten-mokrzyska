<?php
declare(strict_types=1);

namespace Tests\Integration;

use Tests\ApiTestCase;
use Tests\Fixtures;

final class PostAdminTest extends ApiTestCase
{
    /** @return array{file:string,thumb:string,w:int,h:int,alt:string} */
    private function uploadedImage(string $token): array
    {
        $res = $this->request('POST', '/api/admin/uploads/image', ['context' => 'posts'], $token, files: [
            'image' => Fixtures::uploaded(Fixtures::webp(), 'a.webp'),
            'thumb' => Fixtures::uploaded(Fixtures::webp(10, 8), 't.webp'),
        ]);
        return $this->json($res) + ['alt' => 'Dzieci w ogrodzie'];
    }

    /** @return array<string,mixed> */
    private function input(array $overrides = []): array
    {
        return $overrides + [
            'title' => 'Bal przebierańców',
            'excerpt' => 'Krótko o balu',
            'body' => '<p>Treść</p><script>alert(1)</script>',
            'images' => [],
            'targets' => ['news' => true, 'groupIds' => []],
            'status' => 'published',
        ];
    }

    public function testUserCreatesPost(): void
    {
        $userId = $this->createUser('user');
        $token = $this->tokenFor($userId, 'user');
        $img = $this->uploadedImage($token);

        $res = $this->request('POST', '/api/admin/posts', $this->input(['images' => [$img]]), $token);

        self::assertSame(201, $res->getStatusCode());
        $p = $this->json($res);
        self::assertSame('bal-przebierancow', $p['slug']);
        self::assertSame('<p>Treść</p>', $p['body']);
        self::assertSame($userId, $p['createdBy']);
        self::assertSame($userId, $p['updatedBy']);
        self::assertSame('2026-10-15T12:00:00+02:00', $p['publishedAt']);
        self::assertSame([$img], $p['images']);
        self::assertSame(['news' => true, 'groupIds' => []], $p['targets']);
    }

    public function testDuplicateTitleGetsUniqueSlugAndSlugIsStableOnEdit(): void
    {
        $t = $this->token();
        $first = $this->json($this->request('POST', '/api/admin/posts', $this->input(), $t));
        $second = $this->json($this->request('POST', '/api/admin/posts', $this->input(), $t));
        self::assertSame('bal-przebierancow-2', $second['slug']);

        $edited = $this->json($this->request('PUT', "/api/admin/posts/{$first['id']}", $this->input(['title' => 'Nowy tytuł']), $t));
        self::assertSame('bal-przebierancow', $edited['slug']);
        self::assertSame('Nowy tytuł', $edited['title']);
    }

    public function testDraftHasNoPublishedAtUntilPublished(): void
    {
        $userId = $this->createUser('admin');
        $t = $this->tokenFor($userId, 'admin');
        $draft = $this->json($this->request('POST', '/api/admin/posts', $this->input(['status' => 'draft']), $t));
        self::assertNull($draft['publishedAt']);

        $this->clock->advance('+1 day');
        $t = $this->tokenFor($userId, 'admin'); // access token trwa 60 min
        $pub = $this->json($this->request('PUT', "/api/admin/posts/{$draft['id']}", $this->input(), $t));
        self::assertSame('2026-10-16T12:00:00+02:00', $pub['publishedAt']);

        $this->clock->advance('+1 day');
        $t = $this->tokenFor($userId, 'admin');
        $again = $this->json($this->request('PUT', "/api/admin/posts/{$draft['id']}", $this->input(['title' => 'X']), $t));
        self::assertSame('2026-10-16T12:00:00+02:00', $again['publishedAt']);
    }

    public function testUserCanEditAdminsPostButNotDelete(): void
    {
        $post = $this->json($this->request('POST', '/api/admin/posts', $this->input(), $this->token('admin')));
        $userId = $this->createUser('user');
        $userToken = $this->tokenFor($userId, 'user');

        $edited = $this->request('PUT', "/api/admin/posts/{$post['id']}", $this->input(['title' => 'Poprawka']), $userToken);
        self::assertSame(200, $edited->getStatusCode());
        self::assertSame($userId, $this->json($edited)['updatedBy']);

        self::assertSame(403, $this->request('DELETE', "/api/admin/posts/{$post['id']}", token: $userToken)->getStatusCode());
    }

    public function testAdminDeleteRemovesPostAndFiles(): void
    {
        $t = $this->token();
        $img = $this->uploadedImage($t);
        $post = $this->json($this->request('POST', '/api/admin/posts', $this->input(['images' => [$img]]), $t));

        self::assertSame(204, $this->request('DELETE', "/api/admin/posts/{$post['id']}", token: $t)->getStatusCode());
        self::assertFileDoesNotExist($this->uploadDir . '/' . $img['file']);
        self::assertFileDoesNotExist($this->uploadDir . '/' . $img['thumb']);
        self::assertSame(404, $this->request('GET', "/api/admin/posts/{$post['id']}", token: $t)->getStatusCode());
    }

    public function testRemovingImageOnUpdateDeletesItsFiles(): void
    {
        $t = $this->token();
        $a = $this->uploadedImage($t);
        $b = $this->uploadedImage($t);
        $post = $this->json($this->request('POST', '/api/admin/posts', $this->input(['images' => [$a, $b]]), $t));

        $this->request('PUT', "/api/admin/posts/{$post['id']}", $this->input(['images' => [$b]]), $t);

        self::assertFileDoesNotExist($this->uploadDir . '/' . $a['file']);
        self::assertFileExists($this->uploadDir . '/' . $b['file']);
    }

    public function testRejectsMoreThan30Images(): void
    {
        $img = ['file' => 'posts/2026/10/123e4567-e89b-42d3-a456-426614174000.webp', 'thumb' => 'posts/2026/10/123e4567-e89b-42d3-a456-426614174000_thumb.webp', 'w' => 1, 'h' => 1, 'alt' => ''];
        $res = $this->request('POST', '/api/admin/posts', $this->input(['images' => array_fill(0, 31, $img)]), $this->token());
        self::assertSame(400, $res->getStatusCode());
    }

    public function testRejectsForeignOrTraversalPathsAndDeletesNothing(): void
    {
        $t = $this->token();
        $img = $this->uploadedImage($t);
        $post = $this->json($this->request('POST', '/api/admin/posts', $this->input(['images' => [$img]]), $t));

        // wabik dokładnie tam, gdzie rozwiązałaby się ścieżka z traversalem
        $decoy = $this->uploadDir . '/.env';
        $parentDecoy = dirname($this->uploadDir) . '/.env-b10-decoy';
        file_put_contents($decoy, 'SECRET=1');
        file_put_contents($parentDecoy, 'SECRET=2');
        try {
            $uuid = '123e4567-e89b-42d3-a456-426614174000';
            $bads = [
                ['file' => 'posts/../.env', 'thumb' => 'posts/../.env'],
                ['file' => '../' . basename($parentDecoy), 'thumb' => '../' . basename($parentDecoy)],
                ['file' => "content/2026/10/$uuid.webp", 'thumb' => "content/2026/10/{$uuid}_thumb.webp"],
            ];
            foreach ($bads as $bad) {
                $res = $this->request('PUT', "/api/admin/posts/{$post['id']}", $this->input(['images' => [$bad + ['w' => 1, 'h' => 1, 'alt' => '']]]), $t);
                self::assertSame(400, $res->getStatusCode());
            }
            self::assertFileExists($this->uploadDir . '/' . $img['file']);
            self::assertFileExists($this->uploadDir . '/' . $img['thumb']);
            self::assertFileExists($decoy);
            self::assertFileExists($parentDecoy);
            $after = $this->json($this->request('GET', "/api/admin/posts/{$post['id']}", token: $t));
            self::assertSame([$img], $after['images']);
        } finally {
            @unlink($parentDecoy);
        }
    }

    public function testRejectsImageReferencedByAnotherPost(): void
    {
        $t = $this->token();
        $img = $this->uploadedImage($t);
        $this->request('POST', '/api/admin/posts', $this->input(['images' => [$img]]), $t);
        $other = $this->json($this->request('POST', '/api/admin/posts', $this->input(['title' => 'Inny']), $t));

        $res = $this->request('PUT', "/api/admin/posts/{$other['id']}", $this->input(['title' => 'Inny', 'images' => [$img]]), $t);
        self::assertSame(400, $res->getStatusCode());
        self::assertSame(400, $this->request('POST', '/api/admin/posts', $this->input(['title' => 'Trzeci', 'images' => [$img]]), $t)->getStatusCode());
        self::assertFileExists($this->uploadDir . '/' . $img['file']);
        self::assertFileExists($this->uploadDir . '/' . $img['thumb']);
    }

    public function testRejectsThumbNotPairedWithFile(): void
    {
        $t = $this->token();
        $a = $this->uploadedImage($t);
        $b = $this->uploadedImage($t);
        $res = $this->request('POST', '/api/admin/posts', $this->input(['images' => [['thumb' => $b['thumb']] + $a]]), $t);
        self::assertSame(400, $res->getStatusCode());
        $res = $this->request('POST', '/api/admin/posts', $this->input(['images' => [['thumb' => $a['file']] + $a]]), $t);
        self::assertSame(400, $res->getStatusCode());
    }

    public function testRejectsUnknownGroup(): void
    {
        $res = $this->request('POST', '/api/admin/posts', $this->input(['targets' => ['news' => false, 'groupIds' => ['0123456789abcdef01234567']]]), $this->token());
        self::assertSame(400, $res->getStatusCode());
        $res = $this->request('POST', '/api/admin/posts', $this->input(['targets' => ['news' => false, 'groupIds' => ['zle']]]), $this->token());
        self::assertSame(400, $res->getStatusCode());
    }

    public function testAcceptsExistingGroup(): void
    {
        $t = $this->token();
        $gid = $this->json($this->request('POST', '/api/admin/groups', ['name' => 'Pingwinki'], $t))['id'];
        $p = $this->json($this->request('POST', '/api/admin/posts', $this->input(['targets' => ['news' => false, 'groupIds' => [$gid, $gid]]]), $t));
        self::assertSame([$gid], $p['targets']['groupIds']);
    }

    public function testAdminListIncludesDraftsPaginated(): void
    {
        $t = $this->token('user');
        for ($i = 1; $i <= 21; $i++) {
            $this->clock->advance('+1 minute');
            $this->request('POST', '/api/admin/posts', $this->input(['title' => "Wpis $i", 'status' => $i % 2 ? 'draft' : 'published']), $t);
        }
        $page1 = $this->json($this->request('GET', '/api/admin/posts', token: $t));
        self::assertSame([1, 2, 21], [$page1['page'], $page1['pages'], $page1['total']]);
        self::assertCount(20, $page1['items']);
        self::assertSame('Wpis 21', $page1['items'][0]['title']);
        self::assertCount(1, $this->json($this->request('GET', '/api/admin/posts?page=2', token: $t))['items']);
    }

    public function testSavingImageDeletedByCleanupIsRejected(): void
    {
        $t = $this->token();
        $img = $this->uploadedImage($t);
        unlink($this->uploadDir . '/' . $img['file']);
        $res = $this->request('POST', '/api/admin/posts', $this->input(['images' => [$img]]), $t);
        self::assertSame(400, $res->getStatusCode());
        self::assertSame('Zdjęcie wygasło — dodaj je ponownie.', $this->json($res)['error']['message']);
        self::assertSame(0, $this->db->collection('posts')->countDocuments());
    }

    public function testMissingThumbOnUpdateIsRejectedAndNothingWritten(): void
    {
        $t = $this->token();
        $img = $this->uploadedImage($t);
        $post = $this->json($this->request('POST', '/api/admin/posts', $this->input(['images' => [$img]]), $t));
        $new = $this->uploadedImage($t);
        unlink($this->uploadDir . '/' . $new['thumb']);
        $res = $this->request('PUT', "/api/admin/posts/{$post['id']}", $this->input(['title' => 'Zmiana', 'images' => [$img, $new]]), $t);
        self::assertSame(400, $res->getStatusCode());
        self::assertSame('Bal przebierańców', $this->json($this->request('GET', "/api/admin/posts/{$post['id']}", token: $t))['title']);
        self::assertFileExists($this->uploadDir . '/' . $img['file']);
    }
}
