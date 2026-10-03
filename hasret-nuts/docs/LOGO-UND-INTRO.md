# Logo, Logo-Drehung und Eröffnungsanimation

Dieses Dokument beschreibt das Hasret-Nuts-Logo als Vektorgrafik, das drehende Logo in der Kopfzeile und die Eröffnungsanimation („öffnet sich mit dem Logo“). Beide Plattformen nutzen dieselben Dateien: den Corporate Hub und den Online-Shop.

## 1. Dateien

| Datei | Zweck |
|---|---|
| `shared/assets/logo/hasret-logo.svg` | Vollfarbiges Logo, alle Schriften als Pfade (rendert überall gleich). viewBox `0 0 600 420`, `<title>Hasret Nuts</title>` |
| `shared/assets/logo/hasret-logo-mono.svg` | Einfarbig mit `currentColor`: Oval-Doppellinie, Nuss-Silhouette, Wortmarke. Als `<img>` schwarz, inline färbbar |
| `shared/assets/logo/favicon.svg` | Favicon: vereinfachtes Oval mit „H“ (lesbar ab 16 px) |
| `shared/assets/logo/apple-touch-icon.png` | 180 × 180 px, Perlweiß-Grund, Logo mittig |
| `shared/assets/logo/og-default.png` | 1200 × 630 px Share-Bild: Smaragd-Grund, Champagner-Haarlinie, Logo mittig, „Hasret Nuts · Memmingen“ |
| `shared/views/partials/logo.njk` | Logo als Inline-SVG für Kopfzeile, Drawer und Footer (Varianten `color` und `mono`) |
| `shared/assets/motion/logo-spin.css` | Münz-Drehung des Logos |
| `shared/views/partials/intro.njk` | Eröffnungsanimation, bestehend aus Head-Teil und Body-Teil |
| `shared/assets/motion/intro.css` | Eröffnungsanimation (reines CSS) |
| `shared/assets/motion/intro.js` | Optionale Verbesserung: Überspringen, einmal pro Sitzung, vollständige Hover-Drehung |

Alle Assets liegen unter `/assets/…`, denn `createBaseApp` bildet `/assets` auf `shared/assets` ab.

## 2. Einbindung im Layout (`layout.njk` beider Apps)

```njk
<head>
  …
  {# 1) Eröffnungsanimation, Head-Teil: so früh wie möglich #}
  {% set introPart = 'head' %}{% include "partials/intro.njk" %}
  <link rel="stylesheet" href="/assets/motion/logo-spin.css?v={{ assetV }}">

  <link rel="icon" href="/assets/logo/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/assets/logo/apple-touch-icon.png">
  {# og:image als Standard: /assets/logo/og-default.png (absolute URL über seo.js / BASE_URL) #}
  …
</head>
<body>
  {# 2) Eröffnungsanimation, Body-Teil: direkt nach <body>, noch vor dem Skip-Link #}
  {% set introPart = 'body' %}{% set introVariant = 'corporate' %}{% include "partials/intro.njk" %}
  {# Shop: introVariant = 'shop' #}

  <header class="site-header">
    <a class="brand" href="/" aria-label="Hasret Nuts – Startseite">
      {% set logoVariant = 'color' %}{% set logoId = 'hnl' %}{% set logoDecorative = true %}{% set logoStatic = false %}
      {% include "partials/logo.njk" %}
      <span class="brand__word" aria-hidden="true">…</span>
    </a>
  </header>
  …
  <footer>
    {% set logoVariant = 'mono' %}{% set logoId = 'hnl-f' %}{% set logoDecorative = false %}{% set logoStatic = true %}
    {% include "partials/logo.njk" %}
  </footer>
</body>
```

### Variablen von `partials/logo.njk`

| Variable | Werte | Standard | Hinweis |
|---|---|---|---|
| `logoVariant` (oder `variant`) | `'color'`, `'mono'` | `'color'` | Jeder andere Wert ergibt `color`. Ein Produktobjekt namens `variant` stört also nicht |
| `logoId` | Kurzes ID-Präfix | `'hnl'` | **Pro Einbindung auf derselben Seite eindeutig setzen**, z. B. Kopfzeile `hnl`, Drawer `hnl-d`, Footer `hnl-f` |
| `logoLabel` | Text | `'Hasret Nuts'` | Zugänglicher Name (`role="img"`, `aria-label`) |
| `logoDecorative` | `true`/`false` | `false` | `true` setzt das ganze SVG auf `aria-hidden`. Sinnvoll, wenn der Link schon ein `aria-label` hat |
| `logoStatic` | `true`/`false` | `false` | `true` ergibt keine Drehung. Für Footer und Drawer empfohlen |

