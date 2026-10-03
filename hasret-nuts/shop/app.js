'use strict';
/**
 * Online-Shop (Plattform 2) – App-Aufbau (FOUNDATION-CORE).
 * Routen-Inhalte: BUILD-SHOP (pages, catalog, cart, checkout, feedback, seo) und
 * BUILD-AUTH (auth, account, admin).
 *
 * Reihenfolge: pages wird zuerst eingebunden – ein router.use() am Anfang von
 * routes/pages.js läuft daher für ALLE Shop-Seiten (auch Konto/Verwaltung), z. B. für
 * res.locals.cartCount im Header.
 */
const { createBaseApp } = require('../shared/app-base');
const { notFound, errorHandler } = require('../shared/errors');
const { requireAdmin, requireAuth } = require('../shared/security');

function createApp() {
  const app = createBaseApp({ name: 'shop', appDir: __dirname });

  // Zusätzlicher Schutz privater Bereiche (Defense in Depth – die Routen prüfen selbst ebenfalls):
  //   /admin/**                       nur Administratoren (anonym → Login, Kunde → 403)
  //   /konto, /konto/passwort/**, /konto/loeschen/**   nur angemeldete Nutzer
  app.use('/admin', requireAdmin);
  app.all('/konto', requireAuth);
  app.use('/konto/passwort', requireAuth);
  app.use('/konto/loeschen', requireAuth);

  app.use(require('./routes/pages'));
  app.use(require('./routes/catalog'));
  app.use(require('./routes/cart'));
  app.use(require('./routes/checkout'));
  app.use(require('./routes/feedback'));
  app.use(require('./routes/seo'));
  app.use(require('./routes/auth'));
  app.use(require('./routes/account'));
  app.use(require('./routes/admin'));

  // Vorläufige Startseite – greift nur, solange routes/pages.js keine Route "/" definiert.
  app.get('/', (req, res) => res.render('placeholder.njk'));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
