'use strict';
/**
 * Owner: BUILD-SHOP · Warenkorb und Rabattcodes (serverseitig).
 *
 * Sitzungsvertrag: req.session.data.cart = [{ sku, qty, bundle: null | [sku, sku, sku] }]
 *                  req.session.data.discountCode = 'CODE' | undefined
 * Preise werden IMMER aus catalog.json gelesen (getVariant / priceCentsFor) – Angaben des
 * Browsers (Preis, Name, Summe) werden nie übernommen. Rabattcodes stehen in der Tabelle
 * discount_codes (npm run seed übernimmt sie aus offers.json).
 */
const catalog = require('../../shared/catalog');
const { getDb, nowIso } = require('../../shared/db');
const { formatEuro } = require('../../shared/views');
const view = require('./catalog-view');

const MAX_LINES = 30;
const MAX_QTY = 99;
const SKU_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

function isSku(v) {
  return typeof v === 'string' && SKU_RE.test(v);
}

function lineKey(item) {
  return item.bundle && item.bundle.length ? `${item.sku}~${item.bundle.join('+')}` : item.sku;
}

function clampQty(q) {
  const n = Number(q);
  if (!Number.isInteger(n) || n < 1) return 0;
  return Math.min(MAX_QTY, n);
}

/**
 * Prüft und bereinigt einen Warenkorb aus der Sitzung.
 * Entfernt unbekannte/nicht verfügbare Artikel, ungültige Bundles und Mengen, fasst Duplikate zusammen.
 * → { items, removed }
 */
function sanitize(raw) {
  const list = Array.isArray(raw) ? raw : [];
  const byKey = new Map();
  let removed = 0;
  for (const it of list) {
    if (!it || typeof it !== 'object' || !isSku(it.sku)) {
      removed += 1;
      continue;
    }
    const hit = catalog.getVariant(it.sku);
    const qty = clampQty(it.qty);
    if (!hit || !view.isAvailable(hit.variant) || qty === 0) {
      removed += 1;
      continue;
    }
    let bundle = null;
    if (hit.product.type === 'bundle') {
      const sel = Array.isArray(it.bundle) ? it.bundle.map(String) : [];
      const check = catalog.validateBundleSelection(it.sku, sel);
      if (!check.ok || check.items.some((x) => !view.isAvailable(x.variant))) {
        removed += 1;
        continue;
      }
      bundle = sel;
    }
    const item = { sku: it.sku, qty, bundle };
    const key = lineKey(item);
    const prev = byKey.get(key);
    if (prev) prev.qty = Math.min(MAX_QTY, prev.qty + qty);
    else byKey.set(key, item);
  }
  const items = [...byKey.values()].slice(0, MAX_LINES);
  removed += Math.max(0, byKey.size - items.length);
  return { items, removed };
}

/** Anzahl der Artikel (Summe der Mengen) – für den Zähler im Header. */
function countItems(raw) {
  return sanitize(raw).items.reduce((s, it) => s + it.qty, 0);
}

/** Baut die Warenkorbzeilen mit Katalogpreisen. */
function build(raw) {
  const { items, removed } = sanitize(raw);
  const lines = items.map((it) => {
    const { product, variant } = catalog.getVariant(it.sku);
    const unitCents = variant.priceCents;
    const isBundle = product.type === 'bundle';
    const bundleItems = isBundle
      ? it.bundle.map((sku) => {
          const b = catalog.getVariant(sku);
          return { sku, label: b.variant.label, priceCents: b.variant.priceCents };
        })
      : [];
    const multi = view.variantsOf(product).length > 1;
    const photos = product.photos || {};
    return {
      key: lineKey(it),
      sku: it.sku,
      qty: it.qty,
      productSlug: product.slug,
      name: product.name,
      variantLabel: isBundle ? '' : multi || variant.label !== product.name ? variant.label : '',
      size: isBundle ? variant.size || '' : variant.size && variant.size !== variant.label ? variant.size : '',
      unitCents,
      lineCents: unitCents * it.qty,
      bundle: bundleItems,
      bundleText: bundleItems.map((b) => b.label).join(' · '),
      href: `/produkt/${product.slug}`,
      photo: view.photo(variant.photo || photos.packshot, { id: 'S-Pxx-A', ratio: '4:5' }),
    };
  });
  const subtotalCents = lines.reduce((s, l) => s + l.lineCents, 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);
  return { items, lines, subtotalCents, count, removed, empty: lines.length === 0 };
}

