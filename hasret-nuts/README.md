# Hasret Nuts – Corporate Hub & Online-Shop

Zwei getrennte Plattformen für **Hasret Kuruyemiş** (Markenname **Hasret Nuts**, Inhaber Eyyüp Koca, Memmingen):

| Plattform | Zweck | Standard-Port | Start |
|---|---|---|---|
| **Corporate Hub** (`corporate/`) | Markenauftritt, Philosophie, Messe-Chronik, B2B-Händlerbereich mit Anfrageformular – **kein Verkauf, keine Preise** | 3001 | `npm run start:corporate` |
| **Online-Shop** (`shop/`) | Produkte, Warenkorb, Rabattcodes, **unverbindliche Bestellanfrage** (Bestätigung durch den Inhaber per E-Mail, noch keine Online-Zahlung), Kundenkonto, Verwaltung | 3002 | `npm run start:shop` |

Beide Apps teilen sich eine gemeinsame Bibliothek (`shared/`) und **eine** SQLite-Datenbank. Technik: Node.js 22, Express 5, Nunjucks-Templates (serverseitig gerendert), better-sqlite3, nodemailer. Keine externen Dienste, keine Tracking- oder Marketing-Cookies, Schriften selbst gehostet.

---

## Inhalt

1. [Voraussetzungen](#voraussetzungen)
2. [Projektstruktur](#projektstruktur)
3. [Einrichtung für die Entwicklung](#einrichtung-für-die-entwicklung)
4. [npm-Skripte](#npm-skripte)
5. [Umgebungsvariablen](#umgebungsvariablen)
6. [Administrator anlegen](#administrator-anlegen)
7. [E-Mails in der Entwicklung](#e-mails-in-der-entwicklung)
8. [Betrieb auf einem Server (Deployment)](#betrieb-auf-einem-server-deployment)
9. [Datensicherung (SQLite-Backups)](#datensicherung-sqlite-backups)
10. [Google Search Console](#google-search-console)
11. [Produkte, Preise, Allergene und Rabattcodes pflegen](#produkte-preise-allergene-und-rabattcodes-pflegen)
12. [Sicherheit](#sicherheit)
13. [Tests](#tests)
14. [Vor dem Livegang: offene Platzhalter](#vor-dem-livegang-offene-platzhalter)

---

## Voraussetzungen

- **Node.js 22** oder neuer (LTS) und npm 10+ – `node --version`
- Linux-Server (empfohlen: Debian/Ubuntu) mit einem **Reverse Proxy für HTTPS** (Caddy oder nginx)
- Ein SMTP-Postfach für den Versand (z. B. beim Hosting- oder E-Mail-Anbieter)
- `better-sqlite3` bringt vorkompilierte Binärdateien mit. Falls auf exotischen Systemen ein Kompilieren nötig ist: `build-essential` und `python3` installieren.

## Projektstruktur

```
hasret-nuts/
├─ corporate/            Corporate Hub (app.js, server.js, routes/, views/, public/)
├─ shop/                 Online-Shop  (app.js, server.js, routes/, views/, public/)
├─ shared/               gemeinsame Bibliothek
│  ├─ config.js          Konfiguration aus Umgebungsvariablen (zod-geprüft, Fail-fast in Produktion)
│  ├─ db.js              SQLite-Verbindung, Migrationen, Transaktionen
│  ├─ migrations/        SQL-Migrationen (001_init.sql …)
│  ├─ app-base.js        gemeinsame Express-Basis (Sicherheits-Header, Sitzungen, CSRF, Templates)
│  ├─ session.js         datenbankgestützte Sitzungen
│  ├─ security.js        CSRF, Zugriffsschutz, Ratenlimits, Honeypot, sichere Weiterleitungen
│  ├─ auth.js            Passwörter (scrypt), Einmal-Tokens, Konten, Login-Sperre, Sicherheitsprotokoll
│  ├─ mailer.js          E-Mail-Versand (+ mail-templates.js)
│  ├─ validate.js        Eingabeprüfung mit deutschen Fehlermeldungen
│  ├─ views.js · seo.js · catalog.js · errors.js
│  ├─ data/              catalog.json, allergens.json, offers.json  ← Produkte, Preise, Allergene, Angebote
│  ├─ assets/            Logo, Animationen, Schriften (woff2), Icons – ausgeliefert unter /assets
│  └─ views/             gemeinsame Templates (SEO-Kopf, Flash, Formular-Makros, Fehlerseiten, Logo, Intro)
├─ scripts/              migrate, seed, create-admin, backup, dev, copy-fonts
├─ test/                 automatisierte Tests (node:test)
├─ docs/                 SICHERHEIT.md und weitere Dokumentation
├─ data/                 SQLite-Datenbank (nicht im Repository)
└─ var/                  Laufzeitdaten: Entwicklungs-Mails, Backups (nicht im Repository)
```

## Einrichtung für die Entwicklung

```bash
cd hasret-nuts
npm install                 # Abhängigkeiten installieren
cp .env.example .env        # Konfiguration anlegen (Standardwerte genügen für die Entwicklung)
npm run migrate             # Datenbank anlegen (passiert beim Start auch automatisch)
npm run seed                # Rabattcodes aus shared/data/offers.json übernehmen
npm run create-admin        # Administratorkonto anlegen (Passwort wird verdeckt abgefragt)
npm run dev                 # beide Apps mit automatischem Neustart starten
```

Danach erreichbar unter <http://localhost:3001> (Corporate Hub) und <http://localhost:3002> (Shop).
Templates werden in der Entwicklung ohne Cache geladen – Änderungen an `.njk`-Dateien sind sofort sichtbar.

## npm-Skripte

| Befehl | Wirkung |
|---|---|
| `npm run start:corporate` | Corporate Hub starten (Port `CORPORATE_PORT`, Standard 3001) |
| `npm run start:shop` | Online-Shop starten (Port `SHOP_PORT`, Standard 3002) |
| `npm run dev` | Beide Apps gleichzeitig mit automatischem Neustart (`node --watch`) |
| `npm run migrate` | Ausstehende Datenbank-Migrationen einspielen (idempotent; erfolgt auch beim Start) |
| `npm run seed` | Fehlende Rabattcodes aus `shared/data/offers.json` anlegen · `npm run seed -- --update` aktualisiert auch bestehende |
| `npm run create-admin` | Administrator anlegen oder bestehendes Konto befördern |
| `npm run backup` | Konsistente Datenbanksicherung nach `var/backups` (siehe unten) |
| `npm test` | Alle automatisierten Tests ausführen |
| `npm run fonts` | Schriften (woff2) aus den @fontsource-Paketen nach `shared/assets/fonts` kopieren und `fonts.css` erzeugen |
| `npm run audit:deps` | Sicherheitsprüfung der Laufzeit-Abhängigkeiten (`npm audit`) |

## Umgebungsvariablen

Alle Einstellungen kommen aus Umgebungsvariablen bzw. der Datei `.env` (Vorlage mit Erläuterungen: [`.env.example`](.env.example)). **Im Code stehen keine Zugangsdaten oder Schlüssel.** `.env` ist per `.gitignore` vom Repository ausgeschlossen.

| Variable | Pflicht in Produktion | Bedeutung (Standard) |
|---|---|---|
| `NODE_ENV` | ✔ (`production`) | `development` · `production` · `test` |
| `HOST` | | Bind-Adresse (`127.0.0.1` – hinter dem Proxy so lassen) |
| `CORPORATE_PORT`, `SHOP_PORT` | | Ports (`3001`, `3002`) |
| `CORPORATE_BASE_URL`, `SHOP_BASE_URL` | ✔ (https) | Öffentliche Adressen für Canonical, Sitemap, Open Graph, Mail-Links |
| `TRUST_PROXY` | ✔ (z. B. `1`) | Anzahl vertrauenswürdiger Proxys für die echte Client-IP (`false`) |
| `DATABASE_PATH` | | SQLite-Datei (`data/hasret.db`) |
| `MAIL_TRANSPORT` | | `smtp` · `file` · `memory` (Produktion: `smtp`, Entwicklung: `file`) |
| `MAIL_FROM` | ✔ | Absender, z. B. `Hasret Nuts <shop@ihre-domain.de>` |
| `MAIL_REPLY_TO` | | Optionale Antwortadresse |
| `OWNER_EMAIL` | ✔ | Empfänger für Bestellanfragen, Händleranfragen, Feedback |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | ✔ (`SMTP_HOST`) | SMTP-Zugang (587 + STARTTLS bzw. 465 + `SMTP_SECURE=true`) |
| `LOG_SALT` | ✔ (≥ 32 Zeichen) | Geheimes Salz für IP-Hashes in Protokollen (`openssl rand -hex 32`) |
| `SESSION_TTL_DAYS` | | Sitzungsdauer, rollierend (`14`) |
| `ADMIN_IDLE_MINUTES` | | Abmeldung von Admins nach Inaktivität (`30`, `0` = aus) |
| `RATE_LIMIT_<NAME>_MAX`, `RATE_LIMIT_<NAME>_WINDOW_MIN` | | Ratenlimits überschreiben (siehe [docs/SICHERHEIT.md](docs/SICHERHEIT.md)) |
| `ALLOW_INDEXING` | | Suchmaschinen-Indexierung (nur in Produktion `true`; für Staging `false`) |
| `GOOGLE_SITE_VERIFICATION_CORPORATE`, `GOOGLE_SITE_VERIFICATION_SHOP` | | Bestätigungscode der Google Search Console |
| `ORDER_PREFIX` | | Präfix der Bestellnummern (`HN` → `HN-2026-0001`) |
| `CATALOG_PATH`, `ALLERGENS_PATH`, `OFFERS_PATH` | | Abweichende Pfade der Katalogdateien (Tests) |

In Produktion **startet die App nicht**, wenn eine Pflichtangabe fehlt, eine Basis-URL nicht mit `https://` beginnt oder `TRUST_PROXY=true` gesetzt ist – die Fehlermeldung nennt alle Probleme auf einmal.

## Administrator anlegen

```bash
npm run create-admin
```

Das Skript fragt E-Mail-Adresse, Passwort (verdeckt, zweimal) und Namen ab. Existiert das Konto bereits, wird es zum Administrator befördert (optional mit neuem Passwort – dabei werden alle Sitzungen beendet). Für eine automatisierte Ersteinrichtung geht auch:

```bash
ADMIN_EMAIL=inhaber@ihre-domain.de ADMIN_PASSWORD='…' npm run create-admin
```

Die Variablen danach wieder entfernen (auch aus dem Shell-Verlauf: `history -d …`). Zugangsdaten werden nirgends gespeichert außer als scrypt-Hash in der Datenbank. Anmeldung: `https://shop.ihre-domain.de/konto/anmelden`, Verwaltung: `/admin`.

## E-Mails in der Entwicklung

In der Entwicklung (`MAIL_TRANSPORT=file`, Standard) werden keine Mails verschickt. Jede Mail landet als `.eml`-Datei in **`var/mail/`** (mit jedem Mailprogramm zu öffnen), und der erste Link der Mail (z. B. Bestätigungs- oder Passwort-Link) wird in der Konsole ausgegeben:

```
[mail] an kunde@example.com · Bitte bestätigen Sie Ihre E-Mail-Adresse – Hasret Nuts → var/mail/2026-…-bitte-bestatigen….eml
[mail] Link: http://localhost:3002/konto/bestaetigen?token=…
```

In Tests (`NODE_ENV=test`) landen Mails nur im Speicher (`mailer.outbox`).

## Betrieb auf einem Server (Deployment)

Empfohlenes Setup: beide Node-Prozesse laufen nur auf `127.0.0.1`, davor ein Reverse Proxy, der HTTPS (Let's Encrypt) terminiert. Beispiel-Domains: `www.ihre-domain.de` (Corporate) und `shop.ihre-domain.de` (Shop).

### 1. Code und Abhängigkeiten

```bash
sudo adduser --system --group --home /srv/hasret-nuts hasret
sudo -u hasret git clone <repository> /srv/hasret-nuts/app
cd /srv/hasret-nuts/app/hasret-nuts
sudo -u hasret npm ci --omit=dev
sudo -u hasret cp .env.example .env && sudo chmod 600 .env   # dann .env bearbeiten
sudo -u hasret npm run migrate && sudo -u hasret npm run seed && sudo -u hasret npm run create-admin
```

Die Apps lesen `.env` aus dem Projektordner selbst ein (bereits gesetzte Umgebungsvariablen haben Vorrang). Wichtige Werte in `.env`: `NODE_ENV=production`, `TRUST_PROXY=1`, `HOST=127.0.0.1`, beide `*_BASE_URL` mit `https://`, SMTP-Zugang, `MAIL_FROM`, `OWNER_EMAIL`, `LOG_SALT`.

### 2. Reverse Proxy

**Caddy** (`/etc/caddy/Caddyfile`, HTTPS-Zertifikate automatisch):

```caddyfile
www.ihre-domain.de {
	encode zstd gzip
	reverse_proxy 127.0.0.1:3001
}
ihre-domain.de {
	redir https://www.ihre-domain.de{uri} permanent
}
shop.ihre-domain.de {
	encode zstd gzip
	reverse_proxy 127.0.0.1:3002
}
```

**nginx** (Ausschnitt; Zertifikate z. B. mit certbot):

```nginx
server {
    listen 443 ssl http2;
    server_name shop.ihre-domain.de;
    ssl_certificate     /etc/letsencrypt/live/shop.ihre-domain.de/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/shop.ihre-domain.de/privkey.pem;
    client_max_body_size 64k;

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;   # überschreibt (nicht anhängen) → kein Spoofing
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
    }
}
server {
    listen 80;
    server_name shop.ihre-domain.de;
    return 301 https://$host$request_uri;
}
```

(Analog für `www.ihre-domain.de` → Port 3001.) Mit genau einem Proxy davor gilt `TRUST_PROXY=1`. Sicherheits-Header (CSP, HSTS, X-Frame-Options …) setzt die App selbst; der Proxy muss sie nur durchreichen.

### 3. Prozesse dauerhaft betreiben

**systemd** (empfohlen) – `/etc/systemd/system/hasret-shop.service` (für den Corporate Hub analog mit `start:corporate`):

```ini
[Unit]
Description=Hasret Nuts – Online-Shop
After=network.target

[Service]
Type=simple
User=hasret
Group=hasret
WorkingDirectory=/srv/hasret-nuts/app/hasret-nuts
Environment=NODE_ENV=production
ExecStart=/usr/bin/node shop/server.js
Restart=on-failure
RestartSec=5
# Härtung
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/srv/hasret-nuts/app/hasret-nuts/data /srv/hasret-nuts/app/hasret-nuts/var

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now hasret-corporate hasret-shop
journalctl -u hasret-shop -f        # Protokolle ansehen
```

**PM2** (Alternative):

```bash
npm install -g pm2
pm2 start shop/server.js --name hasret-shop
pm2 start corporate/server.js --name hasret-corporate
pm2 save && pm2 startup
```

Wichtig: je App **genau ein Prozess** (kein Cluster-Modus) – Ratenlimits werden im Arbeitsspeicher des Prozesses gezählt, und SQLite ist für einen Schreibprozess pro App ausgelegt.

### 4. Updates einspielen

```bash
cd /srv/hasret-nuts/app && sudo -u hasret git pull
cd hasret-nuts && sudo -u hasret npm ci --omit=dev && sudo -u hasret npm run migrate
sudo systemctl restart hasret-corporate hasret-shop
```

## Datensicherung (SQLite-Backups)

Die gesamte Datenhaltung steckt in einer Datei (`data/hasret.db` plus `-wal`/`-shm` während des Betriebs). **Nie** die Datei einfach im laufenden Betrieb kopieren – stattdessen:

```bash
npm run backup                                   # → var/backups/hasret-YYYYMMDD-HHMMSSmmm.db (behält 14)
BACKUP_DIR=/srv/backup BACKUP_KEEP=30 npm run backup
```

Das Skript nutzt die Online-Backup-API von SQLite und ist im laufenden Betrieb sicher. Täglicher Cronjob (Benutzer `hasret`, `crontab -e`):

```cron
15 3 * * * cd /srv/hasret-nuts/app/hasret-nuts && /usr/bin/node scripts/backup.js >> var/backup.log 2>&1
```

Zusätzlich die Sicherungen **verschlüsselt außer Haus** kopieren (z. B. `restic` oder `borg` auf einen externen Speicher) – sie enthalten personenbezogene Daten (Bestellungen, Konten). Wiederherstellung: App stoppen, Sicherungsdatei nach `data/hasret.db` kopieren, `-wal`/`-shm`-Dateien entfernen, App starten. Die Wiederherstellung sollte einmal testweise geprobt werden.

## Google Search Console

1. In der [Google Search Console](https://search.google.com/search-console) je Plattform eine **URL-Präfix-Property** anlegen (`https://www.ihre-domain.de/` und `https://shop.ihre-domain.de/`).
2. Bestätigungsmethode **„HTML-Tag“** wählen und nur den Code aus `content="…"` übernehmen:
   `GOOGLE_SITE_VERIFICATION_CORPORATE=…` bzw. `GOOGLE_SITE_VERIFICATION_SHOP=…` in `.env`, App neu starten, in der Search Console „Bestätigen“ klicken. Das Meta-Tag erscheint automatisch auf jeder Seite (`shared/views/partials/seo-head.njk`).
3. Unter **Sitemaps** jeweils `sitemap.xml` einreichen (`https://shop.ihre-domain.de/sitemap.xml`). Die `robots.txt` verweist ebenfalls darauf.
4. Strukturierte Daten (Organization, Product, BreadcrumbList …) mit dem [Test für Rich-Suchergebnisse](https://search.google.com/test/rich-results) prüfen.

Außerhalb der Produktion (oder mit `ALLOW_INDEXING=false`) sperrt `robots.txt` alles und jede Seite trägt `noindex` – Test- und Staging-Umgebungen erscheinen so nicht bei Google.

## Produkte, Preise, Allergene und Rabattcodes pflegen

Alle Produktdaten liegen in **`shared/data/`** (JSON, mit jedem Texteditor bearbeitbar; vorher Sicherungskopie anlegen):

- **`catalog.json`** – Kategorien und Produkte. Preise stehen in **Cent** je Variante (`"priceCents": 800` = 8,00 €). Neue Variante: eindeutige `sku` vergeben. Die vom Inhaber genannten „ca.“-Preise sind als `"priceNote": "bitte bestätigen"` markiert. Unbekannte Angaben stehen als Platzhalter in eckigen Klammern (`[GEWICHT]`, `[ZUTATEN]`, `[X] ml`) und müssen vor dem Livegang anhand der Etiketten ersetzt werden.
- **Allergene** stehen je Variante unter `allergens.contains` (enthält) und `allergens.mayContain` (kann Spuren enthalten) mit den IDs aus **`allergens.json`** (14 Hauptallergene nach LMIV Anhang II: `gluten`, `krebstiere`, `eier`, `fisch`, `erdnuesse`, `soja`, `milch`, `schalenfruechte`, `sellerie`, `senf`, `sesam`, `sulfite`, `lupinen`, `weichtiere`). Solange `"allergensConfirmed": false` gesetzt ist, zeigt der Shop den Hinweis „vorläufig – vom Inhaber anhand der Etiketten zu bestätigen“. Nach Prüfung des Etiketts auf `true` setzen.
- **`offers.json`** – Rabattcodes (`codes`), Bundles und Angebotsbanner. Rabattcodes: `type` `percent` (`value` = Prozent) oder `fixed` (`value` = Cent), `minSubtotalCents`, `startsAt`/`endsAt` (ISO-Datum), `maxUses`, `oncePerEmail`. Neue Codes übernehmen mit `npm run seed`, geänderte mit `npm run seed -- --update`. Codes lassen sich außerdem im Verwaltungsbereich unter `/admin/rabattcodes` einsehen und verwalten.

Nach Änderungen an den JSON-Dateien die Apps neu starten (`systemctl restart hasret-shop hasret-corporate`) – der Katalog wird beim Start einmal eingelesen. Preise werden **ausschließlich serverseitig** aus `catalog.json` übernommen; Preisangaben aus dem Browser werden nie verwendet.

## Sicherheit

Das vollständige Sicherheitskonzept mit Checkliste je Anforderung steht in **[docs/SICHERHEIT.md](docs/SICHERHEIT.md)**. Kurzfassung:

- Private Bereiche (`/konto`, `/admin`) nur nach Anmeldung bzw. mit Admin-Rolle; Admins werden nach 30 Minuten Inaktivität abgemeldet.
- Keine Geheimnisse im Code – nur Umgebungsvariablen; Produktionsstart bricht bei unsicherer Konfiguration ab.
- Ratenlimits für alle Formulare, Login-Sperre nach 5 Fehlversuchen.
- Schutz vor SQL-Injection (nur vorbereitete Statements), XSS (Autoescaping + strikte Content-Security-Policy mit Nonce), Header-/E-Mail-Injection, Template-Injection, Open Redirects und CSRF.
- Sitzungen: zufällige Tokens, in der DB nur als SHA-256-Hash, Cookies `HttpOnly`, `Secure`, `SameSite=Lax`, `__Host-`-Präfix.
- Passwörter mit scrypt; Einmal-Links (Bestätigung, Passwort-Reset) sind einmalig, laufen ab und liegen nur gehasht vor.
- Protokolle enthalten keine rohen IP-Adressen (nur gesalzene Hashes).
- Nur technisch notwendige Cookies → kein Cookie-Banner nötig (Hinweisseite `/cookies`).
- Abhängigkeiten regelmäßig prüfen: `npm run audit:deps`; Node.js-Sicherheitsupdates einspielen.

## Tests

```bash
npm test                         # alle Tests
node --test test/core.test.js    # nur die Kern-Tests (Sicherheit, Sitzungen, Validierung …)
```

Die Tests starten die Apps auf freien Ports mit jeweils eigener temporärer Datenbank; es werden keine echten Mails versendet.

## Vor dem Livegang: offene Platzhalter

Bewusst wurden **keine Fakten erfunden**. Vor der Veröffentlichung müssen vom Inhaber ergänzt bzw. bestätigt werden:

- Impressum (Anschrift, Telefon, USt-IdNr. o. Ä.), Datenschutzerklärung (Hoster, Mailanbieter), AGB, Widerrufsbelehrung, Versand & Zahlung
- Alle Platzhalter in eckigen Klammern (`[GEWICHT]`, `[ZUTATEN]`, `[X] ml`, `[TELEFON]`, `[DATUM]` …)
- Preise („bitte bestätigen“) und Allergenangaben je Produkt (`allergensConfirmed`)
- Alle Produkt- und Eventfotos (`[FOTO-PLATZHALTER: …]` mit Foto-ID, Seitenverhältnis und Mindestgröße – Fotos erstellt der Inhaber selbst)
- Messe-Termine (Festiculture Paris/Lyon) mit bestätigten Daten
