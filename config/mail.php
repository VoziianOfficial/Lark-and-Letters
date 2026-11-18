<?php
declare(strict_types=1);

$mail = [
    // smtp or resend (HTTPS API, useful when the hosting provider blocks SMTP).
    'transport' => getenv('MAIL_TRANSPORT') ?: 'smtp',
    'host' => getenv('SMTP_HOST') ?: '',
    'port' => (int) (getenv('SMTP_PORT') ?: 587),
    'security' => getenv('SMTP_SECURITY') ?: 'starttls',
    'username' => getenv('SMTP_USERNAME') ?: '',
    'password' => getenv('SMTP_PASSWORD') ?: '',
    'from' => getenv('MAIL_FROM') ?: (getenv('SMTP_FROM') ?: ''),
    'api_key' => getenv('RESEND_API_KEY') ?: '',
];

// Optional private overrides for hosting without PHP environment variables.
$localFile = __DIR__ . '/mail.local.php';
if (is_file($localFile)) {
    $local = require $localFile;
    if (!is_array($local)) {
        throw new RuntimeException('config/mail.local.php must return an array');
    }
    $mail = array_replace($mail, $local);
}
return $mail;
