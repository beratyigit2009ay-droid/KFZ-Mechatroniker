'use strict';
/**
 * Nunjucks-Einrichtung (FOUNDATION-CORE).
 *
 * Suchpfade: [<app>/views, shared/views]  → App-Templates überschreiben gemeinsame.
 * autoescape ist AN – niemals "| safe" auf Nutzereingaben anwenden.
 *
 * Filter:
 *   {{ 800 | euro }}                    → "8,00 €" (geschütztes Leerzeichen U+00A0 vor €)
 *   {{ order.created_at | date }}       → "03.10.2026"
 *   {{ ts | date('datetime') }}         → "03.10.2026, 17:05"   (Zeitzone Europe/Berlin)
 *   {{ ts | date('long') }}             → "3. Oktober 2026"
 *   {{ data | jsonld }}                 → sicheres JSON für <script type="application/ld+json">
 * Globals:
 *   site      { name, app, baseUrl, googleVerification, corporateUrl, shopUrl }
 *   assetV    Cache-Busting-Version;  asset('/static/css/shop.css') → '/static/css/shop.css?v=…'
 *   currentYear
 */
const path = require('node:path');
const nunjucks = require('nunjucks');
const config = require('./config');

const SHARED_VIEWS = path.join(__dirname, 'views');

/** Cent → "8,00 €" (deutsches Format, U+00A0 vor dem Eurozeichen). */
function formatEuro(cents) {
  const n = Number(cents);
  if (cents === null || cents === undefined || cents === '' || !Number.isFinite(n)) return '';
  const negative = n < 0;
  const abs = Math.round(Math.abs(n));
  const euros = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const rest = String(abs % 100).padStart(2, '0');
  return `${negative ? '−' : ''}${euros},${rest}\u00a0€`;
}

const DATE_FORMATS = {
  date: { day: '2-digit', month: '2-digit', year: 'numeric' },
  datetime: { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' },
  long: { day: 'numeric', month: 'long', year: 'numeric' },
  time: { hour: '2-digit', minute: '2-digit' },
  monthYear: { month: 'long', year: 'numeric' },
};

/** Datum im deutschen Format (Europe/Berlin). style: date | datetime | long | time | monthYear */
function formatDate(value, style = 'date') {
  if (value === null || value === undefined || value === '') return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const opts = DATE_FORMATS[style] || DATE_FORMATS.date;
  return new Intl.DateTimeFormat('de-DE', { ...opts, timeZone: 'Europe/Berlin' }).format(d);
}

/** JSON für <script type="application/ld+json"> – escaped <, >, &, U+2028, U+2029. */
function jsonLdString(value) {
  return JSON.stringify(value ?? null)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Richtet Nunjucks für eine Express-App ein und gibt die Environment zurück.
 * Erwartet app.locals.site und app.locals.assetV (setzt createBaseApp()).
 */
function createViews(app, appDir) {
  const searchPaths = [path.join(appDir, 'views'), SHARED_VIEWS];
  const loader = new nunjucks.FileSystemLoader(searchPaths, { noCache: config.isDev, watch: false });
  const env = new nunjucks.Environment(loader, {
    autoescape: true,
    throwOnUndefined: false,
    trimBlocks: true,
    lstripBlocks: true,
  });

  env.addFilter('euro', formatEuro);
  env.addFilter('date', formatDate);
  env.addFilter('jsonld', (value) => new nunjucks.runtime.SafeString(jsonLdString(value)));

  const assetV = app.locals.assetV || '1';
  env.addGlobal('site', app.locals.site || {});
  env.addGlobal('assetV', assetV);
  env.addGlobal('asset', (p) => `${p}${String(p).includes('?') ? '&' : '?'}v=${assetV}`);
  env.addGlobal('currentYear', new Date().getFullYear());

  env.express(app);
  app.set('view engine', 'njk');
  app.set('views', searchPaths);
  return env;
}

module.exports = { createViews, formatEuro, formatDate, jsonLdString, SHARED_VIEWS };
