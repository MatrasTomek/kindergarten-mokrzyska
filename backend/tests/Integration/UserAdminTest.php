<?php
declare(strict_types=1);

namespace Tests\Integration;

use Tests\ApiTestCase;

final class UserAdminTest extends ApiTestCase
{
    private string $adminId;
    private string $t;

    protected function setUp(): void
    {
        parent::setUp();
        $this->adminId = $this->createUser('admin', 'admin@test.pl');
        $this->t = $this->tokenFor($this->adminId, 'admin');
    }

    public function testCreateUserAndLogin(): void
    {
        $res = $this->request('POST', '/api/admin/users', ['email' => 'Pani.Ania@Test.pl', 'name' => 'Pani Ania', 'role' => 'user', 'password' => 'haslo-ani-123'], $this->t);
        self::assertSame(201, $res->getStatusCode());
        $u = $this->json($res);
        self::assertSame(['pani.ania@test.pl', 'Pani Ania', 'user', true], [$u['email'], $u['name'], $u['role'], $u['active']]);
        self::assertArrayNotHasKey('passwordHash', $u);
        self::assertStringNotContainsString('passwordHash', (string) $res->getBody());

        self::assertSame(200, $this->request('POST', '/api/auth/login', ['email' => 'pani.ania@test.pl', 'password' => 'haslo-ani-123'])->getStatusCode());
    }

    public function testListHidesHashes(): void
    {
        $res = $this->request('GET', '/api/admin/users', token: $this->t);
        $list = $this->json($res);
        self::assertCount(1, $list);
        self::assertArrayNotHasKey('passwordHash', $list[0]);
        self::assertStringNotContainsString('passwordHash', (string) $res->getBody());
    }

    public function testValidation(): void
    {
        $base = ['email' => 'x@test.pl', 'name' => 'X', 'role' => 'user', 'password' => 'haslo-dlugie-1'];
        self::assertSame(400, $this->request('POST', '/api/admin/users', ['password' => 'krotkie'] + $base, $this->t)->getStatusCode());
        self::assertSame(400, $this->request('POST', '/api/admin/users', ['email' => 'nie-email'] + $base, $this->t)->getStatusCode());
        self::assertSame(400, $this->request('POST', '/api/admin/users', ['role' => 'root'] + $base, $this->t)->getStatusCode());
        self::assertSame(400, $this->request('POST', '/api/admin/users', ['email' => 'ADMIN@test.pl'] + $base, $this->t)->getStatusCode());
    }

    public function testUpdatePasswordAndDeactivate(): void
    {
        $id = $this->json($this->request('POST', '/api/admin/users', ['email' => 'u@test.pl', 'name' => 'U', 'role' => 'user', 'password' => 'stare-haslo-1'], $this->t))['id'];

        $res = $this->request('PUT', "/api/admin/users/$id", ['name' => 'U2', 'role' => 'user', 'active' => true, 'password' => 'nowe-haslo-12'], $this->t);
        self::assertStringNotContainsString('passwordHash', (string) $res->getBody());
        self::assertSame(200, $this->request('POST', '/api/auth/login', ['email' => 'u@test.pl', 'password' => 'nowe-haslo-12'])->getStatusCode());

        $res = $this->request('PUT', "/api/admin/users/$id", ['name' => 'U2', 'role' => 'user', 'active' => false], $this->t);
        $u = $this->json($res);
        self::assertFalse($u['active']);
        self::assertStringNotContainsString('passwordHash', (string) $res->getBody());
        self::assertSame(401, $this->request('POST', '/api/auth/login', ['email' => 'u@test.pl', 'password' => 'nowe-haslo-12'])->getStatusCode());
    }

    public function testUpdateWithoutPasswordKeepsOldPassword(): void
    {
        $id = $this->json($this->request('POST', '/api/admin/users', ['email' => 'k@test.pl', 'name' => 'K', 'role' => 'user', 'password' => 'stare-haslo-1'], $this->t))['id'];
        self::assertSame(200, $this->request('PUT', "/api/admin/users/$id", ['name' => 'K2', 'role' => 'user', 'active' => true], $this->t)->getStatusCode());
        self::assertSame(200, $this->request('POST', '/api/auth/login', ['email' => 'k@test.pl', 'password' => 'stare-haslo-1'])->getStatusCode());
        self::assertSame(400, $this->request('PUT', "/api/admin/users/$id", ['name' => 'K2', 'role' => 'user', 'active' => true, 'password' => 'krotkie'], $this->t)->getStatusCode());
    }

    public function testUpdateAndDeleteUnknownUser(): void
    {
        $missing = '64b7f0f0f0f0f0f0f0f0f0f0';
        self::assertSame(404, $this->request('PUT', "/api/admin/users/$missing", ['name' => 'A', 'role' => 'user', 'active' => true], $this->t)->getStatusCode());
        self::assertSame(404, $this->request('DELETE', "/api/admin/users/$missing", token: $this->t)->getStatusCode());
    }

