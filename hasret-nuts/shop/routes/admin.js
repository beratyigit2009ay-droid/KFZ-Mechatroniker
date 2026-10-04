'use strict';
/**
 * Owner: BUILD-AUTH
 * Verwaltung (nur Administratoren; noindex, no-store):
 *   GET  /admin                              Übersicht mit Kennzahlen
 *   GET  /admin/bestellungen                 Bestellanfragen (Filter Status, Suche, Seiten)
 *   GET  /admin/bestellungen/:id             Detail mit Positionen
 *   POST /admin/bestellungen/:id/status      Status ändern (Whitelist)
 *   GET  /admin/anfragen                     B2B-Händleranfragen (aus dem Corporate Hub)
 *   POST /admin/anfragen/:id/status          Status ändern
 *   GET  /admin/feedback                     Feedback, Ideen & Fehlermeldungen (beide Plattformen)
 *   POST /admin/feedback/:id/status          Status ändern
 *   GET  /admin/rabattcodes                  Rabattcodes mit Nutzungen + Formular „Neuer Code“
 *   POST /admin/rabattcodes                  Code anlegen (validiert)
 *   POST /admin/rabattcodes/:id/status       aktivieren / deaktivieren
 *
 * Administratoren entstehen ausschließlich per `npm run create-admin` auf dem Server.
 * Alle Abfragen mit gebundenen Parametern; IDs, Seiten und Filter werden streng geprüft.
 */
const express = require('express');
const { getDb, nowIso } = require('../../shared/db');
const auth = require('../../shared/auth');
const { buildMeta } = require('../../shared/seo');
const { requireAuth, requireAdmin, noIndex, safeRedirectPath } = require('../../shared/security');
const { parse, schemas, z, optional, oneOf } = require('../../shared/validate');

const router = express.Router();

const PAGE_SIZE = 25;

const ORDER_STATUS = [
  { value: 'neu', label: 'Neu', tone: 'new' },
  { value: 'bestaetigt', label: 'Bestätigt', tone: 'ok' },
  { value: 'versendet', label: 'Versendet', tone: 'ok' },
  { value: 'abgeschlossen', label: 'Abgeschlossen', tone: 'done' },
  { value: 'storniert', label: 'Storniert', tone: 'off' },
];
const INQUIRY_STATUS = [
  { value: 'neu', label: 'Neu', tone: 'new' },
  { value: 'in_bearbeitung', label: 'In Bearbeitung', tone: 'work' },
  { value: 'beantwortet', label: 'Beantwortet', tone: 'ok' },
  { value: 'archiviert', label: 'Archiviert', tone: 'off' },
];
const FEEDBACK_STATUS = [
  { value: 'neu', label: 'Neu', tone: 'new' },
  { value: 'in_bearbeitung', label: 'In Bearbeitung', tone: 'work' },
  { value: 'erledigt', label: 'Erledigt', tone: 'ok' },
  { value: 'verworfen', label: 'Verworfen', tone: 'off' },
];
const FEEDBACK_KIND = [
  { value: 'feedback', label: 'Feedback' },
  { value: 'bug', label: 'Fehlermeldung' },
  { value: 'idee', label: 'Idee' },
];
const APPS = [
  { value: 'shop', label: 'Online-Shop' },
  { value: 'corporate', label: 'Corporate Hub' },
];
const DELIVERY_LABEL = { versand: 'Versand', abholung: 'Abholung' };

const values = (list) => list.map((s) => s.value);
const labelOf = (list, v) => (list.find((s) => s.value === v) || { label: v }).label;
const toneOf = (list, v) => (list.find((s) => s.value === v) || { tone: 'new' }).tone;

/* -------------------------------------------------------- Zugriffsschutz */

// Eigene Prüfung zusätzlich zu shop/app.js (Defense in Depth): anonym → Login, Kunde → 403.
router.use('/admin', requireAuth, requireAdmin, noIndex, (req, res, next) => {
  const db = getDb();
  res.locals.adminCounts = {
    orders: db.prepare("SELECT COUNT(*) AS n FROM orders WHERE status = 'neu'").get().n,
    inquiries: db.prepare("SELECT COUNT(*) AS n FROM inquiries WHERE status = 'neu'").get().n,
    feedback: db.prepare("SELECT COUNT(*) AS n FROM feedback WHERE status = 'neu'").get().n,
  };
  next();
});

