<?php
declare(strict_types=1);

namespace App\Http;

use Psr\Http\Message\ResponseInterface;

final class Json
{
    public static function write(ResponseInterface $res, mixed $data, int $status = 200): ResponseInterface
    {
        $res->getBody()->write(json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
        return $res->withHeader('Content-Type', 'application/json; charset=utf-8')->withStatus($status);
    }
}
