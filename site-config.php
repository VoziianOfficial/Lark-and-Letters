<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, max-age=0');
header('X-Content-Type-Options: nosniff');

if (!in_array($_SERVER['REQUEST_METHOD'], ['GET', 'HEAD'], true)) {
    header('Allow: GET, HEAD');
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed.']);
    exit;
}

try {
    require_once __DIR__ . '/includes/site-config.php';
    // This file contains public site settings only. Never add mail credentials here.
    echo json_encode(\LarkLetters\siteConfig(), JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
} catch (Throwable $error) {
    error_log('Website configuration failed: ' . $error->getMessage());
    http_response_code(503);
    echo json_encode(['error' => 'Site configuration is unavailable.']);
}
