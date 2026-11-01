/**
 * Bausteine für das FIRST-CLASS-Logo: Emblem und Schriftzug. Alle Schriften
 * werden in Pfade umgewandelt – die Dateien brauchen keine Schriftarten und
 * lassen sich direkt plotten (Autofolie, Schilder).
 */
import * as fontkit from 'fontkit'
import { readFileSync } from 'node:fs'
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

/** Emblem (Handwerker mit Schlüssel im Siegel) aus scripts/emblem.generated.json. */
export function tracedEmblem() {
  return JSON.parse(readFileSync(path.join(root, 'scripts/emblem.generated.json'), 'utf8'))
}
