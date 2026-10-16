/**
 * Rendert jede Seite vorab zu statischem HTML (SEO, schneller erster Aufbau)
 * und erzeugt die passenden Meta-Angaben. Läuft nach `vite build`.
 */
import { readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const ssrDir = path.join(root, '.ssr')

const ssrEntry = (await readdir(ssrDir)).find((file) => /^entry-server\.m?js$/.test(file))
const { render, pages, site, isPlaceholder, telHref } = await import(
  pathToFileURL(path.join(ssrDir, ssrEntry)).href
)

const template = await readFile(path.join(dist, 'index.html'), 'utf8')
const assets = await readdir(path.join(dist, 'assets'))

const escape = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

const baseUrl = site.url ? site.url.replace(/\/+$/, '') + '/' : ''
const pageUrl = (page) => (page.file === 'index.html' ? baseUrl : baseUrl + page.file)

const fontPreloads = assets
  .filter((file) => /^(manrope|cormorant-garamond)-latin-wght-normal.*\.woff2$/.test(file))
  .map(
    (file) =>
      `<link rel="preload" href="./assets/${file}" as="font" type="font/woff2" crossorigin />`,
  )

function structuredData() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Locksmith',
    name: `${site.name} Schlüsseldienst`,
    description:
      'Schlüsseldienst für Türöffnungen, Schlosswechsel, Einbruchschutz und Sicherheitstechnik.',
  }
  if (baseUrl) data.image = `${baseUrl}og-image.png`
  // Platzhalter gehören nicht in strukturierte Daten.
  if (!isPlaceholder(site.phone)) data.telephone = telHref().replace('tel:', '')
  if (!isPlaceholder(site.area)) data.areaServed = site.area
  if (baseUrl) data.url = baseUrl
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`
}

// Entscheidet vor dem ersten Bild, ob das Intro läuft: einmal pro Sitzung,
// nie bei „Bewegung reduzieren“, erneut mit #intro in der Adresse.
// Sicherheitsnetz: Nach 9 Sekunden wird das Intro in jedem Fall ausgeblendet.
const introScript = `<script>(function(){var d=document.documentElement,p='skip';try{var r=matchMedia('(prefers-reduced-motion: reduce)').matches,s=null;try{s=sessionStorage.getItem('fc-intro')}catch(e){}if(!r&&(s!=='1'||location.hash==='#intro'))p='play'}catch(e){}window.__fcIntro=p;if(p==='play'){d.classList.add('intro-playing','intro-hold');setTimeout(function(){d.classList.remove('intro-playing','intro-hold')},9000)}})()</script>`

function head(page) {
  // Vorschaubild für geteilte Links (WhatsApp, Facebook …) braucht eine absolute URL.
  const image = baseUrl && `${baseUrl}og-image.png`
  const tags = [
    `<meta name="description" content="${escape(page.description)}" />`,
    page.noindex
      ? '<meta name="robots" content="noindex, follow" />'
      : '<meta name="robots" content="index, follow" />',
    baseUrl && `<link rel="canonical" href="${pageUrl(page)}" />`,
    '<meta property="og:type" content="website" />',
    '<meta property="og:locale" content="de_DE" />',
    `<meta property="og:site_name" content="${escape(site.name)} Schlüsseldienst" />`,
    `<meta property="og:title" content="${escape(page.title)}" />`,
    `<meta property="og:description" content="${escape(page.description)}" />`,
    image && `<meta property="og:image" content="${image}" />`,
    baseUrl && `<meta property="og:url" content="${pageUrl(page)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    ...fontPreloads,
    page.key === 'home' && structuredData(),
    page.key === 'home' && introScript,
  ]
  return tags.filter(Boolean).join('\n    ')
}

for (const page of pages) {
  const html = template
    .replace(/<title>.*?<\/title>/, `<title>${escape(page.title)}</title>`)
    .replace('<!--app-head-->', head(page))
    .replace('data-page=""', `data-page="${page.key}"`)
    .replace('<!--app-html-->', () => render(page.key))
    // Klassisches, verzögertes Skript statt Modul (funktioniert auch über file://).
    .replace(/<script type="module" crossorigin src="([^"]+)"><\/script>/, '<script defer src="$1"></script>')
    .replace(/<link rel="stylesheet" crossorigin href=/g, '<link rel="stylesheet" href=')

  await writeFile(path.join(dist, page.file), html)
  console.log(`  ✓ ${page.file}`)
}

if (baseUrl) {
  const today = new Date().toISOString().slice(0, 10)
  const urls = pages
    .filter((page) => !page.noindex)
    .map((page) => `  <url><loc>${pageUrl(page)}</loc><lastmod>${today}</lastmod></url>`)
    .join('\n')
  await writeFile(
    path.join(dist, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
  )
  await writeFile(
    path.join(dist, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${baseUrl}sitemap.xml\n`,
  )
  console.log('  ✓ sitemap.xml')
}

await rm(ssrDir, { recursive: true, force: true })
console.log(`\n${pages.length} Seiten vorgerendert.`)
