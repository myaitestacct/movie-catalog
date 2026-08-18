<?php

declare(strict_types=1);

final class ApiResponse
{
    public static function configure(): void
    {
        ini_set('display_errors', '0');
        ini_set('log_errors', '1');
        error_reporting(E_ALL);

        header('Content-Type: application/json; charset=utf-8');
        header('X-Content-Type-Options: nosniff');
    }

    public static function serverError(
        string $context,
        Throwable $error,
        string $publicMessage = 'The request could not be completed'
    ): never {
        error_log($context . ': ' . (string)$error);

        http_response_code(500);
        echo json_encode([
            'error' => true,
            'message' => $publicMessage
        ]);
        exit;
    }
}
