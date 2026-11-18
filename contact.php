<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');

function respond(int $status, bool $ok, string $message): void
{
    http_response_code($status);
    echo json_encode(['ok' => $ok, 'message' => $message]);
    exit;
}

function field(string $name): string
{
    $value = $_POST[$name] ?? null;
    return is_string($value) ? trim($value) : '';
}

function smtpReply($socket, array $allowed): string
{
    $reply = '';
    do {
        $line = fgets($socket, 1024);
        if ($line === false || strlen($reply) > 16384 || !preg_match('/^(\d{3})([ -])/', $line, $match)) {
            throw new RuntimeException('Invalid SMTP response');
        }
        $reply .= $line;
    } while ($match[2] === '-');
    if (!in_array((int) $match[1], $allowed, true)) {
        throw new RuntimeException('SMTP rejected request, code ' . $match[1]);
    }
    return $reply;
}

function sendBytes($socket, string $bytes): void
{
    while ($bytes !== '') {
        $written = fwrite($socket, $bytes);
        if (!$written) {
            throw new RuntimeException('SMTP connection lost');
        }
        $bytes = substr($bytes, $written);
    }
}

function command($socket, string $command, array $codes): string
{
    sendBytes($socket, $command . "\r\n");
    return smtpReply($socket, $codes);
}

function deliver(array $mail, string $recipient, string $replyTo, string $body): void
{
    $host = $mail['host'];
    $from = $mail['from'] ?: $mail['username'];
    if (!filter_var($host, FILTER_VALIDATE_DOMAIN, FILTER_FLAG_HOSTNAME) ||
        !filter_var($from, FILTER_VALIDATE_EMAIL) || !filter_var($recipient, FILTER_VALIDATE_EMAIL) ||
        preg_match('/[\r\n<>]/', $from . $recipient . $replyTo) ||
        !in_array($mail['security'], ['starttls', 'smtps'], true) ||
        $mail['port'] < 1 || $mail['port'] > 65535 ||
        $mail['username'] === '' || $mail['password'] === '') {
        throw new RuntimeException('Incomplete SMTP configuration');
    }

    $implicit = $mail['security'] === 'smtps';
    $context = stream_context_create(['ssl' => [
        'verify_peer' => true, 'verify_peer_name' => true, 'peer_name' => $host,
        'crypto_method' => STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT,
    ]]);
    $endpoint = ($implicit ? 'tls' : 'tcp') . '://' . $host . ':' . $mail['port'];
    $socket = @stream_socket_client($endpoint, $errno, $errstr, 8, STREAM_CLIENT_CONNECT, $context);
    if (!$socket) {
        throw new RuntimeException('Unable to connect to configured mail service');
    }
    try {
        stream_set_timeout($socket, 10);
        smtpReply($socket, [220]);
        $helo = 'EHLO ' . substr(strrchr($from, '@'), 1);
        $features = command($socket, $helo, [250]);
        if (!$implicit) {
            command($socket, 'STARTTLS', [220]);
            if (@stream_socket_enable_crypto($socket, true) !== true) {
                throw new RuntimeException('Unable to secure SMTP connection');
            }
            $features = command($socket, $helo, [250]);
        }
        if (preg_match('/^250[ -]AUTH[ =][^\r\n]*\bPLAIN\b/im', $features)) {
            command($socket, 'AUTH PLAIN ' . base64_encode("\0" . $mail['username'] . "\0" . $mail['password']), [235]);
        } else {
            command($socket, 'AUTH LOGIN', [334]);
            command($socket, base64_encode($mail['username']), [334]);
            command($socket, base64_encode($mail['password']), [235]);
        }
        command($socket, 'MAIL FROM:<' . $from . '>', [250]);
        command($socket, 'RCPT TO:<' . $recipient . '>', [250, 251]);
        command($socket, 'DATA', [354]);
        $headers = [
            'From: ' . $from, 'To: ' . $recipient, 'Reply-To: ' . $replyTo,
            'Subject: New website enquiry', 'Date: ' . date(DATE_RFC2822),
            'Message-ID: <' . bin2hex(random_bytes(16)) . '@' . substr(strrchr($from, '@'), 1) . '>',
            'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: base64',
        ];
        sendBytes($socket, implode("\r\n", $headers) . "\r\n\r\n" . chunk_split(base64_encode($body)) . ".\r\n");
        smtpReply($socket, [250]);
    } finally {
        fclose($socket);
    }
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    respond(405, false, 'Please submit the enquiry form.');
}
$name = field('name');
$email = field('email');
$topic = field('topic');
$message = field('message');
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 254 ||
    $name === '' || strlen($name) > 300 || $topic === '' || strlen($topic) > 300 ||
    $message === '' || strlen($message) > 20000 || field('consent') !== 'yes' ||
    field('website') !== '' || preg_match('/[\r\n<>]/', $email) ||
    preg_match('/[\r\n]/', $name . $topic)) {
    respond(422, false, 'Please check your details and accept the privacy policy.');
}
try {
    $source = file_get_contents(__DIR__ . '/config/config.js');
    if (!preg_match('/^window\.SITE_CONFIG\s*=\s*(\{.*\});\s*$/s', $source, $matches)) {
        throw new RuntimeException('Invalid site configuration');
    }
    $site = json_decode($matches[1], true, 512, JSON_THROW_ON_ERROR);
    $success = $site['form']['success'] ?? '';
    if (!is_string($success) || $success === '') {
        throw new RuntimeException('Missing form confirmation');
    }
    $body = "Name: $name\nEmail: $email\nEnquiry: $topic\n\n$message";
    deliver(require __DIR__ . '/config/mail.php', $site['email'], $email, $body);
    respond(200, true, $success);
} catch (Throwable $error) {
    error_log('Website enquiry failed: ' . $error->getMessage());
    respond(503, false, 'Your enquiry could not be sent. Please try again or contact us by email.');
}
