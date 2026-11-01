/**
 * Bausteine für das FIRST-CLASS-Logo: Schild mit Schlüsselloch und Schriftzug.
 * Alle Schriften werden in Pfade umgewandelt – die Dateien brauchen keine
 * Schriftarten und lassen sich direkt plotten (Autofolie, Schilder).
 */
import * as fontkit from 'fontkit'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import paper from 'paper/dist/paper-core.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const fontCache = new Map()
export function font(pkg, weight) {
  const name = pkg.split('/').pop()
  const file = path.join(root, `node_modules/${pkg}/files/${name}-latin-${weight}-normal.woff`)
  if (!fontCache.has(file)) fontCache.set(file, fontkit.openSync(file))
  return fontCache.get(file)
}

const r = (n) => Math.round(n * 100) / 100

/** Text als SVG-Pfad. `width` erzwingt eine Gesamtbreite über den Buchstabenabstand. */
export function textPath(f, text, { size, x = 0, y = 0, tracking = 0, width }) {
  const run = f.layout(text)
  const scale = size / f.unitsPerEm
  const advances = run.positions.map((p) => p.xAdvance * scale)
  const natural = advances.reduce((a, b) => a + b, 0)
  const gaps = run.glyphs.length - 1
  const space = width != null ? (width - natural) / gaps : tracking * size
  let cx = x
  const parts = []
  run.glyphs.forEach((glyph, i) => {
    const ox = cx
    const d = glyph.path.mapPoints((px, py) => [r(ox + px * scale), r(y - py * scale)]).toSVG()
    if (d) parts.push(d)
    cx += advances[i] + space
  })
  return {
    d: parts.join(''),
    width: natural + gaps * space,
    capHeight: f['OS/2'].capHeight * scale,
  }
}

/**
 * Schild (Wappenform) mit abgeschrägten oberen Ecken; `i` = Abstand nach innen.
 * Zeichenfläche 100 × 120.
 */
export function shield(i = 0, chamfer = 11) {
  const L = 4 + i
  const R = 96 - i
  const T = 4 + i
  const B = 116 - i * 1.55
  const c = Math.max(0, chamfer - i * 0.414)
  return [
    `M${r(L)} ${r(T + c)}`,
    `L${r(L + c)} ${r(T)}`,
    `H${r(R - c)}`,
    `L${r(R)} ${r(T + c)}`,
    `V${r(60)}`,
    `C${r(R)} ${r(88 - i * 0.2)} ${r(72 - i * 0.35)} ${r(106 - i * 0.9)} 50 ${r(B)}`,
    `C${r(28 + i * 0.35)} ${r(106 - i * 0.9)} ${r(L)} ${r(88 - i * 0.2)} ${r(L)} ${r(60)}`,
    'Z',
  ].join('')
}

/** Schlüsselloch als eine geschlossene Form. */
export function keyhole(
  cx = 50,
  cy = 49,
  radius = 14,
  slotTop = 5.8,
  slotBottom = 9.6,
  bottom = 89,
) {
  const yJoin = cy + Math.sqrt(radius ** 2 - slotTop ** 2)
  return [
    `M${r(cx - slotTop)} ${r(yJoin)}`,
    `A${radius} ${radius} 0 1 1 ${r(cx + slotTop)} ${r(yJoin)}`,
    `L${r(cx + slotBottom)} ${r(bottom)}`,
    `H${r(cx - slotBottom)}`,
    'Z',
  ].join('')
}

/**
 * Teile des Emblems (alle mit fill-rule="evenodd" zeichnen):
 * frame = äußerer Rahmen, inner = inneres Schild mit ausgespartem
 * Schlüsselloch, keyhole = Schlüsselloch (für die zweifarbige Fassung).
 */
export function emblemParts({ band = 6.5, gap = 3.2 } = {}) {
  const hole = keyhole()
  return {
    frame: shield(0) + shield(band),
    inner: shield(band + gap) + hole,
    keyhole: hole,
  }
}

