'use strict';
/**
 * Owner: BUILD-CORPORATE
 * Formulare: POST /haendler/anfrage , GET/POST /feedback
 *
 * Schutzschichten (in dieser Reihenfolge):
 *   1. CSRF-Prüfung – global in shared/app-base.js (403 ohne gültiges Token)
 *   2. Ratenlimit "forms" (10 Anfragen / Stunde / IP, per RATE_LIMIT_FORMS_* änderbar)
 *   3. Honeypot "website" – befüllt ⇒ Erfolg wird nur vorgetäuscht, nichts gespeichert/versendet
 *   4. Serverseitige Validierung (shared/validate.js): Längen, Zeichen, keine CR/LF in
 *      einzeiligen Feldern (Header-/E-Mail-Injection), feste Auswahllisten
 *   5. Speichern ausschließlich mit vorbereiteten Statements (gebundene Parameter)
 *   6. Ausgabe nur über Nunjucks-Autoescape – Nutzereingaben werden nie als Template kompiliert
 * Erfolg ⇒ Post/Redirect/Get (303) mit einmaligem Sitzungs-Merker.
 */
const express = require('express');
const config = require('../../shared/config');
const { getDb } = require('../../shared/db');
const mailer = require('../../shared/mailer');
const { rateLimits, honeypot, safeRedirectPath } = require('../../shared/security');
const { parse, schemas, z, optional, arrayOf, oneOf } = require('../../shared/validate');
const content = require('./content');
const pages = require('./pages');
const { renderPage, noStore } = require('./render');

const router = express.Router();

/* ------------------------------------------------------------------ Hilfen */

/** Nur Strings (bzw. String-Arrays) aus dem Formular übernehmen und kürzen – für das erneute Anzeigen. */
function keepValues(body, fields, arrays = []) {
  const out = {};
  for (const f of fields) {
    const v = body ? body[f] : undefined;
    if (typeof v === 'string') out[f] = v.slice(0, 4000);
  }
  for (const f of arrays) {
    const v = body ? body[f] : undefined;
    const list = Array.isArray(v) ? v : typeof v === 'string' ? [v] : [];
    out[f] = list.filter((x) => typeof x === 'string').slice(0, 10);
  }
  return out;
}

function logMailError(kind, err) {
  console.error(`[corporate] Mail "${kind}" konnte nicht versendet werden: ${err && err.message ? err.message : err}`);
}

const ZIP_CITY_RE = /^(?:[A-Z]{1,2}-)?\d{4,5}\s+\p{L}[\p{L}\p{M}\s.'’()/-]*$/u;

/* ------------------------------------------------------------ Händleranfrage */

const BUSINESS_VALUES = content.BUSINESS_TYPES.map((t) => t.value);
const ASSORTMENT_KEYS = content.ASSORTMENT.map((a) => a.key);

const InquirySchema = z.object({
  firma: schemas.company,
  name: schemas.name,
  email: schemas.email,
  telefon: optional(schemas.phone),
  ort: schemas
    .line(120, { requiredMessage: 'Bitte geben Sie Postleitzahl und Ort an.' })
    .refine((v) => ZIP_CITY_RE.test(v), 'Bitte geben Sie Postleitzahl und Ort an (z. B. 87700 Memmingen).'),
  typ: oneOf(BUSINESS_VALUES, 'Bitte wählen Sie die Art Ihres Geschäfts.'),
  sortiment: arrayOf(oneOf(ASSORTMENT_KEYS, 'Bitte wählen Sie nur Sortimente aus der Liste.'), { max: ASSORTMENT_KEYS.length }),
  nachricht: optional(schemas.text(2000)),
  datenschutz: schemas.consent('Bitte bestätigen Sie die Datenschutzhinweise, damit wir Ihre Anfrage bearbeiten können.'),
});

const INQUIRY_FIELDS = ['firma', 'name', 'email', 'telefon', 'ort', 'typ', 'nachricht', 'datenschutz'];

const insertInquiry = () =>
  getDb().prepare(
    `INSERT INTO inquiries (company, contact_name, email, phone, zip_city, business_type, assortments_json, message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

router.post(
  '/haendler/anfrage',
  rateLimits.forms,
  honeypot('website', { passThrough: true }),
  async (req, res, next) => {
    try {
      // Bot im Honigtopf: Erfolg vortäuschen, nichts speichern, nichts senden.
      if (req.honeypotTripped) {
        req.session.data.inquirySent = true;
        return res.redirect(303, '/haendler#danke');
      }

      const result = parse(InquirySchema, req.body);
      if (!result.ok) {
        return pages.renderHaendler(req, res, {
          values: keepValues(req.body, INQUIRY_FIELDS, ['sortiment']),
          errors: result.errors,
          status: 422,
        });
      }

      const d = result.data;
      const businessType = content.BUSINESS_TYPES.find((t) => t.value === d.typ).label;
      const assortments = [...new Set(d.sortiment)].map((k) => content.ASSORTMENT.find((a) => a.key === k).name);
      const info = insertInquiry().run(
        d.firma,
        d.name,
        d.email,
        d.telefon || null,
        d.ort,
        businessType,
        JSON.stringify(assortments),
        d.nachricht || null
      );

      try {
        await mailer.send(
          'ownerNewInquiry',
          mailer.ownerEmail(),
          {
            inquiry: {
              company: d.firma,
              contact_name: d.name,
              email: d.email,
              phone: d.telefon || '',
              zip_city: d.ort,
              business_type: businessType,
              assortments,
              message: d.nachricht || '',
            },
            adminUrl: `${config.apps.shop.baseUrl}/admin/anfragen`,
          },
          { replyTo: d.email }
        );
      } catch (err) {
        logMailError('ownerNewInquiry', err);
      }

      if (!config.isTest) console.log(`[corporate] Neue Händleranfrage #${info.lastInsertRowid}`);
      req.session.data.inquirySent = true;
      return res.redirect(303, '/haendler#danke');
    } catch (err) {
      return next(err);
    }
  }
);

