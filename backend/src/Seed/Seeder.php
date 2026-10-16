<?php
declare(strict_types=1);

namespace App\Seed;

use App\Database;
use App\Support\Clock;
use App\Support\Dates;
use App\Support\Slugger;
use App\Theme\DefaultThemes;

final class Seeder
{
    private const GROUPS = ['Ananaski', 'Pingwinki', 'Tygryski', 'Kangurki'];

    public function __construct(private readonly Database $db, private readonly Clock $clock)
    {
    }

    /**
     * @param array{email:string,password:string,name:string}|null $admin
     * @return array{groups:int, themes:int, settings:bool, admin:bool}
     */
    public function run(?array $admin): array
    {
        $result = ['groups' => 0, 'themes' => 0, 'settings' => false, 'admin' => false];

        foreach (self::GROUPS as $i => $name) {
            $slug = Slugger::slugify($name);
            $r = $this->db->collection('groups')->updateOne(
                ['slug' => $slug],
                ['$setOnInsert' => ['name' => $name, 'slug' => $slug, 'order' => $i + 1, 'description' => '']],
                ['upsert' => true]
            );
            $result['groups'] += $r->getUpsertedCount();
        }

        foreach (DefaultThemes::all() as $theme) {
            $r = $this->db->collection('themes')->updateOne(['key' => $theme['key']], ['$setOnInsert' => $theme], ['upsert' => true]);
            $result['themes'] += $r->getUpsertedCount();
        }

        $r = $this->db->collection('settings')->updateOne(
            ['_id' => 'site'],
            ['$setOnInsert' => ['themeMode' => 'auto', 'manualThemeId' => null]],
            ['upsert' => true]
        );
        $result['settings'] = $r->getUpsertedCount() === 1;

        if ($admin !== null) {
            if (mb_strlen($admin['password']) < 10) {
                throw new \InvalidArgumentException('Hasło administratora musi mieć co najmniej 10 znaków.');
            }
            $email = mb_strtolower(trim($admin['email']));
            $r = $this->db->collection('users')->updateOne(
                ['email' => $email],
                ['$setOnInsert' => [
                    'email' => $email,
                    'passwordHash' => password_hash($admin['password'], PASSWORD_DEFAULT),
                    'name' => $admin['name'],
                    'role' => 'admin',
                    'active' => true,
                    'createdAt' => Dates::now($this->clock),
                ]],
                ['upsert' => true]
            );
            $result['admin'] = $r->getUpsertedCount() === 1;
        }

        return $result;
    }
}