/**
 * Fügt einen Artikel hinzu. → { ok, error?, status?, items, line? }
 * input: { sku, qty, bundle } – bundle nur beim Messe-Bundle (genau 3 Sorten, Duplikate erlaubt).
 */
function addItem(raw, input) {
  const sku = input && input.sku;
  if (!isSku(sku)) return { ok: false, status: 400, error: 'Dieser Artikel ist leider nicht verfügbar.' };
  const hit = catalog.getVariant(sku);
  if (!hit || !view.isAvailable(hit.variant)) return { ok: false, status: 422, error: 'Dieser Artikel ist leider nicht verfügbar.' };
  const qty = clampQty(input.qty === undefined || input.qty === '' ? 1 : Number(input.qty));
  if (!qty) return { ok: false, status: 422, error: 'Bitte wählen Sie eine Menge zwischen 1 und 99.' };
  let bundle = null;
  if (hit.product.type === 'bundle') {
    const sel = (Array.isArray(input.bundle) ? input.bundle : input.bundle ? [input.bundle] : []).map(String);
    if (sel.some((s) => s === '')) {
      return { ok: false, status: 422, error: `Bitte wählen Sie für alle ${hit.product.bundle.count} Packungen eine Sorte.` };
    }
    const check = catalog.validateBundleSelection(sku, sel);
    if (!check.ok) return { ok: false, status: 422, error: check.error };
    if (check.items.some((x) => !view.isAvailable(x.variant))) {
      return { ok: false, status: 422, error: 'Mindestens eine gewählte Sorte ist derzeit nicht verfügbar.' };
    }
    bundle = sel;
  }
  const { items } = sanitize(raw);
  const item = { sku, qty, bundle };
  const key = lineKey(item);
  const existing = items.find((x) => lineKey(x) === key);
  if (existing) existing.qty = Math.min(MAX_QTY, existing.qty + qty);
  else {
    if (items.length >= MAX_LINES) return { ok: false, status: 422, error: 'Ihr Warenkorb ist voll. Bitte senden Sie zuerst diese Bestellanfrage.' };
    items.push(item);
  }
  return { ok: true, items, key, product: hit.product, variant: hit.variant, qty };
}

/** Setzt die Menge einer Zeile (0 = entfernen). */
function setQty(raw, key, qty) {
  const { items } = sanitize(raw);
  const n = Number(qty);
  const idx = items.findIndex((x) => lineKey(x) === key);
  if (idx === -1) return { ok: false, items };
  if (!Number.isInteger(n) || n < 0) return { ok: false, items, error: 'Bitte geben Sie eine gültige Menge an.' };
  if (n === 0) {
    const [gone] = items.splice(idx, 1);
    return { ok: true, items, removed: gone };
  }
  items[idx].qty = Math.min(MAX_QTY, n);
  return { ok: true, items, item: items[idx] };
}

function removeItem(raw, key) {
  const { items } = sanitize(raw);
  const idx = items.findIndex((x) => lineKey(x) === key);
  if (idx === -1) return { ok: false, items };
  const [gone] = items.splice(idx, 1);
  return { ok: true, items, removed: gone };
}

/* ---------------------------------------------------------------- Rabattcodes */

const DISCOUNT_MESSAGES = {
  invalid: 'Dieser Code ist leider nicht gültig oder derzeit nicht einlösbar. Bitte prüfen Sie die Schreibweise.',
  usedByEmail: 'Dieser Code wurde mit Ihrer E-Mail-Adresse bereits eingelöst. Sie können die Anfrage ohne Rabatt senden.',
  removed: 'Der Rabattcode wurde entfernt.',
  emptyCart: 'Bitte legen Sie zuerst Produkte in den Warenkorb.',
};

function findCode(code) {
  if (typeof code !== 'string' || !/^[A-Za-z0-9-]{3,32}$/.test(code)) return null;
  return getDb().prepare('SELECT * FROM discount_codes WHERE code = ?').get(code) || null;
}

function discountCents(row, subtotalCents) {
  if (!row || subtotalCents <= 0) return 0;
  if (row.type === 'percent') return Math.min(subtotalCents, Math.round((subtotalCents * row.value) / 100));
  return Math.min(subtotalCents, row.value);
}

