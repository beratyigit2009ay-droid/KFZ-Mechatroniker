'use strict';
/**
 * Sicherheits-Middleware (FOUNDATION-CORE).
 *
 *   const { csrfProtection, requireAuth, requireAdmin, honeypot, noIndex,
 *           safeRedirectPath, rateLimits, clientIpHash, mailQuota } = require('../shared/security');
 *
 * csrfProtection ist in createBaseApp() bereits GLOBAL für POST/PUT/PATCH/DELETE aktiv –
 * Routen müssen es nicht erneut einbinden (doppelt schadet nicht).
 */
const crypto = require('node:crypto');
const { rateLimit } = require('express-rate-limit');
const config = require('./config');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const MESSAGES = {
  csrf:
    'Ihre Sitzung ist abgelaufen oder das Formular ist nicht mehr gültig. Bitte laden Sie die Seite neu und senden Sie das Formular erneut.',
  forbidden: 'Für diesen Bereich fehlt Ihnen die Berechtigung.',
  rateLimit:
    'Sie haben in kurzer Zeit sehr viele Anfragen gesendet. Bitte warten Sie einen Moment und versuchen Sie es dann erneut.',
  honeypot: 'Vielen Dank – Ihre Nachricht wurde übermittelt.',
};

function lazyAuth() {
  return require('./auth');
}

function lazyErrors() {
  return require('./errors');
}

/** Konstantzeit-Vergleich zweier Strings (auch bei unterschiedlicher Länge). */
function timingSafeEqualStr(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb) && a.length === b.length;
}

/** Private Seiten: nicht cachen, nicht indexieren. */
function privateHeaders(res) {
  res.set('Cache-Control', 'no-store');
  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.locals.noindex = true;
}

function safeLog(type, userId, req) {
  try {
    lazyAuth().logSecurityEvent(type, userId ?? null, req);
  } catch (err) {
    console.error('[security] Ereignis konnte nicht protokolliert werden:', err.message);
  }
}

/**
 * CSRF-Schutz: Zustandsändernde Anfragen müssen das Sitzungs-Token im Feld "_csrf"
 * oder im Header "x-csrf-token" mitsenden. Zusätzlich werden Cross-Site-Anfragen
 * (Sec-Fetch-Site: cross-site) abgewiesen. Fehler -> 403 (HTML-Seite bzw. JSON).
 */
function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method) || req.csrfVerified) return next();
  const fetchSite = req.get('sec-fetch-site');
  const expected = req.session ? req.session.csrfToken : null;
  const bodyToken = req.body && typeof req.body._csrf === 'string' ? req.body._csrf : null;
  const provided = bodyToken || req.get('x-csrf-token') || null;
  const ok = fetchSite !== 'cross-site' && Boolean(expected) && timingSafeEqualStr(expected, provided);
  if (!ok) {
    safeLog('csrf_failure', req.user ? req.user.id : null, req);
    return lazyErrors().renderError(req, res, 403, { code: 'csrf', title: 'Formular abgelaufen', message: MESSAGES.csrf });
  }
  req.csrfVerified = true;
  return next();
}

/**
 * Prüft ein Weiterleitungsziel. Erlaubt sind nur relative Pfade derselben Website
 * ("/konto", "/produkt/x?y=1"). Abgelehnt: "//evil.com", "https://…", "/\\evil",
 * "javascript:…", Steuerzeichen. Gibt den normalisierten Pfad oder fallback zurück.
 */
function safeRedirectPath(next, fallback = '/') {
  if (typeof next !== 'string') return fallback;
  if (next.length === 0 || next.length > 2048) return fallback;
  if (!next.startsWith('/') || next.startsWith('//')) return fallback;
  if (next.includes('\\')) return fallback;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\s]/.test(next)) return fallback;
  let decoded = next;
  try {
    decoded = decodeURIComponent(next);
  } catch {
    return fallback;
  }
  // eslint-disable-next-line no-control-regex
  if (decoded.startsWith('//') || decoded.includes('\\') || /[\u0000-\u001f\u007f]/.test(decoded)) return fallback;
  try {
    const base = 'http://same-origin.invalid';
    const url = new URL(next, base);
    if (url.origin !== base) return fallback;
    // Das Ergebnis erneut prüfen: new URL() löst Punkt-Segmente auf ("/.//evil.com", "/x/..//evil.com",
    // "/%2e//evil.com" → "//evil.com") – ein solcher Pfad wäre im Browser eine fremde Adresse.
    const out = url.pathname + url.search + url.hash;
    if (!out.startsWith('/') || out.startsWith('//') || out.includes('\\')) return fallback;
    return out;
  } catch {
    return fallback;
  }
}

