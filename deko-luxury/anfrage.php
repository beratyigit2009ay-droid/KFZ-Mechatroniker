<?php
/**
 * Anfrageformular – Versand per E-Mail an DEKO.LUXURY
 * LUXURY EVENTS by DEKO.LUXURY
 *
 * Läuft auf üblichem PHP-Webhosting (z. B. IONOS, Strato, all-inkl) ohne weitere Abhängigkeiten.
 * Die E-Mail kommt übersichtlich an: oben, was gewünscht ist (Event-Art, Datum, Nachricht),
 * darunter die Kontaktdaten mit Knöpfen zum Antworten, Anrufen und für WhatsApp.
 * Antwortet immer mit JSON: {"ok": true} oder {"ok": false, "error": "…"}.
 * Ist kein PHP verfügbar (z. B. GitHub Pages), bietet die Website automatisch
 * den Versand per E-Mail-Programm oder WhatsApp an.
 */

declare(strict_types=1);

// ------------------------------------------------------------------
// Einstellungen
// ------------------------------------------------------------------
// TEST: Anfragen gehen vorübergehend an diese Adresse. Danach wieder 'deko.luxury@gmx.de' eintragen.
const EMPFAENGER = 'beratyigit.2009.ay@gmail.com';
// Absender muss zur eigenen Domain gehören, sonst landen Mails im Spam.
// Leer lassen = noreply@<aktuelle Domain>.
const ABSENDER = '';
const MIN_SEKUNDEN = 3;          // Bots senden Formulare schneller ab als Menschen
// ------------------------------------------------------------------

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
date_default_timezone_set('Europe/Berlin');

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

