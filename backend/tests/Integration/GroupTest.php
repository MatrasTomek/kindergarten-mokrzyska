<?php
declare(strict_types=1);

namespace Tests\Integration;

use MongoDB\BSON\ObjectId;
use Tests\ApiTestCase;

final class GroupTest extends ApiTestCase
{
    public function testAdminCreatesGroupWithSlug(): void
    {
        $res = $this->request('POST', '/api/admin/groups', ['name' => 'Żabki', 'order' => 5], $this->token());
        self::assertSame(201, $res->getStatusCode());
        $g = $this->json($res);
        self::assertSame(['name' => 'Żabki', 'slug' => 'zabki', 'order' => 5, 'description' => ''], array_diff_key($g, ['id' => 1]));

        $dup = $this->json($this->request('POST', '/api/admin/groups', ['name' => 'Żabki'], $this->token()));
        self::assertSame('zabki-2', $dup['slug']);
    }

    public function testPublicListSortedByOrderAndDetailBySlug(): void
    {
        $t = $this->token();
        $this->request('POST', '/api/admin/groups', ['name' => 'B', 'order' => 2], $t);
        $this->request('POST', '/api/admin/groups', ['name' => 'A', 'order' => 1], $t);

        self::assertSame(['A', 'B'], array_column($this->json($this->request('GET', '/api/groups')), 'name'));
        self::assertSame('B', $this->json($this->request('GET', '/api/groups/b'))['name']);
        self::assertSame(404, $this->request('GET', '/api/groups/nie-ma')->getStatusCode());
    }

    public function testUpdateKeepsSlug(): void
    {
        $t = $this->token();
        $id = $this->json($this->request('POST', '/api/admin/groups', ['name' => 'Misie'], $t))['id'];
        $g = $this->json($this->request('PUT', "/api/admin/groups/$id", ['name' => 'Misie Pysie', 'order' => 3, 'description' => 'Opis'], $t));
        self::assertSame(['Misie Pysie', 'misie', 3, 'Opis'], [$g['name'], $g['slug'], $g['order'], $g['description']]);
    }

    public function testUserCannotManageGroups(): void
    {
        $user = $this->token('user');
        $id = $this->json($this->request('POST', '/api/admin/groups', ['name' => 'Misie'], $this->token()))['id'];

        self::assertSame(403, $this->request('GET', '/api/admin/groups', token: $user)->getStatusCode());
        self::assertSame(403, $this->request('POST', '/api/admin/groups', ['name' => 'X'], $user)->getStatusCode());
        self::assertSame(403, $this->request('PUT', "/api/admin/groups/$id", ['name' => 'X'], $user)->getStatusCode());
        self::assertSame(403, $this->request('DELETE', "/api/admin/groups/$id", token: $user)->getStatusCode());
        self::assertSame('Misie', $this->json($this->request('GET', '/api/groups/misie'))['name']);
    }

    public function testAnonymousCannotManageGroups(): void
    {
        self::assertSame(401, $this->request('POST', '/api/admin/groups', ['name' => 'X'])->getStatusCode());
    }

    public function testDeletingGroupRemovesItFromPosts(): void
    {
        $t = $this->token();
        $id = $this->json($this->request('POST', '/api/admin/groups', ['name' => 'Kangurki'], $t))['id'];
        $other = new ObjectId();
        $this->db->collection('posts')->insertOne(['slug' => 'p', 'targets' => ['news' => false, 'groupIds' => [new ObjectId($id), $other]]]);

        self::assertSame(204, $this->request('DELETE', "/api/admin/groups/$id", token: $t)->getStatusCode());

        $post = $this->db->collection('posts')->findOne(['slug' => 'p']);
        self::assertNotNull($post);
        self::assertEquals([$other], $post['targets']['groupIds']);
        self::assertSame(404, $this->request('GET', '/api/groups/kangurki')->getStatusCode());
    }

    public function testValidation(): void
    {
        self::assertSame(400, $this->request('POST', '/api/admin/groups', ['name' => ''], $this->token())->getStatusCode());
        self::assertSame(404, $this->request('PUT', '/api/admin/groups/zle-id', ['name' => 'X'], $this->token())->getStatusCode());
    }
}
