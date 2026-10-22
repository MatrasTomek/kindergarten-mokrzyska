<?php
declare(strict_types=1);

namespace Tests\Integration;

use App\Http\ServerParams;
use Slim\Psr7\Factory\ServerRequestFactory;
use Tests\ApiTestCase;

final class AdminAccessTest extends ApiTestCase
{
    public function testMeRequiresToken(): void
    {
        $res = $this->request('GET', '/api/admin/me');
        self::assertSame(401, $res->getStatusCode());
        self::assertSame('UNAUTHORIZED', $this->json($res)['error']['code']);
    }

    public function testMeReturnsCurrentUser(): void
    {
        $id = $this->createUser('user', 'u@test.pl');
        $res = $this->request('GET', '/api/admin/me', token: $this->tokenFor($id, 'user'));
        self::assertSame(200, $res->getStatusCode());
        self::assertSame(['id' => $id, 'email' => 'u@test.pl', 'name' => 'User', 'role' => 'user'], $this->json($res));
    }

    public function testExpiredTokenRejected(): void
    {
        $token = $this->token('admin');
        $this->clock->advance('+61 minutes');
        self::assertSame(401, $this->request('GET', '/api/admin/me', token: $token)->getStatusCode());
    }

    public function testRefreshTokenCannotBeUsedAsAccessToken(): void
    {
        $id = $this->createUser('admin');
        $refresh = (new \App\Auth\JwtService($this->config, $this->clock))->issueRefresh($id, (string) new \MongoDB\BSON\ObjectId(), 'jti', time() + 3600);
        self::assertSame(401, $this->request('GET', '/api/admin/me', token: $refresh)->getStatusCode());
    }

    public function testRedirectAuthorizationHeaderFromApacheIsAccepted(): void
    {
        $token = $this->tokenFor($this->createUser('admin'), 'admin');
        // Apache/CGI: tylko REDIRECT_HTTP_AUTHORIZATION; server params przechodzą przez tę samą funkcję co w public/index.php
        $server = ServerParams::withAuthorization([
            'REDIRECT_HTTP_AUTHORIZATION' => "Bearer $token",
            'REQUEST_METHOD' => 'GET',
            'REQUEST_URI' => '/api/admin/me',
            'SERVER_NAME' => 'localhost',
            'REMOTE_ADDR' => '127.0.0.1',
        ]);
        // Slim-Psr7 sam umie sięgnąć po REDIRECT_HTTP_AUTHORIZATION, więc nagłówek budujemy wyłącznie
        // z HTTP_AUTHORIZATION: test pada, gdy ServerParams::withAuthorization przestanie go uzupełniać.
        $req = (new ServerRequestFactory())->createServerRequest('GET', '/api/admin/me', $server)
            ->withHeader('Authorization', (string) ($server['HTTP_AUTHORIZATION'] ?? ''));
        self::assertSame(200, $this->app->handle($req)->getStatusCode());
    }

    public function testDeactivatedUserLosesAccessImmediately(): void
    {
        $id = $this->createUser('user');
        $token = $this->tokenFor($id, 'user');
        $this->db->collection('users')->updateOne(['_id' => new \MongoDB\BSON\ObjectId($id)], ['$set' => ['active' => false]]);
        self::assertSame(401, $this->request('GET', '/api/admin/me', token: $token)->getStatusCode());
    }

    public function testDeletedUserTokenRejected(): void
    {
        $id = $this->createUser('admin');
        $token = $this->tokenFor($id, 'admin');
        $this->db->collection('users')->deleteOne(['_id' => new \MongoDB\BSON\ObjectId($id)]);
        self::assertSame(401, $this->request('GET', '/api/admin/me', token: $token)->getStatusCode());
    }

    public function testRoleComesFromDatabaseNotToken(): void
    {
        // np. admin odebrał komuś uprawnienia — stary token z rolą admin nie otwiera tras admina
        $id = $this->createUser('user');
        self::assertSame(403, $this->request('GET', '/api/admin/users', token: $this->tokenFor($id, 'admin'))->getStatusCode());
    }

    public function testAccessTokenIssuedBeforePasswordChangeRejected(): void
    {
        $id = $this->createUser('user');
        $old = $this->tokenFor($id, 'user');
        $this->clock->advance('+1 second');
        $this->db->collection('users')->updateOne(
            ['_id' => new \MongoDB\BSON\ObjectId($id)],
            ['$set' => ['passwordChangedAt' => \App\Support\Dates::now($this->clock)]]
        );
        self::assertSame(401, $this->request('GET', '/api/admin/me', token: $old)->getStatusCode());
        // wydany w tej samej sekundzie co zmiana hasła — ważny
        self::assertSame(200, $this->request('GET', '/api/admin/me', token: $this->tokenFor($id, 'user'))->getStatusCode());
    }
}
