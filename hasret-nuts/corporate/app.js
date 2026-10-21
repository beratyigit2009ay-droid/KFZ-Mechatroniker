'use strict';
/**
 * Corporate Hub (Plattform 1) – App-Aufbau (FOUNDATION-CORE).
 * Routen-Inhalte gehören BUILD-CORPORATE (routes/pages.js, routes/forms.js, routes/seo.js).
 */
const { createBaseApp } = require('../shared/app-base');
const { notFound, errorHandler } = require('../shared/errors');

function createApp() {
  const app = createBaseApp({ name: 'corporate', appDir: __dirname });

  app.use(require('./routes/pages'));
  app.use(require('./routes/forms'));
  app.use(require('./routes/seo'));

  // Vorläufige Startseite – greift nur, solange routes/pages.js keine Route "/" definiert.
  app.get('/', (req, res) => res.render('placeholder.njk'));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
