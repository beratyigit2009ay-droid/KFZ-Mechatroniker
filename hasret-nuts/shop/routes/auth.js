'use strict';
/**
 * Owner: BUILD-AUTH
 * Konto-Zugang im Shop:
 *   GET/POST /konto/registrieren          Registrierung (neutral gegenüber bestehenden Adressen)
 *   GET/POST /konto/anmelden              Anmeldung (Sperre nach 5 Fehlversuchen, sicheres "next")
 *   POST     /konto/abmelden              Abmeldung (CSRF, Sitzung wird verworfen)
 *   GET      /konto/bestaetigen[?token=]  ohne Token: „Bitte bestätigen Sie …“ + Erneut-senden-Formular
 *                                         mit Token: Seite mit Bestätigungs-Button (GET verbraucht NICHTS)
 *   POST     /konto/bestaetigen           verbraucht das Token (24 h, einmalig) → bestätigt → angemeldet nur in der
 *                                         Sitzung, die sich registriert hat; sonst weiter zur Anmeldung
 *   POST     /konto/bestaetigung-erneut   Bestätigungsmail erneut senden (neutral, gedrosselt)
 *   GET/POST /konto/passwort-vergessen    Reset-Link anfordern (immer dieselbe Antwort)
 *   GET/POST /konto/passwort-zuruecksetzen[?token=]   neues Passwort setzen (60 min, einmalig)
 *
 * Sicherheitsprinzipien (docs/SICHERHEIT.md §2.12–2.13):
 *   - Keine Konten-Ausspähung: Registrierung, Passwort vergessen und Erneut-senden antworten immer
 *     gleich; bei der Anmeldung gibt es nur eine neutrale Fehlermeldung.
 *   - Tokens nur gehasht in der DB, einmalig, befristet; Mail-Links öffnen eine Seite mit Button.
 *   - Anmeldung, Bestätigung und Passwort-Reset erneuern die Sitzung (Schutz vor Session-Fixation).
 *   - Alle Formulare: CSRF (global), Honeypot, Ratenlimits, serverseitige Validierung.
 */
const express = require('express');
const config = require('../../shared/config');
const auth = require('../../shared/auth');
const mailer = require('../../shared/mailer');
const { layout: mailLayout, escapeHtml, safeUrl, SIGNATURE_TEXT } = require('../../shared/mail-templates');
const { buildMeta } = require('../../shared/seo');
const { rateLimits, honeypot, safeRedirectPath, mailQuota, privateHeaders } = require('../../shared/security');
const { parse, schemas, z, refinements } = require('../../shared/validate');

const router = express.Router();

const VERIFY_TTL_MIN = 24 * 60;
const RESET_TTL_MIN = 60;

const MSG = {
  loginFailed: 'E-Mail oder Passwort ist nicht korrekt.',
  resent:
    'Falls zu dieser Adresse ein noch nicht bestätigtes Konto besteht, haben wir Ihnen soeben eine neue Bestätigungs-E-Mail gesendet.',
  verified: 'Vielen Dank – Ihre E-Mail-Adresse ist bestätigt. Herzlich willkommen bei Hasret Nuts!',
  verifiedLogin: 'Vielen Dank – Ihre E-Mail-Adresse ist bestätigt. Bitte melden Sie sich jetzt mit Ihrem Passwort an.',
  loggedOut: 'Sie haben sich abgemeldet. Bis bald!',
  resetDone: 'Ihr neues Passwort ist gespeichert. Aus Sicherheitsgründen wurden alle anderen Anmeldungen beendet.',
};

/* ------------------------------------------------------------------ Helfer */

function shopUrl(pathAndQuery) {
  return `${config.apps.shop.baseUrl}${pathAndQuery}`;
}

/** Private Seite: no-store, noindex (auch für Formulare mit CSRF-Token). */
function privatePage(req, res, next) {
  privateHeaders(res);
  next();
}

/** Seiten mit Token in der URL: Token darf nicht per Referer weitergegeben werden. */
function tokenPage(req, res, next) {
  res.set('Referrer-Policy', 'no-referrer');
  next();
}

