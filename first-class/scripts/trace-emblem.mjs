/**
 * Wandelt die Emblem-Illustration (brand/quelle/emblem-canva.png, in Canva
 * erzeugt) in saubere Vektorflächen um:
 *
 *   node scripts/trace-emblem.mjs [bild.png]
 *
 * - Die Figur (Handwerker mit Schlüssel) wird mit potrace nachgezeichnet.
 * - Die beiden Kreisringe werden geometrisch exakt neu konstruiert.
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
const source = process.argv[2] || path.join(root, 'brand/quelle/emblem-canva.png')
const TARGET = 1600 // Arbeitsauflösung für das Nachzeichnen

const isGold = (r, g, b) =>
  Math.max(r, g, b) - Math.min(r, g, b) > 45 && 0.3 * r + 0.59 * g + 0.11 * b > 70

// 1. Kreis des Siegels in der Vorlage finden (äußerer Goldring).
const small = await sharp(source).removeAlpha().raw().toBuffer({ resolveWithObject: true })
let minX = Infinity,
  maxX = -1,
  minY = Infinity,
  maxY = -1
for (let y = 0; y < small.info.height; y++) {
  for (let x = 0; x < small.info.width; x++) {
    const i = (y * small.info.width + x) * 3
    if (isGold(small.data[i], small.data[i + 1], small.data[i + 2])) {
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
const mask = Buffer.alloc(TARGET * TARGET, 255)
for (let y = 0; y < TARGET; y++) {
  for (let x = 0; x < TARGET; x++) {
    const i = (y * TARGET + x) * 3
    const inside = Math.hypot(x - cx, y - cy) < R * 0.915
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

const outerRing = circle(100).subtract(circle(96))
const innerRing = circle(93).subtract(circle(90.6))
const figureInside = figure.intersect(circle(90.6))
const gold = outerRing.unite(innerRing).unite(figureInside)
const dark = circle(100).subtract(gold)

const round = (d) => d.replace(/-?\d+\.\d+/g, (n) => String(Math.round(Number(n) * 100) / 100))
await writeFile(
  path.join(root, 'scripts/emblem.generated.json'),
  JSON.stringify({ size: 200, gold: round(gold.pathData), dark: round(dark.pathData) }) + '\n',
)
console.log(
  `✓ scripts/emblem.generated.json (Kreis: ${cx.toFixed(1)}, ${cy.toFixed(1)}, r ${R.toFixed(1)})`,
)