Wichtig: Ein `{% set %}` auf oberster Ebene bleibt für alle folgenden Includes gültig. Setzen Sie die Variablen daher **vor jeder Einbindung vollständig**, wie im Beispiel oben.

Die Ausgabe hat folgende Struktur: `<span class="hn-logo hn-logo--color"><span class="hn-logo__spin"><span class="hn-logo__coin">` mit Vorderseite und Rückseite als SVG.

### Größe

Die Höhe steuert die CSS-Variable `--hn-logo-h` (Standard `52px`). Die Breite ergibt sich daraus automatisch (Seitenverhältnis 10:7). Sinnvoll sind Werte zwischen 44 und 64 px. Hilfsklassen: `.hn-logo--sm` (44 px) und `.hn-logo--lg` (64 px).

Für die schrumpfende Sticky-Kopfzeile gibt es zwei Möglichkeiten:

- **Corporate:** `.brand` wird bereits mit `scale(.84)` verkleinert. Das Logo skaliert dabei automatisch mit.
- **Alternative:** `.site-header.is-scrolled .hn-logo { --hn-logo-h: 44px; }`. Der Wechsel wird mit 0,4 s `cubic-bezier(.16,1,.3,1)` animiert.

## 3. Animations-Spezifikation

### Logo-Drehung (`logo-spin.css`)

- **Bühne:** `.hn-logo` mit `perspective: 800px`. Darin liegen `.hn-logo__spin` und `.hn-logo__coin`, beide mit `transform-style: preserve-3d`.
- **Erste Drehung:** `rotateY(0 → 360deg)` über 1,2 s mit `cubic-bezier(.16,1,.3,1)`, 0,9 s nach dem Laden.
  - Läuft die Eröffnungsanimation, setzt `intro.css` die Verzögerung `--hn-logo-delay` auf **2,05 s**. Dann dreht sich das Kopfzeilen-Logo erst, wenn sich die Türen geöffnet haben. Es wirkt wie eine Übergabe vom Intro an die Kopfzeile.
- **Danach** läuft ein Zyklus von 12 s: Von 0 bis 88 % ruht das Logo, von 88 bis 100 % dreht es sich (≈ 1,44 s, gleiche Kurve).
- **Hover und Tastaturfokus** (`:focus-visible`) des umgebenden Links lösen sofort eine Drehung aus (1,2 s).
  - Ohne JavaScript geschieht das per CSS.
  - Mit JavaScript setzt `intro.js` die Klasse `.is-turning` und entfernt sie bei `animationend`. So läuft die Drehung immer vollständig zu Ende und springt nicht zurück.
- **Rückseite:** Ein zweites, um 180° vorgedrehtes SVG zeigt per `<use href="#…art">` dieselbe Grafik. Beide Seiten haben `backface-visibility: hidden`. Von hinten liest sich die Rückseite richtig herum, deshalb ist nie gespiegelte Schrift zu sehen.
- **`prefers-reduced-motion: reduce`:** keine Drehung.
- **`.hn-logo--static`:** keine Drehung.

### Eröffnungsanimation (`intro.css`, gesamt ≤ 1,9 s)

| Zeit | Element | Bewegung |
|---|---|---|
| 0,05–0,65 s | Logo | `scale(.86 → 1)`, `opacity 0 → 1`, 0,6 s `cubic-bezier(.16,1,.3,1)` |
| 0,50–1,20 s | Glanz | Goldener Lichtstreif über das Oval (0,7 s). Die Maske ist die Ellipse des Logos samt Rand |
| 1,10–1,85 s | Türen | Links `translateX(-101%)`, rechts `translateX(101%)`, 0,75 s `cubic-bezier(.77,0,.18,1)`. An der Fuge leuchtet eine Haarlinie auf |
| 1,10–1,60 s | Logo | `scale(1 → 1.06)` und ausblenden |
| 1,86 s | Overlay | `visibility: hidden` (per `step-start`, ohne Rundungsfehler). Danach gibt es keine Klicks, keinen Fokus und keine Screenreader-Ausgabe mehr |

