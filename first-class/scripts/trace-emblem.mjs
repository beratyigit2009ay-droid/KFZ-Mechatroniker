/**
 * Wandelt eine Emblem-Illustration (rundes Siegel, gold auf anthrazit, z. B.
 * in Canva erzeugt) in saubere Vektorflächen um:
 *
 *   npm run logo:emblem                                   # Standardvorlage
 *   node scripts/trace-emblem.mjs brand/quelle/datei.png [ausgabe.json]
 *
 * - Das Motiv im Siegel wird mit potrace nachgezeichnet.
 * - Die Kreisringe werden erkannt und geometrisch exakt neu konstruiert.
 * - Ergebnis: scripts/emblem.generated.json mit zwei überschneidungsfreien
 *   Flächen (gold, anthrazit) auf einer Zeichenfläche von 200 × 200.
 *
 * Bei einer höher aufgelösten Vorlage einfach die Datei ersetzen und das
 * Skript erneut ausführen, danach `npm run logo`.
 */
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import paper from 'paper/dist/paper-core.js'
import potrace from 'potrace'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = path.resolve(root, process.argv[2] || 'brand/quelle/emblem-loewe.png')
const output = path.resolve(root, process.argv[3] || 'scripts/emblem.generated.json')
const TARGET = 1600 // Arbeitsauflösung für das Nachzeichnen

const isDark = (r, g, b) => 0.3 * r + 0.59 * g + 0.11 * b < 80
const isGold = (r, g, b) =>
  Math.max(r, g, b) - Math.min(r, g, b) > 45 && 0.3 * r + 0.59 * g + 0.11 * b > 70

// 1. Kreis des Siegels in der Vorlage finden (alles außer dem weißen Hintergrund).
const small = await sharp(source).removeAlpha().raw().toBuffer({ resolveWithObject: true })
let minX = Infinity,
  maxX = -1,
  minY = Infinity,
  maxY = -1
for (let y = 0; y < small.info.height; y++) {
  for (let x = 0; x < small.info.width; x++) {
    const i = (y * small.info.width + x) * 3
    const [r, g, b] = [small.data[i], small.data[i + 1], small.data[i + 2]]
    if (isGold(r, g, b) || isDark(r, g, b)) {
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
    }
  }
}
const k = TARGET / small.info.width
const cx = ((minX + maxX + 1) / 2) * k
const cy = ((minY + maxY + 1) / 2) * k
const R = ((maxX - minX + 1 + (maxY - minY + 1)) / 4) * k

// 2. Hochskalieren, leicht glätten und eine Schwarz-Weiß-Maske der Figur bilden
//    (Ringe ausgenommen – die werden exakt neu gezeichnet).
const big = await sharp(source)
  .removeAlpha()
  .resize(TARGET, TARGET, { kernel: 'lanczos3' })
  .blur(2.4)
  .raw()
  .toBuffer({ resolveWithObject: true })
const goldAt = (x, y) => {
  const i = (Math.round(y) * TARGET + Math.round(x)) * 3
  return isGold(big.data[i], big.data[i + 1], big.data[i + 2])
}

// Ringe erkennen: Radien, an denen fast rundherum Gold liegt.
const rings = []
let band = null
for (let t = 100; t >= 75; t -= 0.25) {
  let hits = 0
  for (let a = 0; a < 720; a++) {
    const rad = (a / 720) * 2 * Math.PI
    if (goldAt(cx + (Math.cos(rad) * (R * t)) / 100, cy + (Math.sin(rad) * (R * t)) / 100)) hits++
  }
  const onRing = hits / 720 > 0.6
  if (onRing && !band) band = [t, t]
  else if (onRing) band[1] = t
  else if (band) {
    rings.push(band)
    band = null
  }
}
if (band) rings.push(band)
if (!rings.length) throw new Error('Kein Goldring im Siegel gefunden.')
// Mindeststärke der Ringe (in Prozent des Radius), damit sie sich sauber plotten lassen.
const MIN_RING = 2.6
for (const ring of rings) {
  const grow = Math.max(0, MIN_RING - (ring[0] - ring[1])) / 2
  ring[0] = Math.min(100, ring[0] + grow)
  ring[1] -= grow
}
const clip = rings.at(-1)[1] - 1.5

const mask = Buffer.alloc(TARGET * TARGET, 255)
for (let y = 0; y < TARGET; y++) {
  for (let x = 0; x < TARGET; x++) {
    const i = (y * TARGET + x) * 3
    const inside = Math.hypot(x - cx, y - cy) < (R * (clip + 1)) / 100
    if (inside && isGold(big.data[i], big.data[i + 1], big.data[i + 2])) mask[y * TARGET + x] = 0
  }
}
const maskPng = await sharp(mask, { raw: { width: TARGET, height: TARGET, channels: 1 } })
  .png()
  .toBuffer()

const svg = await new Promise((resolve, reject) =>
  potrace.trace(
    maskPng,
    { turdSize: 60, optTolerance: 0.35, alphaMax: 1, threshold: 128 },
    (err, out) => (err ? reject(err) : resolve(out)),
  ),
)
const traced = svg.match(/ d="([^"]+)"/)[1]

// 3. In die 200er-Zeichenfläche übertragen und mit exakten Ringen kombinieren.
paper.setup(new paper.Size(10, 10))
const circle = (r) => new paper.Path.Circle(new paper.Point(100, 100), r)
const figure = new paper.CompoundPath(traced)
figure.fillRule = 'evenodd'
figure.translate(new paper.Point(-cx, -cy))
figure.scale(100 / R, new paper.Point(0, 0))
figure.translate(new paper.Point(100, 100))

let gold = figure.intersect(circle(clip))
for (const [outer, inner] of rings) gold = gold.unite(circle(outer).subtract(circle(inner)))
const dark = circle(100).subtract(gold)

const round = (d) => d.replace(/-?\d+\.\d+/g, (n) => String(Math.round(Number(n) * 100) / 100))
await writeFile(
  output,
  JSON.stringify({ size: 200, gold: round(gold.pathData), dark: round(dark.pathData) }) + '\n',
)
console.log(
  `✓ ${path.relative(root, output)} (Ringe: ${rings.map(([o, i]) => `${o}–${i} %`).join(', ')})`,
)
