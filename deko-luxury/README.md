# LUXURY EVENTS by DEKO.LUXURY – Website

Statische Website (HTML, CSS, JavaScript) ohne Framework und ohne Build-Schritt.
Sie läuft auf jedem Webhosting. Das Kontaktformular nutzt PHP, das bei üblichen deutschen
Hostern (IONOS, Strato, all-inkl …) bereits vorhanden ist.

```
deko-luxury/
├── index.html            Startseite (alle Bereiche)
├── impressum.html        Impressum (Vorlage mit Platzhaltern)
├── datenschutz.html      Datenschutzerklärung (Vorlage, beschreibt die echten Funktionen)
├── 404.html              Fehlerseite
├── anfrage.php           Versand des Anfrageformulars per E-Mail
├── robots.txt / sitemap.xml / site.webmanifest / .htaccess
├── favicon.svg / favicon.ico / apple-touch-icon.png
├── assets/
│   ├── css/style.css     Gestaltung (Farben & Schriften als Variablen ganz oben)
│   ├── js/main.js        Interaktionen (Menü, Galerie, Formular, Karte, Animationen)
│   ├── fonts/            Schriften lokal eingebunden (keine Verbindung zu Google)
│   ├── brand/            Logo (aus dem Original vektorisiert), Monogramm, Social-Media-Bild
│   └── img/              Bilder als WebP in mehreren Größen
└── tools/bilder-optimieren.mjs   Macht eigene Fotos webfertig
```

## Lokal ansehen

```bash
cd deko-luxury
npm start            # öffnet einen kleinen Server auf http://localhost:8080
```

Ohne Node.js reicht auch ein Doppelklick auf `index.html`. Das Formular braucht dann
allerdings PHP und bietet automatisch den Versand per E-Mail-Programm an.

## Vor dem Livegang: Checkliste

Es wurden **keine Unternehmensdaten erfunden**. Wo Angaben fehlen, stehen gestrichelt
unterstrichene Platzhalter (CSS-Klasse `ph`) oder Kommentare mit `PLATZHALTER`.
Alle Stellen findet man mit der Suche nach `PLATZHALTER` und `class="ph"`.

| Wo | Was fehlt |
| --- | --- |
| **Alle Bilder** | Die Bilder in `assets/img/` sind generierte Stimmungsbilder (Kerzenlicht, Seide, Blüten, Marmor). Sie sind Platzhalter und **müssen durch eigene Fotos ersetzt werden**, vor allem Portfolio und Showroom. Anleitung unten. |
| `index.html` → Portfolio | Projektangaben je Bild über `data-title`, `data-eventtyp`, `data-location`, `data-konzept`, `data-beschreibung`. Leere Felder blendet die Galerie aus. |
| `index.html` → Showroom | Straße & Hausnummer, Öffnungszeiten, Link „Route planen“ (Adresse in `query=` eintragen). |
| `index.html` → Kontakt | Telefonnummer (Beispiel für Click-to-Call steht im Kommentar). |
| `index.html` → Kundenstimmen | Nur echte, freigegebene Bewertungen. Vorlage steht im Kommentar über dem Bereich. Ab zwei Stimmen erscheint automatisch eine Blätter-Navigation. Optional: Link zum Google-Profil, Eventlocations, Presse – ebenfalls als Kommentar vorbereitet. |
| `index.html` → Footer | Instagram-Link nur einfügen, wenn das Profil existiert (auskommentierte Vorlage). |
| `index.html` → `<head>` | Domain eintragen: `canonical`, `og:url`, `og:image` (absolute Adressen). Strukturierte Daten ergänzen: `url`, `image`, `telephone`, `streetAddress`, Öffnungszeiten, `sameAs` (Instagram). |
| `index.html` → Strukturierte Daten | `areaServed` enthält Burgau, Ulm und Augsburg (aus den gewünschten Suchbegriffen abgeleitet). Bitte bestätigen oder anpassen. |
| `index.html` → Formular | Budgetrahmen und Gästezahl-Stufen prüfen und bei Bedarf an die eigenen Pakete anpassen. |
| `impressum.html` | Name, Rechtsform, Anschrift, Telefon, USt-IdNr., Verbraucherstreitbeilegung, Bildnachweise. |
| `datenschutz.html` | Hosting-Anbieter, Speicherdauer der Logfiles, E-Mail-Anbieter, Stand. Bitte rechtlich prüfen lassen. |
| `sitemap.xml`, `robots.txt` | Domain eintragen. |
| Logo | Das Logo wurde aus dem Screenshot vektorisiert. Liegt die Originaldatei (SVG/PDF/AI) vor, `assets/brand/logo-gold.svg` und `monogramm.svg` damit ersetzen. |

## Eigene Fotos einsetzen

1. Fotos in den Ordner `bilder-original/` legen und wie das zu ersetzende Bild benennen,
   z. B. `hero.jpg`, `leistung-floristik.jpg`, `portfolio-04.jpg`.