function h(string $wert): string
{
    return htmlspecialchars($wert, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/** Telefonnummer für WhatsApp-Links: nur Ziffern, international (0179… → 49179…). */
function whatsappNummer(string $telefon): string
{
    $ziffern = preg_replace('/\D/', '', $telefon) ?? '';
    if (strncmp($telefon, '+', 1) === 0) {
        return $ziffern;
    }
    if (strncmp($ziffern, '00', 2) === 0) {
        return substr($ziffern, 2);
    }
    if (strncmp($ziffern, '0', 1) === 0) {
        return '49' . substr($ziffern, 1);
    }
    return $ziffern;
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
$telefon = zeile(feld('telefon', 60));
// Pflicht: Name und E-Mail oder Telefon (mindestens eins davon, jeweils gültig)
$emailOk = $email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL);
$telefonOk = $telefon !== '' && strlen(preg_replace('/\D/', '', $telefon) ?? '') >= 6;
if (mb_strlen($name) < 2 || (!$emailOk && !$telefonOk) || ($email !== '' && !$emailOk)) {
    antwort(422, ['ok' => false, 'error' => 'validation']);
}

$eventart = zeile(feld('eventart', 60));
$datum = zeile(feld('datum', 80));
$nachricht = feld('nachricht', 5000);
$eingang = date('d.m.Y') . ' um ' . date('H:i') . ' Uhr';

$host = preg_replace('/[^a-z0-9.\-]/i', '', $_SERVER['SERVER_NAME'] ?? 'localhost');
$host = preg_replace('/^www\./i', '', (string) $host);
$absender = ABSENDER !== '' ? ABSENDER : 'noreply@' . $host;

// ------------------------------------------------------------------
// Betreff: auf einen Blick, worum es geht
// ------------------------------------------------------------------
$betreffTeile = array_filter([$eventart !== '' ? $eventart : 'Beratung', $datum, $name], fn ($t) => $t !== '');
$betreff = 'Neue Anfrage: ' . implode(' · ', $betreffTeile);

// ------------------------------------------------------------------
// Text-Fassung (für E-Mail-Programme ohne HTML)
// ------------------------------------------------------------------
$t = "NEUE BERATUNGSANFRAGE ÜBER DIE WEBSITE\n";
$t .= "Eingegangen am {$eingang}\n\n";
$t .= "WAS GEWÜNSCHT IST\n";
$t .= 'Event-Art:        ' . ($eventart !== '' ? $eventart : 'nicht angegeben') . "\n";
$t .= 'Datum/Zeitraum:   ' . ($datum !== '' ? $datum : 'nicht angegeben') . "\n";
$t .= "Nachricht:\n" . ($nachricht !== '' ? $nachricht : '(keine Nachricht)') . "\n\n";
$t .= "KONTAKT\n";
$t .= 'Name:             ' . $name . "\n";
if ($email !== '') {
    $t .= 'E-Mail:           ' . $email . "\n";
}
if ($telefon !== '') {
    $t .= 'Telefon:          ' . $telefon . "\n";
    $t .= 'WhatsApp:         https://wa.me/' . whatsappNummer($telefon) . "\n";
}
$t .= "\n" . ($emailOk ? 'Tipp: Mit „Antworten“ schreibt ihr direkt an ' . $name . '.' : 'Keine E-Mail angegeben – bitte telefonisch oder per WhatsApp melden.') . "\n";

// ------------------------------------------------------------------
// HTML-Fassung (übersichtliche Karte)
// ------------------------------------------------------------------
$gold = '#a8834c';
$zeileHtml = function (string $label, string $inhalt): string {
    return '<tr><td style="padding:10px 0;border-bottom:1px solid #eee6d8;width:38%;max-width:170px;padding-right:12px;vertical-align:top;'
        . 'font:12px/1.5 Arial,Helvetica,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#8a7a62">' . h($label) . '</td>'
        . '<td style="padding:10px 0;border-bottom:1px solid #eee6d8;vertical-align:top;font:16px/1.5 Arial,Helvetica,sans-serif;color:#1d1a16;overflow-wrap:anywhere;word-break:break-word">'
        . $inhalt . '</td></tr>';
};
$knopf = function (string $href, string $text, bool $voll = false) use ($gold): string {
    $stil = $voll
        ? "background:{$gold};color:#ffffff;border:1px solid {$gold};"
        : "background:#ffffff;color:#1d1a16;border:1px solid #d9c7a6;";
    return '<a href="' . h($href) . '" style="display:inline-block;margin:0 8px 8px 0;padding:11px 18px;' . $stil
        . 'font:bold 13px/1 Arial,Helvetica,sans-serif;letter-spacing:.06em;text-decoration:none;border-radius:2px">' . h($text) . '</a>';
};

$wunsch = '';
$wunsch .= $zeileHtml('Event-Art', $eventart !== '' ? '<strong>' . h($eventart) . '</strong>' : '<span style="color:#9a8f80">nicht angegeben</span>');
$wunsch .= $zeileHtml('Datum / Zeitraum', $datum !== '' ? '<strong>' . h($datum) . '</strong>' : '<span style="color:#9a8f80">nicht angegeben</span>');
$wunsch .= $zeileHtml('Nachricht', $nachricht !== '' ? nl2br(h($nachricht)) : '<span style="color:#9a8f80">keine Nachricht</span>');

$kontakt = $zeileHtml('Name', '<strong>' . h($name) . '</strong>');
if ($email !== '') {
    $kontakt .= $zeileHtml('E-Mail', '<a href="mailto:' . h($email) . '" style="color:' . $gold . '">' . h($email) . '</a>');
}
if ($telefon !== '') {
    $kontakt .= $zeileHtml('Telefon', '<a href="tel:' . h(preg_replace('/[^\d+]/', '', $telefon) ?? '') . '" style="color:' . $gold . '">' . h($telefon) . '</a>');
}

$knoepfe = '';
if ($emailOk) {
    $knoepfe .= $knopf('mailto:' . $email . '?subject=' . rawurlencode('Eure Anfrage bei DEKO.LUXURY'), 'Per E-Mail antworten', true);
}
if ($telefonOk) {
    $knoepfe .= $knopf('tel:' . (preg_replace('/[^\d+]/', '', $telefon) ?? ''), 'Anrufen', !$emailOk);
    $knoepfe .= $knopf('https://wa.me/' . whatsappNummer($telefon), 'WhatsApp schreiben');
}

$html = '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    . '<title>' . h($betreff) . '</title></head>'
    . '<body style="margin:0;padding:0;background:#f4efe6">'
    . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4efe6"><tr><td align="center" style="padding:24px 12px">'
    . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e6dcc8">'
    // Kopf
    . '<tr><td style="background:#151311;padding:22px 28px">'
    . '<div style="font:12px/1.4 Arial,Helvetica,sans-serif;letter-spacing:.3em;color:#cdb07a">LUXURY EVENTS · DEKO.LUXURY</div>'
    . '<div style="margin-top:8px;font:24px/1.25 Georgia,\'Times New Roman\',serif;color:#f6f1e9">Neue Beratungsanfrage</div>'
    . '<div style="margin-top:6px;font:13px/1.4 Arial,Helvetica,sans-serif;color:#b8ae9f">Eingegangen am ' . h($eingang) . ' über die Website</div>'
    . '</td></tr>'
    // Was gewünscht ist
    . '<tr><td style="padding:26px 28px 6px">'
    . '<div style="font:bold 12px/1.4 Arial,Helvetica,sans-serif;letter-spacing:.2em;color:' . $gold . '">WAS GEWÜNSCHT IST</div>'
    . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;table-layout:fixed">' . $wunsch . '</table>'
    . '</td></tr>'
    // Kontakt
    . '<tr><td style="padding:22px 28px 6px">'
    . '<div style="font:bold 12px/1.4 Arial,Helvetica,sans-serif;letter-spacing:.2em;color:' . $gold . '">KONTAKT</div>'
    . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;table-layout:fixed">' . $kontakt . '</table>'
    . '</td></tr>'
    // Knöpfe
    . '<tr><td style="padding:18px 28px 22px">' . $knoepfe
    . '<div style="margin-top:6px;font:13px/1.5 Arial,Helvetica,sans-serif;color:#8a7a62">'
    . ($emailOk ? 'Mit „Antworten“ in eurem E-Mail-Programm schreibt ihr direkt an ' . h($name) . '.' : 'Keine E-Mail angegeben – bitte telefonisch oder per WhatsApp melden.')
    . '</div></td></tr>'
    . '</table>'
    . '<div style="padding:14px;font:12px/1.4 Arial,Helvetica,sans-serif;color:#9a8f80">Gesendet über das Anfrageformular auf ' . h($host) . '</div>'
    . '</td></tr></table></body></html>';

// ------------------------------------------------------------------
// Versand (Text + HTML in einer E-Mail)
// ------------------------------------------------------------------
$grenze = 'b' . bin2hex(random_bytes(12));
$body = "This is a multi-part message in MIME format.\r\n\r\n"
    . "--{$grenze}\r\n"
    . "Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n"
    . chunk_split(base64_encode($t))
    . "--{$grenze}\r\n"
    . "Content-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n"
    . chunk_split(base64_encode($html))
    . "--{$grenze}--\r\n";

$header = [
    'From: LUXURY EVENTS Website <' . $absender . '>',
    'MIME-Version: 1.0',
    'Content-Type: multipart/alternative; boundary="' . $grenze . '"',
];
if ($emailOk) {
    // Antworten gehen direkt an die anfragende Person
    $header[] = 'Reply-To: =?UTF-8?B?' . base64_encode($name) . '?= <' . $email . '>';
}

$gesendet = mail(
    EMPFAENGER,
    '=?UTF-8?B?' . base64_encode($betreff) . '?=',
    $body,
    implode("\r\n", $header),
    '-f' . $absender
);

if (!$gesendet) {
    antwort(500, ['ok' => false, 'error' => 'mail']);
}
antwort(200, ['ok' => true]);
