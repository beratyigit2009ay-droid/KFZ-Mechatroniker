# FIRST CLASS – Logo

Schild mit Schlüsselloch und kräftigem Schriftzug, in Gold und Anthrazit wie die
Website. Alle Dateien sind Vektorgrafiken; die Schrift ist in Pfade umgewandelt.
Sie lassen sich daher ohne Schriftarten öffnen und direkt plotten.

## Dateien

| Datei | Verwendung |
| --- | --- |
| `logo-hell.svg` / `pdf/logo-hell.pdf` | Querformat für helle Flächen, z. B. weißer Lack, Briefpapier |
| `logo-dunkel.svg` / `pdf/logo-dunkel.pdf` | Querformat für dunkle Flächen, z. B. getönte Heckscheibe, Website |
| `logo-autotuer.svg` / `pdf/logo-autotuer.pdf` | Fahrzeugtür: Logo mit 24-h-Notdienst und Telefonnummer |
| `logo-hochformat-hell.svg` / `-dunkel.svg` | Hochformat, z. B. Heckklappe, Schaufenster, Social-Media-Profil |
| `emblem-hell.svg` / `emblem-dunkel.svg` | Nur das Schild, z. B. Favicon, Stempel, kleine Flächen |
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

- **Fahrer- und Beifahrertür:** `logo-autotuer` ca. 60 cm breit (ca. 26 cm hoch).
- **Heckklappe:** `logo-hell` ca. 40–45 cm breit.
- **Getönte Heckscheibe:** `logo-dunkel` (Schrift creme, Schild gold).

Die genauen Maße legt der Folierer am Fahrzeug fest (Türgriff, Sicken, Sensoren).
Bei 60 cm Breite sind die feinsten Linien rund 3 mm stark und damit gut plottbar.

## Neu erzeugen

```bash
npm run logo
```

Die Fassungen entstehen aus `scripts/logo.mjs` und `scripts/logo-lib.mjs`. Die
Telefonnummer der Türbeschriftung kommt aus `src/config.js`.