function meta(req, title, description, path) {
  return buildMeta({ title, description, path: path || req.path, noindex: true }, req);
}

/** Bereits angemeldete Nutzer brauchen Anmelde-/Registrierungsseiten nicht. */
function redirectIfLoggedIn(req, res, next) {
  if (req.user) return res.redirect(303, safeRedirectPath(req.query.next, '/konto'));
  return next();
}

/** Nur Strings (gekürzt) für das erneute Befüllen von Formularen – niemals Passwörter. */
function echo(body, keys) {
  const out = {};
  for (const k of keys) out[k] = typeof body[k] === 'string' ? body[k].slice(0, 300) : '';
  return out;
}

function rawToken(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
}

/** Fehler beim Mailversand protokollieren, aber nie an Nutzer durchreichen (neutral bleiben). */
async function safeSend(fn) {
  try {
    await fn();
    return true;
  } catch (err) {
    console.error('[auth] E-Mail konnte nicht versendet werden:', err && err.code ? err.code : err && err.message);
    return false;
  }
}

/**
 * Versendet im Hintergrund, ohne auf den Mailserver zu warten. Sonst verriete die Antwortzeit,
 * ob zu einer Adresse ein Konto besteht (nur dann wird eine Mail verschickt).
 */
function sendInBackground(fn) {
  safeSend(fn).catch(() => {});
}

/** Hinweis-Mail, wenn sich jemand mit einer bereits registrierten Adresse registriert. */
function accountExistsMail() {
  const loginUrl = safeUrl(shopUrl('/konto/anmelden'));
  const forgotUrl = safeUrl(shopUrl('/konto/passwort-vergessen'));
  // Bewusst ohne Namen: Mails an unbestätigte Adressen enthalten keinen Text, den Dritte eingeben können.
  const greeting = 'Guten Tag,';
  const intro =
    'soeben wurde versucht, mit dieser E-Mail-Adresse ein neues Kundenkonto bei Hasret Nuts anzulegen. Für diese Adresse besteht bereits ein Konto – ein zweites ist nicht nötig.';
  const how = 'Sie können sich wie gewohnt anmelden. Falls Sie Ihr Passwort nicht mehr wissen, legen Sie einfach ein neues fest.';
  const note = 'Falls Sie das nicht selbst waren, können Sie diese E-Mail ignorieren – an Ihrem Konto wurde nichts verändert.';
  const text = [
    greeting,
    '',
    intro,
    '',
    how,
    '',
    `Anmelden: ${loginUrl}`,
    `Neues Passwort festlegen: ${forgotUrl}`,
    '',
    note,
    '',
    'Mit freundlichen Grüßen',
    'Hasret Nuts',
    '',
    '—',
    SIGNATURE_TEXT,
    '',
  ].join('\n');
  const btn = (url, label, primary) =>
    `<a href="${escapeHtml(url)}" style="display:inline-block;margin:0 12px 12px 0;padding:13px 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;letter-spacing:.04em;text-decoration:none;${
      primary ? 'background:#0E4B3B;color:#ffffff' : 'border:1px solid #0E4B3B;color:#0E4B3B'
    }">${escapeHtml(label)}</a>`;
  const html = mailLayout({
    heading: 'Sie haben bereits ein Konto',
    preheader: 'Für Ihre E-Mail-Adresse besteht bereits ein Kundenkonto.',
    bodyHtml: `<p style="margin:0 0 16px">${escapeHtml(greeting)}</p><p style="margin:0 0 16px">${escapeHtml(intro)}</p><p style="margin:0 0 16px">${escapeHtml(
      how
    )}</p><p style="margin:24px 0 12px">${btn(loginUrl, 'Anmelden', true)}${btn(forgotUrl, 'Neues Passwort festlegen', false)}</p><p style="margin:0 0 16px">${escapeHtml(note)}</p>`,
  });
  return { subject: 'Sie haben bereits ein Kundenkonto – Hasret Nuts', text, html };
}

