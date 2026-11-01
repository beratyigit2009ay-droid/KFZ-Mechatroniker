/**
 * Bausteine für das FIRST-CLASS-Logo: Schild mit Schlüsselloch und Schriftzug.
 * Alle Schriften werden in Pfade umgewandelt – die Dateien brauchen keine
 * Schriftarten und lassen sich direkt plotten (Autofolie, Schilder).
 */
import * as fontkit from 'fontkit'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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