function discountLabel(row) {
  if (!row) return '';
  return row.type === 'percent' ? `−${row.value} %` : `−${formatEuro(row.value)}`;
}

function emailRedeemed(row, email) {
  if (!row || !email) return false;
  return Boolean(getDb().prepare('SELECT 1 FROM discount_redemptions WHERE code_id = ? AND email = ? LIMIT 1').get(row.id, email));
}

/**
 * Prüft einen Code gegen den Warenwert (und optional die E-Mail-Adresse).
 * → { ok, reason?: 'invalid'|'min'|'usedByEmail', message?, row?, cents?, missingCents? }
 * Unbekannt, inaktiv, abgelaufen, noch nicht gültig und ausgeschöpft ergeben bewusst dieselbe
 * allgemeine Meldung (kein Rückschluss beim Durchprobieren).
 */
function evaluate(code, subtotalCents, { email = null, row = undefined } = {}) {
  const r = row === undefined ? findCode(code) : row;
  const now = nowIso();
  if (!r || r.active !== 1 || (r.starts_at && r.starts_at > now) || (r.ends_at && r.ends_at <= now)) {
    return { ok: false, reason: 'invalid', message: DISCOUNT_MESSAGES.invalid };
  }
  if (r.max_uses !== null && r.max_uses !== undefined && r.uses >= r.max_uses) {
    return { ok: false, reason: 'invalid', message: DISCOUNT_MESSAGES.invalid };
  }
  if (subtotalCents < r.min_subtotal_cents) {
    const missing = r.min_subtotal_cents - subtotalCents;
    return {
      ok: false,
      reason: 'min',
      row: r,
      missingCents: missing,
      message: `Dieser Code gilt ab einem Warenwert von ${formatEuro(r.min_subtotal_cents)}. Es fehlen noch ${formatEuro(missing)}.`,
    };
  }
  if (email && r.once_per_email === 1 && emailRedeemed(r, email)) {
    return { ok: false, reason: 'usedByEmail', row: r, message: DISCOUNT_MESSAGES.usedByEmail };
  }
  return { ok: true, row: r, cents: discountCents(r, subtotalCents), label: discountLabel(r) };
}

/**
 * Warenkorb samt Rabatt für die Anzeige. Bereinigt die Sitzung (entfernte Artikel, ungültig
 * gewordener Code) und liefert Hinweise für den Nutzer.
 * → { lines, count, subtotalCents, discount: { code, cents, label, row } | null, totalCents, notices: [] }
 */
function summarize(req, { email = null } = {}) {
  const data = req.session.data;
  const cart = build(data.cart);
  const notices = [];
  if (cart.removed > 0) {
    notices.push({ type: 'warning', message: 'Ein Artikel ist nicht mehr verfügbar und wurde aus Ihrem Warenkorb entfernt.' });
  }
  if (cart.removed > 0 || (Array.isArray(data.cart) && data.cart.length !== cart.items.length)) {
    data.cart = cart.items;
  }
  let discount = null;
  const code = typeof data.discountCode === 'string' ? data.discountCode : null;
  if (code) {
    const ev = evaluate(code, cart.subtotalCents, { email });
    if (ev.ok) {
      discount = { code: ev.row.code, cents: ev.cents, label: ev.label, row: ev.row, description: ev.row.description || '' };
    } else if (ev.reason === 'usedByEmail') {
      notices.push({ type: 'error', message: ev.message });
      delete data.discountCode;
    } else {
      delete data.discountCode;
      if (!cart.empty) {
        notices.push({
          type: 'warning',
          message:
            ev.reason === 'min'
              ? `Ihr Warenwert liegt jetzt unter ${formatEuro(ev.row.min_subtotal_cents)} – der Code ${ev.row.code} wurde deshalb entfernt.`
              : 'Der eingelöste Rabattcode ist nicht mehr gültig und wurde entfernt.',
        });
      }
    }
  } else if (data.discountCode !== undefined) {
    delete data.discountCode;
  }
  const totalCents = Math.max(0, cart.subtotalCents - (discount ? discount.cents : 0));
  return { ...cart, discount, totalCents, notices };
}

module.exports = {
  MAX_LINES,
  MAX_QTY,
  lineKey,
  sanitize,
  countItems,
  build,
  addItem,
  setQty,
  removeItem,
  findCode,
  evaluate,
  discountCents,
  discountLabel,
  emailRedeemed,
  summarize,
  DISCOUNT_MESSAGES,
};
