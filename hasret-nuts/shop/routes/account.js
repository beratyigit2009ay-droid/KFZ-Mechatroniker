'use strict';
/**
 * Owner: BUILD-AUTH
 * Kundenkonto (nur angemeldet, noindex, no-store):
 *   GET      /konto                         Übersicht (Name, E-Mail, Status, letzte Bestellanfragen)
 *   POST     /konto/name                    Namen ändern
 *   GET      /konto/bestellungen            eigene Bestellanfragen (Liste, seitenweise)
 *   GET      /konto/bestellungen/:publicId  Detail – nur eigene Bestellungen (sonst 404, kein IDOR)
 *   GET/POST /konto/passwort                Passwort ändern (aktuelles Passwort erforderlich)
 *   GET/POST /konto/loeschen                Konto löschen (Passwort + Bestätigung erforderlich)
 *
 * Jede Route prüft die Anmeldung selbst (requireAuth) – zusätzlich zur Absicherung in shop/app.js.
 */
const express = require('express');
const config = require('../../shared/config');
const auth = require('../../shared/auth');
const mailer = require('../../shared/mailer');
const { getDb, nowIso } = require('../../shared/db');
const { buildMeta } = require('../../shared/seo');
const { requireAuth, noIndex, rateLimits } = require('../../shared/security');
const { parse, schemas, z, refinements } = require('../../shared/validate');

const router = express.Router();

const PAGE_SIZE = 10;

const ORDER_STATUS = {
  neu: { label: 'Eingegangen', hint: 'Wir prüfen Ihre Anfrage und melden uns per E-Mail.', tone: 'new' },
  bestaetigt: { label: 'Bestätigt', hint: 'Wir haben Ihre Bestellung per E-Mail bestätigt.', tone: 'ok' },
  versendet: { label: 'Versendet', hint: 'Ihre Bestellung ist unterwegs.', tone: 'ok' },
  abgeschlossen: { label: 'Abgeschlossen', hint: 'Vielen Dank für Ihre Bestellung.', tone: 'done' },
  storniert: { label: 'Storniert', hint: 'Diese Anfrage wurde storniert.', tone: 'off' },
};
const DELIVERY_LABEL = { versand: 'Versand', abholung: 'Abholung in Memmingen' };

/** Anzahl eigener Bestellanfragen für die Kontonavigation. */
function navCounts(req, res, next) {
  if (req.user) res.locals.orderTotal = orderCount(req.user.id);
  next();
}

const guard = [requireAuth, noIndex, navCounts];

/* ------------------------------------------------------------------ Helfer */

function meta(req, title, path) {
  return buildMeta({ title, description: 'Ihr Kundenkonto bei Hasret Nuts.', path: path || req.path, noindex: true }, req);
}

function statusInfo(status) {
  return ORDER_STATUS[status] || { label: status, hint: '', tone: 'new' };
}

function pageParam(value) {
  const n = typeof value === 'string' && /^\d{1,4}$/.test(value) ? Number(value) : 1;
  return n >= 1 ? n : 1;
}

function decorateOrder(o) {
  return { ...o, statusInfo: statusInfo(o.status), deliveryLabel: DELIVERY_LABEL[o.delivery] || o.delivery };
}

function parseBundle(json) {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    if (!Array.isArray(v)) return [];
    return v
      .map((x) => (typeof x === 'string' ? x : x && typeof x === 'object' ? x.name || x.label || x.sku || '' : ''))
      .filter((x) => typeof x === 'string' && x)
      .map((x) => x.slice(0, 120))
      .slice(0, 10);
  } catch {
    return [];
  }
}

const STATUS_RANK = { neu: 0, bestaetigt: 1, versendet: 2, abgeschlossen: 3 };

/** Fortschrittsanzeige: Abholung ohne „Versendet“; stornierte Anfragen ohne Anzeige. */
function progressSteps(order) {
  if (!(order.status in STATUS_RANK)) return [];
  const keys = order.delivery === 'abholung' ? ['neu', 'bestaetigt', 'abgeschlossen'] : ['neu', 'bestaetigt', 'versendet', 'abgeschlossen'];
  const rank = STATUS_RANK[order.status];
  const done = keys.filter((k) => STATUS_RANK[k] <= rank);
  const current = done[done.length - 1];
  return keys.map((k) => ({ key: k, label: ORDER_STATUS[k].label, done: STATUS_RANK[k] <= rank, current: k === current }));
}

async function safeSend(fn) {
  try {
    await fn();
  } catch (err) {
    console.error('[konto] E-Mail konnte nicht versendet werden:', err && err.code ? err.code : err && err.message);
  }
}

