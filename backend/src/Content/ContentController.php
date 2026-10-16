<?php
declare(strict_types=1);

namespace App\Content;

use App\Http\ApiException;
use App\Http\Input;
use App\Http\Json;
use App\Support\Ids;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class ContentController
{
    public function __construct(private readonly ContentRepository $items, private readonly ContentService $service)
    {
    }

    /** @param array{page:string} $args */
    public function publicList(Request $req, Response $res, array $args): Response
    {
        if (!in_array($args['page'], ContentPages::ALL, true)) {
            throw ApiException::notFound();
        }
        return Json::write($res, array_map([ContentPresenter::class, 'toArray'], $this->items->byPage($args['page'], true)));
    }

    public function adminList(Request $req, Response $res): Response
    {
        $page = Input::oneOf($req->getQueryParams(), 'page', ContentPages::ALL);
        return Json::write($res, array_map([ContentPresenter::class, 'toArray'], $this->items->byPage($page, false)));
    }

    /** @param array{id:string} $args */
    public function show(Request $req, Response $res, array $args): Response
    {
        $item = $this->items->findById(Ids::parse($args['id'])) ?? throw ApiException::notFound();
        return Json::write($res, ContentPresenter::toArray($item));
    }

    public function create(Request $req, Response $res): Response
    {
        return Json::write($res, ContentPresenter::toArray($this->service->create(Input::body($req))), 201);
    }

    /** @param array{id:string} $args */
    public function update(Request $req, Response $res, array $args): Response
    {
        return Json::write($res, ContentPresenter::toArray($this->service->update(Ids::parse($args['id']), Input::body($req))));
    }

    /** @param array{id:string} $args */
    public function delete(Request $req, Response $res, array $args): Response
    {
        $this->service->delete(Ids::parse($args['id']));
        return $res->withStatus(204);
    }
}
