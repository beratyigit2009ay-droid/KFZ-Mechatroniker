<?php
/**
 * Anfrageformular – Versand per E-Mail
 * LUXURY EVENTS by DEKO.LUXURY
 *
 * Läuft auf üblichem PHP-Webhosting (z. B. IONOS, Strato, all-inkl) ohne weitere Abhängigkeiten.
 * Antwortet immer mit JSON: {"ok": true} oder {"ok": false, "error": "…"}.
 * Ist kein PHP verfügbar, bietet die Website automatisch den Versand per E-Mail-Programm an.
 */

declare(strict_types=1);

// ------------------------------------------------------------------
// Einstellungen
// ------------------------------------------------------------------
const EMPFAENGER = 'deko.luxury@gmx.de';
const BETREFF_PREFIX = 'Website-Anfrage';
// Absender muss zur eigenen Domain gehören, sonst landen Mails im Spam.
// Leer lassen = noreply@<aktuelle Domain>.
const ABSENDER = '';
const MIN_SEKUNDEN = 3;          // Bots senden Formulare schneller ab als Menschen
// ------------------------------------------------------------------

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function antwort(int $status, array $daten): void
{
    http_response_code($status);
    echo json_encode($daten, JSON_UNESCAPED_UNICODE);
    exit;
}

function feld(string $name, int $max = 300): string
{
    $wert = $_POST[$name] ?? '';
    if (!is_string($wert)) {
        return '';
    }
    $wert = trim(str_replace(["\r\n", "\r"], "\n", $wert));
    return mb_substr($wert, 0, $max);
}

function zeile(string $wert): string
{
    // Keine Zeilenumbrüche in einzeiligen Feldern (Schutz vor Header-Injection)
    return trim(preg_replace('/[\r\n\t]+/', ' ', $wert) ?? '');
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    antwort(405, ['ok' => false, 'error' => 'method']);
}

// Spamschutz: Honeypot und Mindestzeit
if (feld('website') !== '') {
    antwort(200, ['ok' => true]);
}
$ts = (int) feld('ts', 20);
if ($ts > 0 && (time() * 1000 - $ts) < MIN_SEKUNDEN * 1000) {
    antwort(200, ['ok' => true]);
}

$name = zeile(feld('name', 120));
$email = zeile(feld('email', 160));
if (mb_strlen($name) < 2 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    antwort(422, ['ok' => false, 'error' => 'validation']);
}

$leistungen = [];
if (isset($_POST['leistungen']) && is_array($_POST['leistungen'])) {
    foreach (array_slice($_POST['leistungen'], 0, 10) as $l) {
        if (is_string($l)) {
            $leistungen[] = zeile(mb_substr($l, 0, 80));
        }
    }
}

$felder = [
    'Anliegen'              => zeile(feld('anliegen', 40)),
    'Name'                  => $name,
    'E-Mail'                => $email,
    'Telefon'               => zeile(feld('telefon', 60)),
    'Eventart'              => zeile(feld('eventart', 60)),
    'Veranstaltungsdatum'   => zeile(feld('datum', 20)),
    'Location'              => zeile(feld('location', 160)),
    'Gästeanzahl'           => zeile(feld('gaeste', 40)),
    'Budgetrahmen'          => zeile(feld('budget', 40)),
    'Wunschtermin Showroom' => zeile(feld('wunschtermin', 120)),
    'Leistungen'            => implode(', ', $leistungen),
];

$text = "Neue Anfrage über die Website\n" . str_repeat('=', 32) . "\n\n";
foreach ($felder as $label => $wert) {
    if ($wert !== '') {
        $text .= $label . ':' . str_repeat(' ', max(1, 23 - mb_strlen($label))) . $wert . "\n";
    }
}
$nachricht = feld('nachricht', 5000);
if ($nachricht !== '') {
    $text .= "\nNachricht:\n" . $nachricht . "\n";
}
$text .= "\n--\nGesendet am " . date('d.m.Y \u\m H:i') . " Uhr\n";

$host = preg_replace('/[^a-z0-9.\-]/i', '', $_SERVER['SERVER_NAME'] ?? 'localhost');
$host = preg_replace('/^www\./i', '', (string) $host);
$absender = ABSENDER !== '' ? ABSENDER : 'noreply@' . $host;

$betreff = BETREFF_PREFIX . ($felder['Eventart'] !== '' ? ' – ' . $felder['Eventart'] : '') . ' – ' . $name;
$betreff = '=?UTF-8?B?' . base64_encode($betreff) . '?=';

$header = [
    'From: LUXURY EVENTS Website <' . $absender . '>',
    'Reply-To: ' . $name . ' <' . $email . '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
];

$gesendet = mail(EMPFAENGER, $betreff, $text, implode("\r\n", $header), '-f' . $absender);

if (!$gesendet) {
    antwort(500, ['ok' => false, 'error' => 'mail']);
}
antwort(200, ['ok' => true]);
