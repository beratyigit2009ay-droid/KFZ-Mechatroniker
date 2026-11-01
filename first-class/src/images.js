import { photos } from './photos.generated.js'

/**
 * Bilder der Website.
 *
 * Grundlage sind die Illustrationen aus `scripts/illustrations.mjs`
 * (public/images/*.svg). Sobald `npm run photos` ein gleichnamiges Foto
 * erzeugt hat (src/photos.generated.js), wird stattdessen das Foto gezeigt –
 * in mehreren Größen, damit Handys keine riesigen Dateien laden.
 *
 * Eigene Fotos: Datei unter photos-src/<name>.jpg ablegen, Bildbeschreibung
 * in scripts/photos.json eintragen und `npm run photos` ausführen.
 */
const illustrations = {
  hero: {
    src: 'images/hero.svg',
    alt: 'Illustration: moderne Haustür bei Nacht mit Stoßgriff, Profilzylinder und Werkzeugkoffer des Monteurs',
  },
  about: {
    src: 'images/about.svg',
    alt: 'Illustration: sorgfältig ausgelegtes Werkzeug, Schließzylinder und Schlüssel',
  },
  tueroeffnung: {
    src: 'images/tueroeffnung.svg',
    alt: 'Illustration: geöffnete Tür, aus der warmes Licht fällt, davor ein Schlüssel',
  },
  schlosswechsel: {
    src: 'images/schlosswechsel.svg',
    alt: 'Illustration: technische Zeichnung eines Profilzylinders mit Schlüssel',
  },
  einbruchschutz: {
    src: 'images/einbruchschutz.svg',
    alt: 'Illustration: Haustür mit Querriegel und Schutzbeschlag',
  },
  sicherheitstechnik: {
    src: 'images/sicherheitstechnik.svg',
    alt: 'Illustration: Schutzbeschlag mit Ziehschutz und elektronisches Codeschloss',
  },
  autooeffnung: {
    src: 'images/autooeffnung.svg',
    alt: 'Illustration: Fahrzeug in Linienzeichnung mit Funkschlüssel',
  },
  schluessel: {
    src: 'images/schluessel.svg',
    alt: 'Illustration: Schlüsselrohling und fertiger Schlüssel an einer Schlüsselfräse',
  },
  keys: {
    src: 'images/keys.svg',
    alt: '',
  },
  entranceNight: {
    src: 'images/entranceNight.svg',
    alt: 'Illustration: beleuchteter Hauseingang am Abend mit Vordach und Stufen',
  },
}

/** Fotos haben Vorrang; Einträge ohne Illustration (z. B. `shop`) gibt es nur als Foto. */
export const images = { ...illustrations, ...photos }

export const hasPhoto = (name) => Boolean(photos[name])
export const usesPhotos = Object.keys(photos).length > 0