/** Nur angemeldete Nutzer. Sonst Weiterleitung zu /konto/anmelden?next=<sicherer Pfad>. */
function requireAuth(req, res, next) {
  privateHeaders(res);
  if (req.user) return next();
  return redirectToLogin(req, res);
}

function redirectToLogin(req, res) {
  let target = '/konto/anmelden';
  if (req.method === 'GET' || req.method === 'HEAD') {
    const nextPath = safeRedirectPath(req.originalUrl, '');
    if (nextPath && nextPath !== '/') target += `?next=${encodeURIComponent(nextPath)}`;
    return res.redirect(302, target);
  }
  return res.redirect(303, target);
}

/** Nur Administratoren. Nicht angemeldet -> Login; angemeldet ohne Admin-Rolle -> 403. */
function requireAdmin(req, res, next) {
  privateHeaders(res);
  if (!req.user) return redirectToLogin(req, res);
  if (req.user.role !== 'admin') {
    safeLog('admin_forbidden', req.user.id, req);
    return lazyErrors().renderError(req, res, 403, { code: 'forbidden', title: 'Kein Zugriff', message: MESSAGES.forbidden });
  }
  return next();
}

/**
 * Honeypot gegen Spam-Bots: Das versteckte Feld (Standard "website") muss leer sein.
 * Ist es befüllt, wird Erfolg vorgetäuscht – nichts wird gespeichert oder versendet.
 * Optionen:
 *   redirectTo   Ziel der vorgetäuschten Erfolgs-Weiterleitung (Standard: Referer-Pfad oder "/")
 *   message      Erfolgsmeldung (Flash)
 *   passThrough  true -> nur req.honeypotTripped = true setzen und weiterreichen
 */
function honeypot(field = 'website', opts = {}) {
  return function honeypotMiddleware(req, res, next) {
    const raw = req.body ? req.body[field] : undefined;
    const values = Array.isArray(raw) ? raw : [raw];
    const tripped = values.some((v) => typeof v === 'string' && v.trim() !== '');
    if (!tripped) return next();
    safeLog('honeypot', null, req);
    req.honeypotTripped = true;
    if (opts.passThrough) return next();
    if (typeof req.flash === 'function') req.flash('success', opts.message || MESSAGES.honeypot);
    let target = opts.redirectTo ? safeRedirectPath(opts.redirectTo, '/') : null;
    if (!target) {
      try {
        const ref = new URL(req.get('referer') || '', `${req.protocol}://${req.get('host')}`);
        target = ref.host === req.get('host') ? safeRedirectPath(ref.pathname + ref.search, '/') : '/';
      } catch {
        target = '/';
      }
    }
    return res.redirect(303, target);
  };
}

/** Setzt "X-Robots-Tag: noindex, nofollow" (und res.locals.noindex = true). */
function noIndex(req, res, next) {
  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.locals.noindex = true;
  next();
}

/** Gesalzener SHA-256 der Client-IP (32 Hex-Zeichen) – rohe IPs werden nie gespeichert. */
function clientIpHash(req) {
  const ip = (req && (req.ip || (req.socket && req.socket.remoteAddress))) || 'unbekannt';
  return crypto.createHash('sha256').update(`${config.security.logSalt}|${ip}`).digest('hex').slice(0, 32);
}

/* ------------------------------------------------------------------ Ratenlimits */

const limiterCache = new WeakMap();

