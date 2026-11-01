/**
 * Erzeugt das FIRST-CLASS-Logo in allen Fassungen:
 *
 *   npm run logo
 *
 * - brand/*.svg       Vektordateien (Schrift in Pfade umgewandelt) für
 *                     Folierung, Druck und Schilder
 * - brand/png/*.png   Rastergrafiken mit transparentem Hintergrund
 * - public/favicon.svg
 * - src/components/logo.generated.js  Pfade für das Logo auf der Website
 *
 * Aufbau: rundes Siegel mit Löwe und Schlüssel (scripts/trace-emblem.mjs),
 * daneben „FIRST CLASS“, eine Goldlinie und „SCHLÜSSELDIENST“.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { site } from '../src/config.js'
import { font, textPath, tracedEmblem } from './logo-lib.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const brand = path.join(root, 'brand')

export const COLORS = {
  gold: '#C49E56',
  anthracite: '#15171A',
  cream: '#F7F2E8',
}

const heavy = font('@fontsource/barlow-semi-condensed', 800)
const bold = font('@fontsource/barlow-semi-condensed', 700)
const sizeForCap = (f, cap) => cap / (f['OS/2'].capHeight / f.unitsPerEm)

const emblem = tracedEmblem()

// ---------- Schriftblock (Ursprung links oben) ----------
const WORD_CAP = 48
const word = textPath(heavy, 'FIRST CLASS', {
  size: sizeForCap(heavy, WORD_CAP),
  x: 0,
  y: WORD_CAP,
  tracking: 0.05,
})
const RULE = { y: WORD_CAP + 14, h: 3 }
const SUB_CAP = 13
const sub = textPath(bold, 'SCHLÜSSELDIENST', {
  size: sizeForCap(bold, SUB_CAP),
  x: 1,
  y: RULE.y + RULE.h + 12 + SUB_CAP,
  width: word.width - 2,
})
const BLOCK_W = word.width
const BLOCK_H = RULE.y + RULE.h + 12 + SUB_CAP

// ---------- Querformat: Siegel links, Schrift rechts ----------
const H_HEIGHT = 120
const EMBLEM_SCALE = H_HEIGHT / emblem.size
const TX = H_HEIGHT + 24
const TY = (H_HEIGHT - BLOCK_H) / 2
const H_WIDTH = Math.ceil(TX + BLOCK_W + 1)

/** `light` = für helle Flächen (weißes Auto), `dark` = für dunkle Flächen. */
const textColor = (scheme) => (scheme === 'dark' ? COLORS.cream : COLORS.anthracite)

function emblemSvg(transform) {
  return [
    `<g transform="${transform}">`,
    `<path fill="${COLORS.anthracite}" fill-rule="evenodd" d="${emblem.dark}"/>`,
    `<path fill="${COLORS.gold}" fill-rule="evenodd" d="${emblem.gold}"/>`,
    '</g>',
  ].join('')
}

function blockSvg(scheme, dx, dy) {
  return [
    `<g transform="translate(${dx.toFixed(2)} ${dy.toFixed(2)})">`,
    `<path fill="${textColor(scheme)}" d="${word.d}"/>`,
    `<rect fill="${COLORS.gold}" x="1" y="${RULE.y}" width="${(word.width - 2).toFixed(2)}" height="${RULE.h}"/>`,
    `<path fill="${COLORS.gold}" d="${sub.d}"/>`,
    '</g>',
  ].join('')
}

const svgDoc = (w, h, body, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><title>${title}</title>${body}</svg>\n`

const horizontal = (scheme) =>
  svgDoc(
    H_WIDTH,
    H_HEIGHT,
    emblemSvg(`scale(${EMBLEM_SCALE})`) + blockSvg(scheme, TX, TY),
    'FIRST CLASS Schlüsseldienst',
  )

// ---------- Hochformat: Siegel oben, Schrift darunter ----------
function stacked(scheme) {
  const W = Math.ceil(BLOCK_W + 8)
  const E = 170
  const H = Math.ceil(E + 26 + BLOCK_H + 4)
  return svgDoc(
    W,
    H,
    emblemSvg(`translate(${((W - E) / 2).toFixed(2)} 0) scale(${E / emblem.size})`) +
      blockSvg(scheme, 4, E + 26),
    'FIRST CLASS Schlüsseldienst',
  )
}

// ---------- Autotür: Logo + Notdienst-Nummer ----------
function carDoor() {
  const label = textPath(bold, '24 H NOTDIENST · AUGSBURG & GERSTHOFEN', {
    size: sizeForCap(bold, 13),
    x: 1,
    y: 172,
    width: H_WIDTH - 2,
  })
  const phoneText = site.phone.replace(/\s*\/\s*/, ' ')
  const phoneSize = sizeForCap(heavy, 40)
  const probe = textPath(heavy, phoneText, { size: phoneSize, tracking: 0.03 })
  const phone = textPath(heavy, phoneText, {
    size: phoneSize,
    x: (H_WIDTH - probe.width) / 2,
    y: 232,
    tracking: 0.03,
  })
  return svgDoc(
    H_WIDTH,
    240,
    emblemSvg(`scale(${EMBLEM_SCALE})`) +
      blockSvg('light', TX, TY) +
      `<path fill="${COLORS.gold}" d="${label.d}"/>` +
      `<path fill="${COLORS.anthracite}" d="${phone.d}"/>`,
    'FIRST CLASS Schlüsseldienst – Fahrzeugbeschriftung',
  )
}

// ---------- Siegel allein (Favicon, Profilbild, Stempel) ----------
const emblemOnly = () => svgDoc(200, 200, emblemSvg('scale(1)'), 'FIRST CLASS')

const files = {
  'logo-hell.svg': horizontal('light'),
  'logo-dunkel.svg': horizontal('dark'),
  'logo-hochformat-hell.svg': stacked('light'),
  'logo-hochformat-dunkel.svg': stacked('dark'),
  'logo-autotuer.svg': carDoor(),
  'emblem.svg': emblemOnly(),
}

await mkdir(path.join(brand, 'png'), { recursive: true })
for (const [name, svg] of Object.entries(files)) {
  await writeFile(path.join(brand, name), svg)
  await sharp(Buffer.from(svg), { density: 600 })
    .resize({ width: name.startsWith('emblem') ? 1200 : 2400 })
    .png()
    .toFile(path.join(brand, 'png', name.replace('.svg', '.png')))
  console.log(`✓ brand/${name}`)
}

await writeFile(path.join(root, 'public/favicon.svg'), files['emblem.svg'])
console.log('✓ public/favicon.svg')

const generated = {
  width: H_WIDTH,
  height: H_HEIGHT,
  emblemScale: EMBLEM_SCALE,
  dark: emblem.dark,
  gold: emblem.gold,
  text: { x: TX, y: Number(TY.toFixed(2)) },
  word: word.d,
  rule: { y: RULE.y, w: Number((word.width - 2).toFixed(2)), h: RULE.h },
  sub: sub.d,
}
await writeFile(
  path.join(root, 'src/components/logo.generated.js'),
  `// Automatisch erzeugt von scripts/logo.mjs – nicht von Hand bearbeiten.\nexport const logo = ${JSON.stringify(generated)}\n`,
)
console.log('✓ src/components/logo.generated.js')
