# LUXURY EVENTS by DEKO.LUXURY – Website

Statische Website (HTML, CSS, JavaScript) ohne Framework und ohne Build-Schritt.
Sie läuft auf jedem Webhosting. Das Anfrageformular nutzt PHP, das bei üblichen deutschen
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
│   ├── css/style.css     Gestaltung (entspricht „styles.css“; Farben & Schriften als Variablen ganz oben)
│   ├── js/main.js        Interaktionen (entspricht „script.js“; Kontaktdaten ganz oben)
│   ├── fonts/            Schriften lokal eingebunden (keine Verbindung zu Google)
│   ├── brand/            Logo (aus dem Original vektorisiert), Monogramm, Social-Media-Bild
│   └── img/              Bilder als WebP in mehreren Größen
└── tools/bilder-optimieren.mjs   Macht eigene Fotos webfertig
```

## Aufbau der Startseite

Die Reihenfolge ist fest:

1. **Hero** – Leitsatz „Wir dekorieren eure Veranstaltungen nach euren Wünschen ✨“, Buttons
   „Beratung anfragen“ (scrollt zum Kontakt) und „WhatsApp“. Hintergrund mit Lichtsäumen,
   Gold-Ornament und dezentem Glitzer, die sich leicht mit Maus und Scrollen bewegen.
2. **Info-Streifen** – Showroom in Burgau · Premium Dekoration · Nach euren Wünschen · 24/7 geöffnet ·
   Bewertungen (verlinkt auf das Google-Profil). Die Icons zeichnen sich beim Scrollen.
3. **Über uns** – kurzer Text und die drei Punkte Planung, Design, Umsetzung.
4. **Leistungen** – acht Karten mit Gold-Icons; beim Hover heben sie sich mit sanftem Schimmer.
   Ein Klick wählt im Formular die passende Event-Art bzw. Leistung vor.
5. **Galerie** – sechs echte Arbeiten, jedes Bild vollständig im eigenen Format. Beim Hover Zoom und
   eingleitende Bildunterschrift, Klick öffnet die große Ansicht.
6. **Showroom & Ablauf** – Adresse **Kapuzinerstr. 4, Burgau 89331**, Route planen, Karte und der
   Zeitstrahl Erstgespräch → Design & Planung → Dekoration vor Ort mit goldener SVG-Linie.
7. **Öffnungszeiten** – Tabelle Montag bis Sonntag, der heutige Tag ist markiert.
8. **Termin & Kontakt** – Formular (Name, E-Mail oder Telefon, Event-Art, Datum/Wunschzeitraum,
   Nachricht) und Buttons E-Mail, Kurz anrufen, WhatsApp, Instagram.
9. **FAQ** – sechs Fragen zum Aufklappen (auch als strukturierte Daten für Google).
10. **Footer** – Adresse, Kontakt, Impressum/Datenschutz, Instagram, „Nach oben“.

Dazu: die Eröffnung mit dem Tor (siehe unten) und eine kleine Leiste „Beratung anfragen“,
die beim Scrollen erscheint und am Kontaktformular wieder verschwindet.

## Vor dem Livegang: Checkliste

Alle offenen Stellen sind im Code mit **TODO** markiert und auf der Seite gestrichelt hervorgehoben.

| Wo | Was fehlt |
| --- | --- |
| **Formular-Test** | Anfragen gehen zum Testen an beratyigit.2009.ay@gmail.com. Vor dem Livegang zurückstellen: in `anfrage.php` `EMPFAENGER` wieder auf `deko.luxury@gmx.de`, in `assets/js/main.js` `anfrageAn` auf `''`. |
| `index.html` → Info-Streifen | **Bewertungen** sind mit dem Google-Profil verlinkt. Optional die Zahl ergänzen (z. B. „4,9 ★ · 37 Bewertungen“) – nur wenn sie echt ist, und regelmäßig aktualisieren. |
| `index.html` → `<head>` | Domain eintragen: `canonical`, `og:url`, `og:image`. Strukturierte Daten ergänzen: `url`, `image`, `logo`. Telefon und Instagram sind bereits eingetragen. |
| `index.html` → Strukturierte Daten | `areaServed` enthält Burgau, Ulm und Augsburg. Bitte bestätigen oder anpassen. |
| **Einverständnis** | Auf `galerie-04` sind die Vornamen des Paares zu lesen (Willkommensschild), auf `galerie-05` ein Vorname (Geburtstagsschild). Auf `galerie-02` ist im Hintergrund ein Kennzeichen teilweise erkennbar. Vor der Veröffentlichung das Einverständnis einholen, unkenntlich machen oder ein anderes Foto wählen. |
| `impressum.html` | Name, Rechtsform, USt-IdNr., Verbraucherstreitbeilegung, Bildnachweise. Telefon ist eingetragen. Die Anschrift Kapuzinerstr. 4 ist eingetragen – bitte prüfen, ob sie auch die ladungsfähige Anschrift ist. |
| `datenschutz.html` | Hosting-Anbieter, E-Mail-Anbieter, Stand. Bitte rechtlich prüfen lassen. |
| `sitemap.xml`, `robots.txt` | Domain eintragen. |
| Karte | Die interaktive Karte zeigt Burgau. Für eine Stecknadel genau am Showroom die Koordinaten in `MAP_SRC` (`assets/js/main.js`) ergänzen (`&marker=Breite,Länge`). |
| Logo | Aus dem Screenshot vektorisiert. Liegt die Originaldatei (SVG/PDF/AI) vor, `assets/brand/logo-gold.svg`, `logo-zeile.svg` und `monogramm.svg` damit ersetzen. |

## Kontaktdaten

Ganz oben in `assets/js/main.js` stehen alle Kontaktwege. Die Buttons in Startbereich,
Kontakt, Footer und Mini-Leiste werden daraus verknüpft:

```js
var KONTAKT = {
  email: 'deko.luxury@gmx.de',
  telefon: '+49 179 4310823',
  whatsapp: '491794310823',            // international, ohne + und Leerzeichen
  instagram: 'https://www.instagram.com/deko.luxury/',
  whatsappText: 'Hallo DEKO.LUXURY, wir interessieren uns für eine Dekoration.'
};
```

Die Links stehen zusätzlich direkt im HTML, damit sie auch ohne JavaScript funktionieren.
Ändert sich eine Nummer, bitte auch in `index.html` (Suche nach `4310823`) und im Impressum anpassen.

## Lokal ansehen

```bash
cd deko-luxury
npm start            # öffnet einen kleinen Server auf http://localhost:8080
```

Ohne Node.js reicht auch ein Doppelklick auf `index.html`. Das Formular braucht dann
allerdings PHP und bietet automatisch den Versand per E-Mail-Programm an.

## Eigene Fotos einsetzen

1. Fotos in den Ordner `bilder-original/` legen und wie das zu ersetzende Bild benennen,
   z. B. `galerie-02.jpg` oder `galerie-04.jpg`.
2. `npm install` (einmalig), dann `npm run bilder`.
3. Das Skript erzeugt alle benötigten Größen als WebP in `assets/img/`.
4. In `index.html` die **Alt-Texte** an das neue Motiv anpassen, z. B.
   „Hochzeitstafel mit weißen Rosen und Kerzenlicht in Burgau“.

| Datei | Bereich | Hinweis |
| --- | --- | --- |
| `galerie-01` … `-05` | Galerie | Jedes Bild erscheint vollständig in seinem Format: drei oben, zwei mittig darunter. 01, 02 und 03 laufen zusätzlich im Bogenfenster oben (Hochformat 3:4 oder 4:5 ideal). Mindestens 1500 px breit. |
| `galerie-04` | Über uns | Wird dort im Format 4:5 gezeigt (Ausschnitt mittig). |

Neue Arbeit in der Galerie: in `index.html` einen `<li class="gal__item">`-Block kopieren und
Bild, Kategorie und Titel anpassen.

Einige der gelieferten Fotos sind schmaler als 1500 px (02: 1179 px, 04: 909 px, 05: 1125 px).
Sie werden nicht hochgerechnet; im `srcset` steht jeweils die echte Breite.

## KI-Bilder für Vorschau & Moodboards

Die Galerie zeigt bewusst nur **echte Arbeiten**. KI-Bilder eignen sich für Moodboards,
Social-Media-Entwürfe oder als Platzhalter in Entwürfen – nicht als „unsere Arbeiten“.

1. **Luxury Wedding Tablescape**
   *Prompt:* Photorealistic, cinematic photo of a long luxury wedding banquet table in an elegant European indoor venue, ivory linen, cascading white and blush roses, pampas grass, gold cutlery, crystal glassware, tall taper candles in gold candelabras, white arched backdrop panels in the background.
   *Licht:* warm golden candlelight with soft ambient fill, gentle bokeh · *Perspektive:* eye level, three-quarter view along the table, 85 mm, shallow depth of field · *Format:* 3:2
   *Negativ:* no people, no text, no logos, no watermark, no plastic look, no distorted cutlery
2. **Sweet Table**
   *Prompt:* Photorealistic luxury dessert table for a celebration: three-tier white cake with gold leaf, macarons in champagne and blush, glass cake stands, small arrangements of white roses and eucalyptus, round white arch backdrop with gold details.
   *Licht:* soft natural side light with warm highlights · *Perspektive:* frontal, slightly elevated, symmetrical · *Format:* 4:5
   *Negativ:* no lettering on the cake, no text, no watermark, no people, no fake-looking food
3. **Glam Photo Corner**
   *Prompt:* Photorealistic glamorous photo corner for an evening event: white and champagne balloon garland arching over a round backdrop, warm fairy lights, cream bouclé armchairs, white and blush flowers on acrylic pedestals, soft neon glow without letters.
   *Licht:* warm golden fairy lights, dim ambience, subtle haze, cinematic glow · *Perspektive:* eye level, 35 mm, centred · *Format:* 4:5
   *Negativ:* no readable text, no neon words, no logos, no watermark, no people
4. **Eventsaal mit europäischem Flair**
   *Prompt:* Cinematic, photorealistic wide shot of an elegant event hall in a historic European building with vaulted ceiling, set for a gala dinner: round tables with ivory linen, low gold centrepieces with white flowers and candles, warm uplighting on stone walls.
   *Licht:* warm amber uplighting and candle glow, evening mood · *Perspektive:* elevated wide angle from a corner of the room · *Format:* 16:9
   *Negativ:* no text, no signage, no place names, no watermark, no faces, no distorted chairs
5. **Detail: Blumen & Gold**
   *Prompt:* Macro detail photo of white garden roses, ranunculus and dried pampas next to a gold-rimmed charger plate, folded linen napkin with gold ring and a champagne glass with light reflections.
   *Licht:* soft directional warm light, glittering highlights, creamy bokeh · *Perspektive:* close-up, 45° from above, 100 mm macro · *Format:* 1:1
   *Negativ:* no text, no watermark, no harsh shadows, no wilted flowers
6. **Planung mit Designboard**
   *Prompt:* Photorealistic hands-on luxury event planning: a designer's hands arranging fabric swatches in ivory, champagne and gold, fresh flower samples, a mood board with sketches of an arched floral backdrop, colour cards and a gold pen on a marble table.
   *Licht:* soft daylight from a large window, warm and airy · *Perspektive:* top-down flat lay, only hands visible · *Format:* 3:2
   *Negativ:* no faces, no readable text, no brand logos, no watermark

## Eröffnung & Animationen

- **Eröffnung („Tor“, rund 4 Sekunden):** schwarz-goldene Bühne mit Goldstaub. Eine anamorphe
  Goldlinie mit Lichtfleck leuchtet auf, die Goldkassette des Tors zeichnet sich von der Mitte aus,
  ein Lichtpunkt zieht den Kreis, das „D“ blüht aus der Unschärfe auf und „DEKO LUXURY“ fliegt
  Buchstabe für Buchstabe zusammen. Dahinter drehen sich Lichtstrahlen, ein Glanz läuft über das Logo.
  Dann reißt ein Lichtspalt auf: Blitz, Druckwelle, Goldkonfetti – die Torflügel schwingen auf und die
  „Kamera“ fährt hindurch auf die Website. Das Logo ist nur während des Aufgehens zu sehen
  und bleibt danach nicht stehen (oben in der Navigation steht nur das kleine Markenzeichen). Läuft bei jedem Aufruf der Startseite, aber nicht beim
  Zurückkommen von einer Unterseite. Klick, Taste oder Scrollen überspringen sie; bei „Bewegung
  reduzieren“ entfällt sie. Alles läuft über transform/opacity, auf Handys mit halb so vielen Partikeln.
- **Hintergrund:** Lichtsäume, Ornament und Glitzer liegen in Ebenen mit leichter Parallax-Bewegung
  (Maus nur am Computer, Scrollen überall). Goldstaub nur auf größeren Bildschirmen.
- **Scroll-Effekte** (ohne zusätzliche Bibliothek):
  - *Smooth Scrolling:* Menü- und Button-Links gleiten weich zum Abschnitt; die Navigation verdeckt
    dabei keine Überschrift. Das Scrollen selbst bleibt nativ (kein „Scroll-Hijacking“), damit es
    auf dem iPhone natürlich und flüssig bleibt.
  - *Reveal on Scroll:* Texte, Bilder und Karten gleiten beim Erreichen des Sichtbereichs sanft nach
    oben und blenden ein; Galeriebilder zoomen dabei leicht zurück.
  - *Stagger:* Was gleichzeitig hereinkommt (z. B. die Leistungskarten), erscheint nacheinander –
    von oben links nach unten rechts, mit kurzen Abständen (maximal 0,6 s).
  - *Parallax:* Im Startbereich wandern Inhalt und Bogenfenster beim Herunterscrollen unterschiedlich
    schnell, das Bild bei „Über uns“ bewegt sich langsamer als sein Rahmen, der große Schriftzug im
    Footer gleitet herein. Läuft per CSS-Scroll-Timeline im Grafikprozessor; ältere Browser am Computer
    bekommen eine schlanke JS-Variante, ältere Smartphones verzichten darauf, damit nichts ruckelt.
  - *Scroll-Fortschritt:* dünne Goldlinie ganz oben.
  - *Navigation:* bleibt sichtbar, bekommt beim Herunterscrollen einen hellen, leicht transparenten
    Hintergrund und einen dezenten Schatten.
  - Sicherheitsnetz: Ohne JavaScript, ohne IntersectionObserver oder bei „Bewegung reduzieren“
    bleibt jedes Element sichtbar; nichts kann dauerhaft unsichtbar bleiben.
- **Hover:** Buttons mit Glanz, Karten heben sich mit Gold-Schimmer, Galerie mit Zoom und Unterschrift.
- Wer im Betriebssystem „Bewegung reduzieren“ eingestellt hat, bekommt eine ruhige Seite ohne
  Eröffnung, Glitzer und Parallax. Alle Inhalte sind auch ohne JavaScript sichtbar.

## Anfrageformular

- `anfrage.php` sendet jede Anfrage an **deko.luxury@gmx.de** (Einstellung oben in der Datei).
- Die E-Mail ist übersichtlich aufgebaut:
  - Betreff: `Neue Anfrage: Hochzeit · 14.06.2027 · Anna Müller`
  - oben **Was gewünscht ist** (Event-Art, Datum/Zeitraum, Nachricht),
  - darunter **Kontakt** (Name, E-Mail, Telefon),
  - Knöpfe **Per E-Mail antworten**, **Anrufen** und **WhatsApp schreiben**.
  Gibt jemand eine E-Mail an, geht „Antworten“ direkt an diese Person.
- Pflicht sind nur Name und **E-Mail oder Telefon**. Nach dem Absenden erscheint die Bestätigung
  „Danke! Eure Anfrage ist bei uns angekommen. Wir melden uns schnell.“ In der Vorschau steht dort
  „Anfrage gesendet (Vorschau)“, es wird nichts verschickt.
- Für gute Zustellbarkeit in `ABSENDER` eine Adresse der eigenen Domain eintragen.
- Spamschutz: unsichtbares Honeypot-Feld und Mindestzeit, kein Captcha nötig.
- Ist kein PHP verfügbar (z. B. GitHub Pages, Netlify), kann die Seite nicht selbst E-Mails senden.
  Dann erscheint „Fast geschafft.“ mit zwei Knöpfen: **Per E-Mail senden** (öffnet das E-Mail-Programm
  mit fertigem Text an deko.luxury@gmx.de) und **Per WhatsApp senden** (fertige Nachricht an
  +49 179 4310823). Die Anfrage kommt erst an, wenn die Person dort auf „Senden“ tippt.
  Für den vollautomatischen Versand die Website bei einem Hoster mit PHP ablegen.
- Nach dem Umzug einmal selbst eine Testanfrage schicken und im GMX-Postfach auch den Spam-Ordner
  prüfen. Landet sie dort, als „Kein Spam“ markieren.

## Datenschutz & Cookies

- Keine Tracking- oder Marketing-Cookies, keine externen Schriften, kein Cookie-Banner nötig.
- Die interaktive Karte (OpenStreetMap) lädt erst nach Klick bzw. Zustimmung
  („Cookie-Einstellungen“ im Footer). Vorher zeigt die Seite eine eigene Übersichtskarte.
- WhatsApp, Instagram und das Google-Profil sind einfache Links; es wird nichts eingebettet.

## SEO

- Title, Description, Open-Graph-Bild, saubere H1/H2-Struktur, Alt-Texte für alle Bilder.
- Strukturierte Daten: `LocalBusiness` mit Adresse Kapuzinerstr. 4, 89331 Burgau, Öffnungszeiten
  und Leistungen sowie `FAQPage` für die FAQ.
- Das Google-Unternehmensprofil ist verlinkt (Info-Streifen, Showroom, Footer; `KONTAKT.google`
  in `assets/js/main.js`). Sobald die Website online ist, ihre Adresse im Google-Profil unter
  „Website“ eintragen – das ist der wirksamste Schritt für die lokale Suche.

## Technik & Qualität

- Lighthouse (lokal, mit Kompression wie beim Hoster): Desktop 99 Performance, Mobil 92 Performance;
  Barrierefreiheit, Best Practices und SEO jeweils 100. Layoutverschiebung unter 0,04 (gut).
- Keine Layoutsprünge beim Laden: Die Ersatzschriften sind metrisch an die Webfonts angeglichen.
- Bilder als WebP in mehreren Größen mit Lazy Loading. Endlos-Animationen laufen nur über
  `transform`/`opacity` und pausieren außerhalb des Sichtbereichs.
- Schriften: Cormorant Garamond, Jost, Cinzel (SIL Open Font License, lokal eingebunden).

## Design-Grundlagen

Farben und Schriften sind als Variablen am Anfang von `assets/css/style.css` definiert:

| Variable | Farbe | Einsatz |
| --- | --- | --- |
| `--ink` | #151311 | Tiefes Schwarz (Hero, Galerie, Öffnungszeiten, Footer) |
| `--ivory` / `--paper` | #f6f1e9 / #fbf8f3 | Warmes Off-White (Über uns, Leistungen, Kontakt, FAQ) |
| `--sand` | #ede4d6 | Champagner-Fläche (Showroom & Ablauf) |
| `--gold` / `--gold-soft` | #a8834c / #cdb07a | Feine Linien und Akzente, sparsam eingesetzt |
| `--foil` | Verlauf | Blattgold für Buttons, Schlüsselwörter und Ziffern |