function sendVerification(user) {
  const token = auth.createToken(user.id, 'verify_email', VERIFY_TTL_MIN);
  // Ohne Namen: Die Adresse ist noch nicht bestätigt, der Name stammt vom Absender des Formulars.
  sendInBackground(() => mailer.send('verifyEmail', user.email, { name: '', url: shopUrl(`/konto/bestaetigen?token=${token}`), ttlHours: 24 }));
}

/* ------------------------------------------------------------ Validierung */

const RegisterSchema = z
  .object({
    name: schemas.name,
    email: schemas.email,
    password: schemas.password,
    passwordConfirm: z.string({ error: () => 'Bitte wiederholen Sie das Passwort.' }).max(1024, 'Ungültige Eingabe.'),
    privacy: schemas.consent('Bitte bestätigen Sie, dass Sie die Datenschutzerklärung zur Kenntnis genommen haben.'),
  })
  .superRefine(refinements.passwordNotEmail())
  .superRefine(refinements.passwordsMatch());

const LoginSchema = z.object({
  email: schemas.email,
  password: schemas.currentPassword,
});

const EmailSchema = z.object({ email: schemas.email });

const ResetSchema = z
  .object({
    password: schemas.password,
    passwordConfirm: z.string({ error: () => 'Bitte wiederholen Sie das Passwort.' }).max(1024, 'Ungültige Eingabe.'),
  })
  .superRefine(refinements.passwordsMatch());

/* ------------------------------------------------------------ Registrierung */

function renderRegister(req, res, { values = {}, errors = {}, status = 200 } = {}) {
  return res.status(status).render('auth/register.njk', {
    meta: meta(
      req,
      'Kundenkonto anlegen',
      'Legen Sie Ihr Kundenkonto bei Hasret Nuts an: Bestellanfragen im Blick behalten und schneller bestellen.',
      '/konto/registrieren'
    ),
    values,
    errors,
  });
}

router.get('/konto/registrieren', privatePage, redirectIfLoggedIn, (req, res) => renderRegister(req, res));

router.post(
  '/konto/registrieren',
  privatePage,
  rateLimits.register,
  honeypot('website', { passThrough: true }),
  async (req, res, next) => {
    try {
      if (req.user) return res.redirect(303, '/konto');
      // Spam-Bot: Erfolg vortäuschen (identische Weiterleitung), nichts anlegen, nichts senden.
      if (req.honeypotTripped) return res.redirect(303, '/konto/bestaetigen');
      const r = parse(RegisterSchema, req.body);
      if (!r.ok) {
        return renderRegister(req, res, { values: echo(req.body, ['name', 'email']), errors: r.errors, status: 422 });
      }
      const { name, email, password } = r.data;
      const existing = auth.findUserByEmail(email);
      if (existing && !existing.email_verified_at) {
        // Noch nicht bestätigtes Konto: wie eine Neuanmeldung behandeln (neues Passwort, neuer Link).
        // Wer die Adresse zuvor fremd registriert hat, verliert damit jeden Zugriff.
        const replaced = await auth.replaceUnverifiedAccount(existing.id, { password, name });
        auth.logSecurityEvent('register_replaced', existing.id, req);
        if (replaced && mailQuota('verify', email)) sendVerification(auth.findUserById(existing.id));
      } else if (existing) {
        // Gleiche Antwort wie bei einer Neuanmeldung (keine Konten-Ausspähung); vergleichbarer
        // Rechenaufwand wie das Anlegen. Der Inhaber der Adresse erhält einen Hinweis.
        await auth.hashPassword(password);
        if (mailQuota('account-exists', email)) {
          const tpl = accountExistsMail();
          sendInBackground(() => mailer.sendMail({ to: existing.email, ...tpl }));
        }
        auth.logSecurityEvent('register_existing', existing.id, req);
      } else {
        let user;
        try {
          user = await auth.createUser({ email, password, name });
        } catch (err) {
          if (!err || err.code !== 'EMAIL_TAKEN') throw err;
          user = null; // gleichzeitige Registrierung – neutral weiter
        }
        if (user) {
          auth.logSecurityEvent('register', user.id, req);
          if (mailQuota('verify', email)) sendVerification(user);
        }
      }
      req.session.data.pendingEmail = email;
      return res.redirect(303, '/konto/bestaetigen');
    } catch (err) {
      return next(err);
    }
  }
);

