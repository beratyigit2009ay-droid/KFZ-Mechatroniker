'use strict';
/**
 * Owner: BUILD-CORPORATE
 * SEO: /robots.txt , /sitemap.xml
 *
 * robots.txt: außerhalb der Produktion bzw. mit ALLOW_INDEXING=false "Disallow: /" (shared/seo.js).
 * In der Produktion ist alles erlaubt – auch /feedback: Die Seite trägt "noindex"; damit
 * Suchmaschinen das sehen, darf sie nicht per robots.txt gesperrt sein. Private Bereiche
 * gibt es im Corporate Hub nicht.
 * sitemap.xml: alle öffentlichen, indexierbaren Seiten mit lastmod (Änderungszeit des Templates).
 */
const express = require('express');
const config = require('../../shared/config');
const { robotsTxt, sitemapXml } = require('../../shared/seo');
const { PAGES, lastModified } = require('./render');

const router = express.Router();

router.get('/robots.txt', (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600');
  res.type('text/plain; charset=utf-8').send(robotsTxt({ baseUrl: config.apps.corporate.baseUrl, disallow: [] }));
});

router.get('/sitemap.xml', (req, res) => {
  const entries = Object.values(PAGES)
    .filter((p) => p.sitemap !== false && !p.noindex)
    .map((p) => ({ loc: p.path, lastmod: lastModified(p), changefreq: p.changefreq, priority: p.priority }));
  res.set('Cache-Control', 'public, max-age=3600');
  res.type('application/xml; charset=utf-8').send(sitemapXml(entries, { baseUrl: config.apps.corporate.baseUrl }));
});

module.exports = router;
