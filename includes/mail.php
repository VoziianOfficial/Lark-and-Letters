<?php
declare(strict_types=1);

namespace LarkLetters;

use RuntimeException;

function smtpReply($socket, array $allowed): string
{
    $reply = '';
    $code = null;
    do {
        $line = fgets($socket, 1024);
        if ($line === false || strlen($reply) + strlen($line) > 16384 || !preg_match('/^(\d{3})([ -])[^\r\n]*\r\n$/', $line, $match)) {
            throw new RuntimeException('Invalid SMTP response');
        }
        if ($code !== null && $code !== $match[1]) {
            throw new RuntimeException('Inconsistent SMTP response');
        }
        $code = $match[1];
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

function deliverSmtp(array $mail, string $recipient, string $replyTo, string $body): void
{
    $host = $mail['host'];
    $from = $mail['from'];
    if (!is_string($host) || !filter_var($host, FILTER_VALIDATE_DOMAIN, FILTER_FLAG_HOSTNAME) ||
        !in_array($mail['security'], ['starttls', 'smtps'], true) ||
        !filter_var($mail['port'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 65535]]) ||
        !is_string($mail['username']) || $mail['username'] === '' ||
        !is_string($mail['password']) || $mail['password'] === '' ||
        strpos($mail['username'] . $mail['password'], "\0") !== false) {
        throw new RuntimeException('Incomplete SMTP configuration');
    }
    if (!extension_loaded('openssl') || !function_exists('stream_socket_client')) {
        throw new RuntimeException('SMTP requires PHP OpenSSL and stream_socket_client');
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
            if (!preg_match('/^250[ -]STARTTLS\b/im', $features)) {
                throw new RuntimeException('SMTP server does not advertise STARTTLS');
            }
            command($socket, 'STARTTLS', [220]);
            if (@stream_socket_enable_crypto($socket, true) !== true) {
                throw new RuntimeException('Unable to secure SMTP connection');
            }
            $features = command($socket, $helo, [250]);
        }
        if (preg_match('/^250[ -]AUTH[ =][^\r\n]*\bPLAIN\b/im', $features)) {
            $credentials = base64_encode("\0" . $mail['username'] . "\0" . $mail['password']);
            $auth = command($socket, 'AUTH PLAIN ' . $credentials, [235, 334]);
            if (substr($auth, 0, 3) === '334') {
                command($socket, $credentials, [235]);
            }
        } elseif (preg_match('/^250[ -]AUTH[ =][^\r\n]*\bLOGIN\b/im', $features)) {
            command($socket, 'AUTH LOGIN', [334]);
            command($socket, base64_encode($mail['username']), [334]);
            command($socket, base64_encode($mail['password']), [235]);
        } else {
            throw new RuntimeException('SMTP provider must support password authentication (PLAIN or LOGIN)');
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

function validMailAddress(string $email): bool
{
    return strlen($email) <= 254 && filter_var($email, FILTER_VALIDATE_EMAIL) !== false &&
        !preg_match('/[\x00-\x20\x7f<>]/', $email);
}

function deliverResend(array $mail, string $recipient, string $replyTo, string $body): void
{
    if (!extension_loaded('curl')) {
        throw new RuntimeException('HTTPS mail requires the PHP cURL extension');
    }
    if (!is_string($mail['api_key']) || $mail['api_key'] === '' || preg_match('/[\x00-\x20\x7f]/', $mail['api_key'])) {
        throw new RuntimeException('Missing or invalid RESEND_API_KEY');
    }
    $payload = json_encode([
        'from' => $mail['from'],
        'to' => [$recipient],
        'reply_to' => $replyTo,
        'subject' => 'New website enquiry',
        'text' => $body,
    ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
    // Fixed HTTPS endpoint; never accept a URL or recipient from the form.
    $curl = curl_init('https://api.resend.com/emails');
    try {
        curl_setopt_array($curl, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $mail['api_key'],
                'Content-Type: application/json',
                'Accept: application/json',
            ],
            CURLOPT_USERAGENT => 'LarkLettersContact/1.0',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
        ]);
        $response = curl_exec($curl);
        if ($response === false) {
            throw new RuntimeException('HTTPS mail connection failed, cURL code ' . curl_errno($curl));
        }
        $status = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
        if ($status < 200 || $status >= 300) {
            throw new RuntimeException('HTTPS mail provider rejected request, HTTP ' . $status);
        }
        $result = json_decode($response, true, 512, JSON_THROW_ON_ERROR);
        if (!is_array($result) || !is_string($result['id'] ?? null) || $result['id'] === '') {
            throw new RuntimeException('HTTPS mail provider did not confirm acceptance');
        }
    } finally {
        // PHP 8.5 frees CurlHandle automatically (curl_close is deprecated).
        unset($curl);
    }
}

function deliver(array $mail, string $recipient, string $replyTo, string $body): void
{
    $mail += ['transport' => 'smtp', 'from' => '', 'username' => '', 'password' => '',
        'host' => '', 'port' => 587, 'security' => 'starttls', 'api_key' => ''];
    $mail['from'] = $mail['from'] ?: $mail['username'];
    foreach ([$mail['from'], $recipient, $replyTo] as $address) {
        if (!is_string($address) || !validMailAddress($address)) {
            throw new RuntimeException('Invalid sender, recipient or reply address');
        }
    }
    // Do not report success for the placeholder left until the client is ready.
    foreach ([$mail['from'], $recipient] as $address) {
        if (preg_match('/@(?:[^@]*\.)?(?:example|invalid|localhost|test)$/i', $address)) {
            throw new RuntimeException('Replace the placeholder email before sending');
        }
    }
    if ($mail['transport'] === 'smtp') {
        deliverSmtp($mail, $recipient, $replyTo, $body);
    } elseif ($mail['transport'] === 'resend') {
        deliverResend($mail, $recipient, $replyTo, $body);
    } else {
        throw new RuntimeException('MAIL_TRANSPORT must be smtp or resend');
    }
}

