<?php
declare(strict_types=1);

namespace Tests;

use App\AppFactory;
use App\Config;
use App\Database;
use App\Support\FixedClock;
use PHPUnit\Framework\TestCase;
use Psr\Http\Message\ResponseInterface;
use Slim\App;
use Slim\Psr7\Factory\ServerRequestFactory;

abstract class ApiTestCase extends TestCase
{
    protected App $app;
    protected Database $db;
    protected FixedClock $clock;
    protected Config $config;
    protected string $uploadDir;

    protected function setUp(): void
    {
        $this->uploadDir = sys_get_temp_dir() . '/przedszkole-test-' . bin2hex(random_bytes(4));
        mkdir($this->uploadDir, 0777, true);
        $this->config = Config::fromEnv([
            'APP_ENV' => getenv('APP_ENV'),
            'MONGO_URI' => getenv('MONGO_URI'),
            'MONGO_DB' => getenv('MONGO_DB'),
            'JWT_SECRET' => getenv('JWT_SECRET'),
            'UPLOAD_DIR' => $this->uploadDir,
        ]);
        $this->clock = new FixedClock(new \DateTimeImmutable('2026-10-15 12:00:00', new \DateTimeZone('Europe/Warsaw')));
        $this->db = Database::connect($this->config);
        $this->db->drop();
        $this->db->ensureIndexes();
        $this->app = AppFactory::create($this->config, $this->db, $this->clock);
    }

    protected function tearDown(): void
    {
        $it = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($this->uploadDir, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($it as $f) {
            $f->isDir() ? rmdir($f->getPathname()) : unlink($f->getPathname());
        }
        rmdir($this->uploadDir);
    }

    /**
     * @param array<string,string> $cookies
     * @param array<string,mixed> $files  PSR-7 UploadedFileInterface keyed by field name
     * @param array<string,string> $server
     */
    protected function request(
        string $method,
        string $path,
        ?array $body = null,
        ?string $token = null,
        array $cookies = [],
        array $files = [],
        array $server = []
    ): ResponseInterface {
        $req = (new ServerRequestFactory())->createServerRequest($method, $path, $server + ['REMOTE_ADDR' => '127.0.0.1']);
        if ($body !== null) {
            $req = $files === []
                ? $req->withHeader('Content-Type', 'application/json')->withParsedBody($body)
                : $req->withParsedBody($body);
        }
        if ($token !== null) {
            $req = $req->withHeader('Authorization', 'Bearer ' . $token);
        }
        if ($cookies !== []) {
            $req = $req->withCookieParams($cookies);
        }
        if ($files !== []) {
            $req = $req->withUploadedFiles($files);
        }
        return $this->app->handle($req);
    }

    /** @return array<mixed> */
    protected function json(ResponseInterface $res): array
    {
        return json_decode((string) $res->getBody(), true, 512, JSON_THROW_ON_ERROR);
    }
}
