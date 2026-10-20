<?php
declare(strict_types=1);

namespace App\Theme;

use App\Http\Input;
use App\Http\Json;
use App\Support\Ids;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class ThemeController
{
    public function __construct(
        private readonly ThemeResolver $resolver,
        private readonly ThemeRepository $themes,
        private readonly ThemeService $service,
    ) {
    }

    public function active(Request $req, Response $res): Response
    {
        return Json::write($res, ThemePresenter::toArray($this->resolver->active()) + ['decor' => $this->service->decor()['decorKey']]);
    }

    public function list(Request $req, Response $res): Response
    {
        return Json::write($res, array_map([ThemePresenter::class, 'toArray'], $this->themes->all()));
    }

    public function create(Request $req, Response $res): Response
    {
        return Json::write($res, ThemePresenter::toArray($this->service->create(Input::body($req))), 201);
    }

    /** @param array{id:string} $args */
    public function update(Request $req, Response $res, array $args): Response
    {
        return Json::write($res, ThemePresenter::toArray($this->service->update(Ids::parse($args['id']), Input::body($req))));
    }

    /** @param array{id:string} $args */
    public function delete(Request $req, Response $res, array $args): Response
    {
        $this->service->delete(Ids::parse($args['id']));
        return $res->withStatus(204);
    }

    public function getSettings(Request $req, Response $res): Response
    {
        return Json::write($res, $this->service->settings());
    }

    public function putSettings(Request $req, Response $res): Response
    {
        return Json::write($res, $this->service->saveSettings(Input::body($req)));
    }

    public function getDecor(Request $req, Response $res): Response
    {
        return Json::write($res, $this->service->decor());
    }

    public function putDecor(Request $req, Response $res): Response
    {
        return Json::write($res, $this->service->saveDecor(Input::body($req)));
    }
}
