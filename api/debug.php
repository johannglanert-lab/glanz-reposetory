<?php
// ════════════════════════════════════════════════════════════════════
// DIAGNOSE-DATEI — nach erfolgreichem Test bitte LÖSCHEN.
// Aufruf:  https://glanzdesign.eu/api/debug.php
// ════════════════════════════════════════════════════════════════════

declare(strict_types=1);

header('Content-Type: text/plain; charset=UTF-8');
header('Cache-Control: no-store');

echo "═══ Glanz Design — SMTP-Diagnose ═══\n\n";
echo "PHP Version: " . PHP_VERSION . "\n";
echo "Zeit:        " . date('Y-m-d H:i:s') . "\n\n";

require_once __DIR__ . '/_lib.php';

echo "── Schritt 0: Was sieht PHP im api-Ordner? ──\n";
echo "  Pfad: " . __DIR__ . "\n";
$files = @scandir(__DIR__);
if (is_array($files)) {
    foreach ($files as $f) {
        if ($f === '.' || $f === '..') continue;
        $full = __DIR__ . DIRECTORY_SEPARATOR . $f;
        $size = @filesize($full);
        $readable = @is_readable($full) ? 'lesbar' : 'NICHT lesbar';
        echo "  - " . $f . "   (" . $size . " Bytes, " . $readable . ")\n";
    }
} else {
    echo "  (Ordner konnte nicht gelesen werden)\n";
}
echo "\n";

echo "── Schritt 1: Konfiguration laden ──\n";
try {
    $cfg = glanz_load_config();
    echo "  OK\n";
    echo "  smtp_host:   " . ($cfg['smtp_host']   ?? '(fehlt)') . "\n";
    echo "  smtp_port:   " . ($cfg['smtp_port']   ?? '(fehlt)') . "\n";
    echo "  smtp_secure: " . ($cfg['smtp_secure'] ?? '(fehlt)') . "\n";
    echo "  smtp_user:   " . ($cfg['smtp_user']   ?? '(fehlt)') . "\n";
    echo "  smtp_pass:   " . (empty($cfg['smtp_pass'])
        ? "(LEER ODER PLATZHALTER NOCH DRIN!)"
        : "(" . strlen((string)$cfg['smtp_pass']) . " Zeichen lang)") . "\n";
    echo "  mail_from:   " . ($cfg['mail_from'] ?? '(fehlt)') . "\n";
    echo "  mail_to:     " . ($cfg['mail_to']   ?? '(fehlt)') . "\n";

    if (!empty($cfg['smtp_pass']) && str_contains((string)$cfg['smtp_pass'], 'HIER_DEIN')) {
        echo "\n  ⚠️  PROBLEM: Im Passwort-Feld steht noch der Platzhalter-Text!\n";
        echo "      Trag in config.local.php dein echtes Postfach-Passwort ein.\n";
        exit;
    }
} catch (\Throwable $e) {
    echo "  FEHLER: " . $e->getMessage() . "\n";
    exit;
}

echo "\n── Schritt 2: Test-Mail senden ──\n";
echo "  (Verbinde mit " . $cfg['smtp_host'] . ":" . $cfg['smtp_port'] . " ...)\n";

try {
    glanz_send_mail(
        'TEST von glanzdesign.eu (Diagnose)',
        "Wenn diese Mail in deinem Postfach landet, funktioniert SMTP korrekt.\n\n"
        . "Zeitpunkt: " . date('d.m.Y H:i:s') . "\n",
        'Debug Test',
        'kontakt@glanzdesign.eu'
    );
    echo "  ✓ ERFOLG — Mail wurde an den SMTP-Server übergeben.\n\n";
    echo "  Schau jetzt in dein Postfach kontakt@glanzdesign.eu (auch Spam-Ordner).\n";
    echo "  Wenn die Mail da ist: SMTP funktioniert — Problem liegt dann am\n";
    echo "  Honeypot-Schutz im Kontaktformular.\n";
} catch (\Throwable $e) {
    echo "  ✗ FEHLER: " . $e->getMessage() . "\n\n";
    echo "  Das ist die Stelle, wo's hakt. Schick mir diese Zeile.\n";
}

echo "\n═══ Ende ═══\n";