2. `npm install` (einmalig), dann `npm run bilder`.
3. Das Skript erzeugt alle benötigten Größen als WebP in `assets/img/`.
4. In `index.html` die **Alt-Texte** an das neue Motiv anpassen. Gute Alt-Texte beschreiben
   das Bild und nennen den Anlass, z. B. „Hochzeitstafel mit weißen Rosen und Kerzenlicht in Burgau“.

| Datei | Bereich | Format | Motiv-Idee |
| --- | --- | --- | --- |
| `hero` | Startbild | Quer, mind. 2400 px | Das stärkste Bild: dekorierte Tafel oder Location bei Abendlicht. Wichtiges Motiv rechts, links bleibt Platz für den Text. |
| `intro` | Einleitung | Hoch 4:5 | Florales Detail |
| `leistung-*` (6) | Leistungen | Hoch 4:5 | Je ein Bild pro Leistung |
| `portfolio-01` … `-12` | Portfolio | Quer oder hoch | Eigene Projekte, je zwei pro Kategorie |
| `stil` | Unser Stil | Hoch 4:5 | Atmosphäre, Licht, Materialien |
| `showroom-1` … `-3` | Showroom | 1 quer, 2 hoch | Echte Aufnahmen des Showrooms |

Die Bilder werden per CSS zugeschnitten. Andere Seitenverhältnisse funktionieren also auch.
Steht beim Startbild das Motiv anders, in `style.css` bei `.hero__media img` den Wert
`object-position` anpassen.

## Kontaktformular

- `anfrage.php` sendet jede Anfrage an **deko.luxury@gmx.de** (Einstellung oben in der Datei).
  Antworten gehen per „Antworten“ direkt an die anfragende Person.
- Für gute Zustellbarkeit in `ABSENDER` eine Adresse der eigenen Domain eintragen
  (z. B. `website@ihre-domain.de`).
- Spamschutz: unsichtbares Honeypot-Feld und Mindestzeit, kein Captcha nötig.
- Ist kein PHP verfügbar (z. B. GitHub Pages, Netlify), zeigt die Seite automatisch an,
  dass die Anfrage per E-Mail-Programm gesendet werden kann. Alle Angaben sind dann schon vorausgefüllt.
  Alternativ kann ein Formulardienst (z. B. Formspree) eingetragen werden: nur das `action`-Attribut
  des Formulars ändern. Der Dienst muss mit JSON antworten (`{"ok": true}`).

## Datenschutz & Cookies

- Keine Tracking- oder Marketing-Cookies, keine externen Schriften, kein Cookie-Banner nötig.
- Die interaktive Karte (OpenStreetMap) lädt erst nach Klick bzw. Zustimmung
  („Cookie-Einstellungen“ im Footer). Vorher zeigt die Seite eine eigene, lagegetreue Übersichtskarte.
- Die Auswahl wird nur im Browser gespeichert (localStorage).

## SEO

- Title, Description, Open-Graph-Bild (`assets/brand/og-image.jpg`), saubere H1/H2-Struktur.
- Strukturierte Daten (`LocalBusiness`) mit Ort Burgau und Leistungen.
- Suchbegriffe wie Eventdekoration, Hochzeitsdekoration, Floristik, Burgau, Ulm und Augsburg
  stehen natürlich im Text, ohne Keyword-Stuffing.
- Empfehlung: Google-Unternehmensprofil für den Showroom anlegen. Für Local SEO ist das der
  wirksamste Schritt. Danach den Profil-Link unter „Kundenstimmen“ einbauen.

## Technik & Qualität

- Lighthouse (lokal gemessen): Desktop 100 / 100 / 100 / 100,
  Mobil 93 Performance · 100 Barrierefreiheit · 100 Best Practices · 100 SEO.
- Alle Bilder zusammen ca. 0,8 MB (WebP, responsive Größen, Lazy Loading).
- Animationen respektieren „Bewegung reduzieren“ des Betriebssystems.
  Inhalte sind auch ohne JavaScript vollständig sichtbar.
- Schriften: Cormorant Garamond, Jost, Cinzel (SIL Open Font License, lokal eingebunden).

## Design-Grundlagen

Farben und Schriften sind als Variablen am Anfang von `assets/css/style.css` definiert:

| Variable | Farbe | Einsatz |
| --- | --- | --- |
| `--ink` | #151311 | Tiefes Schwarz (Hero, CTA, Footer) |
| `--char` | #201d1a | Anthrazit (Ablauf) |
| `--ivory` | #f6f1e9 | Warmes Off-White (Grundfläche) |
| `--sand` | #ede4d6 | Champagner-Fläche (Showroom) |
| `--gold` / `--gold-soft` | #a8834c / #cdb07a | Feine Linien und Akzente, sparsam eingesetzt |
