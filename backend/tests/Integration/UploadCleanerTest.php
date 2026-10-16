<?php
declare(strict_types=1);

namespace Tests\Integration;

use App\Upload\UploadCleaner;
use Tests\ApiTestCase;

final class UploadCleanerTest extends ApiTestCase
{
    private function file(string $rel, int $ageSeconds): void
    {
        $abs = $this->uploadDir . '/' . $rel;
        @mkdir(dirname($abs), 0777, true);
        file_put_contents($abs, 'x');
        touch($abs, $this->clock->now()->getTimestamp() - $ageSeconds);
    }

    private function seedDb(): void
    {
        $this->db->collection('posts')->insertOne(['slug' => 'seed', 'images' => []]);
    }

    private function cleaner(): UploadCleaner
    {
        return new UploadCleaner($this->db, $this->config, $this->clock);
    }

    public function testDeletesOnlyOldUnreferencedFiles(): void
    {
        $this->file('posts/2026/10/00000000-0000-4000-8000-000000000001.webp', 2 * 86400);
        $this->file('posts/2026/10/00000000-0000-4000-8000-000000000002.webp', 2 * 86400);
        $this->file('posts/2026/10/00000000-0000-4000-8000-000000000002_thumb.webp', 2 * 86400);
        $this->file('posts/2026/10/00000000-0000-4000-8000-000000000003.webp', 3600);
        $this->file('docs/00000000-0000-4000-8000-000000000002.pdf', 2 * 86400);
        $this->file('content/2026/10/00000000-0000-4000-8000-000000000002.webp', 2 * 86400);
        $this->file('.htaccess', 10 * 86400);

        $this->db->collection('posts')->insertOne(['images' => [['file' => 'posts/2026/10/00000000-0000-4000-8000-000000000002.webp', 'thumb' => 'posts/2026/10/00000000-0000-4000-8000-000000000002_thumb.webp']]]);
        $this->db->collection('content_items')->insertOne([
            'attachments' => [['file' => 'docs/00000000-0000-4000-8000-000000000002.pdf']],
            'images' => [['file' => 'content/2026/10/00000000-0000-4000-8000-000000000002.webp', 'thumb' => 'content/2026/10/00000000-0000-4000-8000-000000000013_thumb.webp']],
        ]);

        $cleaner = $this->cleaner();
        self::assertSame(['posts/2026/10/00000000-0000-4000-8000-000000000001.webp'], $cleaner->run(true));
        self::assertFileExists($this->uploadDir . '/posts/2026/10/00000000-0000-4000-8000-000000000001.webp');

        self::assertSame(['posts/2026/10/00000000-0000-4000-8000-000000000001.webp'], $cleaner->run());
        self::assertFileDoesNotExist($this->uploadDir . '/posts/2026/10/00000000-0000-4000-8000-000000000001.webp');
        foreach (['posts/2026/10/00000000-0000-4000-8000-000000000002.webp', 'posts/2026/10/00000000-0000-4000-8000-000000000002_thumb.webp', 'posts/2026/10/00000000-0000-4000-8000-000000000003.webp', 'docs/00000000-0000-4000-8000-000000000002.pdf', 'content/2026/10/00000000-0000-4000-8000-000000000002.webp', '.htaccess'] as $kept) {
            self::assertFileExists($this->uploadDir . '/' . $kept);
        }
    }

    public function testEveryReferencingFieldProtectsItsFile(): void
    {
        $paths = [
            'posts/2026/10/00000000-0000-4000-8000-000000000004.webp', 'posts/2026/10/00000000-0000-4000-8000-000000000005.webp',
            'content/2026/10/00000000-0000-4000-8000-000000000014.jpg', 'content/2026/10/00000000-0000-4000-8000-000000000015.jpg',
            'docs/00000000-0000-4000-8000-000000000016.pdf', 'docs/00000000-0000-4000-8000-000000000009.pdf',
        ];
        foreach ($paths as $p) {
            $this->file($p, 5 * 86400);
        }
        $this->db->collection('posts')->insertOne(['images' => [['file' => 'posts/2026/10/00000000-0000-4000-8000-000000000004.webp', 'thumb' => 'posts/2026/10/00000000-0000-4000-8000-000000000005.webp']]]);
        $this->db->collection('content_items')->insertOne([
            'images' => [['file' => 'content/2026/10/00000000-0000-4000-8000-000000000014.jpg', 'thumb' => 'content/2026/10/00000000-0000-4000-8000-000000000015.jpg']],
            'attachments' => [['file' => 'docs/00000000-0000-4000-8000-000000000016.pdf', 'name' => 'a.pdf', 'size' => 1]],
        ]);

        self::assertSame(['docs/00000000-0000-4000-8000-000000000009.pdf'], $this->cleaner()->run());
        foreach (array_slice($paths, 0, 5) as $kept) {
            self::assertFileExists($this->uploadDir . '/' . $kept);
        }
    }

