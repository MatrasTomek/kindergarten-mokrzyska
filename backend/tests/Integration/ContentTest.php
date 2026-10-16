<?php
declare(strict_types=1);

namespace Tests\Integration;

use Tests\ApiTestCase;
use Tests\Fixtures;

final class ContentTest extends ApiTestCase
{
    /** @return array<string,mixed> */
    private function input(array $o = []): array
    {
        return $o + ['page' => 'dokumenty', 'title' => 'Statut', 'body' => '<p>Opis</p>', 'attachments' => [], 'images' => [], 'order' => 1, 'status' => 'published'];
    }

    public function testAdminCreatesItemWithPdf(): void
    {
        $t = $this->token();
        $pdf = $this->json($this->request('POST', '/api/admin/uploads/pdf', [], $t, files: ['file' => Fixtures::uploaded(Fixtures::pdf(), 'Statut.pdf')]));

        $res = $this->request('POST', '/api/admin/content', $this->input(['attachments' => [$pdf]]), $t);
        self::assertSame(201, $res->getStatusCode());
        $item = $this->json($res);
        self::assertSame([$pdf], $item['attachments']);
        self::assertSame('dokumenty', $item['page']);
        self::assertSame('2026-10-15T12:00:00+02:00', $item['updatedAt']);
    }

    public function testPublicListPublishedSortedByOrder(): void
    {
        $t = $this->token();
        $this->request('POST', '/api/admin/content', $this->input(['title' => 'Drugi', 'order' => 2]), $t);
        $this->request('POST', '/api/admin/content', $this->input(['title' => 'Pierwszy', 'order' => 1]), $t);
        $this->request('POST', '/api/admin/content', $this->input(['title' => 'Szkic', 'order' => 0, 'status' => 'draft']), $t);
        $this->request('POST', '/api/admin/content', $this->input(['title' => 'Inna strona', 'page' => 'rodo']), $t);

        self::assertSame(['Pierwszy', 'Drugi'], array_column($this->json($this->request('GET', '/api/content/dokumenty')), 'title'));
        self::assertSame(['Szkic', 'Pierwszy', 'Drugi'], array_column($this->json($this->request('GET', '/api/admin/content?page=dokumenty', token: $t)), 'title'));
    }

    public function testUnknownPage(): void
    {
        self::assertSame(404, $this->request('GET', '/api/content/nie-ma')->getStatusCode());
        self::assertSame(400, $this->request('POST', '/api/admin/content', $this->input(['page' => 'nie-ma']), $this->token())->getStatusCode());
    }

    public function testInvalidAttachmentPathRejected(): void
    {
        $bad = ['file' => 'docs/../../.env', 'name' => 'x.pdf', 'size' => 1];
        self::assertSame(400, $this->request('POST', '/api/admin/content', $this->input(['attachments' => [$bad]]), $this->token())->getStatusCode());
    }

    public function testUserForbidden(): void
    {
        self::assertSame(403, $this->request('POST', '/api/admin/content', $this->input(), $this->token('user'))->getStatusCode());
        self::assertSame(403, $this->request('GET', '/api/admin/content?page=rodo', token: $this->token('user'))->getStatusCode());
    }

    public function testUpdateAndDeleteRemoveFiles(): void
    {
        $t = $this->token();
        $pdf = $this->json($this->request('POST', '/api/admin/uploads/pdf', [], $t, files: ['file' => Fixtures::uploaded(Fixtures::pdf(), 'a.pdf')]));
        $pdf2 = $this->json($this->request('POST', '/api/admin/uploads/pdf', [], $t, files: ['file' => Fixtures::uploaded(Fixtures::pdf(), 'b.pdf')]));
        $item = $this->json($this->request('POST', '/api/admin/content', $this->input(['attachments' => [$pdf, $pdf2]]), $t));

        $this->request('PUT', "/api/admin/content/{$item['id']}", $this->input(['attachments' => [$pdf2]]), $t);
        self::assertFileDoesNotExist($this->uploadDir . '/' . $pdf['file']);

        self::assertSame(204, $this->request('DELETE', "/api/admin/content/{$item['id']}", token: $t)->getStatusCode());
        self::assertFileDoesNotExist($this->uploadDir . '/' . $pdf2['file']);
    }

    /** @return array{file:string,thumb:string,w:int,h:int,alt:string} */
    private function contentImage(string $token, string $context = 'content'): array
    {
        $res = $this->request('POST', '/api/admin/uploads/image', ['context' => $context], $token, files: [
            'image' => Fixtures::uploaded(Fixtures::webp(), 'a.webp'),
            'thumb' => Fixtures::uploaded(Fixtures::webp(10, 8), 't.webp'),
        ]);
        return $this->json($res) + ['alt' => 'Opis'];
    }

