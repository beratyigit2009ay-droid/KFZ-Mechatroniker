# FIRST CLASS Schlüsseldienst – Website

Premium-Website für den Schlüsseldienst **FIRST CLASS**: Türöffnung, Schlosswechsel und
Sicherheitstechnik. Gebaut mit React und Tailwind CSS, jede Seite wird vorab zu
statischem HTML gerendert (gut für SEO und schnelle Ladezeiten).

## Fertige Website

Der Ordner **`dist/`** enthält die fertige Website. Den kompletten Inhalt einfach auf den
Webspace hochladen – fertig. Die Seiten funktionieren auf der eigenen Domain, in einem
Unterordner und auch beim direkten Öffnen der `index.html` im Browser.

| Datei                     | Inhalt                                             |
| ------------------------- | -------------------------------------------------- |
| `index.html`              | Startseite mit allen Bereichen                     |
| `tueroeffnung.html` …     | eine Unterseite pro Leistung („Mehr erfahren“)     |
| `impressum.html`          | vorbereitetes Impressum (Platzhalter ausfüllen!)   |
| `datenschutz.html`        | vorbereitete Datenschutzerklärung (ausfüllen!)     |

## Vor der Veröffentlichung

1. **Unternehmensdaten prüfen** in `src/config.js` (Telefon, E-Mail, Öffnungszeiten und
   Ort sind eingetragen; offen sind Straße und Zahlungsarten):
   - `phone` – ersetzt `[TELEFONNUMMER]` überall; alle Anrufbuttons (`tel:`-Links) nutzen
     automatisch diese Nummer.
   - `area` – `[STADT UND UMGEBUNG]`
   - `hours` – `[ÖFFNUNGSZEITEN]`
   - `paymentMethods` – `[ZAHLUNGSARTEN]` (FAQ)
   - `url` – die spätere Domain; dann werden Canonical-Links und eine `sitemap.xml` erzeugt.
   - `offersCarOpening` – auf `false` setzen, falls keine Autoöffnung angeboten wird.
2. **Impressum und Datenschutzerklärung** in `src/pages/LegalPage.jsx` vervollständigen und
   rechtlich prüfen lassen.
3. **Kontaktformular anbinden** (optional): In `src/config.js` unter `formEndpoint` eine
   Adresse eintragen, die JSON per POST annimmt (z. B. ein Formular-Dienst). Solange das
   Feld leer ist, prüft das Formular die Eingaben und weist ehrlich darauf hin, dass
   **nichts übermittelt** wurde – mit direktem Anrufbutton.
4. Danach neu bauen: `npm run build`.

## Intro

Die Startseite beginnt mit einem kurzen Intro:

1. Haustür bei Nacht, die Wandleuchte schaltet sich ein.
2. Die Kamera fährt auf das Schloss zu, die Tür wird im Schnitt sichtbar.
3. Der Schlüssel hebt Kernstifte (Messing) und Gehäusestifte (Stahl) an – die
   Stifte bewegen sich passend zu den Zacken des Schlüssels.
4. Alle Trennfugen liegen auf der Scherlinie, der Schlüssel dreht, warmes Licht
   dringt durch die Fuge – und die Seite öffnet sich genau dort.

Kurze Texte erklären jeden Schritt. Verhalten:

- **Erster Besuch:** Vollversion (ca. 5 Sekunden). **Spätere Besuche:** Kurzversion
  (ca. 2 Sekunden). **Innerhalb einer Sitzung:** kein Intro mehr.
- Kein Intro bei Direktlinks (z. B. `#kontakt`, `?anliegen=…`), bei Klicks innerhalb
  der Website, bei „Bewegung reduzieren“ oder im Datensparmodus.
- Startet erst, wenn der Tab sichtbar ist; jederzeit überspringbar (Button, Esc,
  Scrollen).
- `#intro` an die Adresse anhängen zeigt die Vollversion erneut.
- Code: `src/components/KeyIntro.jsx`, Entscheidungslogik in `scripts/prerender.mjs`;
  zum Entfernen die Zeile mit `<KeyIntro />` in `src/App.jsx` löschen.

## Zylinder zum Ausprobieren

Der Bereich „So funktioniert Ihr Schließzylinder“ (Startseite, Schlosswechsel,
Sicherheitstechnik) lässt Besucher den Schlüssel selbst einführen und drehen – mit
passendem oder falschem Schlüssel. Beim falschen Schlüssel werden die blockierenden
Stifte markiert. Intro und Erklärer nutzen dasselbe Modell (`src/lock.js`).

