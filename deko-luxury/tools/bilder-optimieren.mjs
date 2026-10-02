// Wandelt eigene Fotos in die webfertigen Bilddateien der Website um.
//
// 1. Fotos (JPG, PNG, HEIC, WebP …) in den Ordner  bilder-original/  legen und so benennen
//    wie das Bild, das ersetzt werden soll – z. B. hero.jpg, leistung-hochzeiten.jpg, portfolio-03.jpg
// 2. Einmalig:  npm install
// 3. Dann:      npm run bilder
//
// Das Skript erzeugt pro Foto die benötigten Breiten als WebP in assets/img/ und
// überschreibt dabei die bisherigen Platzhalter-Dateien gleichen Namens.

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, 'bilder-original');
const OUT = path.join(ROOT, 'assets', 'img');

// Bildname → Breiten, die auf der Website verwendet werden
const SLOTS = {
  'hero': [960, 1600, 2400],
  'intro': [600, 1200],
  'leistung-hochzeiten': [600, 1200],
  'leistung-eventdekoration': [600, 1200],
  'leistung-floristik': [600, 1200],
  'leistung-tischdekoration': [600, 1200],
  'leistung-trauungen': [600, 1200],
  'leistung-konzepte': [600, 1200],
  'portfolio-01': [800, 1600],
  'portfolio-02': [600, 1200],
  'portfolio-03': [700, 1400],
  'portfolio-04': [600, 1200],
  'portfolio-05': [600, 1200],
  'portfolio-06': [600, 1200],
  'portfolio-07': [800, 1600],
  'portfolio-08': [600, 1200],
  'portfolio-09': [800, 1600],
  'portfolio-10': [800, 1600],
  'portfolio-11': [800, 1600],
  'portfolio-12': [800, 1600],
  'stil': [700, 1400],
  'showroom-1': [800, 1600],
  'showroom-2': [600, 1200],
  'showroom-3': [800, 1600],
};

if (!fs.existsSync(SRC)) {
  fs.mkdirSync(SRC);
  console.log('Ordner "bilder-original" wurde angelegt. Fotos hineinlegen und erneut starten.');
  process.exit(0);
}

const files = fs.readdirSync(SRC).filter((f) => !f.startsWith('.'));
if (!files.length) {
  console.log('Keine Fotos in "bilder-original" gefunden.');
  process.exit(0);
}

let count = 0;
for (const file of files) {
  const name = path.parse(file).name.toLowerCase();
  const widths = SLOTS[name];
  if (!widths) {
    console.warn(`Übersprungen: ${file} – unbekannter Name. Erlaubt sind: ${Object.keys(SLOTS).join(', ')}`);
    continue;
  }
  const input = sharp(path.join(SRC, file)).rotate(); // EXIF-Ausrichtung übernehmen
  const meta = await input.metadata();
  for (const w of widths) {
    const target = path.join(OUT, `${name}-${w}.webp`);
    await input.clone()
      .resize({ width: Math.min(w, meta.width || w), withoutEnlargement: true })
      .webp({ quality: 80, effort: 6 })
      .toFile(target);
  }
  if ((meta.width || 0) < widths[widths.length - 1]) {
    console.warn(`Hinweis: ${file} ist nur ${meta.width}px breit, empfohlen sind mindestens ${widths[widths.length - 1]}px.`);
  }
  console.log(`✓ ${file} → ${widths.map((w) => `${name}-${w}.webp`).join(', ')}`);
  count += 1;
}
console.log(`\n${count} Foto(s) umgewandelt. Bitte danach die Alt-Texte in index.html an die neuen Motive anpassen.`);
