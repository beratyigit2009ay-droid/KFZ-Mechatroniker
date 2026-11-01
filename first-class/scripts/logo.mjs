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
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { site } from '../src/config.js'
import { emblemParts, font, textPath } from './logo-lib.mjs'

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

const emblem = emblemParts()

// ---------- Querformat: Schild links, Schriftzug rechts ----------
const TX = 126
const word = textPath(heavy, 'FIRST CLASS', {
  size: sizeForCap(heavy, 52),
  x: TX,
  y: 64,
  tracking: 0.06,
})
const rule = { x: TX + 1, y: 79, w: word.width - 2, h: 3 }
const sub = textPath(bold, 'SCHLÜSSELDIENST', {
  size: sizeForCap(bold, 15.5),
  x: TX + 1,
  y: 109,
  width: word.width - 2,
})
const H_WIDTH = Math.ceil(TX + word.width + 2)
const H_HEIGHT = 120

/** Farbschema: `light` für helle Flächen (weißes Auto), `dark` für dunkle. */
function palette(scheme) {
  return scheme === 'dark'
    ? {
        frame: COLORS.gold,
        inner: COLORS.gold,
        keyhole: null,
        text: COLORS.cream,
        accent: COLORS.gold,
      }
    : {
        frame: COLORS.gold,
        inner: COLORS.anthracite,
        keyhole: COLORS.gold,
        text: COLORS.anthracite,
        accent: COLORS.gold,
      }
}

function emblemSvg(scheme, transform = '') {
  const c = palette(scheme)
  return [
    `<g${transform ? ` transform="${transform}"` : ''}>`,
    `<path fill="${c.frame}" fill-rule="evenodd" d="${emblem.frame}"/>`,
    `<path fill="${c.inner}" fill-rule="evenodd" d="${emblem.inner}"/>`,
    c.keyhole ? `<path fill="${c.keyhole}" d="${emblem.keyhole}"/>` : '',
    '</g>',
  ].join('')
}

function wordmarkSvg(scheme, dx = 0, dy = 0) {
  const c = palette(scheme)
  return [
    `<g transform="translate(${dx} ${dy})">`,
    `<path fill="${c.text}" d="${word.d}"/>`,
    `<rect fill="${c.accent}" x="${rule.x}" y="${rule.y}" width="${rule.w.toFixed(2)}" height="${rule.h}"/>`,
    `<path fill="${c.accent}" d="${sub.d}"/>`,
    '</g>',
  ].join('')
}

const svgDoc = (w, h, body, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><title>${title}</title>${body}</svg>\n`

const horizontal = (scheme) =>
  svgDoc(H_WIDTH, H_HEIGHT, emblemSvg(scheme) + wordmarkSvg(scheme), 'FIRST CLASS Schlüsseldienst')

// ---------- Hochformat: Schild oben, Schriftzug darunter ----------
function stacked(scheme) {
  const scale = 1.5
  const W = Math.ceil(word.width) + 8
  const top = 120 * scale + 30
  return svgDoc(
    W,
    Math.ceil(top + 112),
    emblemSvg(scheme, `translate(${((W - 100 * scale) / 2).toFixed(2)} 0) scale(${scale})`) +
      wordmarkSvg(scheme, 4 - TX, top),
    'FIRST CLASS Schlüsseldienst',
  )
}

// ---------- Autotür: Logo + Notdienst-Nummer ----------
function carDoor() {
  const c = palette('light')
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
  const H = 240
  return svgDoc(
    H_WIDTH,
    H,
    emblemSvg('light') +
      wordmarkSvg('light') +
      `<path fill="${c.accent}" d="${label.d}"/>` +
      `<path fill="${c.text}" d="${phone.d}"/>`,
    'FIRST CLASS Schlüsseldienst – Fahrzeugbeschriftung',
  )
}

// ---------- Emblem allein (Favicon, Profilbild) ----------
const emblemOnly = (scheme) => svgDoc(100, 120, emblemSvg(scheme), 'FIRST CLASS')

const files = {
  'logo-hell.svg': horizontal('light'),
  'logo-dunkel.svg': horizontal('dark'),
  'logo-hochformat-hell.svg': stacked('light'),
  'logo-hochformat-dunkel.svg': stacked('dark'),
  'logo-autotuer.svg': carDoor(),
  'emblem-hell.svg': emblemOnly('light'),
  'emblem-dunkel.svg': emblemOnly('dark'),
}

await mkdir(path.join(brand, 'png'), { recursive: true })
for (const [name, svg] of Object.entries(files)) {
  await writeFile(path.join(brand, name), svg)
  await sharp(Buffer.from(svg), { density: 600 })
    .resize({ width: name.startsWith('emblem') ? 1000 : 2400 })
    .png()
    .toFile(path.join(brand, 'png', name.replace('.svg', '.png')))
  console.log(`✓ brand/${name}`)
}

await writeFile(path.join(root, 'public/favicon.svg'), files['emblem-hell.svg'])
console.log('✓ public/favicon.svg')

const generated = {
  width: H_WIDTH,
  height: H_HEIGHT,
  frame: emblem.frame,
  inner: emblem.inner,
  keyhole: emblem.keyhole,
  word: word.d,
  rule: { x: rule.x, y: rule.y, w: Number(rule.w.toFixed(2)), h: rule.h },
  sub: sub.d,
}
await writeFile(
  path.join(root, 'src/components/logo.generated.js'),
  `// Automatisch erzeugt von scripts/logo.mjs – nicht von Hand bearbeiten.\nexport const logo = ${JSON.stringify(generated)}\n`,
)
console.log('✓ src/components/logo.generated.js')