    public function testTraversalOnUpdateRejectedAndFilesUntouched(): void
    {
        $t = $this->token();
        $img = $this->contentImage($t);
        $item = $this->json($this->request('POST', '/api/admin/content', $this->input(['images' => [$img]]), $t));

        $bad = ['file' => 'content/../../.env', 'thumb' => 'content/../../.env', 'w' => 1, 'h' => 1, 'alt' => ''];
        $res = $this->request('PUT', "/api/admin/content/{$item['id']}", $this->input(['images' => [$bad]]), $t);
        self::assertSame(400, $res->getStatusCode());
        self::assertFileExists($this->uploadDir . '/' . $img['file']);
        self::assertFileExists($this->uploadDir . '/' . $img['thumb']);
        self::assertSame([$img], $this->json($this->request('GET', "/api/admin/content/{$item['id']}", token: $t))['images']);
    }

    public function testPostsContextImageRejected(): void
    {
        $t = $this->token();
        $img = $this->contentImage($t, 'posts');
        self::assertSame(400, $this->request('POST', '/api/admin/content', $this->input(['images' => [$img]]), $t)->getStatusCode());
    }

    public function testThumbMustMatchFile(): void
    {
        $t = $this->token();
        $a = $this->contentImage($t);
        $b = $this->contentImage($t);
        $mixed = ['thumb' => $b['thumb']] + $a;
        self::assertSame(400, $this->request('POST', '/api/admin/content', $this->input(['images' => [$mixed]]), $t)->getStatusCode());
    }

    public function testFileReferencedByOtherContentItemRejected(): void
    {
        $t = $this->token();
        $img = $this->contentImage($t);
        $pdf = $this->json($this->request('POST', '/api/admin/uploads/pdf', [], $t, files: ['file' => Fixtures::uploaded(Fixtures::pdf(), 'a.pdf')]));
        $first = $this->json($this->request('POST', '/api/admin/content', $this->input(['images' => [$img], 'attachments' => [$pdf]]), $t));

        self::assertSame(400, $this->request('POST', '/api/admin/content', $this->input(['images' => [$img]]), $t)->getStatusCode());
        self::assertSame(400, $this->request('POST', '/api/admin/content', $this->input(['attachments' => [$pdf]]), $t)->getStatusCode());

        $second = $this->json($this->request('POST', '/api/admin/content', $this->input(['title' => 'Inny']), $t));
        self::assertSame(400, $this->request('PUT', "/api/admin/content/{$second['id']}", $this->input(['images' => [$img]]), $t)->getStatusCode());

        // własny element może zachować swoje pliki
        self::assertSame(200, $this->request('PUT', "/api/admin/content/{$first['id']}", $this->input(['images' => [$img], 'attachments' => [$pdf]]), $t)->getStatusCode());
        self::assertFileExists($this->uploadDir . '/' . $img['file']);
        self::assertFileExists($this->uploadDir . '/' . $pdf['file']);
    }

    public function testFileReferencedByPostRejected(): void
    {
        $t = $this->token();
        $img = $this->contentImage($t);
        $post = ['title' => 'Wpis', 'excerpt' => '', 'body' => '<p>x</p>', 'images' => [$img], 'targets' => ['news' => true, 'groupIds' => []], 'status' => 'published'];
        // obraz z kontekstu content nie przejdzie walidacji wpisu, więc wstawiamy go bezpośrednio do bazy
        $this->db->collection('posts')->insertOne($post + ['slug' => 'wpis', 'createdAt' => \App\Support\Dates::now($this->clock), 'updatedAt' => \App\Support\Dates::now($this->clock)]);

        self::assertSame(400, $this->request('POST', '/api/admin/content', $this->input(['images' => [$img]]), $t)->getStatusCode());
    }

    public function testMissingImageIsRejectedAndNothingWritten(): void
    {
        $t = $this->token();
        $img = $this->contentImage($t);
        unlink($this->uploadDir . '/' . $img['file']);
        $res = $this->request('POST', '/api/admin/content', $this->input(['images' => [$img]]), $t);
        self::assertSame(400, $res->getStatusCode());
        self::assertSame(0, $this->db->collection('content_items')->countDocuments());
    }

    public function testMissingPdfIsRejected(): void
    {
        $t = $this->token();
        $pdf = $this->json($this->request('POST', '/api/admin/uploads/pdf', [], $t, files: ['file' => Fixtures::uploaded(Fixtures::pdf(), 'a.pdf')]));
        unlink($this->uploadDir . '/' . $pdf['file']);
        $res = $this->request('POST', '/api/admin/content', $this->input(['attachments' => [$pdf]]), $t);
        self::assertSame(400, $res->getStatusCode());
        self::assertStringContainsString('Plik wygasł', (string) $res->getBody());
        self::assertSame(0, $this->db->collection('content_items')->countDocuments());
    }
}
