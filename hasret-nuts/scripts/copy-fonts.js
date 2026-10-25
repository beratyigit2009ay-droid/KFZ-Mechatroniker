#!/usr/bin/env node
'use strict';
/**
 * npm run fonts – kopiert die benötigten Schriftschnitte (woff2, Subsets latin + latin-ext
 * für deutsche UND türkische Zeichen wie ş ı ğ ç ö ü) aus den @fontsource-Paketen nach
 * shared/assets/fonts und erzeugt shared/assets/css/fonts.css.
 *
 * Die Schriften werden selbst gehostet – es gibt KEINE Anfragen an Google Fonts (DSGVO).
 * Die kopierten Dateien inkl. OFL-Lizenztexte werden ins Repository eingecheckt.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const FONTS_DIR = path.join(ROOT, 'shared', 'assets', 'fonts');
const CSS_FILE = path.join(ROOT, 'shared', 'assets', 'css', 'fonts.css');
const SUBSETS = ['latin-ext', 'latin'];

const FONTS = [
  { id: 'cormorant-garamond', family: 'Cormorant Garamond', faces: [[500, 'normal'], [600, 'normal'], [500, 'italic']] },
  { id: 'jost', family: 'Jost', faces: [[400, 'normal'], [500, 'normal'], [600, 'normal']] },
  { id: 'fraunces', family: 'Fraunces', faces: [[400, 'normal'], [600, 'normal'], [400, 'italic']] },
  { id: 'dm-sans', family: 'DM Sans', faces: [[400, 'normal'], [500, 'normal'], [700, 'normal']] },
];

function pkgDir(id) {
  return path.join(ROOT, 'node_modules', '@fontsource', id);
}

function main() {
  const css = [
    '/*',
    ' * Hasret Nuts – selbst gehostete Schriften (erzeugt von "npm run fonts", nicht von Hand bearbeiten).',
    ' * Quellen: @fontsource-Pakete; Lizenz: SIL Open Font License 1.1 (siehe ../fonts/<familie>/OFL.txt).',
    ' * Subsets: latin-ext (u. a. türkische Zeichen ş ı ğ) + latin. Keine externen Anfragen (DSGVO).',
    ' */',
    '',
  ];
  let copied = 0;
  for (const font of FONTS) {
    const src = pkgDir(font.id);
    if (!fs.existsSync(src)) {
      console.error(`Paket @fontsource/${font.id} fehlt – bitte zuerst "npm install" ausführen.`);
      process.exit(1);
    }
    const unicode = JSON.parse(fs.readFileSync(path.join(src, 'unicode.json'), 'utf8'));
    const dest = path.join(FONTS_DIR, font.id);
    fs.mkdirSync(dest, { recursive: true });
    fs.copyFileSync(path.join(src, 'LICENSE'), path.join(dest, 'OFL.txt'));
    for (const [weight, style] of font.faces) {
      for (const subset of SUBSETS) {
        const file = `${font.id}-${subset}-${weight}-${style}.woff2`;
        const from = path.join(src, 'files', file);
        if (!fs.existsSync(from)) {
          console.error(`Datei fehlt: ${from}`);
          process.exit(1);
        }
        fs.copyFileSync(from, path.join(dest, file));
        copied += 1;
        css.push(
          `/* ${font.id}-${subset}-${weight}-${style} */`,
          '@font-face {',
          `  font-family: '${font.family}';`,
          `  font-style: ${style};`,
          `  font-weight: ${weight};`,
          '  font-display: swap;',
          `  src: url('../fonts/${font.id}/${file}') format('woff2');`,
          `  unicode-range: ${unicode[subset]};`,
          '}',
          ''
        );
      }
    }
  }
  fs.mkdirSync(path.dirname(CSS_FILE), { recursive: true });
  fs.writeFileSync(CSS_FILE, css.join('\n'));
  console.log(`${copied} Schriftdateien kopiert → ${path.relative(ROOT, FONTS_DIR)}; CSS → ${path.relative(ROOT, CSS_FILE)}`);
}

main();
