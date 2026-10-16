<?php
declare(strict_types=1);

namespace App\Theme;

use App\Http\Json;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class ThemeController
{
    public function __construct(private readonly ThemeResolver $resolver)
    {
    }

    public function active(Request $req, Response $res): Response
    {
        return Json::write($res, ThemePresenter::toArray($this->resolver->active()));
    }
}
