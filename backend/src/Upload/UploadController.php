<?php
declare(strict_types=1);

namespace App\Upload;

use App\Http\ApiException;
use App\Http\Json;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\UploadedFileInterface;

final class UploadController
{
    public function __construct(private readonly UploadService $uploads)
    {
    }

    public function image(Request $req, Response $res): Response
    {
        $files = $req->getUploadedFiles();
        $body = (array) $req->getParsedBody();
        $context = is_string($body['context'] ?? null) ? $body['context'] : 'posts';
        return Json::write($res, $this->uploads->saveImage($this->file($files, 'image'), $this->file($files, 'thumb'), $context), 201);
    }

    public function pdf(Request $req, Response $res): Response
    {
        return Json::write($res, $this->uploads->savePdf($this->file($req->getUploadedFiles(), 'file')), 201);
    }

    /** @param array<string,mixed> $files */
    private function file(array $files, string $key): UploadedFileInterface
    {
        $f = $files[$key] ?? null;
        if (!$f instanceof UploadedFileInterface) {
            throw ApiException::validation("Brak pliku: $key.");
        }
        return $f;
    }
}
