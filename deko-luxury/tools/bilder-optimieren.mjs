// Wandelt eigene Fotos in die webfertigen Bilddateien der Website um.
//
// 1. Fotos (JPG, PNG, HEIC, WebP …) in den Ordner  bilder-original/  legen und so benennen
//    wie das Bild, das ersetzt werden soll – z. B. galerie-01.jpg, galerie-04.jpg
// 2. Einmalig:  npm install
// 3. Dann:      npm run bilder
//
// Das Skript erzeugt pro Foto die benötigten Breiten als WebP in assets/img/ und
// überschreibt dabei die bisherigen Dateien gleichen Namens.

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, 'bilder-original');
const OUT = path.join(ROOT, 'assets', 'img');

// Bildname → Breiten, die auf der Website verwendet werden
const SLOTS = {
  // Galerie (5 Bilder). 01–03 erscheinen zusätzlich im Bogenfenster oben auf der Startseite
  // (dort am besten Hochformat-Fotos im Verhältnis 3:4 oder 4:5), 04 auch bei „Über uns“.
  'galerie-01': [600, 900, 1500],
  'galerie-02': [600, 900, 1500],
  'galerie-03': [600, 900, 1500],
  'galerie-04': [600, 900, 1500],
  'galerie-05': [600, 900, 1500],
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
      .sharpen({ sigma: 0.5, m1: 0.6, m2: 1.4 })
      .webp({ quality: 86, effort: 6, smartSubsample: true })
      .toFile(target);
  }
  if ((meta.width || 0) < widths[widths.length - 1]) {
    console.warn(`Hinweis: ${file} ist nur ${meta.width}px breit, empfohlen sind mindestens ${widths[widths.length - 1]}px. In index.html beim größten Eintrag im srcset ${meta.width}w angeben.`);
  }
  console.log(`✓ ${file} → ${widths.map((w) => `${name}-${w}.webp`).join(', ')}`);
  count += 1;
}
console.log(`\n${count} Foto(s) umgewandelt. Bitte danach die Alt-Texte in index.html an die neuen Motive anpassen.`);
