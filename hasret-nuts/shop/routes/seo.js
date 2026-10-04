'use strict';
/**
 * Owner: BUILD-SHOP
 * SEO: /robots.txt , /sitemap.xml
 * Außerhalb der Produktion bzw. mit ALLOW_INDEXING=false sperrt robots.txt alles (shared/seo.js).
 */
const fs = require('node:fs');
const express = require('express');
const config = require('../../shared/config');
const catalog = require('../../shared/catalog');
const { robotsTxt, sitemapXml } = require('../../shared/seo');
const view = require('../lib/catalog-view');

const router = express.Router();

const DISALLOW = ['/konto', '/admin', '/warenkorb', '/kasse', '/bestellung', '/api', '/suche', '/newsletter', '/feedback'];

function catalogDate() {
  try {
    return fs.statSync(config.data.catalogPath).mtime;
  } catch {
    return new Date();
  }
}

router.get('/robots.txt', (req, res) => {
  res.type('text/plain; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=3600');
  res.send(robotsTxt({ baseUrl: config.apps.shop.baseUrl, disallow: DISALLOW }));
});

router.get('/sitemap.xml', (req, res) => {
  const lastmod = catalogDate();
  const entries = [
    { loc: '/', lastmod, changefreq: 'daily', priority: 1.0 },
    ...view.sortedCategories().map((c) => ({ loc: `/kategorie/${c.slug}`, lastmod, changefreq: 'weekly', priority: 0.9 })),
    ...catalog.getProducts().map((p) => ({ loc: `/produkt/${p.slug}`, lastmod, changefreq: 'weekly', priority: 0.8 })),
    { loc: '/angebote', lastmod, changefreq: 'weekly', priority: 0.8 },
    { loc: '/allergene', lastmod, changefreq: 'monthly', priority: 0.6 },
    { loc: '/versand-zahlung', lastmod, changefreq: 'yearly', priority: 0.4 },
    ...['/agb', '/widerruf', '/impressum', '/datenschutz', '/cookies'].map((loc) => ({ loc, lastmod, changefreq: 'yearly', priority: 0.2 })),
  ];
  res.type('application/xml; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=3600');
  res.send(sitemapXml(entries, { baseUrl: config.apps.shop.baseUrl }));
});

module.exports = router;