// ---------------------------------------------------------------------------
// Emblem „Handwerker“: Mann im Profil mit Mütze und Vollbart im runden Siegel.
// Formen werden mit paper.js verrechnet, damit jede Farbe eine saubere,
// überschneidungsfreie Fläche ist (wichtig zum Plotten).
// ---------------------------------------------------------------------------
paper.setup(new paper.Size(1000, 1000))
const P = paper
const pCircle = (cx, cy, rad) => new P.Path.Circle(new P.Point(cx, cy), rad)
const pRect = (x, y, w, h) => new P.Path.Rectangle(new P.Rectangle(x, y, w, h))
const pPath = (d) => new P.CompoundPath(d)

// Silhouette, Zeichenfläche 200 × 200, Blick nach rechts.
const MAN = `M-4 212C2 186 22 166 50 156C62 152 70 147 73 140C74 135 74 131 74 128
C68 121 65 112 63 101C61 92 61 84 62 77C59 75 58 71 60 68C66 46 84 31 106 29
C120 28 131 33 136 42C138 46 138 50 136 53C143 55 150 57 156 60C158 62 157 64 154 64
L135 64C135 69 136 73 135 77C134 80 133 82 133 84C137 89 142 93 146 97
C147 99 146 100 143 101L138 102C139 104 139 105 138 106C140 107 140 109 138 110
C139 112 139 113 137 114C141 118 142 124 141 130C140 137 135 142 128 144
C122 145 117 144 113 143C113 148 114 151 117 154C138 157 162 164 180 176
C192 184 200 198 204 212Z`

// Details als Aussparungen: Mützenband, Ohr, Kragen der Arbeitsjacke.
const MAN_CUTS = [
  'M61 72C85 64 112 60 136 59L136 62C112 63 86 67 62 75Z',
  'M94 88C94 82 102 80 105 86C107 91 106 98 101 101L99 99C102 96 103 91 101 87C99 84 96 85 96 89Z',
  'M76 147C90 156 106 160 119 158L134 186L130 188L117 162C103 164 88 159 74 151Z',
]

/** Siegel mit Handwerker: ring (gold), disc (anthrazit, Figur ausgespart), figure (gold). */
export function craftsmanEmblem() {
  let figure = pPath(MAN)
  for (const cut of MAN_CUTS) figure = figure.subtract(pPath(cut))
  const ring = pCircle(100, 100, 100).subtract(pCircle(100, 100, 91))
  const disc = pCircle(100, 100, 87)
  const fig = figure.intersect(disc)
  return {
    size: 200,
    ring: ring.pathData,
    disc: disc.subtract(fig).pathData,
    figure: fig.pathData,
  }
}

/**
 * Schlüssel als Linie: Reide links (Mitte bei x, y), Halm bis x + length,
 * Bart rechts unten. Liefert Pfad und Maße für die Unterzeile.
 */
export function keyRule(
  x,
  y,
  length,
  { bowR = 7.5, holeR = 3, shaft = 3.4, bitW = 22, bitH = 12 } = {},
) {
  let k = pCircle(x, y, bowR)
  k = k.unite(pRect(x + bowR - 1, y - 4.2, 2.6, 8.4))
  k = k.unite(pRect(x + bowR + 2.6, y - shaft / 2, 1.6, shaft))
  k = k.unite(pRect(x + bowR + 4.2, y - 3.4, 2.4, 6.8))
  k = k.unite(pRect(x + bowR + 6, y - shaft / 2, length - bowR - 6, shaft))
  const bx = x + length - bitW
  const t = bitW / 5
  const top = y + shaft / 2 - 0.3
  k = k.unite(
    pPath(
      `M${bx} ${top}V${top + bitH}H${bx + t}V${top + bitH - 4}H${bx + 2 * t}V${top + bitH}H${bx + 3 * t}V${top + bitH - 5.5}H${bx + 4 * t}V${top + bitH - 2}H${x + length}V${top}Z`,
    ),
  )
  k = k.subtract(pCircle(x, y, holeR))
  return { d: k.pathData, textStart: x + bowR + 10, textEnd: bx - 8 }
}
