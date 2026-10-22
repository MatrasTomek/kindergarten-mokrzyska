<?php
declare(strict_types=1);

namespace App\Auth;

use App\Http\ApiException;
use App\Http\AuthUser;
use App\Http\Input;
use App\Support\Clock;
use App\Support\Dates;
use MongoDB\BSON\ObjectId;

final class UserService
{
    public function __construct(
        private readonly UserRepository $users,
        private readonly SessionRepository $sessions,
        private readonly Clock $clock,
    ) {
    }

    /**
     * @param array<string,mixed> $in
     * @return array<string,mixed>
     */
    public function create(array $in): array
    {
        $email = mb_strtolower(Input::string($in, 'email', 254));
        if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            throw ApiException::validation('Nieprawidłowy adres e-mail.');
        }
        if ($this->users->findByEmail($email) !== null) {
            throw ApiException::validation('Użytkownik z tym e-mailem już istnieje.');
        }
        $doc = [
            'email' => $email,
            'passwordHash' => password_hash($this->password($in, true), PASSWORD_DEFAULT),
            'name' => Input::string($in, 'name', 100),
            'role' => Input::oneOf($in, 'role', ['admin', 'user']),
            'active' => true,
            'createdAt' => Dates::now($this->clock),
            'passwordChangedAt' => Dates::now($this->clock),
        ];
        $doc['_id'] = $this->users->insert($doc);
        return $doc;
    }

    /**
     * @param array<string,mixed> $in
     * @return array<string,mixed>
     */
    public function update(ObjectId $id, array $in, AuthUser $actor): array
    {
        $this->users->findById($id) ?? throw ApiException::notFound();
        $set = [
            'name' => Input::string($in, 'name', 100),
            'role' => Input::oneOf($in, 'role', ['admin', 'user']),
            'active' => Input::bool($in, 'active'),
        ];
        if ((string) $id === $actor->id && ($set['role'] !== 'admin' || !$set['active'])) {
            throw ApiException::validation('Nie możesz odebrać sobie uprawnień administratora ani się dezaktywować.');
        }
        $password = $this->password($in, false);
        if ($password !== '') {
            $set['passwordHash'] = password_hash($password, PASSWORD_DEFAULT);
            $set['passwordChangedAt'] = Dates::now($this->clock);
        }
        $this->users->update($id, $set);
        // Nowe hasło albo dezaktywacja: wylogowanie ze wszystkich urządzeń (tokeny odświeżania przestają działać).
        if (isset($set['passwordHash']) || !$set['active']) {
            $this->sessions->deleteForUser($id);
        }
        return (array) $this->users->findById($id);
    }

    public function delete(ObjectId $id, AuthUser $actor): void
    {
        if ((string) $id === $actor->id) {
            throw ApiException::validation('Nie możesz usunąć własnego konta.');
        }
        $this->users->findById($id) ?? throw ApiException::notFound();
        $this->users->delete($id);
        $this->sessions->deleteForUser($id);
    }

    /** @param array<string,mixed> $in */
    private function password(array $in, bool $required): string
    {
        $p = $in['password'] ?? '';
        if (!is_string($p)) {
            throw ApiException::validation('Nieprawidłowe hasło.');
        }
        if (($required || $p !== '') && mb_strlen($p) < 10) {
            throw ApiException::validation('Hasło musi mieć co najmniej 10 znaków.');
        }
        return $p;
    }
}
