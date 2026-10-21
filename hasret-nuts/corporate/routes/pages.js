'use strict';
/**
 * Owner: BUILD-CORPORATE
 * Seiten: / , /philosophie , /messe-chronik , /haendler , /impressum , /datenschutz , /cookies
 * (GET /feedback und alle POST-Formulare: routes/forms.js · robots/sitemap: routes/seo.js)
 *
 * Der Corporate Hub verkauft nicht: keine Preise, kein Warenkorb. Inhalte und Platzhalter
 * stehen in routes/content.js, Titel/Beschreibungen in routes/render.js.
 */
const express = require('express');
const config = require('../../shared/config');
const content = require('./content');
const { renderPage, noStore } = require('./render');

const router = express.Router();

/* Gemeinsame Template-Variablen für alle Corporate-Seiten (läuft vor jeder Route). */
router.use((req, res, next) => {
  res.locals.photos = content.PHOTOS;
  res.locals.contact = content.CONTACT;
  next();
});

router.get('/', (req, res) => {
  renderPage(req, res, 'home', {
    assortment: content.ASSORTMENT,
    nextFair: content.NEXT_FAIR,
  });
});

router.get('/philosophie', (req, res) => {
  renderPage(req, res, 'philosophie');
});

router.get('/messe-chronik', (req, res) => {
  renderPage(req, res, 'messeChronik', {
    timeline: content.TIMELINE,
    nextFair: content.NEXT_FAIR,
  });
});

/**
 * Händlerbereich mit Anfrageformular. Nach erfolgreichem Absenden (PRG, siehe forms.js)
 * steht einmalig req.session.data.inquirySent – dann ersetzt die Erfolgsmeldung das Formular
 * und die Antwort ist noindex.
 */
function renderHaendler(req, res, { values = {}, errors = {}, status = 200 } = {}) {
  const success = Boolean(req.session && req.session.data && req.session.data.inquirySent);
  if (success) delete req.session.data.inquirySent;
  noStore(res);
  return renderPage(
    req,
    res,
    'haendler',
    {
      assortment: content.ASSORTMENT,
      businessTypes: content.BUSINESS_TYPES,
      assortmentOptions: content.ASSORTMENT.map((a) => ({ value: a.key, label: a.name })),
      faq: content.FAQ,
      values,
      errors,
      hasErrors: Object.keys(errors).length > 0,
      success,
    },
    { status, noindex: success }
  );
}

router.get('/haendler', (req, res) => renderHaendler(req, res));

router.get('/impressum', (req, res) => renderPage(req, res, 'impressum'));

router.get('/datenschutz', (req, res) => renderPage(req, res, 'datenschutz'));

router.get('/cookies', (req, res) => {
  renderPage(req, res, 'cookies', {
    cookieName: `${config.isProd ? '__Host-' : ''}hn_sid_corporate`,
    sessionDays: config.security.sessionTtlDays,
  });
});

router.renderHaendler = renderHaendler;

module.exports = router;