    public function testFileReferencedOnlyByThumbOrOnlyByFileIsKept(): void
    {
        $this->file('posts/2026/10/00000000-0000-4000-8000-000000000006.webp', 5 * 86400);
        $this->file('posts/2026/10/00000000-0000-4000-8000-000000000007_thumb.webp', 5 * 86400);
        $this->db->collection('posts')->insertOne(['images' => [
            ['file' => 'posts/2026/10/00000000-0000-4000-8000-000000000006.webp'],
            ['thumb' => 'posts/2026/10/00000000-0000-4000-8000-000000000007_thumb.webp'],
        ]]);
        self::assertSame([], $this->cleaner()->run());
    }

    public function testMalformedDocumentsDoNotCrashAndDoNotCauseDeletionOfReferencedFiles(): void
    {
        $this->file('posts/2026/10/00000000-0000-4000-8000-000000000008.webp', 5 * 86400);
        $this->file('posts/2026/10/00000000-0000-4000-8000-000000000009.webp', 5 * 86400);
        $this->db->collection('posts')->insertMany([
            ['slug' => 's1', 'title' => 'no images'],
            ['slug' => 's2', 'images' => null],
            ['slug' => 's3', 'images' => 'oops'],
            ['slug' => 's4', 'images' => [null, 5, ['file' => null, 'thumb' => 7], ['file' => 'posts/2026/10/00000000-0000-4000-8000-000000000008.webp', 'thumb' => null]]],
        ]);
        $this->db->collection('content_items')->insertOne(['images' => 'x', 'attachments' => [null, ['file' => 3]]]);
        self::assertSame(['posts/2026/10/00000000-0000-4000-8000-000000000009.webp'], $this->cleaner()->run());
        self::assertFileExists($this->uploadDir . '/posts/2026/10/00000000-0000-4000-8000-000000000008.webp');
    }

    public function testAgeBoundaryAndFutureMtime(): void
    {
        $this->seedDb();
        $this->file('posts/2026/10/00000000-0000-4000-8000-000000000010.webp', 86400);
        $this->file('posts/2026/10/00000000-0000-4000-8000-000000000011.webp', 86400 + 60);
        $this->file('posts/2026/10/00000000-0000-4000-8000-000000000012.webp', -3600);
        self::assertSame(['posts/2026/10/00000000-0000-4000-8000-000000000011.webp'], $this->cleaner()->run());
        self::assertFileExists($this->uploadDir . '/posts/2026/10/00000000-0000-4000-8000-000000000010.webp');
        self::assertFileExists($this->uploadDir . '/posts/2026/10/00000000-0000-4000-8000-000000000012.webp');
    }

    public function testNeverFollowsSymlinksOutOfUploadDir(): void
    {
        $this->seedDb();
        $outside = sys_get_temp_dir() . '/przedszkole-outside-' . bin2hex(random_bytes(4));
        mkdir($outside);
        file_put_contents($outside . '/secret.txt', 's');
        touch($outside . '/secret.txt', 1000);
        file_put_contents($outside . '/target.txt', 't');
        touch($outside . '/target.txt', 1000);
        symlink($outside, $this->uploadDir . '/linkdir');
        symlink($outside . '/target.txt', $this->uploadDir . '/link.txt');
        $this->file('posts/2026/10/00000000-0000-4000-8000-000000000090.webp', 5 * 86400);

        try {
            self::assertSame(['posts/2026/10/00000000-0000-4000-8000-000000000090.webp'], $this->cleaner()->run());
            self::assertFileExists($outside . '/secret.txt');
            self::assertFileExists($outside . '/target.txt');
            self::assertTrue(is_link($this->uploadDir . '/linkdir'));
            self::assertTrue(is_link($this->uploadDir . '/link.txt'));
        } finally {
            unlink($this->uploadDir . '/linkdir');
            unlink($this->uploadDir . '/link.txt');
            unlink($outside . '/secret.txt');
            unlink($outside . '/target.txt');
            rmdir($outside);
        }
    }

    public function testOnlyUploadPatternPathsAreEverTouched(): void
    {
        $this->seedDb();
        $keep = ['index.html', 'robots.txt', 'notes/foo.txt', '.hidden/00000000-0000-4000-8000-000000000050.webp',
            '.well-known/x', 'posts/2026/10/notes.txt', 'posts/2026/10/00000000-0000-4000-8000-000000000051.webp.php',
            'posts/00000000-0000-4000-8000-000000000052.webp', 'docs/foo.pdf', 'content/2026/10/00000000-0000-4000-8000-000000000053.pdf'];
        foreach ($keep as $k) {
            $this->file($k, 10 * 86400);
        }
        $orphan = 'content/2026/10/00000000-0000-4000-8000-000000000054_thumb.jpg';
        $this->file($orphan, 10 * 86400);
        self::assertSame([$orphan], $this->cleaner()->run());
        foreach ($keep as $k) {
            self::assertFileExists($this->uploadDir . '/' . $k);
        }
    }

