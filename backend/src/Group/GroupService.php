<?php
declare(strict_types=1);

namespace App\Group;

use App\Database;
use App\Http\ApiException;
use App\Http\Input;
use App\Support\Slugger;
use MongoDB\BSON\ObjectId;

final class GroupService
{
    public function __construct(private readonly GroupRepository $groups, private readonly Database $db)
    {
    }

    /**
     * @param array<string,mixed> $in
     * @return array<string,mixed>
     */
    public function create(array $in): array
    {
        $doc = $this->validate($in);
        $doc['slug'] = Slugger::unique(Slugger::slugify($doc['name']), fn (string $s) => $this->groups->slugExists($s));
        $doc['_id'] = $this->groups->insert($doc);
        return $doc;
    }

    /**
     * @param array<string,mixed> $in
     * @return array<string,mixed>
     */
    public function update(ObjectId $id, array $in): array
    {
        if ($this->groups->findById($id) === null) {
            throw ApiException::notFound();
        }
        $this->groups->update($id, $this->validate($in));
        return (array) $this->groups->findById($id);
    }

    public function delete(ObjectId $id): void
    {
        if ($this->groups->findById($id) === null) {
            throw ApiException::notFound();
        }
        $this->db->collection('posts')->updateMany(['targets.groupIds' => $id], ['$pull' => ['targets.groupIds' => $id]]);
        $this->groups->delete($id);
    }

    /**
     * @param array<string,mixed> $in
     * @return array{name:string,order:int,description:string}
     */
    private function validate(array $in): array
    {
        return [
            'name' => Input::string($in, 'name', 60),
            'order' => Input::int($in, 'order', 0),
            'description' => Input::string($in, 'description', 2000, false),
        ];
    }
}
