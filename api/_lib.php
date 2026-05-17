<?php
declare(strict_types=1);

require_once __DIR__ . '/_smtp.php';

/**
 * Lädt die lokale SMTP-Konfiguration. Diese Datei liegt NUR auf dem Server
 * und enthält das SMTP-Passwort.
 *
 * Bevorzugter Ort: eine Ebene ÜBER public_html (z. B.
 *   /home/USER/domains/glanzdesign.eu/glanz_config.php).
 * Dort fasst Hostingers Git Auto-Deploy die Datei nicht an.
 *
 * @return array<string, mixed>
 */
function glanz_load_config(): array
{
    $candidates = [
        // 1) Sichere Ablage: eine Ebene über public_html (außerhalb der Web-Wurzel,
        //    außerhalb des Deploy-Pfads).
        dirname(__DIR__, 2) . '/glanz_config.php',
        // 2) Fallback: direkt im api-Ordner (wird bei jedem Auto-Deploy gelöscht).
        __DIR__ . '/config.local.php',
    ];

    foreach ($candidates as $path) {
        if (is_file($path)) {
            $config = require $path;
            if (!is_array($config)) {
                throw new \RuntimeException('Konfigurationsdatei ungültig: ' . $path);
            }
            return $config;
        }
    }

    throw new \RuntimeException(
        'Konfigurationsdatei fehlt. Bitte anlegen unter: '
        . dirname(__DIR__, 2) . '/glanz_config.php '
        . '(Inhalt: siehe api/config.example.php).'
    );
}

function glanz_send_mail(string $subject, string $body, string $replyName, string $replyEmail): void
{
    $config = glanz_load_config();
    $smtp = new GlanzSMTP($config);
    $smtp->send($subject, $body, $replyName, $replyEmail);
}

/**
 * Säubert User-Input: trim, Steuerzeichen raus, auf max. Länge kürzen.
 * Verhindert Header-Injection (CRLF → LF) und schädliche Steuerzeichen.
 */
function glanz_clean(string $value, int $maxLen = 1000): string
{
    $value = trim($value);
    $value = str_replace(["\r\n", "\r"], "\n", $value);
    $value = (string) preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value);
    if (function_exists('mb_strlen') && mb_strlen($value, 'UTF-8') > $maxLen) {
        $value = mb_substr($value, 0, $maxLen, 'UTF-8');
    } elseif (strlen($value) > $maxLen) {
        $value = substr($value, 0, $maxLen);
    }
    return $value;
}

function glanz_is_valid_email(string $email): bool
{
    return $email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

/**
 * Datei-basiertes Rate-Limit pro IP.
 * Verhindert dass jemand das Formular flutet.
 */
function glanz_check_rate_limit(string $ip, int $max = 5, int $windowSec = 3600): bool
{
    $dir = sys_get_temp_dir() . '/glanz_rate';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    $file = $dir . '/' . md5($ip) . '.log';
    $now = time();
    $entries = [];

    if (is_file($file)) {
        $raw = @file_get_contents($file);
        if (is_string($raw) && $raw !== '') {
            foreach (explode("\n", trim($raw)) as $line) {
                $ts = (int) $line;
                if ($ts > 0 && $ts >= $now - $windowSec) {
                    $entries[] = $ts;
                }
            }
        }
    }

    if (count($entries) >= $max) {
        return false;
    }

    $entries[] = $now;
    @file_put_contents($file, implode("\n", $entries), LOCK_EX);
    return true;
}

function glanz_get_ip(): string
{
    return (string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
}

/** @param array<string, mixed> $data */
function glanz_json_response(int $code, array $data): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=UTF-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function glanz_require_post(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        glanz_json_response(405, ['ok' => false, 'error' => 'Method Not Allowed']);
    }
}

/**
 * Honeypot-Check: Wenn das versteckte Feld ausgefüllt ist, ist es ein Bot.
 * Feldname '_hp_glanz' ist absichtlich kryptisch, damit Browser-Autofill ihn ignoriert.
 *
 * Hinweis: Aktuell geben wir bei Trigger einen sichtbaren Fehler zurück,
 * damit Echte Submits nicht stillschweigend verschluckt werden, wenn der
 * Schutz fälschlich greift. Später wieder still machen, sobald stabil.
 */
function glanz_check_honeypot(): void
{
    $hp = trim((string) ($_POST['_hp_glanz'] ?? ''));
    if ($hp !== '') {
        glanz_json_response(400, [
            'ok'    => false,
            'error' => 'Spam-Schutz hat ausgelöst. Bitte direkt an kontakt@glanzdesign.eu schreiben.',
        ]);
    }
}
