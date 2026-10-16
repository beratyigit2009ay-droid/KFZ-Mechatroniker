/**
 * Bildquellen. Alle Fotos stammen von Pexels (https://www.pexels.com/license/)
 * und dürfen kostenlos auch kommerziell genutzt werden.
 *
 * Eigene Fotos verwenden: Datei nach `public/images/` legen und beim
 * jeweiligen Eintrag statt `pexels` z. B. `src: 'images/team.jpg'` setzen.
 */
export const images = {
  hero: {
    pexels: 5691502,
    alt: 'Monteur arbeitet mit dem Schraubendreher an einer Tür',
    credit: 'Ksenia Chernaya',
    position: '50% 40%',
  },
  about: {
    pexels: 5691498,
    alt: 'Handwerker montiert sorgfältig einen Beschlag an einer Tür',
    credit: 'Ksenia Chernaya',
    position: '50% 45%',
  },
  tueroeffnung: {
    pexels: 20270229,
    alt: 'Holztür mit steckendem Schlüssel im Schloss',
    credit: 'Henry Acevedo',
  },
  schlosswechsel: {
    pexels: 279810,
    alt: 'Türgriff und Schloss mit eingestecktem Schlüssel',
    credit: 'Pixabay',
  },
  einbruchschutz: {
    pexels: 19227220,
    alt: 'Eingang eines modernen Hauses mit Steinfassade und Holztür',
    credit: 'Curtis Adams',
  },
  sicherheitstechnik: {
    pexels: 6689289,
    alt: 'Modernes elektronisches Türschloss an einer hellen Tür',
    credit: 'Joppe Beurskens',
  },
  autooeffnung: {
    pexels: 4930676,
    alt: 'Hand mit Autoschlüssel an einer Fahrzeugtür',
    credit: 'Mix and Match Studio',
  },
  beratung: {
    pexels: 7046169,
    alt: 'Moderne Wohnungstür aus Holz mit Metallbeschlag',
    credit: 'Max Vakhtbovych',
  },
  keys: {
    pexels: 792031,
    alt: '',
    credit: 'Pexels',
  },
  entranceNight: {
    pexels: 31737862,
    alt: 'Beleuchteter Eingang eines modernen Hauses am Abend',
    credit: 'Sharath G.',
  },
}

const WIDTHS = [480, 768, 1080, 1440, 1920]

export function imageSources(image, maxWidth = 1920) {
  if (image.src) return { src: image.src }
  const id = image.pexels
  const url = (w) =>
    `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`
  const widths = WIDTHS.filter((w) => w <= maxWidth)
  return {
    src: url(widths[Math.min(2, widths.length - 1)]),
    srcSet: widths.map((w) => `${url(w)} ${w}w`).join(', '),
  }
}