/* ------------------------------------------------------------------ Helfer */

function meta(req, title) {
  return buildMeta({ title: `${title} · Verwaltung`, description: 'Verwaltung des Hasret Nuts Shops.', path: req.path, noindex: true }, req);
}

/** Positive ganze Zahl aus Route/Query oder null. */
function intParam(value, max = 1e9) {
  if (typeof value !== 'string' || !/^\d{1,10}$/.test(value)) return null;
  const n = Number(value);
  return n >= 1 && n <= max ? n : null;
}

function pageParam(value) {
  return intParam(value, 100000) || 1;
}

function pick(value, list) {
  return typeof value === 'string' && values(list).includes(value) ? value : '';
}

/** Freitextsuche: LIKE mit maskierten Platzhaltern (Parameter werden gebunden). */
function likeTerm(q) {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

function searchParam(value) {
  if (typeof value !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 80);
}

/** Seitennavigation mit erhaltenen Filtern. */
function pager(basePath, query, page, total) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const p = Math.min(page, pages);
  const url = (n) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v) qs.set(k, v);
    if (n > 1) qs.set('seite', String(n));
    const s = qs.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  return {
    page: p,
    pages,
    total,
    offset: (p - 1) * PAGE_SIZE,
    prev: p > 1 ? url(p - 1) : null,
    next: p < pages ? url(p + 1) : null,
    from: total ? (p - 1) * PAGE_SIZE + 1 : 0,
    to: Math.min(p * PAGE_SIZE, total),
  };
}

/** Filter-Reiter mit Anzahl je Status. */
function statusTabs(basePath, list, counts, current, extra = {}) {
  const all = Object.values(counts).reduce((a, b) => a + b, 0);
  const href = (status) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(extra)) if (v) qs.set(k, v);
    if (status) qs.set('status', status);
    const s = qs.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  return [
    { value: '', label: 'Alle', count: all, href: href(''), current: !current },
    ...list.map((s) => ({ value: s.value, label: s.label, count: counts[s.value] || 0, href: href(s.value), current: current === s.value })),
  ];
}

function countsBy(table, column, where = '', params = []) {
  const rows = getDb()
    .prepare(`SELECT ${column} AS k, COUNT(*) AS n FROM ${table} ${where} GROUP BY ${column}`)
    .all(...params);
  const out = {};
  for (const r of rows) out[r.k] = r.n;
  return out;
}

/** Rücksprung nach Statusänderung: nur in den jeweiligen Verwaltungsbereich. */
function backTo(req, prefix) {
  const target = safeRedirectPath(typeof req.body.back === 'string' ? req.body.back : '', prefix);
  return target === prefix || target.startsWith(`${prefix}?`) || target.startsWith(`${prefix}/`) ? target : prefix;
}

function safeJsonArray(json) {
  try {
    const v = JSON.parse(json || '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string' || (x && typeof x === 'object')).slice(0, 20) : [];
  } catch {
    return [];
  }
}

function itemLabel(x) {
  if (typeof x === 'string') return x.slice(0, 120);
  return String(x.name || x.label || x.sku || '').slice(0, 120);
}

/* -------------------------------------------------------------- Übersicht */

