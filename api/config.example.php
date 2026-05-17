<?php
// ════════════════════════════════════════════════════════════════════
// GLANZ DESIGN — SMTP-Konfiguration (VORLAGE)
// ════════════════════════════════════════════════════════════════════
//
// Diese Datei ist nur eine BEISPIEL-VORLAGE und wird vom Webserver
// NICHT ausgeliefert (siehe .htaccess).
//
// ════════════════════════════════════════════════════════════════════
// SO RICHTEST DU DAS LIVE EIN  (einmalig, dauert ~3 Minuten):
// ════════════════════════════════════════════════════════════════════
//
// 1. SMTP-Zugangsdaten holen
//    ─ Hostinger-Panel öffnen
//    ─ Emails  →  kontakt@glanzdesign.eu  →  "Configure desktop app"
//      (oder "Connect Apps / SMTP-IMAP-Einstellungen")
//    ─ Du brauchst: Server, Port, Username, Passwort
//
// 2. Datei auf Hostinger anlegen
//    ─ Hostinger File-Manager öffnen
//    ─ Pfad:  domains/glanzdesign.eu/public_html/api/
//    ─ Neue Datei erstellen:  config.local.php
//    ─ Den GESAMTEN Inhalt dieser Beispiel-Datei dort hineinkopieren
//    ─ Die Werte unten mit deinen echten SMTP-Daten ersetzen
//      (vor allem 'smtp_pass'!)
//
// 3. Speichern — fertig.
//
//    config.local.php ist per .gitignore vom Repo ausgeschlossen und
//    bleibt bei künftigen Auto-Deploys unberührt.
//
// ════════════════════════════════════════════════════════════════════

return [
    // ── SMTP-Server ──
    // Bei dir: 'smtp.hostinger.com' (Postfach liegt direkt bei Hostinger).
    // Falls Titan: wäre stattdessen 'smtp.titan.email'.
    'smtp_host'   => 'smtp.hostinger.com',

    // ── Port & Verschlüsselung ──
    // 465 = SSL (empfohlen), 587 = STARTTLS
    'smtp_port'   => 465,
    'smtp_secure' => 'ssl',   // 'ssl' bei Port 465, 'tls' bei Port 587

    // ── Authentifizierung ──
    // Das ist dein E-Mail-Postfach + dessen Passwort.
    'smtp_user'   => 'kontakt@glanzdesign.eu',
    'smtp_pass'   => 'HIER_DEIN_POSTFACH_PASSWORT_EINTRAGEN',

    // ── Absender der vom Webserver erzeugten Mails ──
    // Muss zum Postfach oben passen (sonst lehnt der Server's ab).
    'mail_from'      => 'kontakt@glanzdesign.eu',
    'mail_from_name' => 'Glanz Design Website',

    // ── Empfänger ──
    // Wohin die Anfragen geliefert werden. Bei dir: dasselbe Postfach.
    'mail_to'        => 'kontakt@glanzdesign.eu',
];
