<?php
declare(strict_types=1);

namespace Tests\Integration;

use Tests\ApiTestCase;
use Tests\Fixtures;

final class UploadTest extends ApiTestCase
{
    private function uploadImage(string $token, string $image, string $thumb, string $context = 'posts', ?int $imageSize = null, int $error = UPLOAD_ERR_OK): \Psr\Http\Message\ResponseInterface
    {
        return $this->request('POST', '/api/admin/uploads/image', ['context' => $context], $token, files: [
            'image' => Fixtures::uploaded($image, 'a.webp', $imageSize, $error),
            'thumb' => Fixtures::uploaded($thumb, 'a_thumb.webp'),
        ]);
    }

    public function testUserUploadsWebpImage(): void
    {
        $res = $this->uploadImage($this->token('user'), Fixtures::webp(40, 30), Fixtures::webp(10, 8));

        self::assertSame(201, $res->getStatusCode());
        $body = $this->json($res);
        self::assertMatchesRegularExpression('#^posts/2026/10/[0-9a-f-]{36}\.webp$#', $body['file']);
        self::assertMatchesRegularExpression('#^posts/2026/10/[0-9a-f-]{36}_thumb\.webp$#', $body['thumb']);
        self::assertSame([40, 30], [$body['w'], $body['h']]);
        self::assertFileExists($this->uploadDir . '/' . $body['file']);
        self::assertFileExists($this->uploadDir . '/' . $body['thumb']);
    }

    public function testJpegFallbackAccepted(): void
    {
        $res = $this->uploadImage($this->token('admin'), Fixtures::jpeg(), Fixtures::jpeg(10, 8), 'content');
        self::assertSame(201, $res->getStatusCode());
        self::assertMatchesRegularExpression('#^content/2026/10/[0-9a-f-]{36}\.jpg$#', $this->json($res)['file']);
    }

    public function testPngAndFakeExtensionRejected(): void
    {
        self::assertSame(400, $this->uploadImage($this->token(), Fixtures::png(), Fixtures::webp())->getStatusCode());
        $fake = Fixtures::fake();
        self::assertSame(400, $this->uploadImage($this->token(), $fake, Fixtures::webp())->getStatusCode());
    }

    public function testInvalidContextRejected(): void
    {
        self::assertSame(400, $this->uploadImage($this->token(), Fixtures::webp(), Fixtures::webp(), '../etc')->getStatusCode());
    }

    public function testTooLargeImageReturns413(): void
    {
        $res = $this->uploadImage($this->token(), Fixtures::webp(), Fixtures::webp(), imageSize: 3 * 1024 * 1024);
        self::assertSame(413, $res->getStatusCode());
        self::assertSame('FILE_TOO_LARGE', $this->json($res)['error']['code']);

        $res = $this->uploadImage($this->token(), Fixtures::webp(), Fixtures::webp(), error: UPLOAD_ERR_INI_SIZE);
        self::assertSame(413, $res->getStatusCode());
    }

    public function testMissingThumbRejected(): void
    {
        $res = $this->request('POST', '/api/admin/uploads/image', ['context' => 'posts'], $this->token(), files: [
            'image' => Fixtures::uploaded(Fixtures::webp(), 'a.webp'),
        ]);
        self::assertSame(400, $res->getStatusCode());
    }

    public function testAdminUploadsPdf(): void
    {
        $res = $this->request('POST', '/api/admin/uploads/pdf', [], $this->token('admin'), files: [
            'file' => Fixtures::uploaded(Fixtures::pdf(), 'Statut przedszkola.pdf'),
        ]);
        self::assertSame(201, $res->getStatusCode());
        $body = $this->json($res);
        self::assertMatchesRegularExpression('#^docs/[0-9a-f-]{36}\.pdf$#', $body['file']);
        self::assertSame('Statut przedszkola.pdf', $body['name']);
        self::assertGreaterThan(0, $body['size']);
    }

    public function testUserCannotUploadPdf(): void
    {
        $res = $this->request('POST', '/api/admin/uploads/pdf', [], $this->token('user'), files: [
            'file' => Fixtures::uploaded(Fixtures::pdf(), 'a.pdf'),
        ]);
        self::assertSame(403, $res->getStatusCode());
    }

    public function testUploadRequiresLogin(): void
    {
        self::assertSame(401, $this->request('POST', '/api/admin/uploads/image', ['context' => 'posts'])->getStatusCode());
    }

    public function testPathValidators(): void
    {
        $svc = new \App\Upload\UploadService($this->config, $this->clock);
        self::assertTrue($svc->isImagePath('posts/2026/10/123e4567-e89b-42d3-a456-426614174000_thumb.webp', 'posts'));
        self::assertFalse($svc->isImagePath('posts/2026/10/../../.env', 'posts'));
        self::assertFalse($svc->isImagePath('content/2026/10/123e4567-e89b-42d3-a456-426614174000.webp', 'posts'));
        self::assertTrue($svc->isPdfPath('docs/123e4567-e89b-42d3-a456-426614174000.pdf'));
        self::assertFalse($svc->isPdfPath('docs/../index.php'));
    }

    private function uploadDirIsEmpty(): bool
    {
        $it = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($this->uploadDir, \FilesystemIterator::SKIP_DOTS));
        foreach ($it as $f) {
            if ($f->isFile()) {
                return false;
            }
        }
        return true;
    }

    public function testUndecodableImageRejectedAndCleaned(): void
    {
        $broken = Fixtures::fake("RIFF\x04\x00\x00\x00WEBPVP8 ");
        $res = $this->uploadImage($this->token(), $broken, Fixtures::webp(10, 8));
        self::assertSame(400, $res->getStatusCode());
        self::assertTrue($this->uploadDirIsEmpty());

        $res = $this->uploadImage($this->token(), Fixtures::webp(), Fixtures::fake("RIFF\x04\x00\x00\x00WEBPVP8 "));
        self::assertSame(400, $res->getStatusCode());
        self::assertTrue($this->uploadDirIsEmpty());
    }

    public function testTrailingNewlinePathsRejected(): void
    {
        $svc = new \App\Upload\UploadService($this->config, $this->clock);
        $uuid = '123e4567-e89b-42d3-a456-426614174000';
        self::assertFalse($svc->isPdfPath("docs/$uuid.pdf\n"));
        self::assertFalse($svc->isImagePath("posts/2026/10/$uuid.webp\n", 'posts'));
    }

    public function testDeleteRemovesOnlyValidPaths(): void
    {
        $svc = new \App\Upload\UploadService($this->config, $this->clock);
        $uuid = '123e4567-e89b-42d3-a456-426614174000';
        mkdir($this->uploadDir . '/docs');
        file_put_contents($this->uploadDir . "/docs/$uuid.pdf", 'x');
        file_put_contents($this->uploadDir . '/keep.txt', 'x');
        file_put_contents($this->uploadDir . '/docs/other.pdf', 'x');

        $svc->delete('keep.txt');
        $svc->delete('docs/../keep.txt');
        $svc->delete('../' . basename($this->uploadDir) . '/keep.txt');
        $svc->delete('docs/other.pdf');
        self::assertFileExists($this->uploadDir . '/keep.txt');
        self::assertFileExists($this->uploadDir . '/docs/other.pdf');
        self::assertFileExists($this->uploadDir . "/docs/$uuid.pdf");

        $svc->delete("docs/$uuid.pdf");
        self::assertFileDoesNotExist($this->uploadDir . "/docs/$uuid.pdf");
        self::assertFileExists($this->uploadDir . '/keep.txt');
    }
}
