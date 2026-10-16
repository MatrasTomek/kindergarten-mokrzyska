<?php
declare(strict_types=1);

namespace Tests\Integration;

use Tests\ApiTestCase;

final class AuthTest extends ApiTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // login_attempts ma indeks TTL liczony prawdziwym czasem; zegar z przeszlosci
        // pozwolilby mongod usunac proby w trakcie testu (flaky 429).
        $this->clock->set(new \DateTimeImmutable('now', new \DateTimeZone('Europe/Warsaw')));
    }

    private function login(string $email, string $password, string $ip = '10.0.0.1'): \Psr\Http\Message\ResponseInterface
    {
        return $this->request('POST', '/api/auth/login', ['email' => $email, 'password' => $password], server: ['REMOTE_ADDR' => $ip]);
    }

    private function refreshCookieFrom(\Psr\Http\Message\ResponseInterface $res): string
    {
        preg_match('/refresh_token=([^;]+)/', $res->getHeaderLine('Set-Cookie'), $m);
        return $m[1];
    }

    public function testLoginReturnsAccessTokenAndRefreshCookie(): void
    {
        $id = $this->createUser('user', 'nauczyciel@test.pl');
        $res = $this->login('  Nauczyciel@Test.pl ', 'haslo-testowe-123');

        self::assertSame(200, $res->getStatusCode());
        $body = $this->json($res);
        self::assertNotEmpty($body['accessToken']);
        self::assertSame(['id' => $id, 'email' => 'nauczyciel@test.pl', 'name' => 'User', 'role' => 'user'], $body['user']);

        $cookie = $res->getHeaderLine('Set-Cookie');
        self::assertStringContainsString('HttpOnly', $cookie);
        self::assertStringContainsString('Secure', $cookie);
        self::assertStringContainsString('SameSite=Strict', $cookie);
        self::assertStringContainsString('Path=/api/auth', $cookie);
    }

    public function testWrongPasswordReturns401(): void
    {
        $this->createUser('admin', 'a@test.pl');
        $res = $this->login('a@test.pl', 'zle-haslo-123');
        self::assertSame(401, $res->getStatusCode());
        self::assertSame('INVALID_CREDENTIALS', $this->json($res)['error']['code']);
    }

    public function testInactiveUserCannotLogin(): void
    {
        $this->createUser('user', 'off@test.pl', active: false);
        self::assertSame(401, $this->login('off@test.pl', 'haslo-testowe-123')->getStatusCode());
    }

    public function testSixthAttemptIsBlockedEvenWithCorrectPassword(): void
    {
        $this->createUser('admin', 'a@test.pl');
        for ($i = 0; $i < 5; $i++) {
            $this->login('a@test.pl', 'zle-haslo-' . $i);
        }
        $res = $this->login('a@test.pl', 'haslo-testowe-123');
        self::assertSame(429, $res->getStatusCode());
        self::assertSame('TOO_MANY_ATTEMPTS', $this->json($res)['error']['code']);

        $this->clock->advance('+16 minutes');
        self::assertSame(200, $this->login('a@test.pl', 'haslo-testowe-123')->getStatusCode());
    }

    public function testLimitPerIpAcrossEmails(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->login("x$i@test.pl", 'zle-haslo-123', '10.0.0.9');
        }
        $this->createUser('admin', 'ok@test.pl');
        self::assertSame(429, $this->login('ok@test.pl', 'haslo-testowe-123', '10.0.0.9')->getStatusCode());
        self::assertSame(200, $this->login('ok@test.pl', 'haslo-testowe-123', '10.0.0.10')->getStatusCode());
    }

    public function testRefreshIssuesNewAccessToken(): void
    {
        $this->createUser('admin', 'a@test.pl');
        $cookie = $this->refreshCookieFrom($this->login('a@test.pl', 'haslo-testowe-123'));

        $res = $this->request('POST', '/api/auth/refresh', cookies: ['refresh_token' => $cookie]);
        self::assertSame(200, $res->getStatusCode());
        self::assertNotEmpty($this->json($res)['accessToken']);
        self::assertSame('admin', $this->json($res)['user']['role']);
    }

    public function testRefreshWithoutCookieOrWithAccessTokenFails(): void
    {
        $this->createUser('admin', 'a@test.pl');
        $access = $this->json($this->login('a@test.pl', 'haslo-testowe-123'))['accessToken'];

        self::assertSame(401, $this->request('POST', '/api/auth/refresh')->getStatusCode());
        self::assertSame(401, $this->request('POST', '/api/auth/refresh', cookies: ['refresh_token' => $access])->getStatusCode());
    }

    public function testRefreshFailsForDeactivatedUserAndAfterExpiry(): void
    {
        $id = $this->createUser('user', 'u@test.pl');
        $cookie = $this->refreshCookieFrom($this->login('u@test.pl', 'haslo-testowe-123'));

        $this->clock->advance('+15 days');
        self::assertSame(401, $this->request('POST', '/api/auth/refresh', cookies: ['refresh_token' => $cookie])->getStatusCode());

        $this->clock->advance('-15 days');
        $this->db->collection('users')->updateOne(['_id' => new \MongoDB\BSON\ObjectId($id)], ['$set' => ['active' => false]]);
        self::assertSame(401, $this->request('POST', '/api/auth/refresh', cookies: ['refresh_token' => $cookie])->getStatusCode());
    }

    public function testLogoutClearsCookie(): void
    {
        $res = $this->request('POST', '/api/auth/logout');
        self::assertSame(204, $res->getStatusCode());
        self::assertStringContainsString('Max-Age=0', $res->getHeaderLine('Set-Cookie'));
    }
}
