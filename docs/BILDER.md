# Bilder: 3D-Renderings, echte Fotos und Nano-Banana-Prompts

## Ist-Stand

Die Bilder sind **prozedurale 3D-Renderings** (Three.js), die für jeden Betrieb in seiner Akzentfarbe erzeugt werden. Der Bremssattel trägt dabei den Namen des Betriebs, der Nabendeckel seine Initialen. Weil sie keine Aufnahmen aus dem Betrieb sind, kennzeichnet die Website sie automatisch als **„Symbolbild“** (`symbolicImages: true` in `company.ts`).

| Datei (`src/companies/<slug>/renders/`) | Motiv | Verwendung |
| --- | --- | --- |
| `hero.webp` | Komplettrad, freigestellt (transparent) | Poster im Hero, bis das Live-3D geladen ist |
| `brake.webp` | Bremsscheibe + Sattel | Leistungen, Galerie |
| `rim.webp` | Felge + Bremse, Nahaufnahme | Galerie |
| `engine.webp` | Kolben + Pleuel | Leistungen, Galerie |
| `tools.webp` | Ring-Maulschlüssel + Nüsse | Leistungen, Über uns, Galerie |
| `spark.webp` | Zündkerzen | Galerie |

Neu rendern (z. B. nach einer Farbänderung): `npm run renders` bzw. `npm run renders -- --company sauter`.

## Beste Lösung: echte Fotos aus dem Betrieb

Nichts schafft mehr Vertrauen als echte Aufnahmen: Werkstatt, Hebebühne, Inhaber bei der Arbeit, Außenansicht. So tauschen Sie ein Motiv aus:

1. Foto im Querformat, möglichst dunkel und kontrastreich (passt zum Design).
2. Umwandeln und unter **demselben Dateinamen** ablegen:

   ```bash
   node -e "require('sharp')('foto.jpg').resize(1600,1200,{fit:'cover'}).webp({quality:80}).toFile('src/companies/sauter/renders/brake.webp')"
   ```

3. Wenn **alle** Motive echte Fotos sind: `symbolicImages: false` setzen. Dann verschwinden die Symbolbild-Hinweise.
4. Bildtitel/-texte bei Bedarf in `gallery` anpassen, Alternativtexte in `src/lib/company.ts` (`imageAlt`).

## KI-Bilder mit Nano Banana (Gemini Image)

In dieser Entwicklungsumgebung war kein Bildgenerator verfügbar. Mit den folgenden Prompts lassen sich passende, fotorealistische Motive erzeugen.

**Wichtig:** KI-Bilder zeigen *nicht* den echten Betrieb. Lassen Sie `symbolicImages: true`, damit sie als Symbolbild gekennzeichnet bleiben. Keine erkennbaren Marken, Logos oder Kennzeichen erzeugen.

### Akzentfarben

| Betrieb | Farbe | Hex |
| --- | --- | --- |
| KFZ-Service Patran | Signal-Orange | `#FF6A1A` |
| Georg Abdullahad | Acid-Lime | `#C6F432` |
| Kfz-Werkstätte Karl Sauter | Rosso-Rot | `#FF3B3F` |
| Auto- und Fahrzeugtechnik Lothar Maurer | Ice-Blue | `#3EA2FF` |

Ersetzen Sie in den Prompts `{FARBE}` durch Farbname **und** Hex-Wert, z. B. `signal orange (#FF6A1A)`.

### Stil-Baustein (an jeden Prompt anhängen)

```
Photorealistic premium automotive photography, full-frame camera, dark moody low-key
lighting, deep black and anthracite tones, a single soft rim light in {FARBE},
subtle haze, realistic materials and reflections, shallow depth of field, cinematic
color grading, no text, no logos, no brand emblems, no license plates, 4:3 aspect ratio.
```

### Motive

**brake.webp – Bremse**
```
Close-up of a drilled and slotted steel brake disc with a glossy brake caliper
painted in {FARBE}, mounted on a car in a dark modern workshop, wheel removed,
fine machining marks on the disc, warm dust particles in the light.
```

**rim.webp – Rad & Felge**
```
Three-quarter close-up of a modern multi-spoke alloy wheel with a diamond-cut
machined face on a dark car inside a clean workshop, brake caliper in {FARBE}
visible behind the spokes, polished wheel bolts, tire sidewall in soft focus.
```

**engine.webp – Motor**
```
Hands of a mechanic in black nitrile gloves working with a ratchet on a clean modern
car engine bay, overhead LED strip light, engine cover removed, focus on the hands and
the tool, face not visible.
```

**tools.webp – Werkzeug**
```
Top-down flat lay of polished chrome combination wrenches and sockets neatly arranged
on a black rubber workbench mat, graded sizes, crisp reflections from a striped
softbox, one thin accent reflection in {FARBE}.
```

**spark.webp – Zündung**
```
Macro shot of three new spark plugs with white ceramic insulators standing and lying
on a dark brushed steel workbench, threads in sharp focus, background falling off
into black.
```

**hero.webp – nur falls gewünscht** (empfohlen: 3D-Rendering behalten, es ist identisch mit der Live-3D-Szene)
```
Single high-performance car wheel with a machined multi-spoke alloy rim and a brake
caliper in {FARBE}, three-quarter view facing left, floating, isolated on a fully
transparent background, studio product lighting, no shadow on the ground.
```

### Nach dem Generieren

Bild auf 1600 × 1200 px bringen (Befehl siehe oben), unter dem passenden Dateinamen ablegen, `npm run build` ausführen und das Ergebnis prüfen.
