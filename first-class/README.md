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

1. **Unternehmensdaten eintragen** in `src/config.js`:
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

## Bilder

Die Fotos stammen von [Pexels](https://www.pexels.com/license/) (kostenlos, auch
kommerziell) und sind in `src/images.js` hinterlegt. Sie werden aktuell direkt von Pexels
geladen. Für den Live-Betrieb empfehlen wir, die Bilder herunterzuladen und selbst zu
hosten (schneller, unabhängig, datenschutzfreundlicher): Datei nach `public/images/`
legen und beim Eintrag statt `pexels: …` z. B. `src: 'images/tuer.jpg'` setzen. Eigene
Fotos vom Team und von echten Einsätzen wirken noch glaubwürdiger.

## Entwicklung

```bash
npm install
npm run dev      # Entwicklungsserver
npm run build    # baut dist/ und rendert alle Seiten vor
npm run preview  # fertige Website lokal ansehen
```

## Aufbau

```
src/
  config.js        Unternehmensdaten (Telefon, Gebiet, Zeiten …)
  content.js       Texte: Leistungen, Ablauf, Kostenfaktoren, FAQ
  images.js        Bildquellen
  pages.js         Seitenliste mit Titeln und Beschreibungen
  sections/        Bereiche der Startseite (Hero, Leistungen, FAQ, Kontakt …)
  pages/           Startseite, Leistungsseiten, Rechtstexte
  components/      Header, Footer, Buttons, Icons, Logo …
scripts/prerender.mjs   erzeugt statisches HTML + Meta-Angaben je Seite
```

Schriften (Cormorant Garamond, Manrope) sind lokal eingebunden – es werden keine
Google-Server kontaktiert. Die Website setzt keine Cookies und nutzt kein Tracking.
