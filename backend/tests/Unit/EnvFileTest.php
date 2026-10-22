<?php
declare(strict_types=1);

namespace Tests\Unit;

use App\EnvFile;
use PHPUnit\Framework\TestCase;

final class EnvFileTest extends TestCase
{
    private string $home;

    protected function setUp(): void
    {
        $this->home = sys_get_temp_dir() . '/envfile-' . bin2hex(random_bytes(4));
        mkdir($this->home . '/przedszkole/api', 0777, true);
    }

    protected function tearDown(): void
    {
        @unlink($this->home . '/przedszkole.env');
        @unlink($this->home . '/przedszkole/api/.env');
        rmdir($this->home . '/przedszkole/api');
        rmdir($this->home . '/przedszkole');
        rmdir($this->home);
        unset($_ENV['ENVFILE_TEST'], $_SERVER['ENVFILE_TEST']);
    }

    public function testOutsidePathIsNextToSiteFolder(): void
    {
        self::assertSame('/home/login/przedszkole.env', EnvFile::outsideWebRoot('/home/login/przedszkole/api'));
    }

    public function testPrefersFileOutsideWebRoot(): void
    {
        file_put_contents($this->home . '/przedszkole.env', "ENVFILE_TEST=poza\n");
        file_put_contents($this->home . '/przedszkole/api/.env', "ENVFILE_TEST=api\n");
        EnvFile::load($this->home . '/przedszkole/api');
        self::assertSame('poza', $_ENV['ENVFILE_TEST']);
    }

    public function testFallsBackToApiEnv(): void
    {
        file_put_contents($this->home . '/przedszkole/api/.env', "ENVFILE_TEST=api\n");
        EnvFile::load($this->home . '/przedszkole/api');
        self::assertSame('api', $_ENV['ENVFILE_TEST']);
    }

    public function testNoFileIsNotAnError(): void
    {
        EnvFile::load($this->home . '/przedszkole/api');
        self::assertArrayNotHasKey('ENVFILE_TEST', $_ENV);
    }
}
