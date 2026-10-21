'use strict';
/**
 * SEO-Grundlagen (FOUNDATION-CORE).
 *
 *   const { buildMeta, robotsTxt, sitemapXml } = require('../shared/seo');
 *   res.render('page.njk', { meta: buildMeta({ title: 'Philosophie', description: '…', path: '/philosophie' }, req) });
 *
 * buildMeta(opts, req?) – die App (Basis-URL, Seitenname) wird aus opts.site, opts.app
 * ('corporate' | 'shop'), req oder – innerhalb einer Anfrage – automatisch aus dem
 * Anfrage-Kontext bestimmt; path standardmäßig = req.path der aktuellen Anfrage.
 * Das Ergebnis rendert shared/views/partials/seo-head.njk.
 */
const config = require('./config');
const { current } = require('./request-context');

const DEFAULTS = {
  corporate: {
    description:
      'Hasret Nuts – Hasret Kuruyemiş aus Memmingen. Traditionelle Spezialitäten, hausgemachte Feinkost und ausgewählte Nüsse. Sehnsucht, die man schmecken kann.',
    image: '/assets/logo/og-default.png',
  },
  shop: {
    description:
      'Der Online-Shop von Hasret Nuts aus Memmingen: Sarma Lokum, hausgemachte Feinkost, Maulbeer-Extrakt, Nüsse und Knabberzeug – bequem als unverbindliche Bestellanfrage.',
    image: '/assets/logo/og-default.png',
  },
};

function siteFor(opts, req) {
  if (opts.site && opts.site.baseUrl) return opts.site;
  const ctx = current();
  const appName =
    opts.app || (req && req.app && req.app.locals && req.app.locals.appName) || (ctx && ctx.appName);
  if (appName && config.apps[appName]) return siteFromConfig(appName);
  if (req && req.app && req.app.locals && req.app.locals.site) return req.app.locals.site;
  throw new TypeError("buildMeta: App unbekannt – außerhalb einer Anfrage req übergeben oder opts.app ('corporate'|'shop') setzen");
}

/** Site-Objekt für Templates (auch als Global "site" verfügbar). */
function siteFromConfig(appName) {
  const a = config.apps[appName];
  return {
    app: appName,
    name: a.siteName,
    brand: 'Hasret Nuts',
    baseUrl: a.baseUrl,
    googleVerification: a.googleVerification,
    corporateUrl: config.apps.corporate.baseUrl,
    shopUrl: config.apps.shop.baseUrl,
    locale: 'de_DE',
    allowIndexing: config.allowIndexing,
  };
}

function absoluteUrl(baseUrl, p) {
  if (!p) return baseUrl + '/';
  if (/^https?:\/\//i.test(p)) return p;
  return baseUrl + (p.startsWith('/') ? p : `/${p}`);
}

function oneLine(value, max) {
  const s = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  return max && s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

/**
 * Baut das Meta-Objekt für partials/seo-head.njk.
 * opts: { title, description, path, image, imageAlt, noindex, type ('website'|'product'|'article'),
 *         fullTitle (Titel unverändert übernehmen), app, site }
 * → { title, description, canonical, url, robots, noindex, type, image, imageAlt, siteName, locale,
 *     twitterCard, googleVerification, app }
 */
function buildMeta(opts = {}, req = null) {
  const site = siteFor(opts, req);
  const defaults = DEFAULTS[site.app] || DEFAULTS.shop;
  const rawTitle = oneLine(opts.title);
  let title;
  if (!rawTitle) title = site.app === 'corporate' ? 'Hasret Nuts – Sehnsucht, die man schmecken kann.' : `${site.name} – Spezialitäten aus Memmingen`;
  else if (opts.fullTitle || rawTitle.includes(site.name)) title = rawTitle;
  else title = `${rawTitle} · ${site.name}`;

  let pathPart = opts.path;
  if (!pathPart && req) pathPart = req.path;
  if (!pathPart) {
    const ctx = current();
    if (ctx && ctx.req) pathPart = ctx.req.path;
  }
  if (!pathPart) pathPart = '/';
  const canonical = absoluteUrl(site.baseUrl, pathPart);
  const noindex = Boolean(opts.noindex) || !config.allowIndexing;

  return {
    app: site.app,
    title,
    description: oneLine(opts.description || defaults.description, 300),
    canonical,
    url: canonical,
    robots: noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large',
    noindex,
    type: opts.type || 'website',
    image: absoluteUrl(site.baseUrl, opts.image || defaults.image),
    imageAlt: oneLine(opts.imageAlt || 'Hasret Nuts – Logo'),
    siteName: site.name,
    locale: 'de_DE',
    twitterCard: 'summary_large_image',
    googleVerification: site.googleVerification || '',
  };
}

/**
 * robots.txt. Außerhalb der Produktion (bzw. ALLOW_INDEXING=false) wird alles gesperrt.
 * robotsTxt({ baseUrl, disallow: ['/konto', '/admin'], allowIndexing })
 */
function robotsTxt({ baseUrl, disallow = [], allowIndexing = config.allowIndexing } = {}) {
  if (!allowIndexing) return 'User-agent: *\nDisallow: /\n';
  const lines = ['User-agent: *', 'Allow: /'];
  for (const d of disallow) {
    const clean = String(d).replace(/[\r\n]/g, '');
    if (clean.startsWith('/')) lines.push(`Disallow: ${clean}`);
  }
  if (baseUrl) lines.push('', `Sitemap: ${String(baseUrl).replace(/\/+$/, '')}/sitemap.xml`);
  return `${lines.join('\n')}\n`;
}

function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const CHANGEFREQ = new Set(['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']);

/**
 * sitemap.xml. entries: [{ loc, lastmod?, changefreq?, priority? }]
 * loc absolut – oder relativ, wenn opts.baseUrl übergeben wird. lastmod: Date oder ISO-String.
 */
function sitemapXml(entries = [], opts = {}) {
  const urls = entries
    .filter((e) => e && e.loc)
    .map((e) => {
      const loc = opts.baseUrl && String(e.loc).startsWith('/') ? absoluteUrl(String(opts.baseUrl).replace(/\/+$/, ''), e.loc) : e.loc;
      const parts = [`    <loc>${xmlEscape(loc)}</loc>`];
      if (e.lastmod) {
        const d = e.lastmod instanceof Date ? e.lastmod : new Date(e.lastmod);
        if (!Number.isNaN(d.getTime())) parts.push(`    <lastmod>${d.toISOString().slice(0, 10)}</lastmod>`);
      }
      if (e.changefreq && CHANGEFREQ.has(e.changefreq)) parts.push(`    <changefreq>${e.changefreq}</changefreq>`);
      if (e.priority !== undefined && e.priority !== null) {
        const p = Math.min(1, Math.max(0, Number(e.priority)));
        if (Number.isFinite(p)) parts.push(`    <priority>${p.toFixed(1)}</priority>`);
      }
      return `  <url>\n${parts.join('\n')}\n  </url>`;
    });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

module.exports = { buildMeta, robotsTxt, sitemapXml, siteFromConfig, absoluteUrl, xmlEscape };
