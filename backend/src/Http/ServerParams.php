<?php
declare(strict_types=1);

namespace App\Http;

final class ServerParams
{
    /**
     * Apache/CGI na OVH przekazuje nagłówek Authorization tylko jako REDIRECT_HTTP_AUTHORIZATION.
     *
     * @param array<string,mixed> $server
     * @return array<string,mixed>
     */
    public static function withAuthorization(array $server): array
    {
        if (empty($server['HTTP_AUTHORIZATION']) && !empty($server['REDIRECT_HTTP_AUTHORIZATION'])) {
            $server['HTTP_AUTHORIZATION'] = $server['REDIRECT_HTTP_AUTHORIZATION'];
        }
        return $server;
    }
}
