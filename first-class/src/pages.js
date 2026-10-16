import { site } from './config.js'
import { services } from './content.js'

/**
 * Alle Seiten liegen flach neben der index.html. Dadurch funktionieren die
 * relativen Links überall: auf der eigenen Domain, in einem Unterordner und
 * auch beim direkten Öffnen der Dateien im Browser.
 */
export const pages = [
  {
    key: 'home',
    file: 'index.html',
    title: `${site.name} Schlüsseldienst | Türöffnung, Schlosswechsel & Sicherheitstechnik`,
    description:
      'FIRST CLASS Schlüsseldienst – Ihr zuverlässiger Ansprechpartner für Türöffnungen, Schlosswechsel und moderne Sicherheitstechnik. Klare Kosteninformation vor Arbeitsbeginn.',
  },
  ...services.map((service) => ({
    key: service.slug,
    file: `${service.slug}.html`,
    title: `${service.title} | ${site.name} Schlüsseldienst`,
    description: service.metaDescription,
    image: service.image,
  })),
  {
    key: 'impressum',
    file: 'impressum.html',
    title: `Impressum | ${site.name} Schlüsseldienst`,
    description: `Impressum von ${site.name} Schlüsseldienst.`,
    noindex: true,
  },
  {
    key: 'datenschutz',
    file: 'datenschutz.html',
    title: `Datenschutzerklärung | ${site.name} Schlüsseldienst`,
    description: `Datenschutzerklärung von ${site.name} Schlüsseldienst.`,
    noindex: true,
  },
]

export const pageByKey = Object.fromEntries(pages.map((p) => [p.key, p]))

export function pageKeyFromPath(pathname) {
  const file = pathname.split('/').pop() || 'index.html'
  const match = pages.find((p) => p.file === file || p.file === `${file}.html`)
  return match ? match.key : 'home'
}