Die Varianten:

- **`corporate`:** Smaragd `#0E4B3B` mit leichtem Verlauf zu `#0A3A2D` und eine Champagner-Haarlinie `#C9A96E` als Rahmen.
- **`shop`:** Creme `#F3EBDD` (Milchschaum bis Creme) mit einer Haarlinie in Schokolade `#3B2418`.

### Verhalten und Barrierefreiheit

- **Reines CSS:** Die Animation läuft auch ohne JavaScript und endet von selbst. Während des Intros fängt nur die jeweilige Türfläche Klicks ab, die freigelegte Seite ist sofort bedienbar.
- **Einmal pro Sitzung:** Das kleine Inline-Skript im Head (mit `nonce`) setzt so früh wie möglich die Klasse `hn-intro-skip` auf `<html>`, wenn mindestens einer dieser Fälle zutrifft:
  - `sessionStorage.hn_intro_seen` ist gesetzt (der Zugriff steht in `try/catch`),
  - die Seite wurde von derselben Website aus aufgerufen (Referrer gleicher Herkunft; das hilft auch, wenn der Speicher gesperrt ist),
  - der Nutzer wünscht reduzierte Bewegung.

  Andernfalls setzt es `hn-intro-on`. Corporate und Shop haben getrennte Herkünfte und zeigen ihr Intro jeweils einmal.
- **Überspringen** (`intro.js`): per Klick oder Tipp, Escape oder beliebiger Taste. Die Taste wirkt normal weiter, z. B. springt Tab zum Skip-Link. Das Overlay blendet in 0,32 s aus und erhält danach `hidden`.
- **Keine Fokusfalle:** Das Overlay ist `aria-hidden="true"` und enthält nichts Fokussierbares.
- **`prefers-reduced-motion: reduce`:** Das Overlay wird gar nicht angezeigt (CSS und Skript). Auch im Druck ist es ausgeblendet.
- **Sicherheitsnetz:** Das Overlay trägt inline `style="display:none"` und wird nur durch `intro.css` sichtbar. Fehlt das Stylesheet, bleibt die Seite unberührt. Die Seite wird also nie unbenutzbar.
- **CSP:** Es gibt keine Inline-Event-Handler. Inline-Skripte tragen `nonce="{{ nonce }}"`, `intro.js` ist eine externe Datei (`defer`). Das Inline-`style`-Attribut ist durch `style-src-attr 'unsafe-inline'` gedeckt.

## 4. Gestaltungsentscheidungen

Das Logo ist eine Vektor-Nachzeichnung der Logodatei des Inhabers (150 × 150 px PNG). Folgende Merkmale wurden übernommen:

- **Oval:** glänzendes rotes Oval mit radialem Verlauf. Oben ist es hell (`#E5362F`), zum Rand hin tiefes Bordeaux (`#3E0A09`). Dazu kommen ein dezenter Glanzbogen und ein innerer Randschatten.
- **Rand:** metallisch, ein Silberring mit feiner Champagner-Innenlinie.
- **Nussberg:** Haselnüsse, Mandeln, eine Walnusshälfte, Cashews, Pistazien mit grünem Kern und Blätter.
  - Jede Sorte ist einmal als Symbol mit eigenen Verläufen gezeichnet und mehrfach platziert. Das hält die Datei klein (≈ 16 KB).
  - Die Konturen sind zurückhaltend und halbtransparent, damit der Berg hochwertig wirkt und nicht nach Clip-Art aussieht.
- **„Hasret“:** in *Lilita One* (SIL Open Font License), einer kräftigen, runden Display-Schrift. Sie kommt den Buchstaben des Originals am nächsten.
  - Die Buchstaben sind in Pfade umgewandelt, die Schrift wird also nicht mitgeladen.
  - Füllung: Goldgelb-Verlauf `#FFE873 → #F6C21B → #E8A410`. Dazu kommen eine dunkelbraune Kontur `#3B1A0E`, eine 3D-Kante, ein weicher Schlagschatten und ein feiner Glanz oben.
- **„Nuts“:** in derselben Schrift und Behandlung. Im Original ist „Nuts“ goldgelb, nicht weiß. Das wurde originalgetreu so übernommen. Eine weiße Variante ist bei Bedarf eine Zeile: Füllung `url(#…nts)` durch `#FFFFFF` ersetzen.
- **Unabhängigkeit vom Renderer:** Die Konturen hängen nicht von `paint-order` ab. Die eigenständigen Dateien enthalten zusätzlich `xlink:href` für ältere Programme.

