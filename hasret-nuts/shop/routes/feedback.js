'use strict';
/**
 * Owner: BUILD-SHOP
 * Feedback & Newsletter: /feedback (+ POST) , POST /newsletter ,
 * /newsletter/bestaetigen?token= (GET zeigt Button, POST bestätigt – Link-Scanner verbrauchen keine Tokens),
 * /newsletter/abmelden (GET Formular, POST meldet ab – zusätzliche Route, siehe Bericht).
 */
const express = require('express');
const config = require('../../shared/config');
const { getDb, nowIso } = require('../../shared/db');
const mailer = require('../../shared/mailer');
const auth = require('../../shared/auth');
const { buildMeta } = require('../../shared/seo');
const { noIndex, rateLimits, honeypot, mailQuota, safeRedirectPath } = require('../../shared/security');
const { parse, schemas, z, optional, oneOf } = require('../../shared/validate');

const router = express.Router();

const NEWSLETTER_TTL_HOURS = 72;
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

function wantsJson(req) {
  const accept = req.get('accept') || '';
  return accept.includes('application/json') && !accept.includes('text/html');
}

function noStore(req, res, next) {
  res.set('Cache-Control', 'no-store');
  next();
}

/** Same-Site-Pfad aus dem Referer (für Rücksprung und Vorbelegung „Auf welcher Seite?“). */
function refererPath(req) {
  try {
    const host = req.get('host');
    const ref = new URL(req.get('referer') || '', `${req.protocol}://${host}`);
    if (ref.host !== host) return null;
    return safeRedirectPath(ref.pathname + ref.search, null);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------- Feedback */
const KINDS = [
  { value: 'feedback', label: 'Feedback', hint: 'Lob, Kritik oder ein Hinweis' },
  { value: 'bug', label: 'Fehler melden', hint: 'Etwas funktioniert nicht wie erwartet' },
  { value: 'idee', label: 'Idee', hint: 'Ein Wunsch oder Vorschlag' },
];

const FeedbackSchema = z.object({
  kind: oneOf(['feedback', 'bug', 'idee'], 'Bitte wählen Sie aus, worum es geht.'),
  message: schemas.text(3000, { requiredMessage: 'Bitte schreiben Sie uns Ihre Nachricht.' }),
  page_url: optional(schemas.line(300)),
  steps: optional(schemas.text(2000)),
  expected: optional(schemas.text(2000)),
  tech: schemas.checkbox,
  screen: optional(z.string().regex(/^\d{2,5}x\d{2,5}(@\d(\.\d{1,2})?)?$/)),
  email: optional(schemas.email),
});

function feedbackMeta(req) {
  return buildMeta(
    {
      title: 'Feedback & Fehler melden',
      description: 'Ihre Rückmeldung macht uns besser: Lob, Kritik, Ideen oder technische Fehler – wir lesen jede Nachricht persönlich.',
      path: '/feedback',
      noindex: true,
    },
    req
  );
}

router.get('/feedback', noIndex, (req, res) => {
  const fromQuery = typeof req.query.seite === 'string' ? safeRedirectPath(req.query.seite.slice(0, 300), null) : null;
  const ref = refererPath(req);
  const page = fromQuery || (ref && ref !== '/feedback' ? ref : '');
  res.render('pages/feedback.njk', {
    meta: feedbackMeta(req),
    kinds: KINDS,
    values: { kind: req.query.art === 'fehler' ? 'bug' : 'feedback', page_url: page ? `${config.apps.shop.baseUrl}${page}` : '', tech: false },
    errors: {},
    sent: req.query.gesendet === '1',
    breadcrumbs: [{ name: 'Startseite', href: '/' }, { name: 'Feedback', href: '/feedback' }],
  });
});

router.post(
  '/feedback',
  noIndex,
  rateLimits.forms,
  honeypot('website', { redirectTo: '/feedback?gesendet=1', message: 'Vielen Dank für Ihre Nachricht!' }),
  async (req, res, next) => {
    try {
      const body = req.body || {};
      const r = parse(FeedbackSchema, body);
      if (!r.ok) {
        delete r.errors.screen;
        const values = {};
        for (const k of ['kind', 'message', 'page_url', 'steps', 'expected', 'email']) values[k] = typeof body[k] === 'string' ? body[k].slice(0, 3000) : '';
        values.tech = body.tech === 'on';
        return res.status(422).render('pages/feedback.njk', {
          meta: feedbackMeta(req),
          kinds: KINDS,
          values,
          errors: r.errors,
          sent: false,
          breadcrumbs: [{ name: 'Startseite', href: '/' }, { name: 'Feedback', href: '/feedback' }],
        });
      }
      const d = r.data;
      let browserInfo = null;
      if (d.tech) {
        const ua = String(req.get('user-agent') || '').replace(/[\r\n\u0000-\u001f\u007f]/g, ' ').slice(0, 250);
        browserInfo = [ua, d.screen ? `Bildschirm ${d.screen}` : null].filter(Boolean).join(' · ') || null;
      }
      const isBug = d.kind === 'bug';
      const row = {
        app: 'shop',
        kind: d.kind,
        page_url: d.page_url || null,
        message: d.message,
        steps: isBug ? d.steps || null : null,
        expected: isBug ? d.expected || null : null,
        browser_info: browserInfo,
        email: d.email || null,
      };
      const info = getDb()
        .prepare(
          `INSERT INTO feedback (app, kind, page_url, message, steps, expected, browser_info, email)
           VALUES (@app, @kind, @page_url, @message, @steps, @expected, @browser_info, @email)`
        )
        .run(row);
      const owner = mailer.ownerEmail();
      if (owner) {
        try {
          await mailer.send(
            'ownerNewFeedback',
            owner,
            { feedback: row, adminUrl: `${config.apps.shop.baseUrl}/admin/feedback#f-${info.lastInsertRowid}` },
            row.email ? { replyTo: row.email } : {}
          );
        } catch (err) {
          console.error('[feedback] Benachrichtigung fehlgeschlagen:', err.message);
        }
      }
      return res.redirect(303, '/feedback?gesendet=1');
    } catch (err) {
      return next(err);
    }
  }
);

/* ------------------------------------------------------------------ Newsletter */
const NL_SUCCESS =
  'Fast geschafft! Bitte bestätigen Sie Ihre Anmeldung über den Link, den wir Ihnen soeben per E-Mail gesendet haben. Der Link ist 72 Stunden gültig.';

router.post(
  '/newsletter',
  noStore,
  rateLimits.newsletter,
  honeypot('website', { passThrough: true }),
  async (req, res, next) => {
    try {
      const back = refererPath(req) || '/';
      const r = parse(z.object({ email: schemas.email }), req.body || {});
      if (!r.ok) {
        const msg = r.errors.email || 'Bitte geben Sie eine gültige E-Mail-Adresse ein.';
        if (wantsJson(req)) return res.status(422).json({ ok: false, error: msg });
        req.flash('error', msg);
        return res.redirect(303, `${back}#newsletter`);
      }
      if (!req.honeypotTripped) {
        const email = r.data.email;
        const db = getDb();
        const existing = db.prepare('SELECT * FROM newsletter WHERE email = ?').get(email);
        const active = existing && existing.confirmed_at && !existing.unsubscribed_at;
        if (!existing) db.prepare('INSERT INTO newsletter (email) VALUES (?)').run(email);
        // Bereits bestätigte Adressen erhalten keine weitere Mail – die Antwort bleibt identisch.
        if (!active && mailQuota('newsletter', email)) {
          try {
            const token = auth.createToken(null, 'newsletter', NEWSLETTER_TTL_HOURS * 60, { email });
            const url = `${config.apps.shop.baseUrl}/newsletter/bestaetigen?token=${encodeURIComponent(token)}`;
            await mailer.send('newsletterConfirm', email, { url, ttlHours: NEWSLETTER_TTL_HOURS });
          } catch (err) {
            console.error('[newsletter] Bestätigungsmail fehlgeschlagen:', err.message);
          }
        }
      }
      if (wantsJson(req)) return res.json({ ok: true, message: NL_SUCCESS });
      req.flash('success', NL_SUCCESS);
      return res.redirect(303, `${back}#newsletter`);
    } catch (err) {
      return next(err);
    }
  }
);

function confirmMeta(req, title) {
  return buildMeta({ title, noindex: true, path: '/newsletter/bestaetigen', description: 'Newsletter-Anmeldung bei Hasret Nuts bestätigen.' }, req);
}

router.get('/newsletter/bestaetigen', noIndex, noStore, (req, res) => {
  const token = typeof req.query.token === 'string' && TOKEN_RE.test(req.query.token) ? req.query.token : null;
  const rec = token ? auth.peekToken(token, 'newsletter') : null;
  res.set('Referrer-Policy', 'no-referrer');
  res.render('pages/newsletter.njk', {
    meta: confirmMeta(req, 'Newsletter-Anmeldung bestätigen'),
    state: rec ? 'confirm' : 'invalid',
    token: rec ? token : '',
  });
});

router.post('/newsletter/bestaetigen', noIndex, noStore, rateLimits.newsletter, (req, res) => {
  const token = typeof req.body.token === 'string' && TOKEN_RE.test(req.body.token) ? req.body.token : null;
  const rec = token ? auth.consumeTokenRecord(token, 'newsletter') : null;
  if (rec && rec.email) {
    const db = getDb();
    const now = nowIso();
    const upd = db.prepare('UPDATE newsletter SET confirmed_at = ?, unsubscribed_at = NULL WHERE email = ?').run(now, rec.email);
    if (upd.changes === 0) db.prepare('INSERT INTO newsletter (email, confirmed_at) VALUES (?, ?)').run(rec.email, now);
  }
  res.status(rec ? 200 : 410).render('pages/newsletter.njk', {
    meta: confirmMeta(req, rec ? 'Anmeldung bestätigt' : 'Link nicht mehr gültig'),
    state: rec ? 'done' : 'invalid',
    token: '',
  });
});

router.get('/newsletter/abmelden', noIndex, (req, res) => {
  res.render('pages/newsletter.njk', {
    meta: buildMeta({ title: 'Newsletter abmelden', noindex: true, path: '/newsletter/abmelden' }, req),
    state: req.query.erledigt === '1' ? 'unsubscribed' : 'unsubscribe',
    token: '',
  });
});

router.post('/newsletter/abmelden', noIndex, noStore, rateLimits.newsletter, (req, res) => {
  const r = parse(z.object({ email: schemas.email }), req.body || {});
  if (!r.ok) {
    return res.status(422).render('pages/newsletter.njk', {
      meta: buildMeta({ title: 'Newsletter abmelden', noindex: true, path: '/newsletter/abmelden' }, req),
      state: 'unsubscribe',
      token: '',
      error: r.errors.email,
    });
  }
  // Immer gleiche Antwort – verrät nicht, ob die Adresse eingetragen war.
  getDb().prepare('UPDATE newsletter SET unsubscribed_at = ? WHERE email = ? AND unsubscribed_at IS NULL').run(nowIso(), r.data.email);
  return res.redirect(303, '/newsletter/abmelden?erledigt=1');
});

module.exports = router;
