<?php
declare(strict_types=1);

namespace App\Group;

use App\Http\ApiException;
use App\Http\Input;
use App\Http\Json;
use App\Support\Ids;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class GroupController
{
    public function __construct(private readonly GroupRepository $groups, private readonly GroupService $service)
    {
    }

    public function list(Request $req, Response $res): Response
    {
        return Json::write($res, array_map([GroupPresenter::class, 'toArray'], $this->groups->all()));
    }

    /** @param array{slug:string} $args */
    public function show(Request $req, Response $res, array $args): Response
    {
        $group = $this->groups->findBySlug($args['slug']) ?? throw ApiException::notFound();
        return Json::write($res, GroupPresenter::toArray($group));
    }

    public function create(Request $req, Response $res): Response
    {
        return Json::write($res, GroupPresenter::toArray($this->service->create(Input::body($req))), 201);
    }

    /** @param array{id:string} $args */
    public function update(Request $req, Response $res, array $args): Response
    {
        return Json::write($res, GroupPresenter::toArray($this->service->update(Ids::parse($args['id']), Input::body($req))));
    }

    /** @param array{id:string} $args */
    public function delete(Request $req, Response $res, array $args): Response
    {
        $this->service->delete(Ids::parse($args['id']));
        return $res->withStatus(204);
    }
}