router.get('/admin', (req, res) => {
  const db = getDb();
  const since30 = nowIso(-30 * 24 * 3600 * 1000);
  const orderCounts = countsBy('orders', 'status');
  const stats = {
    ordersNew: orderCounts.neu || 0,
    ordersOpen: (orderCounts.neu || 0) + (orderCounts.bestaetigt || 0),
    ordersTotal: Object.values(orderCounts).reduce((a, b) => a + b, 0),
    orders30: db.prepare('SELECT COUNT(*) AS n FROM orders WHERE created_at >= ?').get(since30).n,
    volume30: db
      .prepare("SELECT COALESCE(SUM(total_cents), 0) AS s FROM orders WHERE created_at >= ? AND status != 'storniert'")
      .get(since30).s,
    inquiriesNew: db.prepare("SELECT COUNT(*) AS n FROM inquiries WHERE status = 'neu'").get().n,
    inquiriesTotal: db.prepare('SELECT COUNT(*) AS n FROM inquiries').get().n,
    feedbackNew: db.prepare("SELECT COUNT(*) AS n FROM feedback WHERE status = 'neu'").get().n,
    bugsNew: db.prepare("SELECT COUNT(*) AS n FROM feedback WHERE status = 'neu' AND kind = 'bug'").get().n,
    codesActive: db.prepare('SELECT COUNT(*) AS n FROM discount_codes WHERE active = 1').get().n,
    redemptions30: db.prepare('SELECT COUNT(*) AS n FROM discount_redemptions WHERE created_at >= ?').get(since30).n,
    customers: db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'customer'").get().n,
    customersVerified: db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'customer' AND email_verified_at IS NOT NULL").get().n,
    newsletter: db.prepare('SELECT COUNT(*) AS n FROM newsletter WHERE confirmed_at IS NOT NULL AND unsubscribed_at IS NULL').get().n,
  };
  const recentOrders = db
    .prepare('SELECT id, public_id, name, total_cents, status, delivery, created_at FROM orders ORDER BY created_at DESC, id DESC LIMIT 6')
    .all()
    .map((o) => ({ ...o, statusLabel: labelOf(ORDER_STATUS, o.status), tone: toneOf(ORDER_STATUS, o.status) }));
  const recentInquiries = db
    .prepare('SELECT id, company, contact_name, status, created_at FROM inquiries ORDER BY created_at DESC, id DESC LIMIT 4')
    .all()
    .map((i) => ({ ...i, statusLabel: labelOf(INQUIRY_STATUS, i.status), tone: toneOf(INQUIRY_STATUS, i.status) }));
  const recentFeedback = db
    .prepare('SELECT id, app, kind, message, status, created_at FROM feedback ORDER BY created_at DESC, id DESC LIMIT 4')
    .all()
    .map((f) => ({
      ...f,
      excerpt: f.message.length > 110 ? `${f.message.slice(0, 110)}…` : f.message,
      kindLabel: labelOf(FEEDBACK_KIND, f.kind),
      appLabel: labelOf(APPS, f.app),
      statusLabel: labelOf(FEEDBACK_STATUS, f.status),
      tone: toneOf(FEEDBACK_STATUS, f.status),
    }));
  res.render('admin/dashboard.njk', {
    meta: meta(req, 'Übersicht'),
    section: 'dashboard',
    stats,
    recentOrders,
    recentInquiries,
    recentFeedback,
  });
});

/* -------------------------------------------------------- Bestellanfragen */