/* --------------------------------------------------------- Feedback & Fehler */

const FEEDBACK_KINDS = content.FEEDBACK_KINDS.map((k) => k.value);

const FeedbackSchema = z.object({
  art: oneOf(FEEDBACK_KINDS, 'Bitte wählen Sie aus, worum es geht.'),
  nachricht: schemas.text(3000, { requiredMessage: 'Bitte schreiben Sie uns, was Sie uns mitteilen möchten.' }),
  seite: optional(schemas.line(500)),
  schritte: optional(schemas.text(3000)),
  erwartet: optional(schemas.text(2000)),
  technik: schemas.checkbox,
  browser: optional(schemas.line(500)),
  email: optional(schemas.email),
});

const FEEDBACK_FIELDS = ['art', 'nachricht', 'seite', 'schritte', 'erwartet', 'technik', 'email'];

/** Seite, von der aus das Formular geöffnet wurde: ?von=<Pfad> oder Referer derselben Website. */
function originPage(req) {
  const fromQuery = typeof req.query.von === 'string' ? safeRedirectPath(req.query.von, '') : '';
  let candidate = fromQuery;
  const referer = req.get('referer');
  if (!candidate && referer) {
    try {
      const host = req.get('host');
      const ref = new URL(referer, `${req.protocol}://${host}`);
      if (ref.host === host) candidate = safeRedirectPath(ref.pathname + ref.search, '');
    } catch {
      candidate = '';
    }
  }
  if (!candidate || candidate.startsWith('/feedback')) return '';
  return candidate.slice(0, 500);
}

function renderFeedback(req, res, { values = {}, errors = {}, status = 200 } = {}) {
  const success = Boolean(req.session && req.session.data && req.session.data.feedbackSent);
  if (success) delete req.session.data.feedbackSent;
  noStore(res);
  return renderPage(
    req,
    res,
    'feedback',
    {
      kinds: content.FEEDBACK_KINDS,
      values,
      errors,
      hasErrors: Object.keys(errors).length > 0,
      success,
    },
    { status }
  );
}

router.get('/feedback', (req, res) => {
  renderFeedback(req, res, { values: { art: 'feedback', seite: originPage(req) } });
});

const insertFeedback = () =>
  getDb().prepare(
    `INSERT INTO feedback (app, kind, page_url, message, steps, expected, browser_info, email)
     VALUES ('corporate', ?, ?, ?, ?, ?, ?, ?)`
  );

router.post('/feedback', rateLimits.forms, honeypot('website', { passThrough: true }), async (req, res, next) => {
  try {
    if (req.honeypotTripped) {
      req.session.data.feedbackSent = true;
      return res.redirect(303, '/feedback#danke');
    }

    const result = parse(FeedbackSchema, req.body);
    if (!result.ok) {
      return renderFeedback(req, res, {
        values: keepValues(req.body, FEEDBACK_FIELDS),
        errors: result.errors,
        status: 422,
      });
    }

    const d = result.data;
    const isBug = d.art === 'bug';
    const entry = {
      app: 'corporate',
      kind: d.art,
      page_url: d.seite || null,
      message: d.nachricht,
      steps: isBug ? d.schritte || null : null,
      expected: isBug ? d.erwartet || null : null,
      // Technische Angaben nur mit ausdrücklichem Häkchen
      browser_info: d.technik ? d.browser || null : null,
      email: d.email || null,
    };
    const info = insertFeedback().run(entry.kind, entry.page_url, entry.message, entry.steps, entry.expected, entry.browser_info, entry.email);

    try {
      await mailer.send(
        'ownerNewFeedback',
        mailer.ownerEmail(),
        { feedback: entry, adminUrl: `${config.apps.shop.baseUrl}/admin/feedback` },
        entry.email ? { replyTo: entry.email } : {}
      );
    } catch (err) {
      logMailError('ownerNewFeedback', err);
    }

    if (!config.isTest) console.log(`[corporate] Neue Rückmeldung #${info.lastInsertRowid} (${entry.kind})`);
    req.session.data.feedbackSent = true;
    return res.redirect(303, '/feedback#danke');
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
