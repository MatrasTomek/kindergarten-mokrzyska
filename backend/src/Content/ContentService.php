<?php
declare(strict_types=1);

namespace App\Content;

use App\Http\ApiException;
use App\Http\Input;
use App\Post\PostRepository;
use App\Support\Clock;
use App\Support\Dates;
use App\Support\HtmlSanitizer;
use App\Upload\UploadService;
use MongoDB\BSON\ObjectId;

final class ContentService
{
    public function __construct(
        private readonly ContentRepository $items,
        private readonly PostRepository $posts,
        private readonly HtmlSanitizer $sanitizer,
        private readonly UploadService $uploads,
        private readonly Clock $clock,
    ) {
    }

    /**
     * @param array<string,mixed> $in
     * @return array<string,mixed>
     */
    public function create(array $in): array
    {
        $doc = $this->validate($in, null);
        $doc['createdAt'] = $doc['updatedAt'] = Dates::now($this->clock);
        $doc['_id'] = $this->items->insert($doc);
        return $doc;
    }

    /**
     * @param array<string,mixed> $in
     * @return array<string,mixed>
     */
    public function update(ObjectId $id, array $in): array
    {
        $old = $this->items->findById($id) ?? throw ApiException::notFound();
        $set = $this->validate($in, $id);
        $set['updatedAt'] = Dates::now($this->clock);
        $this->items->update($id, $set);
        $kept = $this->files($set);
        foreach ($this->files($old) as $path) {
            if (!in_array($path, $kept, true)) {
                $this->uploads->delete($path);
            }
        }
        return (array) $this->items->findById($id);
    }

    public function delete(ObjectId $id): void
    {
        $old = $this->items->findById($id) ?? throw ApiException::notFound();
        $this->items->delete($id);
        foreach ($this->files($old) as $path) {
            $this->uploads->delete($path);
        }
    }

    /**
     * @param array<string,mixed> $doc
     * @return list<string>
     */
    private function files(array $doc): array
    {
        $paths = array_column($doc['attachments'] ?? [], 'file');
        foreach ($doc['images'] ?? [] as $img) {
            $paths[] = $img['file'];
            $paths[] = $img['thumb'];
        }
        return $paths;
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
        $attachments = [];
        foreach (Input::list($in, 'attachments') as $a) {
            if (!is_array($a) || !is_string($a['file'] ?? null) || !$this->uploads->isPdfPath($a['file'])) {
                throw ApiException::validation('Nieprawidłowy załącznik.');
            }
            if (!$this->uploads->exists($a['file'])) {
                throw ApiException::validation('Plik wygasł — dodaj go ponownie.');
            }
            $attachments[] = ['file' => $a['file'], 'name' => Input::string($a, 'name', 200), 'size' => Input::int($a, 'size')];
        }
        $images = [];
        foreach (Input::list($in, 'images') as $img) {
            if (!is_array($img)
                || !is_string($img['file'] ?? null) || !$this->uploads->isImagePath($img['file'], 'content')
                || !is_string($img['thumb'] ?? null) || !$this->uploads->isImagePath($img['thumb'], 'content')) {
                throw ApiException::validation('Nieprawidłowe zdjęcie.');
            }
            if ($img['thumb'] !== preg_replace('/\.(webp|jpg)\z/', '_thumb.$1', $img['file'])) {
                throw ApiException::validation('Miniatura nie pasuje do zdjęcia.');
            }
            if (!$this->uploads->exists($img['file']) || !$this->uploads->exists($img['thumb'])) {
                throw ApiException::validation('Zdjęcie wygasło — dodaj je ponownie.');
            }
            $images[] = ['file' => $img['file'], 'thumb' => $img['thumb'], 'w' => Input::int($img, 'w'), 'h' => Input::int($img, 'h'), 'alt' => Input::string($img, 'alt', 300, false)];
        }
        if (count($attachments) > 50 || count($images) > 30) {
            throw ApiException::validation('Za dużo plików w jednym elemencie.');
        }
        $paths = array_merge(array_column($attachments, 'file'), array_column($images, 'file'), array_column($images, 'thumb'));
        if ($paths !== [] && ($this->items->filesUsedByOther($paths, $selfId) || $this->posts->filesUsedByOther($paths, null))) {
            throw ApiException::validation('Plik jest już używany w innym miejscu.');
        }
        return [
            'page' => Input::oneOf($in, 'page', ContentPages::ALL),
            'title' => Input::string($in, 'title', 200),
            'body' => $this->sanitizer->clean($body),
            'attachments' => $attachments,
            'images' => $images,
            'order' => Input::int($in, 'order', 0),
            'status' => Input::oneOf($in, 'status', ['draft', 'published']),
        ];
    }
}
