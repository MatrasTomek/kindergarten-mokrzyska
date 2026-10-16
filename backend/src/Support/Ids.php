<?php
declare(strict_types=1);

namespace App\Support;

use App\Http\ApiException;
use MongoDB\BSON\ObjectId;

final class Ids
{
    public static function parse(string $id): ObjectId
    {
        if (!preg_match('/^[0-9a-f]{24}\z/', $id)) {
            throw ApiException::notFound();
        }
        return new ObjectId($id);
    }
}