    public function testAdminCannotLockThemselvesOut(): void
    {
        self::assertSame(400, $this->request('DELETE', "/api/admin/users/{$this->adminId}", token: $this->t)->getStatusCode());
        self::assertSame(400, $this->request('PUT', "/api/admin/users/{$this->adminId}", ['name' => 'A', 'role' => 'user', 'active' => true], $this->t)->getStatusCode());
        self::assertSame(400, $this->request('PUT', "/api/admin/users/{$this->adminId}", ['name' => 'A', 'role' => 'admin', 'active' => false], $this->t)->getStatusCode());
    }

    public function testDeleteOtherUser(): void
    {
        $id = $this->createUser('user');
        self::assertSame(204, $this->request('DELETE', "/api/admin/users/$id", token: $this->t)->getStatusCode());
        self::assertCount(1, $this->json($this->request('GET', '/api/admin/users', token: $this->t)));
    }

    public function testUserRoleForbidden(): void
    {
        $ut = $this->token('user');
        $id = $this->createUser('user');
        self::assertSame(403, $this->request('GET', '/api/admin/users', token: $ut)->getStatusCode());
        self::assertSame(403, $this->request('POST', '/api/admin/users', ['email' => 'z@test.pl', 'name' => 'Z', 'role' => 'admin', 'password' => 'haslo-dlugie-1'], $ut)->getStatusCode());
        self::assertSame(403, $this->request('PUT', "/api/admin/users/$id", ['name' => 'Z', 'role' => 'admin', 'active' => true], $ut)->getStatusCode());
        self::assertSame(403, $this->request('DELETE', "/api/admin/users/$id", token: $ut)->getStatusCode());
        self::assertNull($this->db->collection('users')->findOne(['email' => 'z@test.pl']));
    }

    public function testUnauthenticated(): void
    {
        self::assertSame(401, $this->request('GET', '/api/admin/users')->getStatusCode());
    }

    private function loginCookie(string $email, string $password): string
    {
        $res = $this->request('POST', '/api/auth/login', ['email' => $email, 'password' => $password], server: ['REMOTE_ADDR' => '10.1.1.1']);
        self::assertSame(200, $res->getStatusCode());
        preg_match('/refresh_token=([^;]+)/', $res->getHeaderLine('Set-Cookie'), $m);
        return $m[1];
    }

    private function refreshStatus(string $cookie): int
    {
        return $this->request('POST', '/api/auth/refresh', cookies: ['refresh_token' => $cookie])->getStatusCode();
    }

    public function testPasswordChangeRevokesOldRefreshTokens(): void
    {
        $id = $this->json($this->request('POST', '/api/admin/users', ['email' => 'r@test.pl', 'name' => 'R', 'role' => 'user', 'password' => 'stare-haslo-1'], $this->t))['id'];
        $old = $this->loginCookie('r@test.pl', 'stare-haslo-1');
        self::assertSame(200, $this->refreshStatus($old));

        $this->clock->advance('+1 minute');
        $this->request('PUT', "/api/admin/users/$id", ['name' => 'R', 'role' => 'user', 'active' => true, 'password' => 'nowe-haslo-12'], $this->t);

        $res = $this->request('POST', '/api/auth/refresh', cookies: ['refresh_token' => $old]);
        self::assertSame(401, $res->getStatusCode());
        self::assertSame('UNAUTHORIZED', $this->json($res)['error']['code'] ?? null);

        $fresh = $this->loginCookie('r@test.pl', 'nowe-haslo-12');
        self::assertSame(200, $this->refreshStatus($fresh));
    }

    public function testTokenIssuedInSameSecondAsPasswordChangeStaysValid(): void
    {
        $id = $this->json($this->request('POST', '/api/admin/users', ['email' => 'b@test.pl', 'name' => 'B', 'role' => 'user', 'password' => 'stare-haslo-1'], $this->t))['id'];
        $this->request('PUT', "/api/admin/users/$id", ['name' => 'B', 'role' => 'user', 'active' => true, 'password' => 'nowe-haslo-12'], $this->t);
        // token wydany w tej samej sekundzie co zmiana (iat == changedAt) jest ważny
        self::assertSame(200, $this->refreshStatus($this->loginCookie('b@test.pl', 'nowe-haslo-12')));
        // token wydany sekundę wcześniej jest unieważniony
        $jwt = new \App\Auth\JwtService($this->config, $this->clock);
        $this->clock->advance('-1 second');
        $early = $jwt->issueRefresh($id);
        $this->clock->advance('+1 second');
        self::assertSame(401, $this->refreshStatus($early));
    }

    public function testUpdateWithoutPasswordDoesNotRevoke(): void
    {
        $id = $this->json($this->request('POST', '/api/admin/users', ['email' => 'n@test.pl', 'name' => 'N', 'role' => 'user', 'password' => 'stare-haslo-1'], $this->t))['id'];
        $cookie = $this->loginCookie('n@test.pl', 'stare-haslo-1');
        $this->clock->advance('+1 minute');
        $this->request('PUT', "/api/admin/users/$id", ['name' => 'Nowe imię', 'role' => 'user', 'active' => true], $this->t);
        self::assertSame(200, $this->refreshStatus($cookie));
    }

    public function testLegacyUserWithoutPasswordChangedAtCanRefresh(): void
    {
        $this->createUser('user', 'legacy@test.pl');
        $cookie = $this->loginCookie('legacy@test.pl', 'haslo-testowe-123');
        self::assertSame(200, $this->refreshStatus($cookie));
    }
}
