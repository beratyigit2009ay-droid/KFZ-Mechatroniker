'use strict';
/**
 * Owner: BUILD-SHOP
 * Warenkorb: /warenkorb , POST /warenkorb/hinzufuegen|aendern|entfernen|rabatt|rabatt/entfernen , GET /api/warenkorb
 *
 * Alle Formulare funktionieren ohne JavaScript (Weiterleitung 303 + Hinweis). Mit
 * "Accept: application/json" antworten die POST-Routen mit JSON (Fly-to-Cart in shop.js).
 * Preise, Namen und Summen werden ausschließlich serverseitig aus dem Katalog berechnet.
 */
const express = require('express');
const { buildMeta } = require('../../shared/seo');
const { noIndex, rateLimits, safeRedirectPath } = require('../../shared/security');
const { parse, schemas } = require('../../shared/validate');
const { formatEuro } = require('../../shared/views');
const cart = require('../lib/cart');

const router = express.Router();

function wantsJson(req) {
  const accept = req.get('accept') || '';
  return accept.includes('application/json') && !accept.includes('text/html');
}

function str(v, max = 200) {
  return typeof v === 'string' ? v.slice(0, max) : '';
}

function noStore(req, res, next) {
  res.set('Cache-Control', 'no-store');
  next();
}

/** Ziel nach einem Formularversand ohne JavaScript (nur relative Pfade dieser Website). */
function backTo(req, fallback = '/warenkorb') {
  return safeRedirectPath(str(req.body && req.body.next, 512), fallback);
}

function cartJson(req, extra = {}) {
  const sum = cart.build(req.session.data.cart);
  return { ok: true, count: sum.count, subtotalCents: sum.subtotalCents, subtotal: formatEuro(sum.subtotalCents), ...extra };
}

/* ------------------------------------------------------------- Warenkorbseite */
router.get('/warenkorb', noIndex, noStore, (req, res) => {
  const summary = cart.summarize(req);
  res.locals.cartCount = summary.count;
  res.render('cart/cart.njk', {
    meta: buildMeta({ title: 'Ihr Warenkorb', noindex: true, path: '/warenkorb', description: 'Ihr Warenkorb im Hasret Nuts Shop.' }, req),
    summary,
    codeValue: '',
  });
});

/* ------------------------------------------------------------------ Hinzufügen */
router.post('/warenkorb/hinzufuegen', noStore, (req, res) => {
  const body = req.body || {};
  // Nur SKU, Menge und (beim Bundle) die Sortenauswahl werden gelesen – Preise/Namen aus dem
  // Formular werden ignoriert.
  const input = {
    sku: typeof body.sku === 'string' ? body.sku : '',
    qty: typeof body.qty === 'string' || typeof body.qty === 'number' ? body.qty : undefined,
    bundle: Array.isArray(body.bundle) ? body.bundle.slice(0, 10) : typeof body.bundle === 'string' ? [body.bundle] : [],
  };
  if (input.qty !== undefined && !/^\s*\d{1,3}\s*$/.test(String(input.qty))) input.qty = 0;
  const r = cart.addItem(req.session.data.cart, input);
  if (!r.ok) {
    if (wantsJson(req)) return res.status(r.status || 422).json({ ok: false, error: r.error });
    req.flash('error', r.error);
    const fallback = input.sku && /^[a-z0-9-]{1,64}$/.test(input.sku) ? '/warenkorb' : '/';
    return res.redirect(303, safeRedirectPath(str(body.back, 512), backTo(req, fallback)));
  }
  req.session.data.cart = r.items;
  const label = r.product.type === 'bundle' ? r.product.name : r.product.variants.length > 1 ? `${r.product.name} (${r.variant.label})` : r.product.name;
  const message = `${label} liegt im Warenkorb.`;
  if (wantsJson(req)) return res.json(cartJson(req, { message, name: label, qty: r.qty }));
  req.flash('success', message);
  return res.redirect(303, backTo(req, '/warenkorb'));
});

