<?php
declare(strict_types=1);

return [
    'host' => getenv('SMTP_HOST') ?: '',
    'port' => (int) (getenv('SMTP_PORT') ?: 587),
    'security' => getenv('SMTP_SECURITY') ?: 'starttls',
    'username' => getenv('SMTP_USERNAME') ?: '',
    'password' => getenv('SMTP_PASSWORD') ?: '',
    'from' => getenv('SMTP_FROM') ?: '',
];
