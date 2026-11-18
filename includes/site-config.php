<?php
declare(strict_types=1);

namespace LarkLetters;

/** Read the same public configuration for the page and the form recipient. */
function siteConfig(): array
{
    $source = @file_get_contents(dirname(__DIR__) . '/config/config.js');
    if ($source === false || !preg_match('/\A\s*window\.SITE_CONFIG\s*=\s*(\{.*\})\s*;?\s*\z/s', $source, $matches)) {
        throw new \RuntimeException('Invalid config/config.js: expected window.SITE_CONFIG = { JSON };');
    }
    $site = json_decode($matches[1], true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($site) || !is_string($site['email'] ?? null)) {
        throw new \RuntimeException('Missing email in config/config.js');
    }
    $site['email'] = trim($site['email']);
    if (!filter_var($site['email'], FILTER_VALIDATE_EMAIL) || strlen($site['email']) > 254) {
        throw new \RuntimeException('Invalid email in config/config.js');
    }
    return $site;
}
