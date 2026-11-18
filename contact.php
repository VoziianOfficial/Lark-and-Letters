<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

require_once __DIR__ . '/includes/site-config.php';
require_once __DIR__ . '/includes/mail.php';

function respond(int $status, bool $ok, string $message): void
{
    http_response_code($status);
    echo json_encode(['ok' => $ok, 'message' => $message]);
    exit;
}

function field(string $name): string
{
    $value = $_POST[$name] ?? null;
    if ($value !== null && !is_string($value)) {
        respond(422, false, 'Please check your form fields.');
    }
    return is_string($value) ? trim($value) : '';
}

function textLength(string $value): int
{
    // Validate UTF-8 without requiring mbstring on shared hosting.
    $count = preg_match_all('/./us', $value);
    return $count === false ? -1 : $count;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    respond(405, false, 'Please submit the enquiry form.');
}
$name = field('name');
$email = field('email');
$topic = field('topic');
$message = field('message');
if (!\LarkLetters\validMailAddress($email) ||
    textLength($name) < 1 || textLength($name) > 100 ||
    !in_array($topic, ['Request a lesson', 'Advertising', 'Collaboration', 'General information', 'Feedback'], true) ||
    textLength($message) < 10 || textLength($message) > 4000 || field('consent') !== 'yes' ||
    field('website') !== '' || preg_match('/[\r\n<>]/', $email) ||
    preg_match('/[\x00-\x1f\x7f]/', $name . $topic) || strpos($message, "\0") !== false) {
    respond(422, false, 'Please check your details and accept the privacy policy.');
}
try {
    $site = \LarkLetters\siteConfig();
    $success = $site['form']['success'] ?? '';
    if (!is_string($success) || $success === '') {
        throw new RuntimeException('Missing form confirmation');
    }
    $body = "Name: $name\nEmail: $email\nEnquiry: $topic\n\n$message";
    \LarkLetters\deliver(require __DIR__ . '/config/mail.php', $site['email'], $email, $body);
    respond(200, true, $success);
} catch (Throwable $error) {
    error_log('Website enquiry failed: ' . $error->getMessage());
    respond(503, false, 'Your enquiry could not be sent. Please try again or contact us by email.');
}
