<?php
declare(strict_types=1);

/**
 * Minimaler SMTP-Client für Glanz Design.
 * Unterstützt SSL (Port 465) und STARTTLS (Port 587) mit AUTH LOGIN.
 * Sendet UTF-8 Plain-Text-Mails mit korrektem Header-Encoding.
 */
final class GlanzSMTP
{
    /** @var resource|null */
    private $conn = null;

    /** @var array<string, mixed> */
    private array $config;

    /** @param array<string, mixed> $config */
    public function __construct(array $config)
    {
        $this->config = $config;
    }

    public function send(string $subject, string $body, string $replyName, string $replyEmail): void
    {
        $host   = (string) ($this->config['smtp_host']   ?? '');
        $port   = (int)    ($this->config['smtp_port']   ?? 465);
        $secure = (string) ($this->config['smtp_secure'] ?? 'ssl');
        $user   = (string) ($this->config['smtp_user']   ?? '');
        $pass   = (string) ($this->config['smtp_pass']   ?? '');

        if ($host === '' || $user === '' || $pass === '') {
            throw new \RuntimeException('SMTP-Konfiguration unvollständig.');
        }

        $prefix = ($secure === 'ssl') ? 'ssl://' : '';
        $errno = 0;
        $errstr = '';
        $this->conn = @stream_socket_client(
            $prefix . $host . ':' . $port,
            $errno,
            $errstr,
            15,
            STREAM_CLIENT_CONNECT
        );
        if (!$this->conn) {
            throw new \RuntimeException("SMTP-Verbindung fehlgeschlagen: $errstr ($errno)");
        }
        stream_set_timeout($this->conn, 15);

        try {
            $this->read(220);
            $this->cmd('EHLO ' . $this->getHelo(), 250);

            if ($secure === 'tls') {
                $this->cmd('STARTTLS', 220);
                $ok = @stream_socket_enable_crypto(
                    $this->conn,
                    true,
                    STREAM_CRYPTO_METHOD_TLS_CLIENT
                        | STREAM_CRYPTO_METHOD_TLSv1_1_CLIENT
                        | STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT
                );
                if (!$ok) {
                    throw new \RuntimeException('TLS-Upgrade fehlgeschlagen.');
                }
                $this->cmd('EHLO ' . $this->getHelo(), 250);
            }

            $this->cmd('AUTH LOGIN', 334);
            $this->cmd(base64_encode($user), 334);
            $this->cmd(base64_encode($pass), 235);

            $from = (string) ($this->config['mail_from'] ?? $user);
            $to   = (string) ($this->config['mail_to']   ?? $user);
            $this->cmd("MAIL FROM:<$from>", 250);
            $this->cmd("RCPT TO:<$to>", 250);
            $this->cmd('DATA', 354);

            $message = $this->buildMessage($subject, $body, $replyName, $replyEmail);
            $this->write($message . "\r\n.\r\n");
            $this->read(250);

            $this->cmd('QUIT', 221);
        } finally {
            if (is_resource($this->conn)) {
                @fclose($this->conn);
            }
            $this->conn = null;
        }
    }

    private function buildMessage(string $subject, string $body, string $replyName, string $replyEmail): string
    {
        $fromName = $this->encodeHeader((string) ($this->config['mail_from_name'] ?? 'Glanz Design'));
        $from     = (string) ($this->config['mail_from'] ?? '');
        $to       = (string) ($this->config['mail_to']   ?? '');

        $headers = [
            'Date: ' . date('r'),
            'Message-ID: <' . bin2hex(random_bytes(8)) . '@glanzdesign.eu>',
            'From: ' . $fromName . ' <' . $from . '>',
            'To: <' . $to . '>',
            'Reply-To: ' . $this->encodeHeader($replyName) . ' <' . $replyEmail . '>',
            'Subject: ' . $this->encodeHeader($subject),
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
            'X-Mailer: GlanzDesign-Website',
        ];

        // Normalisiere Zeilenenden auf CRLF
        $bodyNorm = preg_replace('/\r\n|\r|\n/', "\r\n", $body) ?? $body;
        // SMTP Dot-Stuffing: Zeilen, die mit "." beginnen, mit zusätzlichem "." prefixen
        $bodyStuffed = preg_replace('/^\./m', '..', $bodyNorm) ?? $bodyNorm;

        return implode("\r\n", $headers) . "\r\n\r\n" . $bodyStuffed;
    }

    private function encodeHeader(string $value): string
    {
        // RFC 2047 B-Encoding wenn nicht-ASCII enthalten
        if (preg_match('/[^\x20-\x7E]/', $value)) {
            return '=?UTF-8?B?' . base64_encode($value) . '?=';
        }
        return $value;
    }

    private function getHelo(): string
    {
        $host = $_SERVER['HTTP_HOST'] ?? 'glanzdesign.eu';
        // Sanitize: nur a-z, 0-9, .-
        $host = preg_replace('/[^a-zA-Z0-9.\-]/', '', (string) $host) ?? 'glanzdesign.eu';
        return $host !== '' ? $host : 'glanzdesign.eu';
    }

    private function cmd(string $command, ?int $expectCode = null): string
    {
        $this->write($command . "\r\n");
        return $this->read($expectCode);
    }

    private function write(string $data): void
    {
        if (!is_resource($this->conn)) {
            throw new \RuntimeException('SMTP-Verbindung verloren.');
        }
        $written = @fwrite($this->conn, $data);
        if ($written === false) {
            throw new \RuntimeException('SMTP-Schreibfehler.');
        }
    }

    private function read(?int $expectCode = null): string
    {
        if (!is_resource($this->conn)) {
            throw new \RuntimeException('SMTP-Verbindung verloren.');
        }
        $response = '';
        while (($line = fgets($this->conn, 515)) !== false) {
            $response .= $line;
            // Mehrzeilige Antworten: nur Zeilen mit "XYZ " (Leerzeichen an Pos. 3) sind das letzte Stück.
            if (isset($line[3]) && $line[3] === ' ') {
                break;
            }
        }
        if ($response === '') {
            $meta = stream_get_meta_data($this->conn);
            if (!empty($meta['timed_out'])) {
                throw new \RuntimeException('SMTP-Timeout.');
            }
            throw new \RuntimeException('SMTP: keine Antwort.');
        }
        if ($expectCode !== null) {
            $code = (int) substr($response, 0, 3);
            if ($code !== $expectCode) {
                throw new \RuntimeException("SMTP: erwartet $expectCode, bekam: " . trim($response));
            }
        }
        return $response;
    }
}