/* ------------------------------------------------------ E-Mail-Bestätigung */

function renderVerify(req, res, { state, token = null, email = '', errors = {}, status = 200 }) {
  const titles = {
    pending: 'Bitte bestätigen Sie Ihre E-Mail-Adresse',
    confirm: 'E-Mail-Adresse bestätigen',
    invalid: 'Bestätigungslink ungültig',
    unverified: 'E-Mail-Adresse noch nicht bestätigt',
  };
  return res.status(status).render('auth/verify.njk', {
    meta: meta(req, titles[state], 'Bestätigen Sie Ihre E-Mail-Adresse, um Ihr Kundenkonto bei Hasret Nuts zu aktivieren.', '/konto/bestaetigen'),
    state,
    token,
    email,
    errors,
  });
}

function pendingEmail(req) {
  const e = req.session.data.pendingEmail;
  return typeof e === 'string' && e.length <= 254 ? e : '';
}

router.get('/konto/bestaetigen', privatePage, tokenPage, (req, res) => {
  const hasToken = req.query.token !== undefined;
  if (!hasToken) return renderVerify(req, res, { state: 'pending', email: pendingEmail(req) });
  const token = rawToken(req.query.token);
  // Nur prüfen – NICHT verbrauchen (Link-Scanner und Vorschauen dürfen das Token nicht entwerten).
  const rec = token ? auth.peekToken(token, 'verify_email') : null;
  if (!rec) return renderVerify(req, res, { state: 'invalid', email: pendingEmail(req), status: 400 });
  const target = rec.userId != null ? auth.findUserById(rec.userId) : null;
  return renderVerify(req, res, { state: 'confirm', token, email: target ? target.email : '' });
});

router.post('/konto/bestaetigen', privatePage, tokenPage, async (req, res, next) => {
  try {
    const token = rawToken(req.body.token);
    const userId = token ? auth.consumeToken(token, 'verify_email') : null;
    const user = userId ? auth.findUserById(userId) : null;
    if (!user) return renderVerify(req, res, { state: 'invalid', email: pendingEmail(req), status: 400 });
    auth.markEmailVerified(user.id);
    auth.resetLoginFailures(user.id);
    auth.logSecurityEvent('email_verified', user.id, req);
    // Automatisch angemeldet wird nur die Sitzung, in der sich jemand mit genau dieser Adresse
    // registriert hat. Wer einen fremden Link öffnet (oder auf einem anderen Gerät bestätigt),
    // meldet sich anschließend mit dem eigenen Passwort an – so kann niemand einem Opfer ein
    // Konto mit fremdem Passwort „unterschieben“ oder dessen Sitzung übernehmen.
    const sameSession = pendingEmail(req).toLowerCase() === String(user.email).toLowerCase() && (!req.user || req.user.id === user.id);
    delete req.session.data.pendingEmail;
    if (!sameSession) {
      req.flash('success', MSG.verifiedLogin);
      return res.redirect(303, '/konto/anmelden');
    }
    await req.regenerateSession({ keepData: true, userId: user.id });
    req.flash('success', MSG.verified);
    return res.redirect(303, '/konto');
  } catch (err) {
    return next(err);
  }
});

router.post(
  '/konto/bestaetigung-erneut',
  privatePage,
  rateLimits.resend,
  honeypot('website', { passThrough: true }),
  async (req, res, next) => {
    try {
      if (req.honeypotTripped) {
        req.flash('info', MSG.resent);
        return res.redirect(303, '/konto/bestaetigen');
      }
      const r = parse(EmailSchema, req.body);
      if (!r.ok) {
        return renderVerify(req, res, { state: 'pending', email: echo(req.body, ['email']).email, errors: r.errors, status: 422 });
      }
      const { email } = r.data;
      const user = auth.findUserByEmail(email);
      if (user && !user.email_verified_at && mailQuota('verify', email)) {
        sendVerification(user);
        auth.logSecurityEvent('verify_resent', user.id, req);
      }
      req.session.data.pendingEmail = email;
      req.flash('info', MSG.resent);
      return res.redirect(303, '/konto/bestaetigen');
    } catch (err) {
      return next(err);
    }
  }
);

