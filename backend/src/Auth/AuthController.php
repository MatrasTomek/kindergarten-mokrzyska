<?php
declare(strict_types=1);

namespace App\Auth;

use App\Http\ApiException;
use App\Http\Input;
use App\Http\Json;
use App\Http\RefreshCookie;
use App\Support\Ids;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class AuthController
{
    public function __construct(
        private readonly UserRepository $users,
        private readonly JwtService $jwt,
        private readonly LoginRateLimiter $limiter,
    ) {
    }

    /**
     * @param array<string,mixed> $user
     * @return array{id:string,email:string,name:string,role:string}
     */
    public static function userPayload(array $user): array
    {
        return ['id' => (string) $user['_id'], 'email' => $user['email'], 'name' => $user['name'], 'role' => $user['role']];
    }

    public function login(Request $req, Response $res): Response
    {
        $body = Input::body($req);
        $email = mb_strtolower(Input::string($body, 'email', 254));
        $password = is_string($body['password'] ?? null) ? $body['password'] : '';
        $ip = (string) ($req->getServerParams()['REMOTE_ADDR'] ?? 'unknown');

        if ($this->limiter->tooManyAttempts($ip, $email)) {
            throw new ApiException(429, 'TOO_MANY_ATTEMPTS', 'Zbyt wiele nieudanych prób. Spróbuj ponownie za 15 minut.');
        }
        $user = $this->users->findByEmail($email);
        if ($user === null || !$user['active'] || !password_verify($password, $user['passwordHash'])) {
            $this->limiter->recordFailure($ip, $email);
            throw new ApiException(401, 'INVALID_CREDENTIALS', 'Nieprawidłowy e-mail lub hasło.');
        }
        $this->limiter->clear($email);

        $id = (string) $user['_id'];
        $res = RefreshCookie::set($res, $this->jwt->issueRefresh($id));
        return Json::write($res, ['accessToken' => $this->jwt->issueAccess($id, $user['role']), 'user' => self::userPayload($user)]);
    }

    public function refresh(Request $req, Response $res): Response
    {
        $token = $req->getCookieParams()[RefreshCookie::NAME] ?? '';
        if (!is_string($token) || $token === '') {
            throw ApiException::unauthorized();
        }
        $claims = $this->jwt->verify($token, 'refresh');
        $user = $this->users->findById(Ids::parse($claims['sub']));
        if ($user === null || !$user['active']) {
            throw ApiException::unauthorized();
        }
        // Token wydany przed zmianą hasła jest unieważniony (porównanie co do sekundy: iat >= changedAt jest ważny).
        $changedAt = $user['passwordChangedAt'] ?? null;
        if ($changedAt instanceof \MongoDB\BSON\UTCDateTime && (int) ($claims['iat'] ?? 0) < intdiv((int) $changedAt->__toString(), 1000)) {
            throw ApiException::unauthorized();
        }
        return Json::write($res, ['accessToken' => $this->jwt->issueAccess((string) $user['_id'], $user['role']), 'user' => self::userPayload($user)]);
    }

    public function logout(Request $req, Response $res): Response
    {
        return RefreshCookie::clear($res)->withStatus(204);
    }

    public function me(Request $req, Response $res): Response
    {
        $user = $this->users->findById(Ids::parse(\App\Http\AuthUser::from($req)->id));
        if ($user === null || !$user['active']) {
            throw ApiException::unauthorized();
        }
        return Json::write($res, self::userPayload($user));
    }
}