router.get('/admin/bestellungen', (req, res) => {
  const db = getDb();
  const status = pick(req.query.status, ORDER_STATUS);
  const q = searchParam(req.query.q);
  const where = [];
  const params = [];
  if (status) {
    where.push('status = ?');
    params.push(status);
  }
  if (q) {
    where.push("(public_id LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\' OR name LIKE ? ESCAPE '\\')");
    const t = likeTerm(q);
    params.push(t, t, t);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) AS n FROM orders ${whereSql}`).get(...params).n;
  const pg = pager('/admin/bestellungen', { status, q }, pageParam(req.query.seite), total);
  const orders = db
    .prepare(
      `SELECT id, public_id, name, email, delivery, discount_code, total_cents, status, created_at, user_id,
              (SELECT COALESCE(SUM(qty), 0) FROM order_items WHERE order_id = orders.id) AS item_count
         FROM orders ${whereSql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`
    )
    .all(...params, PAGE_SIZE, pg.offset)
    .map((o) => ({
      ...o,
      statusLabel: labelOf(ORDER_STATUS, o.status),
      tone: toneOf(ORDER_STATUS, o.status),
      deliveryLabel: DELIVERY_LABEL[o.delivery] || o.delivery,
    }));
  const searchCounts = q
    ? countsBy('orders', 'status', "WHERE (public_id LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\' OR name LIKE ? ESCAPE '\\')", [
        likeTerm(q),
        likeTerm(q),
        likeTerm(q),
      ])
    : countsBy('orders', 'status');
  res.render('admin/orders.njk', {
    meta: meta(req, 'Bestellanfragen'),
    section: 'orders',
    orders,
    tabs: statusTabs('/admin/bestellungen', ORDER_STATUS, searchCounts, status, { q }),
    status,
    q,
    pager: pg,
    backUrl: req.originalUrl.startsWith('/admin/bestellungen') ? req.originalUrl : '/admin/bestellungen',
  });
});

function loadOrder(id) {
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) return null;
  const items = db
    .prepare('SELECT sku, name, variant, unit_price_cents, qty, line_total_cents, bundle_json FROM order_items WHERE order_id = ? ORDER BY id')
    .all(order.id)
    .map((it) => ({ ...it, bundle: safeJsonArray(it.bundle_json).map(itemLabel).filter(Boolean) }));
  const account = order.user_id ? db.prepare('SELECT id, email, name, email_verified_at FROM users WHERE id = ?').get(order.user_id) : null;
  const previous = db.prepare('SELECT COUNT(*) AS n FROM orders WHERE email = ? AND id != ?').get(order.email, order.id).n;
  return { order, items, account, previous };
}

router.get('/admin/bestellungen/:id', (req, res, next) => {
  const id = intParam(req.params.id);
  const data = id ? loadOrder(id) : null;
  if (!data) return next(); // → 404
  const { order } = data;
  res.render('admin/order.njk', {
    meta: meta(req, `Bestellanfrage ${order.public_id}`),
    section: 'orders',
    ...data,
    order: {
      ...order,
      statusLabel: labelOf(ORDER_STATUS, order.status),
      tone: toneOf(ORDER_STATUS, order.status),
      deliveryLabel: DELIVERY_LABEL[order.delivery] || order.delivery,
    },
    statuses: ORDER_STATUS,
    replySubject: `Ihre Bestellanfrage ${order.public_id} bei Hasret Nuts`,
  });
});

router.post('/admin/bestellungen/:id/status', (req, res, next) => {
  const id = intParam(req.params.id);
  if (!id) return next();
  const status = pick(req.body.status, ORDER_STATUS);
  const order = getDb().prepare('SELECT id, public_id, status FROM orders WHERE id = ?').get(id);
  if (!order) return next();
  if (!status) {
    req.flash('error', 'Bitte wählen Sie einen gültigen Status.');
    return res.redirect(303, `/admin/bestellungen/${id}`);
  }
  if (status !== order.status) {
    getDb().prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?').run(status, nowIso(), id);
    auth.logSecurityEvent(`admin_order_status:${status}`, req.user.id, req);
  }
  req.flash('success', `Status von ${order.public_id}: ${labelOf(ORDER_STATUS, status)}.`);
  return res.redirect(303, `/admin/bestellungen/${id}`);
});

/* ------------------------------------------------------- Händleranfragen */

router.get('/admin/anfragen', (req, res) => {
  const db = getDb();
  const status = pick(req.query.status, INQUIRY_STATUS);
  const whereSql = status ? 'WHERE status = ?' : '';
  const params = status ? [status] : [];
  const total = db.prepare(`SELECT COUNT(*) AS n FROM inquiries ${whereSql}`).get(...params).n;
  const pg = pager('/admin/anfragen', { status }, pageParam(req.query.seite), total);
  const inquiries = db
    .prepare(`SELECT * FROM inquiries ${whereSql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`)
    .all(...params, PAGE_SIZE, pg.offset)
    .map((i) => ({
      ...i,
      assortments: safeJsonArray(i.assortments_json).map(itemLabel).filter(Boolean),
      statusLabel: labelOf(INQUIRY_STATUS, i.status),
      tone: toneOf(INQUIRY_STATUS, i.status),
    }));
  res.render('admin/inquiries.njk', {
    meta: meta(req, 'Händleranfragen'),
    section: 'inquiries',
    inquiries,
    tabs: statusTabs('/admin/anfragen', INQUIRY_STATUS, countsBy('inquiries', 'status'), status),
    statuses: INQUIRY_STATUS,
    pager: pg,
    backUrl: req.originalUrl,
  });
});

router.post('/admin/anfragen/:id/status', (req, res, next) => {
  const id = intParam(req.params.id);
  if (!id) return next();
  const status = pick(req.body.status, INQUIRY_STATUS);
  const back = backTo(req, '/admin/anfragen');
  if (!status) {
    req.flash('error', 'Bitte wählen Sie einen gültigen Status.');
    return res.redirect(303, back);
  }
  const info = getDb().prepare('UPDATE inquiries SET status = ? WHERE id = ?').run(status, id);
  if (!info.changes) return next();
  req.flash('success', `Händleranfrage #${id}: ${labelOf(INQUIRY_STATUS, status)}.`);
  return res.redirect(303, back);
});

/* ------------------------------------------------------------- Feedback */

router.get('/admin/feedback', (req, res) => {
  const db = getDb();
  const status = pick(req.query.status, FEEDBACK_STATUS);
  const kind = pick(req.query.art, FEEDBACK_KIND);
  const app = pick(req.query.app, APPS);
  const where = [];
  const params = [];
  if (kind) {
    where.push('kind = ?');
    params.push(kind);
  }
  if (app) {
    where.push('app = ?');
    params.push(app);
  }
  const baseWhere = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const counts = countsBy('feedback', 'status', baseWhere, params);
  if (status) {
    where.push('status = ?');
    params.push(status);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) AS n FROM feedback ${whereSql}`).get(...params).n;
  const pg = pager('/admin/feedback', { status, art: kind, app }, pageParam(req.query.seite), total);
  const items = db
    .prepare(`SELECT * FROM feedback ${whereSql} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`)
    .all(...params, PAGE_SIZE, pg.offset)
    .map((f) => ({
      ...f,
      kindLabel: labelOf(FEEDBACK_KIND, f.kind),
      appLabel: labelOf(APPS, f.app),
      statusLabel: labelOf(FEEDBACK_STATUS, f.status),
      tone: toneOf(FEEDBACK_STATUS, f.status),
    }));
  res.render('admin/feedback.njk', {
    meta: meta(req, 'Feedback & Fehler'),
    section: 'feedback',
    items,
    tabs: statusTabs('/admin/feedback', FEEDBACK_STATUS, counts, status, { art: kind, app }),
    statuses: FEEDBACK_STATUS,
    kinds: FEEDBACK_KIND,
    apps: APPS,
    filter: { status, kind, app },
    pager: pg,
    backUrl: req.originalUrl,
  });
});

router.post('/admin/feedback/:id/status', (req, res, next) => {
  const id = intParam(req.params.id);
  if (!id) return next();
  const status = pick(req.body.status, FEEDBACK_STATUS);
  const back = backTo(req, '/admin/feedback');
  if (!status) {
    req.flash('error', 'Bitte wählen Sie einen gültigen Status.');
    return res.redirect(303, back);
  }
  const info = getDb().prepare('UPDATE feedback SET status = ? WHERE id = ?').run(status, id);
  if (!info.changes) return next();
  req.flash('success', `Meldung #${id}: ${labelOf(FEEDBACK_STATUS, status)}.`);
  return res.redirect(303, back);
});

/* ------------------------------------------------------------ Rabattcodes */

/** UTC-Versatz von Europe/Berlin (in Minuten) zu einem Zeitpunkt. */
function berlinOffsetMinutes(date) {
  const part = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Berlin', timeZoneName: 'shortOffset' })
    .formatToParts(date)
    .find((p) => p.type === 'timeZoneName');
  const m = part ? /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(part.value) : null;
  if (!m) return 0;
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] || 0));
}

