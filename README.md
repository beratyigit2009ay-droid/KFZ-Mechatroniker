# KFZ-Mechatroniker: Premium-Websites für Kfz-Werkstätten

Eine Codebasis und je ein Profil pro Betrieb. Daraus entstehen vier eigenständige Premium-Websites mit Live-3D-Hero, Scroll-Animationen und eigener Markenfarbe:

| Betrieb | Profil | Akzent |
| --- | --- | --- |
| KFZ-Service Patran, Inh. Alexander Patran | `src/companies/patran` | Orange |
| Georg Abdullahad | `src/companies/abdullahad` | Lime |
| Kfz-Werkstätte Karl Sauter, Inh. Markus Funk | `src/companies/sauter` | Rot |
| Auto- und Fahrzeugtechnik Lothar Maurer | `src/companies/maurer` | Blau |

Das Designkonzept steht in **[docs/KONZEPT.md](docs/KONZEPT.md)**, Bilder und Nano-Banana-Prompts in **[docs/BILDER.md](docs/BILDER.md)**.

## Sofort ansehen

Im Ordner **`standalone/`** liegt für jeden Betrieb eine einzelne HTML-Datei (inkl. Bilder, Schriften und 3D). Die Datei herunterladen und per Doppelklick im Browser öffnen, ganz ohne Server oder Installation. `standalone/index.html` verlinkt alle vier.

## Entwicklung

Voraussetzung: Node.js ≥ 20.19

```bash
npm install
npm run dev:sauter        # oder dev:patran, dev:abdullahad, dev:maurer
```

| Befehl | Zweck |
| --- | --- |
| `npm run build` | alle Betriebe bauen: `dist/<slug>/` (zum Hosten, vorgerendert) und `standalone/<slug>.html` |
| `npm run build:web` | nur `dist/` |
| `npm run preview` | gebautes `dist/` lokal ansehen (`http://localhost:4173/sauter/`) |
| `npm run renders` | 3D-Bildmotive neu rendern (Headless-Chromium) |
| `npm run typecheck` | TypeScript prüfen |

**Hosting:** Den Inhalt von `dist/<slug>/` auf beliebigen statischen Webspace hochladen (Strato, IONOS, Netlify, GitHub Pages …). Alle Pfade sind relativ; es gibt keine Server-Logik.

## Projektstruktur

```
src/
  companies/<slug>/company.ts   ← alle Inhalte eines Betriebs (nur belegte Angaben!)
  companies/<slug>/renders/     ← Bildmotive (3D-Renderings, austauschbar gegen Fotos)
  companies/registry.ts         ← Liste der Betriebe
  sections/                     ← Hero, Leistungen, Warum, Über uns, Galerie,
                                   Fahrzeug-Check, Bewertungen, Termin, FAQ, Kontakt, Footer
  components/                   ← Buttons, Reveal-Animationen, Sterne, Live-Status, Hero3D …
  three/                        ← prozedurale 3D-Modelle (Rad, Motor, Werkzeug, Zündkerze)
  lib/                          ← Öffnungszeiten-Logik, SEO/JSON-LD, FAQ-Generator, Smooth Scroll
render/                         ← Render-Harness für die Offline-Renderings
scripts/                        ← build-all, render-images, screenshots
```

## Inhalte pflegen

Alles steht in `src/companies/<slug>/company.ts`. Grundregel: **Es wird nichts erfunden.** Fehlt eine Angabe (`null` bzw. leeres Array), blendet die Seite den Baustein aus oder verweist aufs Telefon.

- **Öffnungszeiten** (`hours`): Tage ohne Eintrag gelten als geschlossen; `null` bedeutet „telefonisch erfragen“. Der Live-Status rechnet in Europe/Berlin.
- **Bewertungen** (`rating`): Wert, Anzahl und Stand aktuell halten. In `reviews` nur echte, freigegebene Texte eintragen; dann erscheinen sie automatisch als Karten.
- **E-Mail/Website**: Wird `email` gesetzt, erscheinen zusätzliche E-Mail-Buttons. Wird `website` gesetzt, kommt der Canonical-Link hinzu.
- **Neuer Betrieb:** Ordner kopieren, `company.ts` anpassen, in `registry.ts` eintragen, `npm run renders -- --company <slug>` und `npm run build` ausführen.

## Vor der Veröffentlichung (Checkliste)

- [ ] Freigabe durch den Betrieb einholen
- [ ] Impressum und Datenschutz vervollständigen (fehlende Pflichtangaben sind auf der Seite **gestrichelt markiert**: E-Mail, USt-IdNr., Kammer, Hosting). Anschließend rechtlich prüfen lassen.
- [ ] `draft: false` setzen. Im Entwurfsmodus ist die Seite auf `noindex` gestellt und im Footer als „Konzeptentwurf“ markiert.
- [ ] Domain in `website` eintragen
- [ ] Echte Werkstattfotos einsetzen (siehe docs/BILDER.md), danach `symbolicImages: false`
- [ ] Bewertungsstand aktualisieren

## Technik

- **React 19 + TypeScript**, **Vite 8**, **Tailwind CSS 4**
- **Motion** (Framer Motion) für Scroll-, Reveal- und Micro-Animationen, **Lenis** für Smooth Scrolling
- **Three.js + React Three Fiber:** Live-3D-Rad im Hero, per Lazy-Loading erst nach dem ersten Rendern geladen. Bis dahin zeigt ein identisches, vorgerendertes Poster das Rad. Pausiert außerhalb des Sichtbereichs; fällt bei zu langsamer Hardware, „Datensparmodus“ oder „Bewegung reduzieren“ automatisch auf das Poster zurück.
- **Performance:** Haupt-JS ≈ 150 KB gz, 3D-Chunk ≈ 240 KB gz (nachgeladen), WebP-Bilder mit festen Maßen und Lazy-Loading, lokal gehostete Schriften (nur Latin-Subset)
- **SEO:** statisch vorgerendertes HTML (SSG), Meta-/Open-Graph-Tags, strukturierte Daten `AutoRepair` (JSON-LD, nur belegte Angaben), semantisches HTML mit genau einer `h1`
- **Barrierefreiheit:** Skip-Link, sichtbare Fokus-Ringe, ARIA für Menü, Dialoge, Akkordeon und Radiogruppen, Tastaturbedienung, `prefers-reduced-motion`, ausreichende Kontraste
- **Datenschutz:** keine Cookies, kein Tracking, keine Google Fonts. Google Maps lädt erst nach Klick (Zwei-Klick-Lösung). Die Anfrage-Vorbereitung speichert nur lokal im Browser.
- Test-Hilfe: `?static` an die URL hängen erzwingt das Poster statt Live-3D (z. B. für Screenshots)