/* --------------------------------------------------------------- Menge ändern */
router.post('/warenkorb/aendern', noStore, (req, res) => {
  const body = req.body || {};
  const key = str(body.key, 300);
  let qty = Number(str(body.qty, 4));
  if (body.step === 'inc' || body.step === 'dec') {
    const line = cart.sanitize(req.session.data.cart).items.find((x) => cart.lineKey(x) === key);
    if (line) qty = line.qty + (body.step === 'inc' ? 1 : -1);
  }
  const r = cart.setQty(req.session.data.cart, key, qty);
  req.session.data.cart = r.items;
  if (wantsJson(req)) return res.status(r.ok ? 200 : 422).json(cartJson(req, { ok: r.ok }));
  if (!r.ok) req.flash('error', r.error || 'Dieser Artikel befindet sich nicht mehr in Ihrem Warenkorb.');
  else if (r.removed) req.flash('success', 'Der Artikel wurde entfernt.');
  else req.flash('success', 'Die Menge wurde aktualisiert.');
  return res.redirect(303, '/warenkorb');
});

/* ------------------------------------------------------------------- Entfernen */
router.post('/warenkorb/entfernen', noStore, (req, res) => {
  const key = str(req.body && req.body.key, 300);
  const r = cart.removeItem(req.session.data.cart, key);
  req.session.data.cart = r.items;
  if (wantsJson(req)) return res.status(r.ok ? 200 : 422).json(cartJson(req, { ok: r.ok }));
  if (r.ok) req.flash('success', 'Der Artikel wurde entfernt.');
  return res.redirect(303, '/warenkorb');
});

/* ----------------------------------------------------------------- Rabattcode */
router.post('/warenkorb/rabatt', noStore, rateLimits.discount, (req, res) => {
  const fail = (message, status = 422) => {
    if (wantsJson(req)) return res.status(status).json({ ok: false, error: message });
    req.flash('error', message);
    return res.redirect(303, '/warenkorb');
  };
  const parsed = parse(schemas.code, req.body && req.body.code);
  if (!parsed.ok) return fail(cart.DISCOUNT_MESSAGES.invalid);
  const sum = cart.build(req.session.data.cart);
  if (sum.empty) return fail(cart.DISCOUNT_MESSAGES.emptyCart);
  const ev = cart.evaluate(parsed.data, sum.subtotalCents);
  if (!ev.ok) return fail(ev.message);
  req.session.data.discountCode = ev.row.code;
  const message = `Der Code ${ev.row.code} wurde angewendet: ${ev.label}.`;
  if (wantsJson(req)) return res.json({ ok: true, message, code: ev.row.code, discountCents: ev.cents });
  req.flash('success', message);
  return res.redirect(303, '/warenkorb');
});

router.post('/warenkorb/rabatt/entfernen', noStore, (req, res) => {
  delete req.session.data.discountCode;
  if (wantsJson(req)) return res.json({ ok: true, message: cart.DISCOUNT_MESSAGES.removed });
  req.flash('success', cart.DISCOUNT_MESSAGES.removed);
  return res.redirect(303, backTo(req, '/warenkorb'));
});

/* ------------------------------------------------------------------------ API */
router.get('/api/warenkorb', noIndex, noStore, (req, res) => {
  if (req.query.details !== '1') {
    const sum = cart.build(req.session.data.cart);
    return res.json({ count: sum.count, subtotalCents: sum.subtotalCents });
  }
  // ?details=1 – Mini-Warenkorb (Drawer in shop.js): Zeilen und Summen, alles serverseitig berechnet
  const s = cart.summarize(req);
  return res.json({
    count: s.count,
    subtotalCents: s.subtotalCents,
    subtotal: formatEuro(s.subtotalCents),
    discount: s.discount
      ? { code: s.discount.code, label: s.discount.label, cents: s.discount.cents, amount: `−${formatEuro(s.discount.cents)}` }
      : null,
    totalCents: s.totalCents,
    total: formatEuro(s.totalCents),
    notices: s.notices.map((n) => n.message),
    lines: s.lines.map((l) => ({
      key: l.key,
      name: l.name,
      meta: l.bundle.length
        ? `Ihre Auswahl: ${l.bundleText}`
        : [l.variantLabel, l.size && l.size !== l.variantLabel ? l.size : ''].filter(Boolean).join(' · '),
      qty: l.qty,
      maxQty: cart.MAX_QTY,
      unit: formatEuro(l.unitCents),
      line: formatEuro(l.lineCents),
      href: l.href,
      photoId: (l.photo && l.photo.id) || '',
    })),
  });
});

module.exports = router;