/* ---------------------------------------------------------------- Anmeldung */

function renderLogin(req, res, { values = {}, errors = {}, formError = null, nextPath = '', status = 200 } = {}) {
  return res.status(status).render('auth/login.njk', {
    meta: meta(req, 'Anmelden', 'Melden Sie sich in Ihrem Kundenkonto bei Hasret Nuts an.', '/konto/anmelden'),
    values,
    errors,
    formError,
    nextPath,
    idleExpired: Boolean(req.sessionIdleExpired),
  });
}

router.get('/konto/anmelden', privatePage, redirectIfLoggedIn, (req, res) => {
  const nextPath = safeRedirectPath(req.query.next, '');
  return renderLogin(req, res, { nextPath });
});

router.post('/konto/anmelden', privatePage, rateLimits.login, async (req, res, next) => {
  try {
    const nextPath = safeRedirectPath(req.body.next, '');
    if (req.user) return res.redirect(303, nextPath || '/konto');
    const values = echo(req.body, ['email']);
    const r = parse(LoginSchema, req.body);
    if (!r.ok) return renderLogin(req, res, { values, errors: r.errors, nextPath, status: 422 });

    const result = await auth.authenticate(r.data.email, r.data.password, req);
    if (!result.ok) {
      // 'invalid' und 'locked' erhalten bewusst dieselbe neutrale Meldung.
      return renderLogin(req, res, { values, formError: MSG.loginFailed, nextPath, status: 422 });
    }
    const user = result.user;
    if (!user.email_verified_at) {
      // Korrektes Passwort, aber Adresse unbestätigt: keine Sitzung, nur Hinweis + Erneut senden.
      auth.logSecurityEvent('login_unverified', user.id, req);
      req.session.data.pendingEmail = user.email;
      return renderVerify(req, res, { state: 'unverified', email: user.email, status: 403 });
    }
    delete req.session.data.pendingEmail;
    await req.regenerateSession({ keepData: true, userId: user.id });
    req.flash('success', user.name ? `Willkommen zurück, ${user.name}.` : 'Willkommen zurück.');
    return res.redirect(303, nextPath || '/konto');
  } catch (err) {
    return next(err);
  }
});

/* ---------------------------------------------------------------- Abmeldung */

router.post('/konto/abmelden', privatePage, async (req, res, next) => {
  try {
    if (req.user) auth.logSecurityEvent('logout', req.user.id, req);
    // Alte Sitzung (inkl. Warenkorb – geteilte Geräte!) sofort verwerfen, frische Sitzung für die Meldung.
    await req.regenerateSession({ keepData: false });
    req.flash('success', MSG.loggedOut);
    return res.redirect(303, '/');
  } catch (err) {
    return next(err);
  }
});

router.get('/konto/abmelden', privatePage, (req, res) => res.redirect(303, req.user ? '/konto' : '/konto/anmelden'));

/* --------------------------------------------------------- Passwort vergessen */

function renderForgot(req, res, { values = {}, errors = {}, sent = false, status = 200 } = {}) {
  return res.status(status).render('auth/forgot.njk', {
    meta: meta(req, 'Passwort vergessen', 'Fordern Sie einen Link an, um ein neues Passwort für Ihr Kundenkonto festzulegen.', '/konto/passwort-vergessen'),
    values,
    errors,
    sent,
  });
}

router.get('/konto/passwort-vergessen', privatePage, (req, res) => {
  const sent = req.session.data.forgotSent === true;
  if (req.session.data.forgotSent !== undefined) delete req.session.data.forgotSent;
  return renderForgot(req, res, { sent });
});

