/**
 * Fotos für die Website vorbereiten.
 *
 *   npm run photos
 *
 * 1. Lädt jedes Foto aus scripts/photos.json nach photos-src/ (einmalig;
 *    vorhandene Dateien werden nicht erneut geladen). Eigene Fotos können
 *    auch direkt dort abgelegt werden, z. B. photos-src/hero.jpg.
 * 2. Erzeugt daraus WebP-Dateien in mehreren Breiten unter
 *    public/images/photos/ – für schnelles Laden auf jedem Bildschirm.
 * 3. Schreibt src/photos.generated.js. Jedes dort eingetragene Foto ersetzt
 *    automatisch die gleichnamige Illustration (siehe src/images.js).
 *
 * Danach `npm run build` ausführen.
 */
import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = path.join(root, 'photos-src')
const outDir = path.join(root, 'public/images/photos')
const moduleFile = path.join(root, 'src/photos.generated.js')

const WIDTHS = [480, 800, 1200, 1600, 2000]
const DEFAULT_WIDTH = 1200
const QUALITY = 74
const EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

const manifest = JSON.parse(await readFile(path.join(root, 'scripts/photos.json'), 'utf8'))

const findOriginal = async (name) => {
  const files = existsSync(srcDir) ? await readdir(srcDir) : []
  const file = files.find(
    (f) => path.parse(f).name === name && EXTENSIONS.includes(path.extname(f).toLowerCase()),
  )
  return file ? path.join(srcDir, file) : null
}

async function download(name, url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const type = response.headers.get('content-type') || ''
  if (!type.startsWith('image/')) throw new Error(`kein Bild (${type || 'unbekannter Typ'})`)
  const ext = path.extname(new URL(url).pathname).toLowerCase() || '.jpg'
  const file = path.join(srcDir, `${name}${EXTENSIONS.includes(ext) ? ext : '.jpg'}`)
  await writeFile(file, Buffer.from(await response.arrayBuffer()))
  return file
}

await mkdir(srcDir, { recursive: true })
await rm(outDir, { recursive: true, force: true })
await mkdir(outDir, { recursive: true })

const photos = {}
const missing = []

for (const [name, entry] of Object.entries(manifest)) {
  let original = await findOriginal(name)
  if (!original && entry.url) {
    try {
      original = await download(name, entry.url)
      console.log(`↓ ${name}`)
    } catch (error) {
      missing.push(
        `${name}: Download fehlgeschlagen (${error.cause?.code || error.cause?.message || error.message})`,
      )
      continue
    }
  }
  if (!original) {
    missing.push(`${name}: keine Datei in photos-src/ und keine URL`)
    continue
  }

  const image = sharp(original).rotate()
  const { width, height } = await image.metadata()
  const widths = [...new Set([...WIDTHS.filter((w) => w < width), Math.min(width, WIDTHS.at(-1))])]

  const variants = []
  for (const w of widths) {
    const file = `${name}-${w}.webp`
    await image
      .clone()
      .resize({ width: w, withoutEnlargement: true })
      .flatten({ background: '#14161a' })
      .webp({ quality: QUALITY, effort: 5 })
      .toFile(path.join(outDir, file))
    variants.push({ w, src: `images/photos/${file}` })
  }

  const fallback = variants.filter((v) => v.w <= DEFAULT_WIDTH).at(-1) ?? variants[0]
  photos[name] = {
    src: fallback.src,
    srcSet: variants.map((v) => `${v.src} ${v.w}w`).join(', '),
    width,
    height,
    alt: entry.alt ?? '',
    ...(entry.focus ? { focus: entry.focus } : {}),
  }
  console.log(`✓ ${name} (${width}×${height} → ${widths.join(', ')} px)`)
}

await writeFile(
  moduleFile,
  `// Automatisch erzeugt von scripts/photos.mjs – nicht von Hand bearbeiten.\nexport const photos = ${JSON.stringify(photos, null, 2)}\n`,
)

console.log(`\n${Object.keys(photos).length} Fotos eingebunden → src/photos.generated.js`)
if (missing.length) {
  console.warn(`\nNicht eingebunden (dort bleibt die Illustration):\n  ${missing.join('\n  ')}`)
  process.exitCode = 1
}