/** 'YYYY-MM-DD' → ISO-Zeitpunkt 00:00 Uhr Berliner Zeit (dayOffset 1 = Beginn des Folgetags). */
function berlinDayStartIso(ymd, dayOffset = 0) {
  const [y, mo, d] = ymd.split('-').map(Number);
  const guess = Date.UTC(y, mo - 1, d + dayOffset);
  let ts = guess - berlinOffsetMinutes(new Date(guess)) * 60000;
  ts = guess - berlinOffsetMinutes(new Date(ts)) * 60000;
  return new Date(ts).toISOString();
}

function isRealDate(ymd) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return false;
  const [y, mo, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return y >= 2020 && y <= 2100 && dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/** "5", "5,5", "5,50", "1.234,00"? – erlaubt: Ziffern mit optional , oder . und max. 2 Nachkommastellen. */
function euroToCents(value) {
  const s = String(value).trim().replace(/\s|€/g, '');
  if (!/^\d{1,6}(?:[.,]\d{1,2})?$/.test(s)) return null;
  const [eur, ct = ''] = s.replace(',', '.').split('.');
  return Number(eur) * 100 + Number(ct.padEnd(2, '0'));
}

const dateField = optional(
  z
    .string()
    .trim()
    .refine(isRealDate, 'Bitte geben Sie ein gültiges Datum ein.')
);

const CodeSchema = z
  .object({
    code: schemas.code,
    type: oneOf(['percent', 'fixed'], 'Bitte wählen Sie die Art des Rabatts.'),
    value: z.string({ error: () => 'Bitte geben Sie den Rabattwert ein.' }).trim().min(1, 'Bitte geben Sie den Rabattwert ein.').max(12, 'Ungültiger Wert.'),
    minSubtotal: optional(z.string().trim().max(12, 'Ungültiger Betrag.')),
    startsOn: dateField,
    endsOn: dateField,
    maxUses: optional(z.string().trim().regex(/^\d{1,6}$/, 'Bitte geben Sie eine ganze Zahl ein.')),
    oncePerEmail: schemas.checkbox,
    active: schemas.checkbox,
    description: optional(schemas.line(200)),
  })
  .transform((v, ctx) => {
    let value;
    if (v.type === 'percent') {
      value = /^\d{1,3}$/.test(v.value) ? Number(v.value) : NaN;
      if (!(value >= 1 && value <= 100)) {
        ctx.addIssue({ code: 'custom', path: ['value'], message: 'Prozent-Rabatt: bitte eine ganze Zahl von 1 bis 100.' });
      }
    } else {
      value = euroToCents(v.value);
      if (value === null || value < 1 || value > 100000) {
        ctx.addIssue({ code: 'custom', path: ['value'], message: 'Fester Rabatt: bitte einen Betrag zwischen 0,01 und 1.000,00 € (z. B. 5,00).' });
      }
    }
    let minSubtotalCents = 0;
    if (v.minSubtotal) {
      const c = euroToCents(v.minSubtotal);
      if (c === null || c > 1000000) ctx.addIssue({ code: 'custom', path: ['minSubtotal'], message: 'Bitte einen Betrag wie 30,00 eingeben.' });
      else minSubtotalCents = c;
    }
    let maxUses = null;
    if (v.maxUses) {
      maxUses = Number(v.maxUses);
      if (maxUses < 1 || maxUses > 100000) ctx.addIssue({ code: 'custom', path: ['maxUses'], message: 'Bitte eine Zahl von 1 bis 100.000.' });
    }
    if (v.startsOn && v.endsOn && v.endsOn < v.startsOn) {
      ctx.addIssue({ code: 'custom', path: ['endsOn'], message: 'Das Enddatum darf nicht vor dem Startdatum liegen.' });
    }
    return {
      code: v.code,
      type: v.type,
      value,
      min_subtotal_cents: minSubtotalCents,
      starts_at: v.startsOn ? berlinDayStartIso(v.startsOn) : null,
      ends_at: v.endsOn ? berlinDayStartIso(v.endsOn, 1) : null, // gültig bis einschließlich Endtag
      max_uses: maxUses,
      once_per_email: v.oncePerEmail ? 1 : 0,
      active: v.active ? 1 : 0,
      description: v.description || null,
    };
  });

function codeState(c, now) {
  if (!c.active) return { label: 'Deaktiviert', tone: 'off' };
  if (c.ends_at && c.ends_at <= now) return { label: 'Abgelaufen', tone: 'off' };
  if (c.max_uses !== null && c.uses >= c.max_uses) return { label: 'Ausgeschöpft', tone: 'off' };
  if (c.starts_at && c.starts_at > now) return { label: 'Geplant', tone: 'work' };
  return { label: 'Aktiv', tone: 'ok' };
}

function renderCodes(req, res, { values: formValues = {}, errors = {}, status = 200, openForm = false } = {}) {
  const now = nowIso();
  const codes = getDb()
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM discount_redemptions r WHERE r.code_id = c.id) AS redemptions
         FROM discount_codes c ORDER BY c.active DESC, c.created_at DESC, c.id DESC`
    )
    .all()
    .map((c) => ({
      ...c,
      state: codeState(c, now),
      validUntil: c.ends_at ? new Date(Date.parse(c.ends_at) - 1).toISOString() : null,
    }));
  return res.status(status).render('admin/discounts.njk', {
    meta: meta(req, 'Rabattcodes'),
    section: 'discounts',
    codes,
    values: { type: 'percent', active: true, ...formValues },
    errors,
    openForm: openForm || Object.keys(errors).length > 0,
  });
}

router.get('/admin/rabattcodes', (req, res) => renderCodes(req, res));

router.post('/admin/rabattcodes', (req, res, next) => {
  try {
    const keys = ['code', 'type', 'value', 'minSubtotal', 'startsOn', 'endsOn', 'maxUses', 'description'];
    const echoValues = {};
    for (const k of keys) echoValues[k] = typeof req.body[k] === 'string' ? req.body[k].slice(0, 200) : '';
    echoValues.oncePerEmail = req.body.oncePerEmail === 'on';
    echoValues.active = req.body.active === 'on';
    const r = parse(CodeSchema, req.body);
    if (!r.ok) return renderCodes(req, res, { values: echoValues, errors: r.errors, status: 422 });
    const d = r.data;
    try {
      getDb()
        .prepare(
          `INSERT INTO discount_codes (code, type, value, min_subtotal_cents, starts_at, ends_at, max_uses, once_per_email, active, description, created_at)
           VALUES (@code, @type, @value, @min_subtotal_cents, @starts_at, @ends_at, @max_uses, @once_per_email, @active, @description, @created_at)`
        )
        .run({ ...d, created_at: nowIso() });
    } catch (err) {
      if (err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return renderCodes(req, res, { values: echoValues, errors: { code: 'Diesen Code gibt es bereits.' }, status: 422 });
      }
      throw err;
    }
    auth.logSecurityEvent('admin_code_created', req.user.id, req);
    req.flash('success', `Der Rabattcode ${d.code} wurde angelegt${d.active ? ' und ist aktiv' : ' (noch deaktiviert)'}.`);
    return res.redirect(303, '/admin/rabattcodes');
  } catch (err) {
    return next(err);
  }
});

router.post('/admin/rabattcodes/:id/status', (req, res, next) => {
  const id = intParam(req.params.id);
  if (!id) return next();
  const active = req.body.active === '1' ? 1 : req.body.active === '0' ? 0 : null;
  const code = getDb().prepare('SELECT id, code FROM discount_codes WHERE id = ?').get(id);
  if (!code) return next();
  if (active === null) {
    req.flash('error', 'Ungültige Aktion.');
    return res.redirect(303, '/admin/rabattcodes');
  }
  getDb().prepare('UPDATE discount_codes SET active = ? WHERE id = ?').run(active, id);
  auth.logSecurityEvent(active ? 'admin_code_activated' : 'admin_code_deactivated', req.user.id, req);
  req.flash('success', `Der Rabattcode ${code.code} ist jetzt ${active ? 'aktiv' : 'deaktiviert'}.`);
  return res.redirect(303, '/admin/rabattcodes');
});

module.exports = router;