function buildLimiter(name, { lazy = false } = {}) {
  const settings = config.rateLimits[name];
  if (!settings) throw new Error(`Unbekanntes Ratenlimit: ${name}`);
  return rateLimit({
    windowMs: settings.windowMs,
    limit: settings.max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    validate: lazy ? { creationStack: false } : true,
    handler(req, res) {
      safeLog(`rate_limited:${name}`, req.user ? req.user.id : null, req);
      return lazyErrors().renderError(req, res, 429, {
        code: 'rate_limit',
        title: 'Einen Moment, bitte',
        message: MESSAGES.rateLimit,
        retryAfterMinutes: Math.max(1, Math.ceil(settings.windowMs / 60000)),
      });
    },
  });
}

const LIMITER_NAMES = ['global', 'login', 'register', 'forgot', 'resend', 'forms', 'discount', 'newsletter'];

/**
 * Legt die Zähler für eine App-Instanz beim App-Aufbau an (ruft createBaseApp() auf).
 * Jede App-Instanz hat eigene Zähler (wichtig für Tests mit mehreren App-Instanzen).
 */
function initRateLimits(app) {
  const cache = Object.create(null);
  for (const name of LIMITER_NAMES) cache[name] = buildLimiter(name);
  limiterCache.set(app, cache);
  return cache;
}

function makeLimiter(name) {
  const middleware = function rateLimitMiddleware(req, res, next) {
    const key = req.app || middleware;
    let cache = limiterCache.get(key);
    if (!cache) {
      cache = Object.create(null);
      limiterCache.set(key, cache);
    }
    if (!cache[name]) cache[name] = buildLimiter(name, { lazy: true });
    return cache[name](req, res, next);
  };
  Object.defineProperty(middleware, 'name', { value: `rateLimit_${name}` });
  return middleware;
}

/**
 * Middleware je Zweck (pro App-Instanz eigener Zähler; Werte aus config.rateLimits,
 * per RATE_LIMIT_<NAME>_MAX / _WINDOW_MIN überschreibbar):
 *   global 300/15 min · login 10/15 min · register 5/h · forgot 5/h · resend 3/h
 *   forms 10/h · discount 20/10 min · newsletter 5/h   (jeweils pro IP)
 */
const rateLimits = Object.freeze({
  global: makeLimiter('global'),
  login: makeLimiter('login'),
  register: makeLimiter('register'),
  forgot: makeLimiter('forgot'),
  resend: makeLimiter('resend'),
  forms: makeLimiter('forms'),
  discount: makeLimiter('discount'),
  newsletter: makeLimiter('newsletter'),
});

/* ------------------------------------------------- Mail-Kontingent pro Adresse */

const mailBuckets = new Map();

/**
 * Begrenzt Mails pro Empfängeradresse (Standard 3 pro Stunde, RATE_LIMIT_MAIL_PER_ADDRESS_*).
 * Gibt true zurück, wenn die Mail gesendet werden darf (und zählt sie), sonst false.
 *   if (mailQuota('reset', email)) await mailer.send('resetPassword', email, {...});
 */
function mailQuota(kind, address, opts = {}) {
  const defaults = config.rateLimits.mailPerAddress;
  const max = opts.max ?? defaults.max;
  const windowMs = opts.windowMs ?? defaults.windowMs;
  const key = crypto.createHash('sha256').update(`${kind}|${String(address).trim().toLowerCase()}`).digest('hex');
  const now = Date.now();
  const hits = (mailBuckets.get(key) || []).filter((t) => t > now - windowMs);
  if (mailBuckets.size > 20000) {
    for (const [k, v] of mailBuckets) if (!v.some((t) => t > now - windowMs)) mailBuckets.delete(k);
  }
  if (hits.length >= max) {
    mailBuckets.set(key, hits);
    return false;
  }
  hits.push(now);
  mailBuckets.set(key, hits);
  return true;
}

function resetMailQuota() {
  mailBuckets.clear();
}

module.exports = {
  csrfProtection,
  requireAuth,
  requireAdmin,
  honeypot,
  noIndex,
  safeRedirectPath,
  rateLimits,
  initRateLimits,
  clientIpHash,
  mailQuota,
  resetMailQuota,
  timingSafeEqualStr,
  privateHeaders,
  MESSAGES,
};
