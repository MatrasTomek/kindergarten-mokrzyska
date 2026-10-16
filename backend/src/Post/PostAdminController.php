<?php
declare(strict_types=1);

namespace App\Post;

use App\Http\ApiException;
use App\Http\AuthUser;
use App\Http\Input;
use App\Http\Json;
use App\Support\Ids;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class PostAdminController
{
    private const PER_PAGE = 20;

    public function __construct(private readonly PostRepository $posts, private readonly PostService $service)
    {
    }

    public function list(Request $req, Response $res): Response
    {
        $page = max(1, (int) ($req->getQueryParams()['page'] ?? 1));
        $result = $this->posts->paginate([], ['updatedAt' => -1], $page, self::PER_PAGE);
        return Json::write($res, PostPresenter::paged($result, $page, self::PER_PAGE, true));
    }

    /** @param array{id:string} $args */
    public function show(Request $req, Response $res, array $args): Response
    {
        $post = $this->posts->findById(Ids::parse($args['id'])) ?? throw ApiException::notFound();
        return Json::write($res, PostPresenter::toArray($post, true));
    }

    public function create(Request $req, Response $res): Response
    {
        $post = $this->service->create(Input::body($req), AuthUser::from($req));
        return Json::write($res, PostPresenter::toArray($post, true), 201);
    }

    /** @param array{id:string} $args */
    public function update(Request $req, Response $res, array $args): Response
    {
        $post = $this->service->update(Ids::parse($args['id']), Input::body($req), AuthUser::from($req));
        return Json::write($res, PostPresenter::toArray($post, true));
    }

    /** @param array{id:string} $args */
    public function delete(Request $req, Response $res, array $args): Response
    {
        $this->service->delete(Ids::parse($args['id']));
        return $res->withStatus(204);
    }
}
