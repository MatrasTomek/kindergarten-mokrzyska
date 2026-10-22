<?php
declare(strict_types=1);

namespace App\Auth;

use App\Http\ApiException;
use App\Http\Input;
use App\Http\Json;
use App\Http\RefreshCookie;
use App\Support\Clock;
use App\Support\Dates;
use App\Support\Ids;
use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class AuthController
{
    /**
     * Ile sekund po rotacji poprzedni token odświeżania jest jeszcze przyjmowany (bez kolejnej rotacji):
     * kilka kart przywróconych naraz wysyła /auth/refresh równolegle z tym samym ciasteczkiem.
     */
    public const ROTATION_GRACE_SECONDS = 30;

    public function __construct(
        private readonly UserRepository $users,
        private readonly SessionRepository $sessions,
        private readonly JwtService $jwt,
        private readonly LoginRateLimiter $limiter,
        private readonly Clock $clock,
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
        $now = Dates::now($this->clock);
        $expiresAt = $this->clock->now()->getTimestamp() + JwtService::REFRESH_TTL;
        $this->sessions->deleteExpired($now);
        $jti = JwtService::newJti();
        $sid = $this->sessions->create($user['_id'], $jti, $now, new UTCDateTime($expiresAt * 1000));
        $res = RefreshCookie::set($res, $this->jwt->issueRefresh($id, (string) $sid, $jti, $expiresAt));
        return Json::write($res, ['accessToken' => $this->jwt->issueAccess($id, $user['role']), 'user' => self::userPayload($user)]);
    }

    public function refresh(Request $req, Response $res): Response
    {
        $claims = $this->jwt->verify($this->cookieToken($req), 'refresh');
        $sid = $this->sessionId($claims);
        $session = $this->sessions->find($sid);
        if ($session === null || (string) $session['userId'] !== $claims['sub']) {
            throw ApiException::unauthorized();
        }
        $user = $this->users->findById($session['userId']);
        if ($user === null || !$user['active'] || JwtService::issuedBeforePasswordChange($claims, $user)) {
            $this->sessions->delete($sid);
            throw ApiException::unauthorized();
        }

        $now = $this->clock->now()->getTimestamp();
        if ($claims['jti'] === $session['jti']) {
            $newJti = JwtService::newJti();
            // Przegrany wyścig (równoległe odświeżenie zrotowało pierwsze) = jak okres karencji niżej.
            if ($this->sessions->rotate($sid, $claims['jti'], $newJti, Dates::now($this->clock))) {
                $expiresAt = intdiv((int) $session['expiresAt']->__toString(), 1000);
                $res = RefreshCookie::set($res, $this->jwt->issueRefresh($claims['sub'], (string) $sid, $newJti, $expiresAt), $expiresAt - $now);
            }
        } elseif (!$this->withinGrace($claims['jti'], $session, $now)) {
            // Użycie już zrotowanego tokenu: ktoś ma starą kopię ciasteczka (kradzież?) — zamykamy całą sesję.
            $this->sessions->delete($sid);
            throw ApiException::unauthorized();
        }
        return Json::write($res, ['accessToken' => $this->jwt->issueAccess((string) $user['_id'], $user['role']), 'user' => self::userPayload($user)]);
    }

    public function logout(Request $req, Response $res): Response
    {
        try {
            $this->sessions->delete($this->sessionId($this->jwt->verify($this->cookieToken($req), 'refresh')));
        } catch (ApiException) {
            // brak/nieważne ciasteczko: nie ma czego unieważniać
        }
        return RefreshCookie::clear($res)->withStatus(204);
    }

    private function cookieToken(Request $req): string
    {
        $token = $req->getCookieParams()[RefreshCookie::NAME] ?? '';
        if (!is_string($token) || $token === '') {
            throw ApiException::unauthorized();
        }
        return $token;
    }

    /** @param array<string,mixed> $claims */
    private function sessionId(array $claims): ObjectId
    {
        // Tokeny sprzed wprowadzenia sesji nie mają sid/jti — wymagają ponownego logowania.
        if (!is_string($claims['sid'] ?? null) || !is_string($claims['jti'] ?? null)) {
            throw ApiException::unauthorized();
        }
        return Ids::parse($claims['sid']);
    }

    /** @param array<string,mixed> $session */
    private function withinGrace(string $jti, array $session, int $now): bool
    {
        $rotatedAt = $session['rotatedAt'] ?? null;
        return $jti === ($session['prevJti'] ?? null)
            && $rotatedAt instanceof UTCDateTime
            && $now - intdiv((int) $rotatedAt->__toString(), 1000) <= self::ROTATION_GRACE_SECONDS;
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
