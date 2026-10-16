<?php
declare(strict_types=1);

namespace App\Auth;

use App\Http\AuthUser;
use App\Http\Input;
use App\Http\Json;
use App\Support\Ids;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class UserController
{
    public function __construct(private readonly UserRepository $users, private readonly UserService $service)
    {
    }

    public function list(Request $req, Response $res): Response
    {
        return Json::write($res, array_map([UserPresenter::class, 'toArray'], $this->users->all()));
    }

    public function create(Request $req, Response $res): Response
    {
        return Json::write($res, UserPresenter::toArray($this->service->create(Input::body($req))), 201);
    }

    /** @param array{id:string} $args */
    public function update(Request $req, Response $res, array $args): Response
    {
        return Json::write($res, UserPresenter::toArray($this->service->update(Ids::parse($args['id']), Input::body($req), AuthUser::from($req))));
    }

    /** @param array{id:string} $args */
    public function delete(Request $req, Response $res, array $args): Response
    {
        $this->service->delete(Ids::parse($args['id']), AuthUser::from($req));
        return $res->withStatus(204);
    }
}
