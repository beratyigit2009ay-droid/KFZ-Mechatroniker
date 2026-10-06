'use strict';
/**
 * Owner: BUILD-SHOP
 * Feedback & Newsletter: /feedback (+ POST) , POST /newsletter ,
 * /newsletter/bestaetigen?token= (GET zeigt Button, POST bestätigt – Link-Scanner verbrauchen keine Tokens),
 * /newsletter/abmelden (GET Formular, POST meldet ab – zusätzliche Route, siehe Bericht).
 */
const crypto = require('node:crypto');
const express = require('express');
const config = require('../../shared/config');
const { getDb, nowIso } = require('../../shared/db');
const mailer = require('../../shared/mailer');
const auth = require('../../shared/auth');
const { buildMeta } = require('../../shared/seo');
const { noIndex, rateLimits, honeypot, mailQuota, safeRedirectPath } = require('../../shared/security');
const { parse, schemas, z, optional, oneOf } = require('../../shared/validate');
const { layout: mailLayout, escapeHtml, safeUrl, SIGNATURE_TEXT } = require('../../shared/mail-templates');

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
          const token = auth.createToken(null, 'newsletter', NEWSLETTER_TTL_HOURS * 60, { email });
          const url = `${config.apps.shop.baseUrl}/newsletter/bestaetigen?token=${encodeURIComponent(token)}`;
          // Nicht auf den Mailserver warten: Sonst verriete die Antwortzeit, ob die Adresse schon eingetragen ist.
          mailer.send('newsletterConfirm', email, { url, ttlHours: NEWSLETTER_TTL_HOURS }).catch((err) => {
            console.error('[newsletter] Bestätigungsmail fehlgeschlagen:', err.message);
          });
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

/* ------------------------------------------------------ Newsletter abmelden
   Abmelden nur mit persönlichem Link: e (Adresse) + t (HMAC über die Adresse, Schlüssel aus
   LOG_SALT). Wer nur seine Adresse eingibt, bekommt diesen Link per Mail – so kann niemand
   fremde Abonnentinnen abmelden. Für Newsletter-Mails: unsubscribeUrl(email) verwenden
   (auch als List-Unsubscribe-Header). */
function unsubscribeToken(email) {
  const key = crypto.createHmac('sha256', String(config.security.logSalt)).update('newsletter-unsubscribe').digest();
  return crypto.createHmac('sha256', key).update(String(email).trim().toLowerCase()).digest('base64url');
}

function unsubscribeUrl(email) {
  return `${config.apps.shop.baseUrl}/newsletter/abmelden?e=${encodeURIComponent(String(email).trim().toLowerCase())}&t=${unsubscribeToken(email)}`;
}

function validUnsubscribe(e, t) {
  if (typeof e !== 'string' || typeof t !== 'string' || e.length > 254 || !/^[A-Za-z0-9_-]{43}$/.test(t)) return false;
  const expected = Buffer.from(unsubscribeToken(e));
  const given = Buffer.from(t);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

function unsubscribeMail(email) {
  const url = safeUrl(unsubscribeUrl(email));
  const intro = 'Sie möchten unseren Newsletter abbestellen? Mit einem Klick auf den folgenden Link bestätigen Sie die Abmeldung.';
  const note = 'Falls Sie das nicht selbst angefordert haben, können Sie diese E-Mail ignorieren – Sie bleiben dann angemeldet.';
  const text = ['Guten Tag,', '', intro, '', url, '', note, '', 'Mit freundlichen Grüßen', 'Hasret Nuts', '', '—', SIGNATURE_TEXT, ''].join('\n');
  const html = mailLayout({
    heading: 'Newsletter abmelden',
    preheader: 'Ihr Link zur Abmeldung vom Newsletter.',
    bodyHtml: `<p style="margin:0 0 16px">Guten Tag,</p><p style="margin:0 0 16px">${escapeHtml(intro)}</p><p style="margin:24px 0"><a href="${escapeHtml(url)}" style="display:inline-block;padding:13px 24px;background:#3B2418;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;text-decoration:none">Abmeldung bestätigen</a></p><p style="margin:0 0 16px">${escapeHtml(note)}</p>`,
  });
  return { subject: 'Newsletter abmelden – Hasret Nuts', text, html };
}

function unsubMeta(req) {
  return buildMeta({ title: 'Newsletter abmelden', noindex: true, path: '/newsletter/abmelden' }, req);
}

router.get('/newsletter/abmelden', noIndex, noStore, (req, res) => {
  res.set('Referrer-Policy', 'no-referrer');
  const e = typeof req.query.e === 'string' ? req.query.e : '';
  const t = typeof req.query.t === 'string' ? req.query.t : '';
  let state = 'unsubscribe';
  if (req.query.erledigt === '1') state = 'unsubscribed';
  else if (req.query.gesendet === '1') state = 'unsubscribeSent';
  else if (e && t) state = validUnsubscribe(e, t) ? 'unsubscribeConfirm' : 'unsubscribeInvalid';
  // GET verändert nichts (Link-Scanner) – abgemeldet wird erst mit dem Button (POST).
  res.render('pages/newsletter.njk', { meta: unsubMeta(req), state, token: '', unsubEmail: state === 'unsubscribeConfirm' ? e : '', unsubToken: state === 'unsubscribeConfirm' ? t : '' });
});

router.post('/newsletter/abmelden', noIndex, noStore, rateLimits.newsletter, (req, res) => {
  const body = req.body || {};
  if (typeof body.t === 'string' && body.t) {
    if (!validUnsubscribe(body.e, body.t)) {
      return res.status(400).render('pages/newsletter.njk', { meta: unsubMeta(req), state: 'unsubscribeInvalid', token: '' });
    }
    getDb().prepare('UPDATE newsletter SET unsubscribed_at = ? WHERE email = ? AND unsubscribed_at IS NULL').run(nowIso(), String(body.e).trim().toLowerCase());
    return res.redirect(303, '/newsletter/abmelden?erledigt=1');
  }
  const r = parse(z.object({ email: schemas.email }), body);
  if (!r.ok) {
    return res.status(422).render('pages/newsletter.njk', { meta: unsubMeta(req), state: 'unsubscribe', token: '', error: r.errors.email });
  }
  // Immer gleiche Antwort – verrät nicht, ob die Adresse eingetragen ist. Abgemeldet wird erst
  // über den Link in der Mail (Nachweis, dass das Postfach der anfragenden Person gehört).
  const email = r.data.email;
  const row = getDb().prepare('SELECT confirmed_at, unsubscribed_at FROM newsletter WHERE email = ?').get(email);
  if (row && row.confirmed_at && !row.unsubscribed_at && mailQuota('newsletter-unsubscribe', email)) {
    const tpl = unsubscribeMail(email);
    mailer.sendMail({ to: email, ...tpl }).catch((err) => console.error('[newsletter] Abmelde-Mail fehlgeschlagen:', err.message));
  }
  return res.redirect(303, '/newsletter/abmelden?gesendet=1');
});

router.unsubscribeUrl = unsubscribeUrl;

module.exports = router;
