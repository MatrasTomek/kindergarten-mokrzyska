<?php
declare(strict_types=1);

namespace App\Http;

use Psr\Http\Message\ResponseFactoryInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Slim\Exception\HttpException;
use Slim\Exception\HttpMethodNotAllowedException;
use Slim\Exception\HttpNotFoundException;

final class JsonErrorHandler
{
    public function __construct(
        private readonly ResponseFactoryInterface $factory,
        private readonly bool $showDetails,
    ) {
    }

    public function __invoke(
        ServerRequestInterface $request,
        \Throwable $e,
        bool $displayErrorDetails,
        bool $logErrors,
        bool $logErrorDetails
    ): ResponseInterface {
        [$status, $code, $message] = match (true) {
            $e instanceof ApiException => [$e->status, $e->errorCode, $e->getMessage()],
            $e instanceof HttpNotFoundException => [404, 'NOT_FOUND', 'Nie znaleziono.'],
            $e instanceof HttpMethodNotAllowedException => [405, 'METHOD_NOT_ALLOWED', 'Niedozwolona metoda.'],
            $e instanceof HttpException => [$e->getCode(), 'HTTP_ERROR', $e->getMessage()],
            default => [500, 'INTERNAL', 'Wystąpił błąd serwera.'],
        };
        $error = ['code' => $code, 'message' => $message];
        if ($status === 500) {
            error_log((string) $e);
            if ($this->showDetails) {
                $error['details'] = $e->getMessage();
            }
        }
        return Json::write($this->factory->createResponse(), ['error' => $error], $status);
    }
}