function orderCount(userId) {
  return getDb().prepare('SELECT COUNT(*) AS n FROM orders WHERE user_id = ?').get(userId).n;
}

/* ---------------------------------------------------------------- Übersicht */

function renderOverview(req, res, { nameValue, nameError = null, status = 200 } = {}) {
  const userId = req.user.id;
  const recent = getDb()
    .prepare(
      `SELECT id, public_id, status, total_cents, delivery, created_at,
              (SELECT COALESCE(SUM(qty), 0) FROM order_items WHERE order_id = orders.id) AS item_count
         FROM orders WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 3`
    )
    .all(userId)
    .map(decorateOrder);
  return res.status(status).render('account/overview.njk', {
    meta: meta(req, 'Mein Konto', '/konto'),
    section: 'overview',
    recent,
    orderTotal: orderCount(userId),
    nameValue: nameValue !== undefined ? nameValue : req.user.name,
    nameError,
  });
}

router.get('/konto', guard, (req, res) => renderOverview(req, res));

const NameSchema = z.object({ name: schemas.name });

router.post('/konto/name', guard, (req, res) => {
  const r = parse(NameSchema, req.body);
  if (!r.ok) {
    const raw = typeof req.body.name === 'string' ? req.body.name.slice(0, 120) : '';
    return renderOverview(req, res, { nameValue: raw, nameError: r.errors.name, status: 422 });
  }
  getDb().prepare('UPDATE users SET name = ?, updated_at = ? WHERE id = ?').run(r.data.name, nowIso(), req.user.id);
  auth.logSecurityEvent('name_changed', req.user.id, req);
  req.flash('success', 'Ihr Name wurde gespeichert.');
  return res.redirect(303, '/konto');
});

/* ---------------------------------------------------------- Bestellanfragen */

router.get('/konto/bestellungen', guard, (req, res) => {
  const userId = req.user.id;
  const total = orderCount(userId);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(pageParam(req.query.seite), pages);
  const orders = getDb()
    .prepare(
      `SELECT id, public_id, status, total_cents, discount_cents, delivery, created_at,
              (SELECT COALESCE(SUM(qty), 0) FROM order_items WHERE order_id = orders.id) AS item_count
         FROM orders WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`
    )
    .all(userId, PAGE_SIZE, (page - 1) * PAGE_SIZE)
    .map(decorateOrder);
  const pageUrl = (n) => (n > 1 ? `/konto/bestellungen?seite=${n}` : '/konto/bestellungen');
  res.render('account/orders.njk', {
    meta: meta(req, 'Meine Bestellanfragen', '/konto/bestellungen'),
    section: 'orders',
    orders,
    total,
    pager: {
      page,
      pages,
      total,
      prev: page > 1 ? pageUrl(page - 1) : null,
      next: page < pages ? pageUrl(page + 1) : null,
      from: total ? (page - 1) * PAGE_SIZE + 1 : 0,
      to: Math.min(page * PAGE_SIZE, total),
    },
  });
});

router.get('/konto/bestellungen/:publicId', guard, (req, res, next) => {
  const publicId = String(req.params.publicId || '');
  if (!/^[A-Z]{1,8}-\d{4}-\d{1,8}$/.test(publicId)) return next(); // → 404
  // Eigentumsprüfung direkt in der Abfrage: fremde Bestellungen sind nicht von "nicht vorhanden" zu unterscheiden.
  const order = getDb().prepare('SELECT * FROM orders WHERE public_id = ? AND user_id = ?').get(publicId, req.user.id);
  if (!order) return next();
  const items = getDb()
    .prepare('SELECT sku, name, variant, unit_price_cents, qty, line_total_cents, bundle_json FROM order_items WHERE order_id = ? ORDER BY id')
    .all(order.id)
    .map((it) => ({ ...it, bundle: parseBundle(it.bundle_json) }));
  return res.render('account/order.njk', {
    meta: meta(req, `Bestellanfrage ${order.public_id}`, `/konto/bestellungen/${order.public_id}`),
    section: 'orders',
    order: decorateOrder(order),
    items,
    steps: progressSteps(order),
  });
});

/* ---------------------------------------------------------- Passwort ändern */

const PasswordSchema = z
  .object({
    currentPassword: schemas.currentPassword,
    password: schemas.password,
    passwordConfirm: z.string({ error: () => 'Bitte wiederholen Sie das neue Passwort.' }).max(1024, 'Ungültige Eingabe.'),
  })
  .superRefine(refinements.passwordsMatch());