router.post(
  '/konto/passwort-vergessen',
  privatePage,
  rateLimits.forgot,
  honeypot('website', { passThrough: true }),
  async (req, res, next) => {
    try {
      if (req.honeypotTripped) {
        req.session.data.forgotSent = true;
        return res.redirect(303, '/konto/passwort-vergessen');
      }
      const r = parse(EmailSchema, req.body);
      if (!r.ok) return renderForgot(req, res, { values: echo(req.body, ['email']), errors: r.errors, status: 422 });
      const { email } = r.data;
      const user = auth.findUserByEmail(email);
      // Max. 3 Mails pro Stunde und Adresse; die Antwort ist in jedem Fall dieselbe.
      if (user && mailQuota('reset', email)) {
        const token = auth.createToken(user.id, 'reset_password', RESET_TTL_MIN);
        sendInBackground(() =>
          mailer.send('resetPassword', user.email, {
            name: user.email_verified_at ? user.name : '',
            url: shopUrl(`/konto/passwort-zuruecksetzen?token=${token}`),
            ttlMinutes: RESET_TTL_MIN,
          })
        );
        auth.logSecurityEvent('password_reset_requested', user.id, req);
      }
      req.session.data.forgotSent = true;
      return res.redirect(303, '/konto/passwort-vergessen');
    } catch (err) {
      return next(err);
    }
  }
);

/* ------------------------------------------------------- Passwort zurücksetzen */

function renderReset(req, res, { state, token = null, errors = {}, status = 200 }) {
  return res.status(status).render('auth/reset.njk', {
    meta: meta(req, state === 'form' ? 'Neues Passwort festlegen' : 'Link ungültig', 'Legen Sie ein neues Passwort für Ihr Kundenkonto fest.', '/konto/passwort-zuruecksetzen'),
    state,
    token,
    errors,
  });
}

router.get('/konto/passwort-zuruecksetzen', privatePage, tokenPage, (req, res) => {
  const token = rawToken(req.query.token);
  const rec = token ? auth.peekToken(token, 'reset_password') : null;
  if (!rec || rec.userId == null) return renderReset(req, res, { state: 'invalid', status: 400 });
  return renderReset(req, res, { state: 'form', token });
});

router.post('/konto/passwort-zuruecksetzen', privatePage, tokenPage, rateLimits.login, async (req, res, next) => {
  try {
    const token = rawToken(req.body.token);
    const rec = token ? auth.peekToken(token, 'reset_password') : null;
    const user = rec && rec.userId != null ? auth.findUserById(rec.userId) : null;
    if (!user) return renderReset(req, res, { state: 'invalid', status: 400 });

    const r = parse(ResetSchema, req.body);
    const errors = r.ok ? {} : { ...r.errors };
    if (r.ok) {
      const pl = r.data.password.trim().toLowerCase();
      const el = String(user.email).toLowerCase();
      if (pl === el || pl === el.split('@')[0]) errors.password = 'Das Passwort darf nicht Ihrer E-Mail-Adresse entsprechen.';
    }
    if (Object.keys(errors).length) return renderReset(req, res, { state: 'form', token, errors, status: 422 });

    // Erst jetzt verbrauchen (atomar, einmalig) – Tippfehler im Formular entwerten den Link nicht.
    const userId = auth.consumeToken(token, 'reset_password');
    if (userId !== user.id) return renderReset(req, res, { state: 'invalid', status: 400 });

    await auth.updatePassword(user.id, r.data.password); // beendet ALLE Sitzungen, hebt Sperre auf
    auth.markEmailVerified(user.id); // Zugriff auf das Postfach ist nachgewiesen
    auth.logSecurityEvent('password_reset', user.id, req);
    sendInBackground(() =>
      mailer.send('passwordChanged', user.email, { name: user.name, forgotUrl: shopUrl('/konto/passwort-vergessen') })
    );
    delete req.session.data.pendingEmail;
    await req.regenerateSession({ keepData: true, userId: user.id });
    req.flash('success', MSG.resetDone);
    return res.redirect(303, '/konto');
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
