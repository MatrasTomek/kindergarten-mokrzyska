<?php
declare(strict_types=1);

namespace App\Post;

use App\Group\GroupRepository;
use App\Http\ApiException;
use App\Http\AuthUser;
use App\Http\Input;
use App\Support\Clock;
use App\Support\Dates;
use App\Support\HtmlSanitizer;
use App\Support\Slugger;
use App\Upload\UploadService;
use MongoDB\BSON\ObjectId;

final class PostService
{
    public const MAX_IMAGES = 30;

    public function __construct(
        private readonly PostRepository $posts,
        private readonly GroupRepository $groups,
        private readonly HtmlSanitizer $sanitizer,
        private readonly UploadService $uploads,
        private readonly Clock $clock,
    ) {
    }

    /**
     * @param array<string,mixed> $in
     * @return array<string,mixed>
     */
    public function create(array $in, AuthUser $user): array
    {
        $doc = $this->validate($in, null);
        $now = Dates::now($this->clock);
        $doc += [
            'slug' => Slugger::unique(Slugger::slugify($doc['title']), fn (string $s) => $this->posts->slugExists($s)),
            'publishedAt' => $doc['status'] === 'published' ? $now : null,
            'createdBy' => new ObjectId($user->id),
            'updatedBy' => new ObjectId($user->id),
            'createdAt' => $now,
            'updatedAt' => $now,
        ];
        $doc['_id'] = $this->posts->insert($doc);
        return $doc;
    }

    /**
     * @param array<string,mixed> $in
     * @return array<string,mixed>
     */
    public function update(ObjectId $id, array $in, AuthUser $user): array
    {
        $old = $this->posts->findById($id) ?? throw ApiException::notFound();
        $set = $this->validate($in, $id);
        $now = Dates::now($this->clock);
        $set['updatedBy'] = new ObjectId($user->id);
        $set['updatedAt'] = $now;
        if ($set['status'] === 'published' && ($old['publishedAt'] ?? null) === null) {
            $set['publishedAt'] = $now;
        }
        $this->posts->update($id, $set);

        $kept = array_merge(array_column($set['images'], 'file'), array_column($set['images'], 'thumb'));
        foreach ($old['images'] ?? [] as $img) {
            foreach ([$img['file'], $img['thumb']] as $path) {
                if (!in_array($path, $kept, true)) {
                    $this->uploads->delete($path);
                }
            }
        }
        return (array) $this->posts->findById($id);
    }

    public function delete(ObjectId $id): void
    {
        $post = $this->posts->findById($id) ?? throw ApiException::notFound();
        $this->posts->delete($id);
        foreach ($post['images'] ?? [] as $img) {
            $this->uploads->delete($img['file']);
            $this->uploads->delete($img['thumb']);
        }
    }

    /**
     * @param array<string,mixed> $in
     * @return array<string,mixed>
     */
    private function validate(array $in, ?ObjectId $selfId): array
    {
        $body = $in['body'] ?? '';
        if (!is_string($body) || strlen($body) > 100_000) {
            throw ApiException::validation('Treść jest nieprawidłowa lub za długa.');
        }
        $targets = is_array($in['targets'] ?? null) ? $in['targets'] : [];

        return [
            'title' => Input::string($in, 'title', 200),
            'excerpt' => Input::string($in, 'excerpt', 500, false),
            'body' => $this->sanitizer->clean($body),
            'images' => $this->validateImages(Input::list($in, 'images'), $selfId),
            'targets' => [
                'news' => Input::bool($targets, 'news'),
                'groupIds' => $this->validateGroupIds(Input::list($targets, 'groupIds')),
            ],
            'status' => Input::oneOf($in, 'status', ['draft', 'published']),
        ];
    }

    /**
     * @param list<mixed> $images
     * @return list<array{file:string,thumb:string,w:int,h:int,alt:string}>
     */
    private function validateImages(array $images, ?ObjectId $selfId): array
    {
        if (count($images) > self::MAX_IMAGES) {
            throw ApiException::validation('Wpis może mieć maksymalnie ' . self::MAX_IMAGES . ' zdjęć.');
        }
        $out = [];
        foreach ($images as $img) {
            if (!is_array($img)
                || !is_string($img['file'] ?? null) || !$this->uploads->isImagePath($img['file'], 'posts')
                || !is_string($img['thumb'] ?? null) || !$this->uploads->isImagePath($img['thumb'], 'posts')) {
                throw ApiException::validation('Nieprawidłowe zdjęcie.');
            }
            if ($img['thumb'] !== preg_replace('/\.(webp|jpg)\z/', '_thumb.$1', $img['file'])) {
                throw ApiException::validation('Miniatura nie pasuje do zdjęcia.');
            }
            if (!$this->uploads->exists($img['file']) || !$this->uploads->exists($img['thumb'])) {
                throw ApiException::validation('Zdjęcie wygasło — dodaj je ponownie.');
            }
            $out[] = [
                'file' => $img['file'],
                'thumb' => $img['thumb'],
                'w' => Input::int($img, 'w'),
                'h' => Input::int($img, 'h'),
                'alt' => Input::string($img, 'alt', 300, false),
            ];
        }
        $paths = array_merge(array_column($out, 'file'), array_column($out, 'thumb'));
        if ($paths !== [] && $this->posts->filesUsedByOther($paths, $selfId)) {
            throw ApiException::validation('Zdjęcie jest już używane w innym wpisie.');
        }
        return $out;
    }

    /**
     * @param list<mixed> $ids
     * @return list<ObjectId>
     */
    private function validateGroupIds(array $ids): array
    {
        $unique = [];
        foreach ($ids as $id) {
            if (!is_string($id) || !preg_match('/^[0-9a-f]{24}\z/', $id)) {
                throw ApiException::validation('Nieznana grupa.');
            }
            $unique[$id] = new ObjectId($id);
        }
        $list = array_values($unique);
        if ($this->groups->countExisting($list) !== count($list)) {
            throw ApiException::validation('Nieznana grupa.');
        }
        return $list;
    }
}
