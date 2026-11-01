# FIRST CLASS – Logo

Rundes Siegel mit einem Handwerker (Schiebermütze, Vollbart, Arbeitsjacke), der
einen großen Schlüssel über der Schulter trägt. Daneben der kräftige Schriftzug
„FIRST CLASS“, eine Goldlinie und „SCHLÜSSELDIENST“ – in Gold und Anthrazit
wie die Website.

Die Figur wurde mit der Bild-KI von Canva erzeugt (`quelle/emblem-canva.png`)
und mit `npm run logo:emblem` in Vektorflächen umgewandelt; die Kreisringe sind
geometrisch exakt neu konstruiert.

Alle Dateien sind Vektorgrafiken; die Schrift ist in Pfade umgewandelt. Sie
lassen sich daher ohne Schriftarten öffnen und direkt plotten.

## Dateien

| Datei | Verwendung |
| --- | --- |
| `logo-hell.svg` / `pdf/logo-hell.pdf` | Querformat für helle Flächen, z. B. weißer Lack, Briefpapier |
| `logo-dunkel.svg` / `pdf/logo-dunkel.pdf` | Querformat für dunkle Flächen, z. B. getönte Heckscheibe, Website |
| `logo-autotuer.svg` / `pdf/logo-autotuer.pdf` | Fahrzeugtür: Logo mit 24-h-Notdienst und Telefonnummer |
| `logo-hochformat-hell.svg` / `-dunkel.svg` | Hochformat, z. B. Heckklappe, Schaufenster, Social-Media-Profil |
| `emblem.svg` / `pdf/emblem.pdf` | Nur das Siegel, z. B. Favicon, Profilbild, Stempel, kleine Flächen |
| `png/` | Dieselben Motive als PNG mit transparentem Hintergrund |

## Farben

| Farbe | HEX | RGB |
| --- | --- | --- |
| Gold | `#C49E56` | 196 / 158 / 86 |
| Anthrazit | `#15171A` | 21 / 23 / 26 |
| Creme (Schrift auf dunklem Grund) | `#F7F2E8` | 247 / 242 / 232 |

Für die Folie: Gold als goldfarbene Plotterfolie, Anthrazit als Schwarz oder
Anthrazit. Den Goldton bitte beim Folierer am Farbmuster auswählen. Jede Farbe
liegt als eigene Fläche vor, ohne Verläufe.

## Mercedes C-Klasse (weiß) – Vorschlag

- **Fahrer- und Beifahrertür:** `logo-autotuer` ca. 60 cm breit (ca. 27 cm hoch).
- **Heckklappe:** `logo-hell` ca. 40–45 cm breit.
- **Getönte Heckscheibe:** `logo-dunkel` (Schrift creme, Siegel gold).

Die genauen Maße legt der Folierer am Fahrzeug fest (Türgriff, Sicken, Sensoren).
Das Siegel enthält feine Details (Gesicht, Bart, Finger). Auf der Tür (Siegel
ca. 13 cm Durchmesser) sind sie plottbar, der Folierer sollte sie beim Entgittern
aber prüfen. Für kleine Aufkleber unter etwa 20 cm Breite besser nur den
Schriftzug verwenden oder das Siegel drucken statt plotten.

## Neu erzeugen

```bash
npm run logo
```

Die Fassungen entstehen aus `scripts/logo.mjs` und `scripts/logo-lib.mjs`; das
Siegel aus `scripts/trace-emblem.mjs` (`npm run logo:emblem`). Bei einer höher
aufgelösten Vorlage `quelle/emblem-canva.png` ersetzen und beide Befehle
ausführen. Die
Telefonnummer der Türbeschriftung kommt aus `src/config.js`.
