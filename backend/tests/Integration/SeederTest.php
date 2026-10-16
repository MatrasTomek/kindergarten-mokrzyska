<?php
declare(strict_types=1);

namespace Tests\Integration;

use App\Seed\Seeder;
use Tests\ApiTestCase;

final class SeederTest extends ApiTestCase
{
    public function testSeedsEverythingOnce(): void
    {
        $seeder = new Seeder($this->db, $this->clock);
        $admin = ['email' => 'Dyrektor@Przedszkole.pl', 'password' => 'bardzo-tajne-haslo', 'name' => 'Dyrektor'];

        $first = $seeder->run($admin);
        self::assertSame(['groups' => 4, 'themes' => 4, 'settings' => true, 'admin' => true], $first);

        $second = $seeder->run($admin);
        self::assertSame(['groups' => 0, 'themes' => 0, 'settings' => false, 'admin' => false], $second);

        $slugs = array_column($this->db->collection('groups')->find([], ['sort' => ['order' => 1]])->toArray(), 'slug');
        self::assertSame(['ananaski', 'pingwinki', 'tygryski', 'kangurki'], $slugs);

        $user = $this->db->collection('users')->findOne(['email' => 'dyrektor@przedszkole.pl']);
        self::assertSame('admin', $user['role']);
        self::assertTrue(password_verify('bardzo-tajne-haslo', $user['passwordHash']));
    }

    public function testRejectsShortAdminPassword(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        (new Seeder($this->db, $this->clock))->run(['email' => 'a@b.pl', 'password' => 'krotkie', 'name' => 'A']);
    }
}
