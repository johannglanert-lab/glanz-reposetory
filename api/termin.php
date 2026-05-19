<?php
declare(strict_types=1);

require_once __DIR__ . '/_lib.php';

glanz_require_post();
glanz_check_honeypot();

$ip = glanz_get_ip();
if (!glanz_check_rate_limit($ip, 5, 3600)) {
    glanz_json_response(429, [
        'ok'    => false,
        'error' => 'Zu viele Anfragen. Bitte versuche es in einer Stunde erneut.',
    ]);
}

$name    = glanz_clean((string) ($_POST['name']    ?? ''), 200);
$email   = glanz_clean((string) ($_POST['email']   ?? ''), 200);
$phone   = glanz_clean((string) ($_POST['phone']   ?? ''), 100);
$message = glanz_clean((string) ($_POST['message'] ?? ''), 4000);
$date    = glanz_clean((string) ($_POST['date']    ?? ''), 100);
$time    = glanz_clean((string) ($_POST['time']    ?? ''), 50);
$consent = (string) ($_POST['consent'] ?? '');

if ($name === '' || $email === '' || $phone === '' || $date === '' || $time === '') {
    glanz_json_response(400, [
        'ok'    => false,
        'error' => 'Bitte alle Pflichtfelder ausfüllen.',
    ]);
}
if (!glanz_is_valid_email($email)) {
    glanz_json_response(400, [
        'ok'    => false,
        'error' => 'Bitte eine gültige E-Mail-Adresse angeben.',
    ]);
}
if ($consent !== '1') {
    glanz_json_response(400, [
        'ok'    => false,
        'error' => 'Bitte stimmen Sie der Datenschutzerklärung zu, um die Anfrage zu senden.',
    ]);
}

$subject = 'Terminanfrage – ' . $date . ' um ' . $time . ' Uhr';
$divider = str_repeat('—', 50);

$lines = [
    'Neue Terminanfrage über glanzdesign.eu',
    $divider,
    '',
    'Wunschtermin: ' . $date,
    'Uhrzeit:      ' . $time . ' Uhr',
    '',
    'Name:    ' . $name,
    'E-Mail:  ' . $email,
    'Telefon: ' . $phone,
    '',
    'Anliegen:',
    $message !== '' ? $message : '(keine weitere Beschreibung)',
    '',
    $divider,
    'Eingegangen: ' . date('d.m.Y, H:i') . ' Uhr',
    'IP-Adresse:  ' . $ip,
];
$body = implode("\n", $lines);

try {
    glanz_send_mail($subject, $body, $name, $email);
    glanz_json_response(200, ['ok' => true]);
} catch (\Throwable $e) {
    error_log('[Glanz Termin] ' . $e->getMessage());
    glanz_json_response(500, [
        'ok'    => false,
        'error' => 'Die Anfrage konnte gerade nicht gesendet werden. '
                 . 'Bitte schreibe uns direkt an kontakt@glanzdesign.eu.',
    ]);
}
