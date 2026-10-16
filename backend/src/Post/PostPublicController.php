<?php
declare(strict_types=1);

namespace App\Post;

use App\Group\GroupRepository;
use App\Http\ApiException;
use App\Http\Json;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class PostPublicController
{
    private const PER_PAGE = 12;

    public function __construct(private readonly PostRepository $posts, private readonly GroupRepository $groups)
    {
    }

    public function list(Request $req, Response $res): Response
    {
        $q = $req->getQueryParams();
        $filter = ['status' => 'published'];
        if (($q['news'] ?? '') === '1') {
            $filter['targets.news'] = true;
        }
        if (is_string($q['group'] ?? null) && $q['group'] !== '') {
            $group = $this->groups->findBySlug($q['group']) ?? throw ApiException::notFound('Nie ma takiej grupy.');
            $filter['targets.groupIds'] = $group['_id'];
        }
        $page = max(1, (int) ($q['page'] ?? 1));
        $result = $this->posts->paginate($filter, ['publishedAt' => -1], $page, self::PER_PAGE);
        return Json::write($res, PostPresenter::paged($result, $page, self::PER_PAGE, false));
    }

    /** @param array{slug:string} $args */
    public function show(Request $req, Response $res, array $args): Response
    {
        $post = $this->posts->findPublishedBySlug($args['slug']) ?? throw ApiException::notFound();
        return Json::write($res, PostPresenter::toArray($post));
    }
}