## 5. Logo durch die offizielle Vektordatei ersetzen

Wenn der Inhaber eine offizielle Vektordatei hat (SVG, AI, EPS oder PDF der Druckerei bzw. Agentur), gehen Sie so vor:

1. **SVG exportieren:** Aus AI, EPS oder PDF ein SVG erzeugen, z. B. mit Illustrator, Inkscape oder Affinity („Text in Pfade umwandeln“, „Präsentationsattribute“). Sinnvoll ist eine Zeichenfläche im Seitenverhältnis von etwa 10:7. Bei anderem Format die Breiten-Formel in `logo-spin.css` anpassen (`width: calc(var(--hn-logo-h) * B / H)`).
2. **Datei bereinigen:** Editor-Reste wie `sodipodi:*`, `inkscape:*` und Metadaten entfernen, z. B. mit SVGO.
   - Das Ergebnis sollte deutlich unter 40 KB bleiben.
   - Eingebettete Rasterbilder (`<image>`) vermeiden.
3. **Dateien ersetzen:**
   - `shared/assets/logo/hasret-logo.svg` durch die bereinigte Datei; auf dem `<svg>` `role="img"` sowie `<title>Hasret Nuts</title>` ergänzen.
   - `hasret-logo-mono.svg`: einfarbige Fassung mit `fill="currentColor"`. Falls die Agentur eine liefert, diese verwenden.
4. **Partial `logo.njk` aktualisieren:** Den Inhalt des neuen SVG zwischen `<defs aria-hidden="true">…</defs>` und `<g id="{{ _p }}art">…</g>` einsetzen und **alle IDs mit `{{ _p }}` präfixieren**. Das folgende Node-Skript (nur Node-Bordmittel) erzeugt die präfixierten Fragmente:

   ```bash
   node -e '
   const fs = require("fs");
   const src = fs.readFileSync(process.argv[1], "utf8");
   const inner = src.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "").replace(/<title[\s\S]*?<\/title>/, "");
   const P = "{{ _p }}";
   const out = inner
     .replace(/\s+xlink:href="[^"]*"/g, "")
     .replace(/\bid="([^"]+)"/g, (m, id) => `id="${P}${id}"`)
     .replace(/url\(#([^)]+)\)/g, (m, id) => `url(#${P}${id})`)
     .replace(/\bhref="#([^"]+)"/g, (m, id) => `href="#${P}${id}"`);
   const defs = (out.match(/<defs>([\s\S]*?)<\/defs>/) || ["", ""])[1];
   const art = out.replace(/<defs>[\s\S]*?<\/defs>/, "");
   console.log("DEFS:\n" + defs.trim() + "\n\nART:\n" + art.trim());
   ' shared/assets/logo/hasret-logo.svg
   ```

   Danach die Ausgabe `DEFS` in die `<defs>` und `ART` in die `<g id="{{ _p }}art">` der Farbvariante kopieren. Die Monovariante entsprechend aus `hasret-logo-mono.svg` erzeugen.
5. **PNGs neu erzeugen:** `apple-touch-icon.png` (180 × 180) und `og-default.png` (1200 × 630) aus HTML mit Playwright rendern. Smaragd-Grund `#0E4B3B → #0A3A2D`, Champagner-Haarlinie, Zeile „Hasret Nuts · Memmingen“ in Cormorant Garamond, Farbe `#D8BD88`. Das Favicon bei Bedarf aus dem neuen Zeichen ableiten (lesbar ab 16 px).
6. **Prüfen:** Kopfzeile (44–64 px), Drehung (Rückseite nicht gespiegelt), Intro auf Smaragd und Creme, Footer (mono) auf dunklem Grund.

## 6. Hinweise

- Die Nachzeichnung ist ein Entwurf auf Basis einer kleinen Bilddatei. **Bitte vom Inhaber freigeben lassen** oder durch die offizielle Datei ersetzen (siehe Abschnitt 5).
- Für die Single-File-Vorschauen gibt es eine eigenständige Kopie aller Teile (Inline-SVG, CSS, JS, ohne Nunjucks) als `inline-snippets.html` im Arbeitsordner der Logo-Erstellung.
