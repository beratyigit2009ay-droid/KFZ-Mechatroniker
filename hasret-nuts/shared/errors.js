'use strict';
/**
 * Fehlerseiten (FOUNDATION-CORE): 404, 403, 429, 500 – deutsch, ohne Stacktraces
 * außerhalb von NODE_ENV=development. Fehler werden serverseitig protokolliert
 * (ohne Query-Strings, damit keine Tokens in Logs landen).
 *
 *   const { notFound, errorHandler, renderError } = require('../shared/errors');
 *   renderError(req, res, 403, { title, message })   // HTML-Seite bzw. JSON bei Accept: application/json
 */
const crypto = require('node:crypto');
const config = require('./config');

const TEMPLATES = { 403: 'errors/403.njk', 404: 'errors/404.njk', 429: 'errors/429.njk' };

const DEFAULT_TEXT = {
  400: { title: 'Ungültige Anfrage', message: 'Die Anfrage konnte nicht verarbeitet werden. Bitte prüfen Sie Ihre Eingaben und versuchen Sie es erneut.' },
  403: { title: 'Kein Zugriff', message: 'Für diesen Bereich fehlt Ihnen die Berechtigung.' },
  404: {
    title: 'Seite nicht gefunden',
    message: 'Die gewünschte Seite existiert nicht oder wurde verschoben. Vielleicht finden Sie über die Startseite, wonach Sie suchen.',
  },
  405: { title: 'Nicht erlaubt', message: 'Diese Aktion ist hier nicht möglich.' },
  413: { title: 'Zu viele Daten', message: 'Die gesendeten Daten sind zu umfangreich. Bitte kürzen Sie Ihre Eingaben.' },
  429: { title: 'Einen Moment, bitte', message: 'Sie haben in kurzer Zeit sehr viele Anfragen gesendet. Bitte warten Sie einen Moment.' },
  500: {
    title: 'Es ist ein Fehler aufgetreten',
    message: 'Leider ist auf unserer Seite ein unerwarteter Fehler aufgetreten. Bitte versuchen Sie es in einigen Minuten erneut.',
  },
};

function wantsJson(req) {
  if (req.is && req.is('application/json')) return true;
  const accept = req.get ? req.get('accept') || '' : '';
  if (!accept) return false;
  return req.accepts(['html', 'json']) === 'json';
}

/** Sicherer Rücksprung-Pfad aus dem Referer (nur gleiche Website), sonst "/". */
function backUrl(req) {
  try {
    const host = req.get('host');
    const ref = new URL(req.get('referer') || '', `${req.protocol}://${host}`);
    if (ref.host !== host) return '/';
    return require('./security').safeRedirectPath(ref.pathname + ref.search, '/');
  } catch {
    return '/';
  }
}

function errorMeta(req, title) {
  try {
    const { buildMeta } = require('./seo');
    return buildMeta({ title, noindex: true, path: req.path }, req);
  } catch {
    return { title: `${title} · Hasret Nuts`, robots: 'noindex, nofollow', noindex: true, description: '' };
  }
}

/**
 * Antwortet mit einer Fehlerseite. opts: { code, title, message, retryAfterMinutes, errorRef, stack }
 */
function renderError(req, res, status, opts = {}) {
  const defaults = DEFAULT_TEXT[status] || DEFAULT_TEXT[status >= 500 ? 500 : 400];
  const title = opts.title || defaults.title;
  const message = opts.message || defaults.message;
  res.status(status);
  res.set('Cache-Control', 'no-store');
  res.set('X-Robots-Tag', 'noindex, nofollow');
  if (wantsJson(req)) {
    return res.json({ error: opts.code || String(status), message });
  }
  const template = TEMPLATES[status] || 'errors/500.njk';
  const context = {
    meta: errorMeta(req, title),
    status,
    title,
    message,
    retryAfterMinutes: opts.retryAfterMinutes || null,
    backUrl: backUrl(req),
    errorRef: opts.errorRef || null,
    stack: config.isDev && opts.stack ? opts.stack : null,
  };
  try {
    return res.render(template, context, (err, html) => {
      if (err) {
        console.error('[errors] Fehlerseite konnte nicht gerendert werden:', err.message);
        return res.type('text/plain; charset=utf-8').send(`${title}\n\n${message}`);
      }
      return res.type('html').send(html);
    });
  } catch (err) {
    console.error('[errors] Fehlerseite konnte nicht gerendert werden:', err.message);
    return res.type('text/plain; charset=utf-8').send(`${title}\n\n${message}`);
  }
}

/** 404 – als letzte Middleware vor errorHandler einbinden. */
function notFound(req, res) {
  return renderError(req, res, 404, { code: 'not_found' });
}

/** Zentrale Fehlerbehandlung – als allerletzte Middleware einbinden. */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    console.error('[error] nach dem Senden der Header:', err);
    return req.socket && req.socket.destroy();
  }
  let status = Number(err && (err.status || err.statusCode)) || 500;
  if (status < 400 || status > 599) status = 500;
  const ref = crypto.randomBytes(4).toString('hex');
  const where = `${req.method} ${req.path}`;
  if (status >= 500) {
    console.error(`[error ${ref}] ${where}:`, err && err.stack ? err.stack : err);
  } else if (config.isDev) {
    console.warn(`[error ${ref}] ${where}: ${status} ${err && err.message}`);
  }
  let code = 'error';
  if (err && err.type === 'entity.too.large') code = 'too_large';
  else if (err && err.type === 'entity.parse.failed') code = 'bad_request';
  else if (status === 404) code = 'not_found';
  // Nachrichten aus Fehlerobjekten werden NICHT an Nutzer ausgegeben (Informationsabfluss),
  // außer der Fehler ist ausdrücklich als öffentlich markiert (err.expose bei 4xx).
  const message = err && err.expose && status < 500 && err.publicMessage ? err.publicMessage : undefined;
  return renderError(req, res, status, { code, message, errorRef: status >= 500 ? ref : null, stack: err && err.stack });
}

module.exports = { notFound, errorHandler, renderError, wantsJson };