    public function testEmptyDatabaseAbortsAndDeletesNothing(): void
    {
        $orphan = 'posts/2026/10/00000000-0000-4000-8000-000000000060.webp';
        $this->file($orphan, 5 * 86400);
        try {
            $this->cleaner()->run();
            self::fail('Oczekiwano wyjątku');
        } catch (\RuntimeException $e) {
            self::assertStringContainsString('--force', $e->getMessage());
        }
        self::assertFileExists($this->uploadDir . '/' . $orphan);
        self::assertSame([$orphan], $this->cleaner()->run(true, true));
        self::assertFileExists($this->uploadDir . '/' . $orphan);
        self::assertSame([$orphan], $this->cleaner()->run(false, true));
        self::assertFileDoesNotExist($this->uploadDir . '/' . $orphan);
    }

    public function testEmptyDatabaseWithNoCandidatesIsFine(): void
    {
        $this->file('posts/2026/10/00000000-0000-4000-8000-000000000061.webp', 60);
        self::assertSame([], $this->cleaner()->run());
    }

    public function testDatabaseFailureDeletesNothing(): void
    {
        $orphan = 'posts/2026/10/00000000-0000-4000-8000-000000000070.webp';
        $this->file($orphan, 5 * 86400);
        $bad = new \App\Config('test', 'mongodb://127.0.0.1:1/?serverSelectionTimeoutMS=300&connectTimeoutMS=300&serverSelectionTryOnce=true', 'x', $this->config->jwtSecret, $this->uploadDir);
        $start = microtime(true);
        try {
            (new UploadCleaner(\App\Database::connect($bad), $bad, $this->clock))->run(false, true);
            self::fail('Oczekiwano wyjątku');
        } catch (\MongoDB\Driver\Exception\Exception) {
        }
        self::assertLessThan(2.0, microtime(true) - $start);
        self::assertFileExists($this->uploadDir . '/' . $orphan);
    }

    public function testFailedUnlinkIsNotReportedAsRemoved(): void
    {
        $this->seedDb();
        $dir = 'posts/2026/10';
        $f = $dir . '/00000000-0000-4000-8000-000000000080.webp';
        $this->file($f, 5 * 86400);
        chmod($this->uploadDir . '/' . $dir, 0555);
        if (is_writable($this->uploadDir . '/' . $dir)) {
            chmod($this->uploadDir . '/' . $dir, 0777);
            self::markTestSkipped('Uruchomione jako root - nie da się zablokować usuwania.');
        }
        $cleaner = $this->cleaner();
        try {
            self::assertSame([], $cleaner->run());
            self::assertSame([$f], $cleaner->failed());
        } finally {
            chmod($this->uploadDir . '/' . $dir, 0777);
        }
    }

    public function testMissingUploadDirReturnsEmpty(): void
    {
        $config = new \App\Config('test', $this->config->mongoUri, $this->config->mongoDb, $this->config->jwtSecret, $this->uploadDir . '/nope');
        self::assertSame([], (new UploadCleaner($this->db, $config, $this->clock))->run());
    }

    public function testCliDryRunAndRealRun(): void
    {
        $this->file('posts/2026/10/00000000-0000-4000-8000-000000000009.webp', 5 * 86400);
        $this->file('posts/2026/10/00000000-0000-4000-8000-000000000008.webp', 5 * 86400);
        $this->db->collection('posts')->insertOne(['images' => [['file' => 'posts/2026/10/00000000-0000-4000-8000-000000000008.webp', 'thumb' => 'posts/2026/10/00000000-0000-4000-8000-000000000008_thumb.webp']]]);

        $env = [
            'APP_ENV' => 'test',
            'MONGO_URI' => $this->config->mongoUri,
            'MONGO_DB' => $this->config->mongoDb,
            'JWT_SECRET' => $this->config->jwtSecret,
            'UPLOAD_DIR' => $this->uploadDir,
            'PATH' => (string) getenv('PATH'),
        ];
        $script = dirname(__DIR__, 2) . '/bin/cleanup-uploads.php';

        $dry = $this->runCli($script, ['--dry-run'], $env);
        self::assertStringContainsString("1 plików do usunięcia (dry-run)\nposts/2026/10/00000000-0000-4000-8000-000000000009.webp", $dry);
        self::assertFileExists($this->uploadDir . '/posts/2026/10/00000000-0000-4000-8000-000000000009.webp');

        $real = $this->runCli($script, [], $env);
        self::assertStringContainsString("1 plików usunięto\nposts/2026/10/00000000-0000-4000-8000-000000000009.webp", $real);
        self::assertFileDoesNotExist($this->uploadDir . '/posts/2026/10/00000000-0000-4000-8000-000000000009.webp');
        self::assertFileExists($this->uploadDir . '/posts/2026/10/00000000-0000-4000-8000-000000000008.webp');
    }

    /** @param list<string> $args @param array<string,string> $env */
    private function runCli(string $script, array $args, array $env): string
    {
        $cmd = array_merge([PHP_BINARY, $script], $args);
        $proc = proc_open($cmd, [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes, dirname($script, 2), $env);
        self::assertIsResource($proc);
        $out = (string) stream_get_contents($pipes[1]);
        $err = (string) stream_get_contents($pipes[2]);
        $code = proc_close($proc);
        self::assertSame(0, $code, $err . $out);
        self::assertSame('', $err);
        return $out;
    }
}
