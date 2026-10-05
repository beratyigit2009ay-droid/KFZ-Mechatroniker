# Sicherheitskonzept – Hasret Nuts

Dieses Dokument beschreibt, wie die Sicherheitsanforderungen des Inhabers in beiden Plattformen (Corporate Hub und Online-Shop) umgesetzt sind, und enthält eine Checkliste für Livegang und Betrieb. Grundprinzip: **sicher per Voreinstellung** – die gemeinsame Basis (`shared/app-base.js`) aktiviert alle Schutzmaßnahmen für jede Route automatisch; einzelne Seiten müssen nichts „einschalten“, um geschützt zu sein.

Automatisch geprüft wird das meiste davon in `test/core.test.js` (`npm test`).

---

## 1. Übersicht: Anforderung → Umsetzung

| # | Anforderung des Inhabers | Umsetzung | Ort im Code | Test |
|---|---|---|---|---|
| 1 | Geschützte private Seiten | `requireAuth` (Anmeldung nötig, Weiterleitung mit sicherem `next`), `requireAdmin` (Rolle `admin`, sonst 403); zusätzlich in `shop/app.js` global vor `/admin/**`, `/konto`, `/konto/passwort`, `/konto/loeschen`. Private Seiten: `Cache-Control: no-store`, `X-Robots-Tag: noindex`. Admin-Abmeldung nach 30 min Inaktivität. | `shared/security.js`, `shop/app.js`, `shared/session.js` | ✔ |
| 2 | Keine API-Schlüssel/Geheimnisse im Code | Alle Werte nur aus Umgebungsvariablen (`.env`, per `.gitignore` ausgeschlossen; `.env.example` ohne echte Werte). zod-Prüfung; in Produktion Startabbruch bei fehlenden/unsicheren Werten. | `shared/config.js` | ✔ |
| 3 | Ratenlimits | `express-rate-limit` je Zweck und IP, deutsche 429-Seite, Standard-Header (`RateLimit`, `Retry-After`); Login-Sperre nach 5 Fehlversuchen; max. 3 Mails/Stunde je Empfängeradresse. | `shared/security.js`, `shared/auth.js` | ✔ |
| 4 | Schutz vor SQL-Injection | Ausschließlich vorbereitete Statements mit gebundenen Parametern (better-sqlite3); keine String-Verkettung in SQL. | `shared/db.js`, alle Routen | ✔ |
| 5 | Schutz vor XSS | Nunjucks-Autoescaping (immer an), strikte CSP mit Nonce pro Anfrage, `script-src-attr 'none'` (keine Inline-Event-Handler), sicherer `jsonld`-Filter für strukturierte Daten, `nosniff`. | `shared/views.js`, `shared/app-base.js` | ✔ |
| 6 | Header-/E-Mail-Injection | Einzeilige Felder lehnen CR/LF/Steuerzeichen ab; Mailer entfernt CR/LF aus Betreff/Namen und validiert jede Adresse streng (keine Kommas, Klammern, Umbrüche). | `shared/validate.js`, `shared/mailer.js` | ✔ |
| 7 | Template-Injection | Templates sind feste Dateien; Nutzereingaben werden nie als Template kompiliert (kein `renderString` mit Fremddaten); Mails werden in JavaScript mit Escaping gebaut. | `shared/views.js`, `shared/mail-templates.js` | – |
| 8 | Open Redirects | `safeRedirectPath()` erlaubt nur relative Pfade derselben Website; abgelehnt werden `//…`, `https://…`, `/\…`, `javascript:`, kodierte Varianten, Steuerzeichen. | `shared/security.js` | ✔ |
| 9 | CSRF | Synchronizer-Token pro Sitzung, global für POST/PUT/PATCH/DELETE (Feld `_csrf` oder Header `x-csrf-token`, Vergleich in konstanter Zeit) + `SameSite=Lax` + Ablehnung von `Sec-Fetch-Site: cross-site` + CSP `form-action 'self'`. | `shared/security.js`, `shared/app-base.js` | ✔ |
| 10 | Sichere Sitzungen | Zufallstoken (32 Byte), in der DB nur SHA-256; `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, `__Host-`-Präfix; 14 Tage rollierend; neue Sitzung bei Anmeldung/Abmeldung (Fixation-Schutz); Passwortänderung beendet alle Sitzungen. | `shared/session.js` | ✔ |
| 11 | Login, Registrierung, E-Mail-Bestätigung, Passwort-Reset, Konto löschen | Bausteine in `shared/auth.js` (scrypt, Einmal-Tokens, Sperre, Löschung mit Aufbewahrung der Bestellungen); Seiten im Shop (`/konto/**`). | `shared/auth.js`, `shop/routes/auth.js`, `account.js` | ✔ (Kern) |
| 12 | Nur notwendige Cookies, kein Banner | Einziges Cookie: Sitzungs-Cookie (Warenkorb, Anmeldung, CSRF) – technisch notwendig (§ 25 Abs. 2 Nr. 2 TDDDG). Keine Tracking-, Analyse- oder Drittanbieter-Cookies; Schriften selbst gehostet (keine Google-Fonts-Anfragen). | `shared/session.js`, `shared/assets/css/fonts.css` | ✔ |

---

## 2. Details

### 2.1 Zugriffsschutz (private Seiten)

- `requireAuth`: Nicht angemeldet → `302` auf `/konto/anmelden?next=<Pfad>` (nur bei GET; der Pfad wird durch `safeRedirectPath` geprüft). Bei POST → `303` ohne `next`.
- `requireAdmin`: nicht angemeldet → Login; angemeldet ohne Admin-Rolle → `403` (wird als `admin_forbidden` protokolliert).
- Zusätzliche Absicherung in `shop/app.js` (auch falls eine Route den Schutz vergisst): `/admin` und alle Unterseiten, `/konto`, `/konto/passwort/**`, `/konto/loeschen/**`.
- Private Antworten: `Cache-Control: no-store` (kein Zwischenspeichern in Proxys oder im Zurück-Cache des Browsers) und `X-Robots-Tag: noindex, nofollow`.
- Admin-Sitzungen enden nach `ADMIN_IDLE_MINUTES` (Standard 30) ohne Aktivität.
- Rollen: nur `customer` und `admin` (Datenbank-CHECK). Admins werden ausschließlich per `npm run create-admin` auf dem Server angelegt – nie über die Website.

### 2.2 Geheimnisse und Konfiguration

- Geheimnisse (`SMTP_PASS`, `LOG_SALT`) stehen nur in `.env` auf dem Server (Rechte `600`, Eigentümer Dienstnutzer) bzw. in der Prozessumgebung.
- In Produktion verweigert die App den Start, wenn: eine Basis-URL nicht `https://` ist, `SMTP_HOST`/`MAIL_FROM`/`OWNER_EMAIL` fehlen, `LOG_SALT` fehlt oder kürzer als 32 Zeichen ist, `MAIL_TRANSPORT` nicht `smtp` ist oder `TRUST_PROXY=true` (IP-Spoofing) gesetzt ist.
- Fehlermeldungen an Nutzer enthalten nie Konfigurationswerte, Stacktraces oder interne Fehlermeldungen (nur eine kurze Fehlerkennung zum Abgleich mit dem Server-Log).

### 2.3 Ratenlimits

Zähler pro Client-IP und App-Prozess (die echte IP hinter dem Reverse Proxy wird über `TRUST_PROXY` ermittelt). Überschreiten → HTTP 429 mit deutscher Seite bzw. JSON.

| Name | Standard | Einsatz |
|---|---|---|
| `global` | 300 / 15 min | alle Seitenaufrufe (statische Dateien ausgenommen) |
| `login` | 10 / 15 min | `POST /konto/anmelden` – zusätzlich **Kontosperre 15 min nach 5 Fehlversuchen** |
| `register` | 5 / 60 min | Registrierung |
| `forgot` | 5 / 60 min | Passwort vergessen – zusätzlich max. 3 Mails/h je Adresse (`mailQuota`) |
| Bestellbestätigung | – | Gast-Bestellanfragen: Bestätigung an die eingegebene Adresse max. 3/h je Adresse (`mailQuota('order-confirmation')`); der Freitext der Anfrage wird nur an den Inhaber geschickt, nie an die eingegebene Adresse (kein Versand fremder Inhalte über die Shop-Mail) |
| `resend` | 3 / 60 min | Bestätigungsmail erneut senden |
| `forms` | 10 / 60 min | Händleranfrage, Feedback, Bestellanfrage |
| `discount` | 20 / 10 min | Rabattcode-Eingabe (Schutz vor Durchprobieren) |
| `newsletter` | 5 / 60 min | Newsletter-Anmeldung |

Anpassbar über `RATE_LIMIT_<NAME>_MAX` und `RATE_LIMIT_<NAME>_WINDOW_MIN`. Hinweis: Die Zähler liegen im Arbeitsspeicher – daher je App genau ein Prozess (kein Cluster-Modus).

### 2.4 SQL-Injection

- Alle Abfragen nutzen `db.prepare('… WHERE x = ?').get(wert)` bzw. benannte Parameter (`@name`). Werte werden nie in SQL-Strings eingesetzt.
- Der Test speichert u. a. `Robert'); DROP TABLE users;--` und liest den Wert unverändert zurück; alle Tabellen bleiben erhalten.
- Datenbank-Constraints (CHECK, UNIQUE, Fremdschlüssel mit `foreign_keys=ON`) sichern zusätzlich die Datenintegrität.

### 2.5 Cross-Site-Scripting (XSS)

- **Autoescaping** in allen Templates; `| safe` nur für eigene, vertrauenswürdige Texte – niemals für Nutzereingaben.
- **Content-Security-Policy** (pro Anfrage neue Nonce):
  `default-src 'self'; script-src 'self' 'nonce-…'; script-src-attr 'none'; style-src-elem 'self' 'nonce-…'; style-src-attr 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'` (+ `upgrade-insecure-requests` in Produktion).
  Damit laufen nur eigene Skripte bzw. Inline-Skripte mit Nonce; Inline-Event-Handler (`onclick=…`) sind wirkungslos.
- **Strukturierte Daten** (JSON-LD) nur über den Filter `jsonld`, der `<`, `>`, `&`, U+2028/U+2029 maskiert – ein `</script>` in Produkttexten kann den Script-Block nicht verlassen.
- Weitere Header: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` (+ `frame-ancestors 'none'` gegen Clickjacking), `Referrer-Policy: strict-origin-when-cross-origin`, `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`, `Permissions-Policy` (Kamera, Mikrofon, Standort, Payment aus).

### 2.6 Header- und E-Mail-Injection

- `validate.js`: E-Mail, Name, Firma, Telefon, PLZ, Ort, Straße und Rabattcode lehnen CR, LF und alle Steuerzeichen ab (Prüfung **vor** dem Trimmen – auch ein abschließender Zeilenumbruch wird abgelehnt).
- `mailer.js`: entfernt CR/LF/Steuerzeichen aus Betreff und Absendernamen, prüft jede Empfänger- und Antwortadresse mit einem strengen Muster (keine Kommas, Semikola, spitzen Klammern, Anführungszeichen, Umbrüche), max. 10 Empfänger; Dateizugriff und URL-Abruf in nodemailer sind deaktiviert. Absender ist immer `MAIL_FROM` – Nutzeradressen erscheinen höchstens als geprüftes `Reply-To`.
- HTTP-Header werden nie aus Nutzereingaben gebaut; Weiterleitungsziele laufen durch `safeRedirectPath`.

### 2.7 Template-Injection (SSTI)

Nunjucks rendert ausschließlich Template-**Dateien** aus `corporate/views`, `shop/views` und `shared/views`. Nutzereingaben werden nur als Daten (escaped) eingesetzt und nie als Template-Quelltext kompiliert. E-Mails werden in JavaScript zusammengesetzt; jede Einsetzung im HTML-Teil wird escaped, Links sind nur als `http(s)` zulässig.

### 2.8 Open Redirects

`safeRedirectPath(next, fallback = '/')` akzeptiert nur Pfade, die mit genau einem `/` beginnen, keinen Backslash und keine Steuerzeichen/Leerzeichen enthalten, auch nach URL-Dekodierung nicht mit `//` beginnen und beim Auflösen gegen eine Dummy-Origin dieselbe Origin behalten. Zusätzlich wird der **aufgelöste** Pfad erneut geprüft, denn `new URL()` macht aus Punkt-Segmenten wie `/.//evil.com`, `/%2e//evil.com` oder `/x/..//evil.com` den fremden Pfad `//evil.com`. Getestet u. a. mit `//evil.com`, `https://evil.com`, `/\evil.com`, `javascript:alert(1)`, `/%2F%2Fevil.com` und diesen Punkt-Segment-Varianten.

### 2.9 CSRF

- Jede Sitzung hat ein eigenes 32-Byte-Token. Formulare enthalten es als verstecktes Feld (`{{ forms.csrf() }}`), JavaScript-Anfragen senden es im Header `x-csrf-token` (aus `<meta name="csrf-token">`).
- Die Prüfung läuft **global** für alle zustandsändernden Methoden; Vergleich in konstanter Zeit (SHA-256 + `timingSafeEqual`).
- Zusätzlich: Sitzungs-Cookie `SameSite=Lax`, Ablehnung von Anfragen mit `Sec-Fetch-Site: cross-site`, CSP `form-action 'self'`.
- Fehlschlag → 403 mit verständlicher deutscher Seite („Formular abgelaufen – bitte neu laden“), Ereignis `csrf_failure` wird protokolliert.

### 2.10 Sitzungen

- Token: 32 Zufallsbytes (base64url) im Cookie; in der Tabelle `sessions` steht nur `SHA-256(Token)` – ein Datenbank-Leck verrät keine gültigen Sitzungen.
- Cookie: `__Host-hn_sid_<app>` (Produktion) mit `HttpOnly; Secure; SameSite=Lax; Path=/`, ohne `Domain` → nur für genau diese Domain, nicht per JavaScript lesbar.
- Laufzeit 14 Tage, rollierend; Admin-Leerlauf 30 Minuten; abgelaufene Sitzungen werden stündlich gelöscht.
- `req.regenerateSession()` bei Anmeldung, Abmeldung und Passwortänderung: altes Token wird sofort ungültig (Schutz vor Session-Fixation), neues CSRF-Token.
- Sitzungen entstehen erst bei Bedarf (Warenkorb, Formular, Anmeldung) – reine Seitenaufrufe und Bots erzeugen keine Datensätze.

### 2.11 Passwortspeicherung

- `crypto.scrypt` mit N = 2^16, r = 8, p = 1, 16 Byte Zufalls-Salt, 64 Byte Schlüssel; Format `scrypt$N$r$p$salt$hash`; Vergleich mit `timingSafeEqual`. Parameter aus gespeicherten Hashes werden auf sinnvolle Bereiche begrenzt (Schutz vor manipulierten Hashes/DoS).
- Passwortregeln: 10–128 Zeichen, nicht in einer Liste häufiger Passwörter, nicht gleich der E-Mail-Adresse, nicht nur ein wiederholtes Zeichen.
- Login-Sperre: 5 Fehlversuche → 15 Minuten gesperrt (auch das richtige Passwort wird dann abgelehnt). Das Passwort-Zurücksetzen hebt die Sperre auf.

### 2.12 Schutz vor Konten-Ausspähung (Account Enumeration)

- **Anmeldung:** dieselbe neutrale Meldung für „unbekannte Adresse“ und „falsches Passwort“; bei unbekannter Adresse wird trotzdem ein scrypt-Vergleich gegen einen Dummy-Hash gerechnet (gleiche Antwortzeit).
- **Passwort vergessen:** immer dieselbe Antwort („Falls ein Konto mit dieser Adresse existiert, haben wir Ihnen einen Link gesendet.“), unabhängig davon, ob das Konto existiert.
- **Registrierung:** bei bereits registrierter Adresse dieselbe Erfolgsmeldung wie bei einer neuen Registrierung; der Inhaber der Adresse erhält stattdessen einen Hinweis bzw. kann das Passwort zurücksetzen.
- **Bestätigungsmail erneut senden:** neutrale Antwort, gedrosselt.
- Ratenlimits begrenzen automatisiertes Durchprobieren zusätzlich.

### 2.13 Einmal-Tokens (E-Mail-Bestätigung, Passwort-Reset, Newsletter)

- 32 Zufallsbytes (base64url); in `auth_tokens` steht nur der SHA-256-Hash.
- **Einmalig** (Verbrauch atomar über `used_at IS NULL`), **befristet** (Bestätigung 24 h, Reset 60 min, Newsletter 72 h – Empfehlung) und an den **Typ** gebunden.
- Ein neues Token entwertet ältere unbenutzte Tokens desselben Typs.
- Links in Mails öffnen zuerst eine Seite mit Bestätigungs-Button (GET verbraucht nichts); erst das Absenden (POST, mit CSRF-Schutz) verbraucht das Token – E-Mail-Scanner und Link-Vorschauen können Tokens so nicht „verbrauchen“.
- Tokens erscheinen nie in Server-Logs (Fehlerprotokolle enthalten nur den Pfad ohne Query-String).

### 2.14 Protokollierung ohne rohe IP-Adressen

- Tabelle `security_events`: Ereignistyp, ggf. Nutzer-ID, **gesalzener SHA-256-Hash der IP** (`LOG_SALT`, gekürzt auf 128 Bit) und gekürzter User-Agent.
- Protokolliert werden u. a. Anmeldungen (erfolgreich/fehlgeschlagen), Sperren, CSRF-Fehler, Honeypot-Treffer, Ratenlimit-Überschreitungen, verweigerte Admin-Zugriffe.
- Beim Löschen eines Kontos werden zugehörige Ereignisse anonymisiert (`user_id = NULL`).
- Server-Logs (`journalctl`) enthalten keine Formularinhalte, Passwörter oder Tokens.

### 2.15 Spam-Schutz

Formulare enthalten ein für Menschen unsichtbares Honeypot-Feld (`website`). Ist es ausgefüllt, wird Erfolg vorgetäuscht, aber nichts gespeichert oder versendet. Zusammen mit dem `forms`-Ratenlimit genügt das ohne Captcha (keine Drittanbieter, keine Einwilligung nötig).

### 2.16 Preise und Bestellungen

- Preise werden **nie** aus dem Browser übernommen – immer aus `shared/data/catalog.json` (`priceCentsFor`, `getVariant`); Mengen auf 1–99 begrenzt; Bundle-Auswahl wird serverseitig geprüft.
- Rabattcodes werden serverseitig geprüft (Zeitraum, Mindestbestellwert, Nutzungslimit, einmal je E-Mail) und gegen Durchprobieren gedrosselt.
- Bestellungen sind unverbindliche Anfragen; es werden keine Zahlungsdaten erhoben.

### 2.17 Transport und Infrastruktur

- HTTPS über den Reverse Proxy (Let's Encrypt), HSTS (`max-age=31536000; includeSubDomains`) in Produktion, `upgrade-insecure-requests`.
- Node-Prozesse lauschen nur auf `127.0.0.1`; `TRUST_PROXY=1`, damit die echte Client-IP für Ratenlimits verwendet wird, ohne `X-Forwarded-For`-Spoofing zu erlauben.
- Request-Größe begrenzt (Formulare/JSON max. 20 kB, max. 200 Felder), Zeitlimits für Header/Anfragen.
- systemd-Härtung (eigener Dienstnutzer, `ProtectSystem=strict`, Schreibrechte nur für `data/` und `var/`) – siehe README.

### 2.18 Abhängigkeiten

- Bewusst wenige, verbreitete Pakete: express, helmet, express-rate-limit, nunjucks, zod, nodemailer, better-sqlite3, compression, cookie-parser, dotenv. Keine Frontend-Frameworks, keine CDNs.
- `package-lock.json` ist eingecheckt; auf dem Server `npm ci --omit=dev` (reproduzierbar, ohne Entwicklungspakete).
- Regelmäßig (mindestens monatlich und vor jedem Update): `npm run audit:deps` und `npm outdated`; Node.js-LTS-Sicherheitsupdates zeitnah einspielen.

### 2.19 Datensicherung

- Tägliche Sicherung mit `npm run backup` (SQLite-Online-Backup, WAL-sicher), Aufbewahrung 14 Stände, Dateirechte `600`.
- Zusätzlich verschlüsselte Kopie außer Haus (z. B. restic/borg). Wiederherstellung regelmäßig testen.
- Sicherungen enthalten personenbezogene Daten → Zugriff nur für den Inhaber/Administrator.

### 2.20 Datenschutz (Datensparsamkeit)

- Gespeichert wird nur, was für Bestellanfragen, Händleranfragen, Feedback, Konten und Newsletter (Double-Opt-in) nötig ist.
- Keine Analyse-/Tracking-Werkzeuge, keine externen Schriften, keine eingebetteten Drittinhalte.
- Konto löschen entfernt Anmeldedaten, Sitzungen und Tokens sofort; Bestellanfragen bleiben wegen gesetzlicher Aufbewahrungspflichten erhalten, sind aber nicht mehr mit einem Konto verknüpft.

---

## 3. Checkliste vor dem Livegang

- [ ] `.env` auf dem Server angelegt, Rechte `600`, Eigentümer Dienstnutzer; **nicht** im Repository
- [ ] `NODE_ENV=production`, `TRUST_PROXY=1`, `HOST=127.0.0.1`
- [ ] `CORPORATE_BASE_URL` / `SHOP_BASE_URL` mit `https://`
- [ ] `LOG_SALT` mit `openssl rand -hex 32` erzeugt
- [ ] SMTP-Zugang getestet (Registrierung → Bestätigungsmail kommt an, SPF/DKIM/DMARC der Absenderdomain eingerichtet)
- [ ] `OWNER_EMAIL` erhält Testbestellung, Test-Händleranfrage und Test-Feedback
- [ ] HTTPS aktiv, HTTP leitet auf HTTPS um; Header prüfen (z. B. securityheaders.com, Ziel: A/A+)
- [ ] Administrator per `npm run create-admin` angelegt; starkes, einzigartiges Passwort
- [ ] `/admin` und `/konto` ohne Anmeldung nicht erreichbar (Weiterleitung zur Anmeldung)
- [ ] Ports 3001/3002 von außen **nicht** erreichbar (Firewall, z. B. `ufw allow 80,443/tcp`)
- [ ] Tägliches Backup per Cron eingerichtet und eine Wiederherstellung getestet
- [ ] `npm run audit:deps` ohne kritische Befunde
- [ ] Impressum, Datenschutzerklärung (inkl. Hoster und Mailanbieter), AGB, Widerruf, Versand & Zahlung vom Inhaber ergänzt
- [ ] Platzhalter (`[GEWICHT]`, `[ZUTATEN]`, Preise „bitte bestätigen“, Allergene „vorläufig“) geprüft und ersetzt

## 4. Laufender Betrieb

- Monatlich: `npm run audit:deps`, `npm outdated`, Node.js-Updates prüfen; Protokolle auf Auffälligkeiten sehen (`journalctl -u hasret-shop`, Tabelle `security_events`).
- Bei Verdacht auf Kompromittierung: betroffene Passwörter zurücksetzen (beendet alle Sitzungen), `LOG_SALT` und SMTP-Passwort wechseln, Server-Zugänge prüfen; alle Sitzungen beenden mit
  `sqlite3 data/hasret.db "DELETE FROM sessions;"`.
- Sicherheitsereignisse älter als 12 Monate löschen (Datensparsamkeit), z. B.
  `sqlite3 data/hasret.db "DELETE FROM security_events WHERE created_at < date('now','-12 months');"`.