function renderPassword(req, res, { errors = {}, status = 200 } = {}) {
  return res.status(status).render('account/password.njk', {
    meta: meta(req, 'Passwort ändern', '/konto/passwort'),
    section: 'password',
    errors,
  });
}

router.get('/konto/passwort', guard, (req, res) => renderPassword(req, res));

router.post('/konto/passwort', guard, rateLimits.login, async (req, res, next) => {
  try {
    const r = parse(PasswordSchema, req.body);
    const errors = r.ok ? {} : { ...r.errors };
    const row = auth.findUserById(req.user.id);
    if (!row) return res.redirect(303, '/konto/anmelden');
    if (typeof req.body.currentPassword === 'string' && req.body.currentPassword && !errors.currentPassword) {
      const ok = await auth.verifyPassword(req.body.currentPassword, row.password_hash);
      if (!ok) {
        errors.currentPassword = 'Das aktuelle Passwort ist nicht korrekt.';
        auth.logSecurityEvent('password_change_failed', row.id, req);
      }
    }
    if (r.ok && !errors.password) {
      const pl = r.data.password.trim().toLowerCase();
      const el = String(row.email).toLowerCase();
      if (pl === el || pl === el.split('@')[0]) errors.password = 'Das Passwort darf nicht Ihrer E-Mail-Adresse entsprechen.';
      else if (r.data.password === r.data.currentPassword) errors.password = 'Bitte wählen Sie ein anderes als Ihr bisheriges Passwort.';
    }
    if (Object.keys(errors).length) return renderPassword(req, res, { errors, status: 422 });

    await auth.updatePassword(row.id, r.data.password); // beendet ALLE Sitzungen dieses Nutzers
    auth.logSecurityEvent('password_changed', row.id, req);
    await req.regenerateSession({ keepData: true, userId: row.id }); // nur dieses Gerät bleibt angemeldet
    await safeSend(() =>
      mailer.send('passwordChanged', row.email, { name: row.name, forgotUrl: `${config.apps.shop.baseUrl}/konto/passwort-vergessen` })
    );
    req.flash('success', 'Ihr Passwort wurde geändert. Auf allen anderen Geräten wurden Sie abgemeldet.');
    return res.redirect(303, '/konto');
  } catch (err) {
    return next(err);
  }
});

/* ------------------------------------------------------------ Konto löschen */

const DeleteSchema = z.object({
  currentPassword: schemas.currentPassword,
  confirm: schemas.consent('Bitte bestätigen Sie, dass Ihr Konto endgültig gelöscht werden soll.'),
});

function renderDelete(req, res, { errors = {}, status = 200 } = {}) {
  return res.status(status).render('account/delete.njk', {
    meta: meta(req, 'Konto löschen', '/konto/loeschen'),
    section: 'delete',
    errors,
    orderTotal: orderCount(req.user.id),
    isAdmin: req.user.role === 'admin',
  });
}

router.get('/konto/loeschen', guard, (req, res) => renderDelete(req, res));

router.post('/konto/loeschen', guard, rateLimits.login, async (req, res, next) => {
  try {
    const row = auth.findUserById(req.user.id);
    if (!row) return res.redirect(303, '/');
    if (row.role === 'admin') {
      // Schutz vor versehentlichem Aussperren: Administratorkonten werden nur auf dem Server verwaltet.
      return renderDelete(req, res, {
        errors: { _form: 'Administratorkonten können nicht über die Website gelöscht werden. Bitte wenden Sie sich an die technische Betreuung.' },
        status: 403,
      });
    }
    const r = parse(DeleteSchema, req.body);
    const errors = r.ok ? {} : { ...r.errors };
    if (typeof req.body.currentPassword === 'string' && req.body.currentPassword && !errors.currentPassword) {
      const ok = await auth.verifyPassword(req.body.currentPassword, row.password_hash);
      if (!ok) {
        errors.currentPassword = 'Das Passwort ist nicht korrekt.';
        auth.logSecurityEvent('account_delete_failed', row.id, req);
      }
    }
    if (Object.keys(errors).length) return renderDelete(req, res, { errors, status: 422 });

    const { email, name } = row;
    auth.deleteUser(row.id); // Bestellungen bleiben (user_id = NULL), Sitzungen + Tokens werden gelöscht
    auth.logSecurityEvent('account_deleted', null, req);
    await req.regenerateSession({ keepData: false });
    await safeSend(() => mailer.send('accountDeleted', email, { name }));
    req.flash('success', 'Ihr Kundenkonto wurde gelöscht. Eine Bestätigung haben wir Ihnen per E-Mail gesendet.');
    return res.redirect(303, '/');
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
