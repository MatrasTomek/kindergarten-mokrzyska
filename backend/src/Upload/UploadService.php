<?php
declare(strict_types=1);

namespace App\Upload;

use App\Config;
use App\Http\ApiException;
use App\Support\Clock;
use App\Support\Uuid;
use Psr\Http\Message\UploadedFileInterface;

final class UploadService
{
    public const IMAGE_MAX = 2 * 1024 * 1024;
    public const THUMB_MAX = 300 * 1024;
    public const PDF_MAX = 10 * 1024 * 1024;
    public const IMAGE_CONTEXTS = ['posts', 'content'];
    private const IMAGE_TYPES = ['image/webp' => 'webp', 'image/jpeg' => 'jpg'];
    private const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

    public function __construct(private readonly Config $config, private readonly Clock $clock)
    {
    }

    /** @return array{file:string,thumb:string,w:int,h:int} */
    public function saveImage(UploadedFileInterface $image, UploadedFileInterface $thumb, string $context): array
    {
        if (!in_array($context, self::IMAGE_CONTEXTS, true)) {
            throw ApiException::validation('Nieprawidłowy kontekst pliku.');
        }
        $this->assertOk($image, self::IMAGE_MAX);
        $this->assertOk($thumb, self::THUMB_MAX);
        $ext = $this->detect($image, self::IMAGE_TYPES);
        $thumbExt = $this->detect($thumb, self::IMAGE_TYPES);

        $dir = $context . '/' . $this->clock->now()->format('Y/m');
        $id = Uuid::v4();
        $file = "$dir/$id.$ext";
        $thumbFile = "$dir/{$id}_thumb.$thumbExt";
        $this->move($image, $file);
        $this->move($thumb, $thumbFile);

        $size = $this->imageSize($file);
        if ($size === null || $this->imageSize($thumbFile) === null) {
            $this->delete($file);
            $this->delete($thumbFile);
            throw ApiException::validation('Uszkodzony obraz.');
        }
        return ['file' => $file, 'thumb' => $thumbFile, 'w' => (int) $size[0], 'h' => (int) $size[1]];
    }

    /** @return array{file:string,name:string,size:int} */
    public function savePdf(UploadedFileInterface $upload): array
    {
        $this->assertOk($upload, self::PDF_MAX);
        $this->detect($upload, ['application/pdf' => 'pdf']);
        $file = 'docs/' . Uuid::v4() . '.pdf';
        $this->move($upload, $file);

        $name = mb_substr(basename((string) $upload->getClientFilename()), 0, 200);
        return ['file' => $file, 'name' => $name !== '' ? $name : 'dokument.pdf', 'size' => (int) filesize($this->absolute($file))];
    }

    public function isImagePath(string $path, string $context): bool
    {
        return in_array($context, self::IMAGE_CONTEXTS, true)
            && preg_match('#^' . $context . '/\d{4}/\d{2}/' . self::UUID . '(_thumb)?\.(webp|jpg)\z#', $path) === 1;
    }

    public function isPdfPath(string $path): bool
    {
        return preg_match('#^docs/' . self::UUID . '\.pdf\z#', $path) === 1;
    }

    public function delete(string $relativePath): void
    {
        $valid = $this->isPdfPath($relativePath)
            || $this->isImagePath($relativePath, 'posts')
            || $this->isImagePath($relativePath, 'content');
        if ($valid && is_file($this->absolute($relativePath))) {
            unlink($this->absolute($relativePath));
        }
    }

    /** @return array{int,int}|null */
    private function imageSize(string $relativePath): ?array
    {
        $info = @getimagesize($this->absolute($relativePath));
        if ($info === false || !in_array($info[2], [IMAGETYPE_WEBP, IMAGETYPE_JPEG], true) || $info[0] < 1 || $info[1] < 1) {
            return null;
        }
        return [$info[0], $info[1]];
    }

    private function absolute(string $relativePath): string
    {
        return $this->config->uploadDir . '/' . $relativePath;
    }

    private function assertOk(UploadedFileInterface $f, int $max): void
    {
        if (in_array($f->getError(), [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true) || (int) $f->getSize() > $max) {
            throw new ApiException(413, 'FILE_TOO_LARGE', 'Plik jest za duży.');
        }
        if ($f->getError() !== UPLOAD_ERR_OK) {
            throw ApiException::validation('Nie udało się przesłać pliku.');
        }
    }

    /** @param array<string,string> $types mime => ext */
    private function detect(UploadedFileInterface $f, array $types): string
    {
        $tmp = (string) $f->getStream()->getMetadata('uri');
        $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($tmp);
        if (!is_string($mime) || !isset($types[$mime])) {
            throw ApiException::validation('Niedozwolony typ pliku.');
        }
        return $types[$mime];
    }

    private function move(UploadedFileInterface $f, string $relativePath): void
    {
        $target = $this->absolute($relativePath);
        if (!is_dir(dirname($target)) && !mkdir(dirname($target), 0755, true) && !is_dir(dirname($target))) {
            throw new \RuntimeException('Nie można utworzyć katalogu ' . dirname($target));
        }
        $f->moveTo($target);
    }
}