## Bilder

Grundlage sind eigens gezeichnete Illustrationen (goldene Linien auf Anthrazit) in
`public/images/`, erzeugt von `scripts/illustrations.mjs` (`npm run illustrations`).

### Fotos

Für alle Bildplätze gibt es KI-generierte Fotos (Nano Banana), eingetragen mit
Download-Adresse und Bildbeschreibung in `scripts/photos.json`. Einbinden mit:

```bash
npm run photos   # lädt die Fotos, erzeugt WebP in mehreren Größen
npm run build
```

`npm run photos` lädt jedes Foto einmalig nach `photos-src/` (nicht im Git),
erzeugt daraus `public/images/photos/<name>-<breite>.webp` und schreibt
`src/photos.generated.js`. Jedes dort eingetragene Foto ersetzt automatisch die
gleichnamige Illustration; die Seiten laden je nach Bildschirm die passende Größe.
Fehlt ein Foto, bleibt an dieser Stelle die Illustration.

- **Intro:** Mit dem Foto `introDoor` beginnt das Intro an der echten Haustür und
  fährt ins Schloss. `focus` in `scripts/photos.json` gibt die Lage des Schlosses im
  Bild an (Anteil von Breite und Höhe, 0–1). Ohne Foto läuft die gezeichnete Tür.
- **Ladengeschäft:** Das Foto `shop` erscheint im Bereich „Ladengeschäft“ mit dem
  Hinweis „Symbolbild“, weil es nicht den echten Laden zeigt.
- Sobald Fotos eingebunden sind, steht im Footer „Fotos: KI-generierte Symbolbilder“.

Eigene Fotos (Team, Laden, echte Einsätze) wirken noch persönlicher: Datei als
`photos-src/<name>.jpg` ablegen (z. B. `photos-src/shop.jpg`), Bildbeschreibung in
`scripts/photos.json` anpassen und `npm run photos` ausführen. Bei echten Fotos
Hinweis im Shop-Bereich und im Footer entfernen.

Es werden keine Bilder von fremden Servern geladen; alle Dateien liegen auf der
eigenen Website.

`public/og-image.png` ist das Vorschaubild für geteilte Links. Es wird verwendet, sobald
in `src/config.js` die `url` eingetragen ist.

## Logo

Das Logo (Siegel mit Handwerker, Schriftzug mit Schlüssel-Linie in Gold und Anthrazit) liegt mit
allen Fassungen in `brand/` – als SVG, PDF und PNG, inklusive Fassung für die
Fahrzeugtür. Hinweise für den Folierer stehen in `brand/README.md`. Neu erzeugen
mit `npm run logo` (aktualisiert auch das Logo der Website und das Favicon).

## Entwicklung

```bash
npm install
npm run dev      # Entwicklungsserver
npm run build    # baut dist/ und rendert alle Seiten vor
npm run illustrations  # Illustrationen neu erzeugen
npm run photos   # Fotos laden und als WebP aufbereiten
npm run logo     # Logo-Dateien und Website-Logo erzeugen
npm run preview  # fertige Website lokal ansehen
```

## Aufbau

```
src/
  config.js        Unternehmensdaten (Telefon, Gebiet, Zeiten …)
  content.js       Texte: Leistungen, Ablauf, Kostenfaktoren, FAQ
  images.js        Bildquellen (Illustrationen, ersetzt durch Fotos)
  photos.generated.js  von npm run photos erzeugt
  pages.js         Seitenliste mit Titeln und Beschreibungen
  lock.js          Modell des Schließzylinders (Intro und Erklärer)
  sections/        Bereiche der Startseite (Hero, Leistungen, FAQ, Kontakt …)
  pages/           Startseite, Leistungsseiten, Rechtstexte
  components/      Header, Footer, Buttons, Icons, Logo …
scripts/prerender.mjs   erzeugt statisches HTML + Meta-Angaben je Seite
scripts/photos.mjs      lädt Fotos und erzeugt WebP-Größen
scripts/logo.mjs        erzeugt das Logo in allen Fassungen (brand/)
brand/                  Logo-Dateien für Druck und Folierung
```

Schriften (Cormorant Garamond, Manrope) sind lokal eingebunden – es werden keine
Google-Server kontaktiert. Die Website setzt keine Cookies und nutzt kein Tracking.
